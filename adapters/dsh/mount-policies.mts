/**
 * mount-policies.mts — 挂载策略件组装（存留挂载面 = A2 开场地图 + A4 写码在环判据
 * 拦回〔lint + 导出契约注释两判据〕+ A3 技能触点提醒；记录投影不挂 M1/M2/M3 事件位——宿主
 * Session.append 无 ignorable 写入口，下游插件自定义事件类型会令会话历史在读路径 fail-closed
 * 不可加载，ADR 2026-09-08-a8-session-record-projection-removal）。
 *
 * 档位：A4 在环判据 = block 拦回（升格批 2026-09-09-lint-block-and-staged-hook；
 * 同文件连续 block 达上限降级 context 防死锁；注释面判据扩面 ADR
 * 2026-09-10-export-docs-inloop）；A3 技能触点提醒 = advice 非阻断
 * （M1 守卫②，2026-09-10-m1-guard-anti-overdesign）；A5 零策略件；降级 = 异常由
 * index.mts 胶水 catch → warn，拦回/提醒缺席不阻塞会话。状态按会话 WeakMap 隔离
 * （GC 自清）。零宿主依赖（防火墙规则 2）；fs 只读。
 *
 * HERO 答案单源 = B4 ADR Decision 4（A2 地图件）+ 轨道 A ADR
 * 2026-09-08-lint-in-loop-feedback + 升格 ADR 2026-09-09-lint-block-and-staged-hook
 * （A4 反馈/拦回件）+ ADR 2026-09-10-export-docs-inloop（A4 注释面判据件）+
 * M1 立项 ADR 2026-09-10-m1-guard-anti-overdesign（A2 路标行 +
 * A3 触点提醒件）；本文不重抄判据，只落组装。
 */
import fs from "node:fs";
import path from "node:path";
import { createSessionStore, createSessionWarnOnce } from "./mount.mjs";
import type { PreStepPolicy, SessionStartPolicy, ToolPostPolicy, ToolPrePolicy } from "./mount.mjs";
import { resolveRepoRoot, sessionWorkspaceOf } from "./engine-bridge.mjs";
import type { RepoRootConfig } from "./engine-bridge.mjs";
import { DEFAULT_SKILL_GUARDS } from "./config.mjs";
import type { SkillGuardEntry } from "./config.mjs";
import { createLintFeedbackPolicies } from "./lint-feedback.mjs";
import type { LintFeedbackDeps } from "./lint-feedback.mjs";
import { createExportDocsPolicies } from "./export-docs-feedback.mjs";
import type { ExportDocsFeedbackDeps } from "./export-docs-feedback.mjs";
import { createSkillGuardPolicies } from "./skill-guard.mjs";

/** M2 布点表（蓝图 §1 五件；闭集，新增子树件随 C11 布点变更同改）。 */
export const SUBTREE_AGENTS = ["engine", "adapters", "scripts", "docs", ".agents/notes"] as const;

/** 技能路标行（M1 守卫①）：任务型→技能名映射，常驻可见、调用仍自觉。 */
const SKILL_ROSTER: readonly { task: string; skills: readonly string[] }[] = [
	{ task: "docs", skills: ["noo-doc-standards", "noo-prose-standard"] },
	{ task: "ADR housekeeping", skills: ["noo-archive-agent-notes"] },
	{ task: "review close-out", skills: ["noo-code-review"] },
	{ task: "pre-push", skills: ["noo-pre-push-checks"] },
	{ task: "simplification candidates", skills: ["noo-find-simplifications"] },
	{ task: "prose audit", skills: ["noo-trim-cot-leakage"] },
];

/** 技能面候选目录（活副本 + 随库缓存；selftest 同源消费）。 */
export const SKILL_DIR_CANDIDATES = [".agents/skills", ".noogenesis/genes-cache/.agents/skills"] as const;

/** 活副本通道：宿主文件系统 provider 直接可见，与随库 provider 注册与否无关。 */
const LIVE_SKILL_DIR = SKILL_DIR_CANDIDATES[0];

/** 随库缓存通道：只在 noogenesis-bank provider 注册成功后进宿主 catalog。 */
const BANK_SKILL_DIR = SKILL_DIR_CANDIDATES[1];

/** 技能面可达性注入缝（A2 路标行 + A3 触点提醒共用）。 */
export interface SkillSurfaceDeps {
	/** 随库 provider 是否已交给宿主；缺省读作「未注册」→ 缓存通道不计入可达集。 */
	isBankSkillsRegistered?: () => boolean;
}

/** 技能面快照：available = 本会话目录里实际可载的技能名（两通道并集）。 */
export interface SkillSurface {
	available: ReadonlySet<string>;
	/** 缓存里有技能、但 provider 未注册——可达性门把它读作「交付未发生」并留痕。 */
	bankCachePending: boolean;
}

/**
 * 目录内技能名：只认目录且 `<name>/SKILL.md` 在场——与随库 provider 的实服条件
 * 对齐（`skill-provider.mts` 读 SKILL.md 失败即跳过该目录），半成品目录不得进
 * 可达集；frontmatter 合法性更严的一层不在此复算（provider 读文件时判，见 ADR
 * Consequences 的残余边界）。目录缺席（未 pull / 无活副本）与其它读错误同分型：
 * 零技能，绝不抛。
 */
function skillNamesIn(repoRoot: string, dir: string): string[] {
	try {
		return fs.readdirSync(path.join(repoRoot, dir), { withFileTypes: true })
			.filter((entry) => entry.isDirectory() && fs.existsSync(path.join(repoRoot, dir, entry.name, "SKILL.md")))
			.map((entry) => entry.name);
	} catch {
		return [];
	}
}

/**
 * 技能面可达性快照（提醒面唯一判据）：两通道分别按目录实况采集，缓存通道叠加
 * provider 注册结果——宿主 catalog 里不会出现的名字一律不计入，提醒面据此
 * 静默（宁可不说，也不指一个载不到的技能）。
 */
export function inspectSkillSurface(repoRoot: string, bankRegistered: boolean): SkillSurface {
	const names = new Set(skillNamesIn(repoRoot, LIVE_SKILL_DIR));
	const bankNames = skillNamesIn(repoRoot, BANK_SKILL_DIR);
	if (bankRegistered) {
		for (const name of bankNames) names.add(name);
	}
	return { available: names, bankCachePending: !bankRegistered && bankNames.length > 0 };
}

/** 路标行渲染：只点名可达技能；零可达返回 null（该行不发行，零内容零注入）。 */
function rosterLine(available: ReadonlySet<string>): string | null {
	const clauses = SKILL_ROSTER.map(({ task, skills }) => {
		const reachable = skills.filter((skill) => available.has(skill));
		return reachable.length > 0 ? `${task} → ${reachable.join(" + ")}` : null;
	}).filter((clause): clause is string => clause !== null);
	if (clauses.length === 0) return null;
	return `- Task-matched skills (load via the skill tool when the task matches; calls stay self-initiated): ${clauses.join(", ")}`;
}

/**
 * M2 规范事前接入落点（A2 会话开场子树规则地图）：每会话首个 pre-step，
 * mapShown 单门；subagent 跳过；残余边界 = 首步即被其他策略拒绝则地图缺席
 * （B4 ADR Consequences 在案）。「须读入后才推进」拦截 = 升格候选不落地
 * （B4 ADR Decision 4）。发行条件 = 地图有内容（子树布点 / 规范指针 /
 * 技能路标任一在场）——零内容零注入零 token（B4 噪音纪律）；技能路标行按
 * 可达集渲染（见 inspectSkillSurface）。诊断留痕：缓存里有技能而 provider
 * 未注册 = 交付未发生，每会话一条 warn（不静默永久缺席）。
 */
export function createSubtreeRulesPolicies(config: RepoRootConfig, deps: SkillSurfaceDeps & { warn?: (message: string) => void } = {}): { preStep: PreStepPolicy } {
	const store = createSessionStore();
	const warnOnce = createSessionWarnOnce(deps.warn ?? (() => {}));
	interface MapState {
		mapShown: boolean;
	}
	const initState = (): MapState => ({ mapShown: false });
	const preStep: PreStepPolicy = (payload) => {
		// 每会话首个 pre-step 触发（mapShown 单门去重——双门在首步被拒时
		// turn≥2 不再命中，地图会永久缺席）。
		if (payload.agent?.session?.header?.origin === "subagent") return;
		const state = store.of<MapState>(payload.agent?.session, initState);
		if (state.mapShown) return;
		state.mapShown = true;
		const repoRoot = resolveRepoRoot(config, sessionWorkspaceOf(payload));
		const present = SUBTREE_AGENTS.filter((subtree) => fs.existsSync(path.join(repoRoot, subtree, "AGENTS.md")));
		const lines = [
			"Noogenesis subtree rules map — read a subtree's AGENTS.md before working in it:",
			...present.map((subtree) => `- ${subtree}/ → ${subtree}/AGENTS.md`),
		];
		// 规范指针行与布点件同款存在性过滤：指向不存在文件的指针行是噪音。
		if (fs.existsSync(path.join(repoRoot, "docs/method/code-standards.md"))) {
			lines.push("- Coding standards: docs/method/code-standards.md (in-loop feedback on code writes: lint rules + export contract comments)");
		}
		if (fs.existsSync(path.join(repoRoot, "docs/method/architecture-standards.md"))) {
			lines.push("- Architecture standards: docs/method/architecture-standards.md (layering / dependencies / impact surface; new top-level dirs first pass the admission questions)");
		}
		const surface = inspectSkillSurface(repoRoot, deps.isBankSkillsRegistered?.() ?? false);
		if (surface.bankCachePending) {
			warnOnce(payload.agent?.session, `noogenesis: bank skills cached under ${repoRoot} but the noogenesis-bank provider is not registered — skill surface not delivered, skill reminder faces stay silent`);
		}
		const roster = rosterLine(surface.available);
		if (roster !== null) lines.push(roster);
		if (lines.length === 1) return;
		return { kind: "advice", lines };
	};
	return { preStep };
}

/** 全部策略件的挂载面汇总（A5 首批零策略能力位——升格件出现时增挂）。 */
export interface MountPolicySet {
	preStep: PreStepPolicy[];
	toolPre: ToolPrePolicy[];
	toolPost: ToolPostPolicy[];
	sessionStart: SessionStartPolicy[];
}

/** A4 两判据的注入缝汇总（日志面共享；执行面各自可替换——夹具按判据分别注入桩）。 */
export type MountPolicyDeps = LintFeedbackDeps & ExportDocsFeedbackDeps & SkillSurfaceDeps;

/**
 * 组装存留挂载物（A2 地图件 + A4 写码在环判据拦回〔lint + 注释面〕+ A3 技能触点提醒）；
 * config 走 M2 的 repoRoot 回退链，deps 透传给 A4 两判据（执行面/日志面注入缝）
 * 并共享给 A2/A3 的可达性门与降级提示面。skillGuards 显式配置整体替换缺省表
 * （config.mts 归一化后随 validateConfig 结果传入——无该字段的直调面落缺省表）。
 */
export function createMountPolicies(config: RepoRootConfig = {}, deps: MountPolicyDeps = {}): MountPolicySet {
	const subtree = createSubtreeRulesPolicies(config, { isBankSkillsRegistered: deps.isBankSkillsRegistered, warn: deps.warn });
	const lintFeedback = createLintFeedbackPolicies(config, { runLint: deps.runLint, warn: deps.warn });
	const exportDocs = createExportDocsPolicies(config, { runExportDocs: deps.runExportDocs, warn: deps.warn });
	const skillGuards = (config as RepoRootConfig & { skillGuards?: readonly SkillGuardEntry[] }).skillGuards ?? DEFAULT_SKILL_GUARDS;
	const skillGuard = createSkillGuardPolicies(config, skillGuards, {
		warn: deps.warn,
		reachableSkills: (repoRoot) => inspectSkillSurface(repoRoot, deps.isBankSkillsRegistered?.() ?? false).available,
	});
	return {
		preStep: [subtree.preStep],
		// A3 advice 档（M1 守卫②）：策略件出现即挂；deny/ask 能力位仍零策略。
		toolPre: [skillGuard.toolPre],
		// A4 判据序 = lint → 注释面（合并器首 block 胜出：lint 未过时不叠加注释面反馈）。
		toolPost: [lintFeedback.toolPost, exportDocs.toolPost],
		sessionStart: [],
	};
}
