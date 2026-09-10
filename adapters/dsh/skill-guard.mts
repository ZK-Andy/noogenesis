/**
 * skill-guard.mts — A3 技能触点提醒（M1 守卫②，立项 ADR
 * 2026-09-10-m1-guard-anti-overdesign Proposal 1②）。
 *
 * 写码工具触及守卫路径（config.skillGuards 路径前缀）而本会话尚未载对口技能
 * → A3 advice 建议行（非阻断，经 agent.inject 投递——repeat-tool-reminder
 * 同款哲学：触发交给机器，服从留给自觉）。技能载入观测 = 本事件流上的
 * skill 调用（exec.name === "skill"、exec.arguments.name——B4 ADR
 * Decision 3 实证口径 + mount-exec-arguments-field 勘误；seen 集不设前缀
 * 过滤——守卫表可配置任意技能名，前缀硬编码会挡住自定义条目）。
 *
 * 噪音纪律：每会话每技能至多提醒一次（重复提醒稀释真守卫信号——立项 ADR
 * 风险面）；阻断档判不立（「该不该用」是语义判断机器判不了，HERO 判据，
 * 立项 ADR Alternatives）。「用了没有」的会话级对账不在此件——单源在
 * session-close 流程卡对账步（宿主日志 tool/result 证据面）。
 *
 * subagent 面（与 A2 地图的有意不对称，B4 Decision 4 subagent 跳过口径不外推）：
 * A2 全仓地图对窄任务子代理是纯噪音故跳；本件提醒是单行、写码路径强相关——
 * 子代理写 docs/ 同样该载对口技能，提醒有效且每（子）会话至多一次，噪音有界。
 *
 * 降级纪律（同 lint-feedback）：策略件自身永不抛；非 write/edit/skill、
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

/** 守卫条目命中判定：rel（POSIX 形态）等于前缀目录自身或落在其子树内。 */
function matchesGuardPath(relPosix: string, entry: SkillGuardEntry): boolean {
	return relPosix === entry.path || relPosix.startsWith(`${entry.path}/`);
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
			if (exec.name === "skill") {
				const name = (args as Record<string, unknown>).name;
				if (typeof name === "string" && name.length > 0) state.seen.add(name);
				return;
			}
			if (exec.name !== "write" && exec.name !== "edit") return;
			const filePath = (args as Record<string, unknown>).file_path;
			if (typeof filePath !== "string") return;
			const sessionCwd = sessionWorkspaceOf(exec);
			const repoRoot = resolveRepoRoot(config, sessionCwd);
			const abs = path.resolve(sessionCwd ?? repoRoot, filePath);
			if (!isInsideRepo(repoRoot, abs)) return;
			const relPosix = path.relative(repoRoot, abs).split(path.sep).join("/");
			for (const entry of guards) {
				if (!matchesGuardPath(relPosix, entry) || state.seen.has(entry.skill) || state.reminded.has(entry.skill)) continue;
				state.reminded.add(entry.skill);
				return {
					kind: "advice",
					lines: [
						`Noogenesis: writing to ${entry.path}/ without loading the ${entry.skill} skill this session — load it via the skill tool if this task matches (advisory; skill calls stay self-initiated).`,
					],
				};
			}
			return;
		} catch (cause) {
			warnOnce(exec.agent?.session, `noogenesis skill guard failed: ${cause instanceof Error ? cause.message : String(cause)}`);
			return;
		}
	};
	return { toolPre };
}
