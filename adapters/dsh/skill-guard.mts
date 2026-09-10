/**
 * skill-guard.mts — A3 技能触点提醒（M1 守卫②，立项 ADR
 * 2026-09-10-m1-guard-anti-overdesign Proposal 1②；触发面扩面 ADR
 * 2026-09-11-skill-guard-trigger-faces）。
 *
 * 触发面三类（config.skillGuards 条目的 kind）：
 * - path：写码目标落在条目目录子树内（POSIX 相对路径前缀）；
 * - suffix：写码目标以条目后缀结尾（扩展名，如 .md）；
 * - command：bash 命令文本匹配条目正则。
 * 写码目标两条通道——`write` / `edit` 的 `file_path`，以及 bash 命令里的
 * `>` / `>>` / `tee` 目标（引号包或裸 token；按会话 cwd 解析，出仓即弃，与
 * 写码工具同口径）；脚本体内的写（python heredoc 的 `sub(path, …)`、`sed -i`）
 * 与 heredoc 体内的 `>` 文本不可枚举，是残余边界（扩面 ADR Consequences）。
 *
 * 命中即 advice 建议行（非阻断，经 agent.inject 投递——repeat-tool-reminder
 * 同款哲学：触发交给机器，服从留给自觉）；同一事件命中的技能由同一条 advice
 * 一次列全，每会话每技能至多提醒一次。技能载入观测 = 本事件流上的 skill 调用
 * （exec.name === "skill"、exec.arguments.name——B4 ADR Decision 3 实证口径 +
 * mount-exec-arguments-field 勘误；seen 集不设前缀过滤——守卫表可配置任意
 * 技能名，前缀硬编码会挡住自定义条目）。
 *
 * 噪音纪律：每会话每技能至多一次（重复提醒稀释真守卫信号——立项 ADR 风险面）；
 * 阻断档判不立（「该不该用」是语义判断机器判不了，HERO 判据，立项 ADR
 * Alternatives）。「用了没有」的会话级对账不在此件——单源在 session-close
 * 流程卡对账步（宿主日志 tool/result 证据面）。
 *
 * subagent 面（与 A2 地图的有意不对称，B4 Decision 4 subagent 跳过口径不外推）：
 * A2 全仓地图对窄任务子代理是纯噪音故跳；本件提醒是单行级、写码路径强相关——
 * 子代理写 docs/ 同样该载对口技能，提醒有效且每（子）会话至多一次，噪音有界。
 *
 * 降级纪律（同 lint-feedback）：策略件自身永不抛；非 write/edit/bash/skill、
 * 参数面缺失、路径出仓——一律 void（静默不提醒）；异常 warn 每会话至多
 * 一条。零宿主依赖（防火墙规则 2）；fs 不落盘。
 */
import path from "node:path";
import { createSessionStore, createSessionWarnOnce } from "./mount.mjs";
import type { ToolPrePolicy } from "./mount.mjs";
import { resolveRepoRoot, sessionWorkspaceOf, isInsideRepo } from "./engine-bridge.mjs";
import type { RepoRootConfig } from "./engine-bridge.mjs";
import type { SkillGuardEntry } from "./config.mjs";

/** 策略件注入缝：`warn` = 降级提示落点（默认静默）。 */
export interface SkillGuardDeps {
	warn?: (message: string) => void;
}

interface GuardState {
	seen: Set<string>;
	reminded: Set<string>;
}

/**
 * bash 写文件目标提取：`>` / `>>` / `tee`（含 `-a` / `--append`）后跟的目标——
 * 形式 = 双引号包、单引号包或裸 token。只做形状枚举：脚本体内的写不在此列，
 * `->` / `=>` 不算重定向（前导 `-`/`=` 被排除），`$`/`~` 开头的未展开式不取
 * （解析不出仓内路径，取了只会假阳）。以上均为残余边界与假阳面的落点（扩面
 * ADR Consequences）。
 */
const REDIRECT_TARGET_RE = /(?:(?<![-=])>>?|(?:^|[\s;&|])tee(?:\s+(?:-a|--append))?)\s*(?:"([^"]+)"|'([^']+)'|([^\s"'`;&|()<>]+))/g;

/** 从命令文本提取重定向/tee 写目标（原样字符串，去重保序；未展开式丢弃）。 */
function redirectTargets(command: string): string[] {
	const out: string[] = [];
	for (const match of command.matchAll(REDIRECT_TARGET_RE)) {
		const target = match[1] ?? match[2] ?? match[3];
		if (target === undefined || target.includes("$") || target.startsWith("~")) continue;
		if (!out.includes(target)) out.push(target);
	}
	return out;
}

/** 目标相对路径（POSIX）解析：出仓返回 null（出仓面不反馈——同 lint 口径）。 */
function relTarget(repoRoot: string, sessionCwd: string | undefined, raw: string): string | null {
	const abs = path.resolve(sessionCwd ?? repoRoot, raw);
	if (!isInsideRepo(repoRoot, abs)) return null;
	return path.relative(repoRoot, abs).split(path.sep).join("/");
}

/** 条目命中判定：path = 前缀目录自身或子树内；suffix = 路径以后缀结尾。 */
function matchesWriteTarget(relPosix: string, entry: SkillGuardEntry): boolean {
	if (entry.kind === "path") return relPosix === entry.pattern || relPosix.startsWith(`${entry.pattern}/`);
	if (entry.kind === "suffix") return relPosix.endsWith(entry.pattern);
	return false;
}

/** 命中原因描述（建议行主语，按 kind 分派）。 */
function triggerPhrase(entry: SkillGuardEntry): string {
	if (entry.kind === "path") return `writing to ${entry.pattern}/`;
	if (entry.kind === "suffix") return `writing a ${entry.pattern} file`;
	return `running a command matching /${entry.pattern}/`;
}

/**
 * 组装 A3 技能触点提醒策略。返回的策略挂进 `toolPre`（mount-policies 组装）；
 * `config` 走 M2 的 repoRoot 四级回退链，`deps` 为日志面注入缝。
 */
export function createSkillGuardPolicies(config: RepoRootConfig, guards: readonly SkillGuardEntry[], deps: SkillGuardDeps = {}): { toolPre: ToolPrePolicy } {
	const warnOnce = createSessionWarnOnce(deps.warn ?? (() => {}));
	const store = createSessionStore();
	const toolPre: ToolPrePolicy = (exec) => {
		try {
			if (guards.length === 0) return;
			const args = exec.arguments;
			if (typeof args !== "object" || args === null) return;
			const state = store.of<GuardState>(exec.agent?.session, () => ({ seen: new Set(), reminded: new Set() }));
			const fields = args as Record<string, unknown>;
			if (exec.name === "skill") {
				const name = fields.name;
				if (typeof name === "string" && name.length > 0) state.seen.add(name);
				return;
			}
			const isWriteTool = exec.name === "write" || exec.name === "edit";
			const isBash = exec.name === "bash";
			if (!isWriteTool && !isBash) return;
			const sessionCwd = sessionWorkspaceOf(exec);
			const repoRoot = resolveRepoRoot(config, sessionCwd);
			// 写码目标集（POSIX 相对路径）：写码工具给一条，bash 给全部重定向/tee 目标。
			const targets: string[] = [];
			const command = isBash && typeof fields.command === "string" ? fields.command : undefined;
			const raws = isWriteTool
				? typeof fields.file_path === "string" ? [fields.file_path] : []
				: command !== undefined ? redirectTargets(command) : [];
			for (const raw of raws) {
				const rel = relTarget(repoRoot, sessionCwd, raw);
				if (rel !== null && !targets.includes(rel)) targets.push(rel);
			}
			const lines: string[] = [];
			for (const entry of guards) {
				if (state.seen.has(entry.skill) || state.reminded.has(entry.skill)) continue;
				const hit = entry.kind === "command"
					? command !== undefined && new RegExp(entry.pattern).test(command)
					: targets.some((rel) => matchesWriteTarget(rel, entry));
				if (!hit) continue;
				state.reminded.add(entry.skill);
				lines.push(`Noogenesis: ${triggerPhrase(entry)} without loading the ${entry.skill} skill this session — load it via the skill tool if this task matches (advisory; skill calls stay self-initiated).`);
			}
			if (lines.length === 0) return;
			return { kind: "advice", lines };
		} catch (cause) {
			warnOnce(exec.agent?.session, `noogenesis skill guard failed: ${cause instanceof Error ? cause.message : String(cause)}`);
			return;
		}
	};
	return { toolPre };
}
