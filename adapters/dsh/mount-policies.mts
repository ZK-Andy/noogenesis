/**
 * mount-policies.mts — 挂载策略件组装（A2 开场地图 + A4 写码在环 lint 反馈；
 * M1/M2 记录件与 M3 已随 A8 投影撤除批整体退役——ADR
 * 2026-09-08-a8-session-record-projection-removal：宿主 Session.append 无
 * ignorable 写入口，下游插件自定义事件类型会令会话历史在读路径 fail-closed
 * 不可加载）。
 *
 * 建议档，零阻断路径（档位纪律）；降级 = 异常由 index.mts 胶水 catch →
 * warn，建议缺席不阻塞会话。状态按会话 WeakMap 隔离（GC 自清）。零宿主
 * 依赖（防火墙规则 2）；fs 只读（M2 布点件存在性检查）。
 *
 * HERO 答案单源 = B4 ADR Decision 4（A2 地图件）+ 轨道 A ADR
 * 2026-09-08-lint-in-loop-feedback（A4 反馈件）；本文不重抄判据，只落组装。
 */
import fs from "node:fs";
import path from "node:path";
import { createSessionStore } from "./mount.mjs";
import type { PreStepPolicy, SessionStartPolicy, ToolPostPolicy, ToolPrePolicy } from "./mount.mjs";
import { resolveRepoRoot, sessionWorkspaceOf } from "./engine-bridge.mjs";
import type { RepoRootConfig } from "./engine-bridge.mjs";
import { createLintFeedbackPolicies } from "./lint-feedback.mjs";
import type { LintFeedbackDeps } from "./lint-feedback.mjs";

/** M2 布点表（蓝图 §1 五件；闭集，新增子树件随 C11 布点变更同改）。 */
export const SUBTREE_AGENTS = ["engine", "adapters", "scripts", "docs", ".agents/notes"] as const;

/**
 * M2 规范事前接入落点（A2 会话开场子树规则地图）：每会话首个 pre-step，
 * mapShown 单门；subagent 跳过；残余边界 = 首步即被其他策略拒绝则地图缺席
 * （B4 ADR Consequences 在案）。「须读入后才推进」拦截 = 升格候选不落地
 * （B4 ADR Decision 4）。
 */
export function createSubtreeRulesPolicies(config: RepoRootConfig): { preStep: PreStepPolicy } {
	const store = createSessionStore();
	interface MapState {
		mapShown: boolean;
	}
	const initState = (): MapState => ({ mapShown: false });
	const preStep: PreStepPolicy = (payload) => {
		// 每会话首个 pre-step 触发（mapShown 单门去重）——R2-S1：turn/step 双门
		// 在首步被拒时永久丢地图（turn≥2 不再命中 turn===1）。
		if (payload.agent?.session?.header?.origin === "subagent") return;
		const state = store.of<MapState>(payload.agent?.session, initState);
		if (state.mapShown) return;
		state.mapShown = true;
		const repoRoot = resolveRepoRoot(config, sessionWorkspaceOf(payload));
		const present = SUBTREE_AGENTS.filter((subtree) => fs.existsSync(path.join(repoRoot, subtree, "AGENTS.md")));
		if (present.length === 0) return;
		const lines = [
			"Noogenesis subtree rules map — read a subtree's AGENTS.md before working in it:",
			...present.map((subtree) => `- ${subtree}/ → ${subtree}/AGENTS.md`),
		];
		// 写码规范指针行与布点件同款存在性过滤：指向不存在文件的指针行是噪音。
		if (fs.existsSync(path.join(repoRoot, "docs/method/code-standards.md"))) {
			lines.push("- 写码规范：docs/method/code-standards.md（机器面 lint 写码后自动反馈；export-docs 在门禁面）");
		}
		return { kind: "advice", lines };
	};
	return { preStep };
}

/** 全部策略件的挂载面汇总（A3/A5 首批零策略能力位——升格件出现时增挂）。 */
export interface MountPolicySet {
	preStep: PreStepPolicy[];
	toolPre: ToolPrePolicy[];
	toolPost: ToolPostPolicy[];
	sessionStart: SessionStartPolicy[];
}

/**
 * 组装存留挂载物（A2 地图件 + A4 写码在环反馈）；config 走 M2 的 repoRoot
 * 回退链，deps 透传给 A4 策略（执行面/日志面注入缝）。
 */
export function createMountPolicies(config: RepoRootConfig = {}, deps: LintFeedbackDeps = {}): MountPolicySet {
	const subtree = createSubtreeRulesPolicies(config);
	const lintFeedback = createLintFeedbackPolicies(config, deps);
	return {
		preStep: [subtree.preStep],
		// A3/A5 首批零策略能力位：能力位已接线（index.mts），策略件出现时
		// 增挂此处，不触宿主接线面（B4 已拍板原则）。
		toolPre: [],
		toolPost: [lintFeedback.toolPost],
		sessionStart: [],
	};
}
