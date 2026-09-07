/**
 * mount-policies.mts — B4 首批挂载物（B4 ADR Proposal 3–5：M1/M2/M3）。
 *
 * 全部建议/记录档，零阻断路径（档位纪律）；降级 = 异常由 index.mts 胶水
 * catch → warn，记录缺席不阻塞会话。状态按会话 WeakMap 隔离（GC 自清；
 * session/disposed 显式清态由 dropSessionState 汇出）。零宿主依赖（防火墙
 * 规则 2）；fs 只读（M2 布点件存在性检查）。
 *
 * HERO 答案与降级/升格边界单源 = B4 ADR Proposal 3–5（M1 降级纯记录件、
 * M2 拦截升格候选不落地、M3 阻断另案）；本文不重抄判据，只落实现。
 */
import fs from "node:fs";
import path from "node:path";
import { createSessionStore } from "./mount.mjs";
import type { PreStepPolicy, SessionStartPolicy, ToolExecLike, ToolPostPolicy, ToolPrePolicy, TurnStoppingPolicy } from "./mount.mjs";
import { resolveRepoRoot, sessionWorkspaceOf } from "./engine-bridge.mjs";
import type { RepoRootConfig } from "./engine-bridge.mjs";

/** M2 布点表（蓝图 §1 五件；闭集，新增子树件随 C11 布点变更同改）。 */
export const SUBTREE_AGENTS = ["engine", "adapters", "scripts", "docs", ".agents/notes"] as const;

/** M2 A3 观测的写面工具名单（宿主 fs 工具闭集；dsh-tool-fs 实证 edit/write）。 */
const WRITE_TOOLS = new Set(["edit", "write"]);

/** M2 触摸归因的状态封顶（防长会话无界增长；超出丢最旧）。 */
const TOUCH_STATE_CAP = 50;

/** M3 评审机器面运行痕迹标记（工具结果文本闭集匹配；global 形态供 matchAll）。 */
const REVIEW_SURFACE_PATTERN = /\bverify-review-(brief|tier)\b|\bgates(?:\.py|\.mts)?\s+--run\b/g;

/** M1 技能使用痕迹观测（A3）：skill 工具调用 + noo-* 前缀即痕迹。 */
function skillNameOf(exec: ToolExecLike): string | undefined {
	if (exec.name !== "skill") return undefined;
	const name = exec.args?.name;
	return typeof name === "string" && name.startsWith("noo-") ? name : undefined;
}

/** M2 归属判定：file_path 落在哪个布点子树内（相对仓根的子树归因）。 */
function subtreeOf(repoRoot: string, filePath: string): string | undefined {
	if (!path.isAbsolute(filePath)) return undefined;
	for (const subtree of SUBTREE_AGENTS) {
		const base = path.join(repoRoot, subtree);
		const relative = path.relative(base, filePath);
		if (relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)) return subtree;
	}
	return undefined;
}

/**
 * M1 技能使用守卫（纯记录件，蓝图降级路径采纳）：A3 观测 noo-* 技能调用
 * 痕迹，A6 在有新痕迹的 turn 投影增量记录。「该不该用」判定不建（prose
 * 分类 = 硬造不可判定信号，B4 ADR Proposal 3）。
 */
export function createSkillUsagePolicy(): { toolPre: ToolPrePolicy; turnStopping: TurnStoppingPolicy; drop(session: unknown): void } {
	const store = createSessionStore();
	interface SkillState {
		seen: string[];
		projected: number;
	}
	const toolPre: ToolPrePolicy = (exec) => {
		const name = skillNameOf(exec);
		if (!name) return;
		const state = store.of<SkillState>(exec.agent?.session, () => ({ seen: [], projected: 0 }));
		if (!state.seen.includes(name)) state.seen.push(name);
	};
	const turnStopping: TurnStoppingPolicy = (payload) => {
		const state = store.of<SkillState>(payload.agent?.session, () => ({ seen: [], projected: 0 }));
		const fresh = state.seen.slice(state.projected);
		if (fresh.length === 0) return;
		state.projected = state.seen.length;
		return [{ kind: "noogenesis/skill-usage", data: { turn: payload.turn ?? null, names: fresh } }];
	};
	return { toolPre, turnStopping, drop: (session) => void store.drop(session) };
}

/**
 * M2 规范事前接入落点（建议档两件 + 记录一件）：A2 会话开场子树规则地图
 * （仅正装 agent；subagent 跳过）；A3 edit/write 命中布点子树归因观测；
 * A6 投影触摸记录。「须读入后才推进」拦截 = 升格候选不落地（B4 ADR
 * Proposal 4）。
 */
export function createSubtreeRulesPolicies(config: RepoRootConfig): { preStep: PreStepPolicy; toolPre: ToolPrePolicy; turnStopping: TurnStoppingPolicy; drop(session: unknown): void } {
	const store = createSessionStore();
	interface TouchState {
		touched: Array<{ subtree: string; path: string }>;
		projected: number;
		mapShown: boolean;
	}
	const preStep: PreStepPolicy = (payload) => {
		if (payload.turn !== 1 || payload.step !== 1) return;
		if (payload.agent?.session?.header?.origin === "subagent") return;
		const state = store.of<TouchState>(payload.agent?.session, () => ({ touched: [], projected: 0, mapShown: false }));
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
	const toolPre: ToolPrePolicy = (exec) => {
		if (exec.name === undefined || !WRITE_TOOLS.has(exec.name)) return;
		const filePath = exec.args?.file_path;
		if (typeof filePath !== "string") return;
		const repoRoot = resolveRepoRoot(config, sessionWorkspaceOf(exec));
		const subtree = subtreeOf(repoRoot, filePath);
		if (!subtree) return;
		const state = store.of<TouchState>(exec.agent?.session, () => ({ touched: [], projected: 0, mapShown: false }));
		if (state.touched.length >= TOUCH_STATE_CAP) state.touched.shift();
		state.touched.push({ subtree, path: path.relative(repoRoot, filePath) });
	};
	const turnStopping: TurnStoppingPolicy = (payload) => {
		const state = store.of<TouchState>(payload.agent?.session, () => ({ touched: [], projected: 0, mapShown: false }));
		const fresh = state.touched.slice(state.projected);
		if (fresh.length === 0) return;
		state.projected = state.touched.length;
		return [{ kind: "noogenesis/subtree-touch", data: { turn: payload.turn ?? null, touches: fresh } }];
	};
	return { preStep, toolPre, turnStopping, drop: (session) => void store.drop(session) };
}

/**
 * M3 评审实质执行记录件（纯记录件）：A4 观测评审机器面运行痕迹（工具结果
 * 文本闭集标记），A6 在计数有变化的 turn 投影累计记录。声称完成的 prose
 * 检测与阻断档不建（B4 ADR Proposal 5；升格判据另案 review.md §5）。
 */
export function createReviewSurfacePolicy(): { toolPost: ToolPostPolicy; turnStopping: TurnStoppingPolicy; drop(session: unknown): void } {
	const store = createSessionStore();
	interface SurfaceState {
		briefRuns: number;
		tierRuns: number;
		gateRuns: number;
		projected: number;
	}
	const toolPost: ToolPostPolicy = (_exec, result) => {
		if (!result.content?.length) return;
		const text = result.content.map((part) => (part.type === "text" && typeof part.text === "string" ? part.text : "")).join("\n");
		const matched = [...text.matchAll(REVIEW_SURFACE_PATTERN)].map((match) => match[0]);
		if (matched.length === 0) return;
		const state = store.of<SurfaceState>(resultAgentKey(_exec), () => ({ briefRuns: 0, tierRuns: 0, gateRuns: 0, projected: 0 }));
		for (const hit of matched) {
			if (hit === "verify-review-brief") state.briefRuns += 1;
			else if (hit === "verify-review-tier") state.tierRuns += 1;
			else state.gateRuns += 1;
		}
	};
	const turnStopping: TurnStoppingPolicy = (payload) => {
		const state = store.of<SurfaceState>(payload.agent?.session, () => ({ briefRuns: 0, tierRuns: 0, gateRuns: 0, projected: 0 }));
		const total = state.briefRuns + state.tierRuns + state.gateRuns;
		if (total === state.projected) return;
		state.projected = total;
		return [{ kind: "noogenesis/review-surface", data: { turn: payload.turn ?? null, briefRuns: state.briefRuns, tierRuns: state.tierRuns, gateRuns: state.gateRuns } }];
	};
	return { toolPost, turnStopping, drop: (session) => void store.drop(session) };
}

/** A4 策略的会话键提取（exec.agent 的 session 对象；缺席 → undefined 不持久）。 */
function resultAgentKey(exec: ToolExecLike): unknown {
	return exec.agent?.session;
}

/** 全部策略件的会话清态汇总（index.mts A8 接线在 session/disposed 调用）。 */
export interface MountPolicySet {
	preStep: PreStepPolicy[];
	toolPre: ToolPrePolicy[];
	toolPost: ToolPostPolicy[];
	sessionStart: SessionStartPolicy[];
	turnStopping: TurnStoppingPolicy[];
	dropSessionState(session: unknown): void;
}

/** 组装首批挂载物（M1/M2/M3）；config 走 M2 的 repoRoot 回退链。 */
export function createMountPolicies(config: RepoRootConfig = {}): MountPolicySet {
	const skill = createSkillUsagePolicy();
	const subtree = createSubtreeRulesPolicies(config);
	const review = createReviewSurfacePolicy();
	return {
		preStep: [subtree.preStep],
		toolPre: [skill.toolPre, subtree.toolPre],
		toolPost: [review.toolPost],
		// A5 首批零策略件：会话开始 inject 能力位已接线（index.mts），策略件
		// 出现时增挂此处，不触宿主接线面。
		sessionStart: [],
		turnStopping: [skill.turnStopping, subtree.turnStopping, review.turnStopping],
		dropSessionState: (session) => {
			skill.drop(session);
			subtree.drop(session);
			review.drop(session);
		},
	};
}
