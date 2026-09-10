/**
 * mount.mts — 挂载面能力层（B4 ADR Decision 1；能力面 = A2–A5，A6 记录位与
 * A8 落点不挂——宿主 Session.append 无 ignorable 写入口，下游插件自定义事件
 * 类型会令会话历史在读路径 fail-closed 不可加载，撤除 ADR
 * 2026-09-08-a8-session-record-projection-removal）。
 *
 * 四挂载点（A2–A5）各一组策略接口 + 一个合并器——hook-protocol 判定
 * 语义的本地蒸馏（蓝图 §7 边界：不建两方言桥，deny→A3 阻断并回消息 /
 * block→A4 结果面拦回 / additionalContexts→A4 上下文附加 / advice→A3
 * 非阻断建议行（agent.inject 投递，M1 守卫②）/ 非阻断→降级日志）。
 * 策略件在 mount-policies.mts（存留件 = A2 开场地图 + A4 写码在环两判据
 * 〔lint + 注释面〕+ A3 技能触点提醒，记录件不挂——撤除 ADR）；宿主 ctx.on 胶水与消息构造在 index.mts。本模块零宿主依赖（防火墙
 * 规则 2，selftest 机器扫描）——宿主 payload 只取本地窄结构面（同
 * engine-bridge AgentCarrier 口径）。
 *
 * 档位纪律（B4 ADR Decision 7 + 升格批 2026-09-09-lint-block-and-staged-hook +
 * 扩面批 2026-09-10-export-docs-inloop）：合并器提供 deny/block 能力（A3/A4 的
 * 阻断语义单源在案）；A4 两判据均已用 block 拦回档（同文件连续 block 达上限降级
 * context 防死锁，计数协议单源 = `createBlockGate`），A3 deny/ask 仍
 * 零策略件（记录档不挂——撤除 ADR）；其余升格逐件过 HERO 另案。宿主事件与
 * 决策形态实证记录见 B4 ADR Problem 节。
 */
import type { AgentCarrier } from "./engine-bridge.mjs";

/** 宿主 agent 的最小结构面（会话身份键；A6/A8 的 append 落点不挂——撤除 ADR）。 */
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
 * 宿主合同把 `arguments` 定为 `unknown`；本窄面据实声明 `unknown`、收窄在读取面
 * 做。`host-api-contract.mts` 以两组互补断言守约：键存在性（改名/删键即红）+
 * 形状相容（本层不得窄于宿主形状）。 */
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

/** A3 策略决策：deny = 阻断并回消息；ask = 交审批通道；advice = 建议行（非阻断，经 agent.inject 投递）。 */
export type ToolPrePolicyDecision =
	| { kind: "deny"; reason: string }
	| { kind: "ask"; reason?: string }
	| { kind: "advice"; lines: string[] };

/** A4 策略决策：block = 结果面拦回纠正消息；context = 附加上下文行（建议档）。 */
export type ToolPostPolicyDecision = { kind: "block"; feedback: string } | { kind: "context"; lines: string[] };

/** A5 策略决策：inject = 会话开始注入上下文行（非阻塞）。 */
export type SessionStartPolicyDecision = { kind: "inject"; lines: string[] };

/** 策略接口四件（A6/A8 记录投影面不挂——撤除 ADR；A5 零策略件）。 */
export type PreStepPolicy = (payload: PreStepPayload) => PreStepPolicyDecision | void;
export type ToolPrePolicy = (exec: ToolExecLike) => ToolPrePolicyDecision | void;
export type ToolPostPolicy = (exec: ToolExecLike, result: ToolResultLike) => ToolPostPolicyDecision | void;
export type SessionStartPolicy = (payload: SessionStartPayload) => SessionStartPolicyDecision | void;

/**
 * 每会话键控状态存储（WeakMap，GC 自清）：键 = 宿主 session 对象（dsh-goal
 * 同款键位——会话对象身份跨 agent 稳定）。策略件各自持有实例；残留状态仅
 * A2 地图的单门布尔，GC 自清兜底（撤除 ADR Decision 1）。
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

/**
 * 每会话 warn 至多一条的降级提示助手（策略件降级面单源，R1 评审 2026-09-10
 * 折叠三份手写实现）：键 = 会话对象，GC 自清。keyless carve-out：会话键缺席
 * = 每调用即席新状态，warn 逐条重复——触达优于静默（keyless 调用面零去重
 * 手段，静默会让降级完全不可见），与 lint-feedback 同款先例。提示面自身
 * 不抛（策略件永不抛合同的组成面）。
 */
export function createSessionWarnOnce(warn: (message: string) => void): (session: unknown, message: string) => void {
	const store = createSessionStore();
	return (session, message) => {
		try {
			const state = store.of<{ warned: boolean }>(session, () => ({ warned: false }));
			if (state.warned) return;
			state.warned = true;
			warn(message);
		} catch {
			// 降级提示面自身不得抛出（策略件永不抛合同）。
		}
	};
}

/** A4 判据的档位门：`null` = 本次干净（void），`block` / `context` = 拦回 / 降级可见。 */
export interface BlockGate {
	/** 判定一次写码结果：`hit=false` 复位该文件并返回 `null`；`hit=true` 按连续计数定档。 */
	decide(session: unknown, file: string, hit: boolean): "block" | "context" | null;
}

/**
 * A4 两判据共用的死锁门（升格批纪律单源，R1 评审 2026-09-10 折叠两份手写实现）：
 * per-session per-file 连续命中计数——达上限后稳定降级 `context`（不清计数，
 * 保持降级态），一次干净写码（`hit=false`）复位重武装。`maxPerFile` 缺省 3
 * （升格批 N 单源）。状态按会话 WeakMap 隔离（GC 自清）。
 */
export function createBlockGate(maxPerFile = 3): BlockGate {
	const store = createSessionStore();
	interface GateState {
		counts: Map<string, number>;
	}
	return {
		decide(session, file, hit) {
			const state = store.of<GateState>(session, () => ({ counts: new Map() }));
			if (!hit) {
				state.counts.delete(file);
				return null;
			}
			const count = (state.counts.get(file) ?? 0) + 1;
			state.counts.set(file, count);
			return count > maxPerFile ? "context" : "block";
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

/** A3 合并结果：deny 优先于 ask（首个 deny 胜出；无 deny 取首个 ask）；advice 行按注册序累积。 */
export interface MergedToolPre {
	deny?: string;
	ask?: string;
	advice: string[];
}

/** A3 合并语义：首个 deny 胜出（此时未扫描到的策略不再问，已累积 advice 随行返回）；无 deny 取首个 ask（reason 缺省 = 空串哨兵，host 合同允许无理由 ask）；advice 不停扫描照常累积；无策略 = 空决策（透传）。 */
export function mergeToolPre(policies: readonly ToolPrePolicy[], exec: ToolExecLike): MergedToolPre {
	let ask: string | undefined;
	const advice: string[] = [];
	for (const policy of policies) {
		const decision = policy(exec);
		if (!decision) continue;
		if (decision.kind === "deny") return { deny: decision.reason, advice };
		if (decision.kind === "ask") {
			ask ??= decision.reason ?? "";
			continue;
		}
		advice.push(...decision.lines);
	}
	return ask === undefined ? { advice } : { ask, advice };
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
