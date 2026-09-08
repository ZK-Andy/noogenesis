/**
 * mount-policies.mts — B4 首批挂载物存留件（M2 的 A2 开场地图；M1/M2 记录件
 * 与 M3 已随 A8 投影撤除批整体退役——ADR
 * 2026-09-08-a8-session-record-projection-removal：宿主 Session.append 无
 * ignorable 写入口，下游插件自定义事件类型会令会话历史在读路径 fail-closed
 * 不可加载）。
 *
 * 建议档，零阻断路径（档位纪律）；降级 = 异常由 index.mts 胶水 catch →
 * warn，建议缺席不阻塞会话。状态按会话 WeakMap 隔离（GC 自清）。零宿主
 * 依赖（防火墙规则 2）；fs 只读（M2 布点件存在性检查）。
 *
 * HERO 答案单源 = B4 ADR Decision 4（A2 地图件；M1/M3 的 HERO 判据原文亦在
 * 案，投影面恢复须另案过上游能力补齐）；本文不重抄判据，只落实现。
 */
import fs from "node:fs";
import path from "node:path";
import { createSessionStore } from "./mount.mjs";
import type { PreStepPolicy, SessionStartPolicy, ToolPostPolicy, ToolPrePolicy } from "./mount.mjs";
import { resolveRepoRoot, sessionWorkspaceOf } from "./engine-bridge.mjs";
import type { RepoRootConfig } from "./engine-bridge.mjs";

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
		return { kind: "advice", lines };
	};
	return { preStep };
}

/** 全部策略件的挂载面汇总（A3/A4/A5 首批零策略能力位——升格件出现时增挂）。 */
export interface MountPolicySet {
	preStep: PreStepPolicy[];
	toolPre: ToolPrePolicy[];
	toolPost: ToolPostPolicy[];
	sessionStart: SessionStartPolicy[];
}

/** 组装存留挂载物（A2 地图件）；config 走 M2 的 repoRoot 回退链。 */
export function createMountPolicies(config: RepoRootConfig = {}): MountPolicySet {
	const subtree = createSubtreeRulesPolicies(config);
	return {
		preStep: [subtree.preStep],
		// A3/A4/A5 首批零策略能力位：能力位已接线（index.mts），策略件出现时
		// 增挂此处，不触宿主接线面（B4 已拍板原则）。
		toolPre: [],
		toolPost: [],
		sessionStart: [],
	};
}
