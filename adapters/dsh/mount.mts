/**
 * mount.mts — 挂载面能力层（B4 ADR Decision 1；A6 记录位与 A8 落点已随
 * A8 投影撤除批退役——ADR 2026-09-08-a8-session-record-projection-removal，
 * 撤除后能力面 = A2–A5）。
 *
 * 四挂载点（A2–A5）各一组策略接口 + 一个合并器——hook-protocol 判定
 * 语义的本地蒸馏（蓝图 §7 边界：不建两方言桥，deny→A3 阻断并回消息 /
 * block→A4 结果面拦回 / additionalContexts→A4 上下文附加 / 非阻断→降级日志）。
 * 策略件在 mount-policies.mts（现存留件 = A2 开场地图 + A4 写码在环 lint
 * 反馈，记录件面已随撤除批退役）；宿主 ctx.on 胶水与消息构造在 index.mts。本模块零宿主依赖（防火墙
 * 规则 2，selftest 机器扫描）——宿主 payload 只取本地窄结构面（同
 * engine-bridge AgentCarrier 口径）。
 *
 * 档位纪律（B4 ADR Decision 7）：合并器提供 deny/block 能力（A3/A4 的阻断
 * 语义单源在案），但首批策略件全部建议档（记录档面已撤——撤除 ADR），不
 * 使用阻断路径；升格逐件过 HERO 另案。宿主事件与决策形态实证记录见 B4
 * ADR Problem 节。
 */
import type { AgentCarrier } from "./engine-bridge.mjs";

/** 宿主 agent 的最小结构面（会话身份键；A6/A8 的 append 落点已撤——撤除 ADR）。 */
export interface AgentRef {
	session?: {
		header?: { cwd?: string; origin?: string };
	};
}

/** A2 一步前 payload（`agent/pre-step` 窄面）。 */
export interface PreStepPayload extends AgentCarrier {
	agent?: AgentRef;
	messages?: unknown[];
	turn?: number;
	step?: number;
	signal?: unknown;
}

/** A3/A4 工具 exec 窄面（`tools/pre-execute` / `tools/post-execute`）。参数面
 * 字段 = `arguments`（宿主 dsh-tools createExecution 铸造形态；官方消费方
 * hooks-claude-code 同读——bug-fix ADR 2026-09-08-mount-exec-arguments-field）。
 * 宿主合同把 `arguments` 定为 `unknown`（不实收窄的 `Record` 会与上游脱钩，
 * `host-api-contract.mts` 以 assignability 断言钉死）；收窄在读取面做。 */
export interface ToolExecLike extends AgentCarrier {
	agent?: AgentRef;
	name?: string;
	arguments?: unknown;
	signal?: unknown;
}

/** A4 工具结果窄面（content 文本抽取面；isError 供策略判定失败调用）。 */
export interface ToolResultLike {
	isError?: boolean;
	content?: Array<{ type?: string; text?: string }>;
}

/** A5 会话开始 payload（`agent/session-start` 窄面；inject 为非阻塞能力位）。 */
export interface SessionStartPayload extends AgentCarrier {
	agent?: AgentRef & { inject?(message: unknown): void };
	source?: unknown;
}

/** A2 策略决策：reject = 权威拒绝一步（阻断档，首批不用）；advice = 建议档消息行。 */
export type PreStepPolicyDecision = { kind: "reject"; reason: string } | { kind: "advice"; lines: string[] };

/** A3 策略决策：deny = 阻断并回消息；ask = 交审批通道（首批不用）。 */
export type ToolPrePolicyDecision = { kind: "deny"; reason: string } | { kind: "ask"; reason?: string };

/** A4 策略决策：block = 结果面拦回纠正消息；context = 附加上下文行（建议档）。 */
export type ToolPostPolicyDecision = { kind: "block"; feedback: string } | { kind: "context"; lines: string[] };

/** A5 策略决策：inject = 会话开始注入上下文行（非阻塞）。 */
export type SessionStartPolicyDecision = { kind: "inject"; lines: string[] };

/** 策略接口四件（A6/A8 记录投影面已撤——撤除 ADR；A3/A5 首批零策略件）。 */
export type PreStepPolicy = (payload: PreStepPayload) => PreStepPolicyDecision | void;
export type ToolPrePolicy = (exec: ToolExecLike) => ToolPrePolicyDecision | void;
export type ToolPostPolicy = (exec: ToolExecLike, result: ToolResultLike) => ToolPostPolicyDecision | void;
export type SessionStartPolicy = (payload: SessionStartPayload) => SessionStartPolicyDecision | void;

/**
 * 每会话键控状态存储（WeakMap，GC 自清）：键 = 宿主 session 对象（dsh-goal
 * 同款键位——会话对象身份跨 agent 稳定）。策略件各自持有实例；残留状态仅
 * A2 地图的单门布尔（投影状态与其显式清态 drain 面已随撤除批退役——GC
 * 自清兜底，撤除 ADR Decision 1）。
 */
export function createSessionStore(): { of<T>(key: unknown, init: () => T): T } {
	const store = new WeakMap<object, unknown>();
	return {
		of<T>(key: unknown, init: () => T): T {
			const objectKey = key as object | null | undefined;
			if (objectKey === null || objectKey === undefined) return init();
			const existing = store.get(objectKey);
			if (existing !== undefined) return existing as T;
			const created = init();
			store.set(objectKey, created);
			return created;
		},
	};
}

/** A2 合并结果：reject = 首个拒绝理由（胜出即停）；advice = 建议行（注册序累积）。 */
export interface MergedPreStep {
	reject?: string;
	advice: string[];
}

/** A2 合并语义：逐策略顺序过；首个 reject 胜出并停止；advice 行按注册序累积。 */
export function mergePreStep(policies: readonly PreStepPolicy[], payload: PreStepPayload): MergedPreStep {
	const merged: MergedPreStep = { advice: [] };
	for (const policy of policies) {
		const decision = policy(payload);
		if (!decision) continue;
		if (decision.kind === "reject") {
			merged.reject = decision.reason;
			return merged;
		}
		merged.advice.push(...decision.lines);
	}
	return merged;
}

/** A3 合并结果：deny 优先于 ask（首个 deny 胜出；无 deny 取首个 ask）。 */
export interface MergedToolPre {
	deny?: string;
	ask?: string;
}

/** A3 合并语义：首个 deny 胜出（扫描全体）；无 deny 取首个 ask（reason 缺省 = 空串哨兵，host 合同允许无理由 ask）；无策略 = 透传。 */
export function mergeToolPre(policies: readonly ToolPrePolicy[], exec: ToolExecLike): MergedToolPre {
	let ask: string | undefined;
	for (const policy of policies) {
		const decision = policy(exec);
		if (!decision) continue;
		if (decision.kind === "deny") return { deny: decision.reason };
		ask ??= decision.reason ?? "";
	}
	return ask === undefined ? {} : { ask };
}

/** A4 合并结果：block = 首个拦回反馈（胜出即停）；context = 附加上下文行。 */
export interface MergedToolPost {
	block?: string;
	context: string[];
}

/** A4 合并语义：首个 block 胜出并停止；context 行按注册序累积（含 block 之前的）。 */
export function mergeToolPost(policies: readonly ToolPostPolicy[], exec: ToolExecLike, result: ToolResultLike): MergedToolPost {
	const merged: MergedToolPost = { context: [] };
	for (const policy of policies) {
		const decision = policy(exec, result);
		if (!decision) continue;
		if (decision.kind === "block") {
			merged.block = decision.feedback;
			return merged;
		}
		merged.context.push(...decision.lines);
	}
	return merged;
}

/** A5 合并语义：inject 行按注册序累积（非阻塞面）。 */
export function mergeSessionStart(policies: readonly SessionStartPolicy[], payload: SessionStartPayload): string[] {
	const lines: string[] = [];
	for (const policy of policies) {
		const decision = policy(payload);
		if (decision) lines.push(...decision.lines);
	}
	return lines;
}
