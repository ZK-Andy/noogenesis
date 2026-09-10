/**
 * mount-policies.mts — 挂载策略件组装（存留挂载面 = A2 开场地图 + A4 写码在环
 * lint 拦回 + A3 技能触点提醒；记录投影不挂 M1/M2/M3 事件位——宿主 Session.append 无 ignorable
 * 写入口，下游插件自定义事件类型会令会话历史在读路径 fail-closed 不可加载，
 * ADR 2026-09-08-a8-session-record-projection-removal）。
 *
 * 档位：A4 lint 反馈 = block 拦回（升格批 2026-09-09-lint-block-and-staged-hook；
 * 同文件连续 block 达上限降级 context 防死锁）；A3 技能触点提醒 = advice 非阻断
 * （M1 守卫②，2026-09-10-m1-guard-anti-overdesign）；A5 零策略件；降级 = 异常由
 * index.mts 胶水 catch → warn，拦回/提醒缺席不阻塞会话。状态按会话 WeakMap 隔离
 * （GC 自清）。零宿主依赖（防火墙规则 2）；fs 只读。
 *
 * HERO 答案单源 = B4 ADR Decision 4（A2 地图件）+ 轨道 A ADR
 * 2026-09-08-lint-in-loop-feedback + 升格 ADR 2026-09-09-lint-block-and-staged-hook
 * （A4 反馈/拦回件）+ M1 立项 ADR 2026-09-10-m1-guard-anti-overdesign（A2 路标行 +
 * A3 触点提醒件）；本文不重抄判据，只落组装。
 */
import fs from "node:fs";
import path from "node:path";
import { createSessionStore } from "./mount.mjs";
import type { PreStepPolicy, SessionStartPolicy, ToolPostPolicy, ToolPrePolicy } from "./mount.mjs";
import { resolveRepoRoot, sessionWorkspaceOf } from "./engine-bridge.mjs";
import type { RepoRootConfig } from "./engine-bridge.mjs";
import { DEFAULT_SKILL_GUARDS } from "./config.mjs";
import type { SkillGuardEntry } from "./config.mjs";
import { createLintFeedbackPolicies } from "./lint-feedback.mjs";
import type { LintFeedbackDeps } from "./lint-feedback.mjs";
import { createSkillGuardPolicies } from "./skill-guard.mjs";

/** M2 布点表（蓝图 §1 五件；闭集，新增子树件随 C11 布点变更同改）。 */
export const SUBTREE_AGENTS = ["engine", "adapters", "scripts", "docs", ".agents/notes"] as const;

/** 技能路标行（M1 守卫①）：任务型→技能名映射，常驻可见、调用仍自觉。 */
const SKILL_ROSTER_LINE =
	"- Task-matched skills (load via the skill tool when the task matches; calls stay self-initiated): docs → noo-doc-standards + noo-prose-standard, ADR housekeeping → noo-archive-agent-notes, review close-out → noo-code-review, pre-push → noo-pre-push-checks, simplification candidates → noo-find-simplifications, prose audit → noo-trim-cot-leakage";

/** 技能面候选目录（活副本 + 随库缓存；任一含 noo-* 技能即发行路标行）。 */
const SKILL_DIR_CANDIDATES = [".agents/skills", ".noogenesis/genes-cache/.agents/skills"] as const;

/** 技能面在场判定：候选目录任一含 noo-* 前缀成员（技能面缺席的仓零噪音——同指针行存在性过滤口径）。 */
function hasNooSkills(repoRoot: string): boolean {
	for (const dir of SKILL_DIR_CANDIDATES) {
		const abs = path.join(repoRoot, dir);
		if (!fs.existsSync(abs)) continue;
		if (fs.readdirSync(abs).some((name) => name.startsWith("noo-"))) return true;
	}
	return false;
}

/**
 * M2 规范事前接入落点（A2 会话开场子树规则地图）：每会话首个 pre-step，
 * mapShown 单门；subagent 跳过；残余边界 = 首步即被其他策略拒绝则地图缺席
 * （B4 ADR Consequences 在案）。「须读入后才推进」拦截 = 升格候选不落地
 * （B4 ADR Decision 4）。发行条件 = 地图有内容（子树布点 / 规范指针 /
 * 技能路标任一在场）——零内容零注入零 token（B4 噪音纪律）。
 */
export function createSubtreeRulesPolicies(config: RepoRootConfig): { preStep: PreStepPolicy } {
	const store = createSessionStore();
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
			lines.push("- Coding standards: docs/method/code-standards.md (in-loop lint feedback on code writes; export-docs at the gate layer)");
		}
		if (fs.existsSync(path.join(repoRoot, "docs/method/architecture-standards.md"))) {
			lines.push("- Architecture standards: docs/method/architecture-standards.md (layering / dependencies / impact surface; new top-level dirs first pass the admission questions)");
		}
		if (hasNooSkills(repoRoot)) lines.push(SKILL_ROSTER_LINE);
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

/**
 * 组装存留挂载物（A2 地图件 + A4 写码在环 lint 拦回 + A3 技能触点提醒）；
 * config 走 M2 的 repoRoot 回退链，deps 透传给 A4 策略（执行面/日志面注入缝）
 * 并共享给 A3 提醒件的降级提示面。skillGuards 显式配置整体替换缺省表
 * （config.mts 归一化后随 validateConfig 结果传入——无该字段的直调面落缺省表）。
 */
export function createMountPolicies(config: RepoRootConfig = {}, deps: LintFeedbackDeps = {}): MountPolicySet {
	const subtree = createSubtreeRulesPolicies(config);
	const lintFeedback = createLintFeedbackPolicies(config, deps);
	const skillGuards = (config as RepoRootConfig & { skillGuards?: readonly SkillGuardEntry[] }).skillGuards ?? DEFAULT_SKILL_GUARDS;
	const skillGuard = createSkillGuardPolicies(config, skillGuards, { warn: deps.warn });
	return {
		preStep: [subtree.preStep],
		// A3 advice 档（M1 守卫②）：策略件出现即挂；deny/ask 能力位仍零策略。
		toolPre: [skillGuard.toolPre],
		toolPost: [lintFeedback.toolPost],
		sessionStart: [],
	};
}
