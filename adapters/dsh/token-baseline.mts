/**
 * token-baseline.mts — 常驻注入面的宿主读数（观察面，非门槛；护栏建设轮
 * ADR 2026-09-13-guardrail-construction-round 决定 1 建议行）。
 *
 * 接线点 = `agent/pre-step`（index.mts 复用既有 A2 listener，不新增宿主
 * listener）；读数按会话至多一次，且**跳过会话首步**——宿主把系统提示面追加进
 * session log 的时机在 pre-step 派发之后（`SystemPromptUpdate` 当前唯一取值
 * `"in-history"`，`dsh-agent-loop` 的 `system/message` append 晚于 pre-step），
 * 首步读到的 surface 尚不含宿主 persona 与 AGENTS.md 注入。会话键 = 宿主 session
 * 对象（WeakSet，GC 自清）；宿主服务缺席时**不消耗**该会话的读数预算（服务晚
 * 挂载仍可读到）。
 *
 * 懒取用 = `ctx.get("tokenMeter")`（cordis 反射层的「无 inject 要求」读法，缺席
 * 返回 `undefined`；宿主机自身同款用法见 `@deepseek-ai/dsh-acp`）——直读
 * `ctx.tokenMeter` 在插件 runtime fiber 上缺席即抛 `cannot get property
 * "tokenMeter" without inject`，不能用作缺席判据。
 *
 * 降级纪律（与其余挂载面同款）：服务缺席 → 静默不发行；`measure` 抛错或返回值无
 * `surfaceTokens` 数值 → 每会话至多一条 warn（失败路径同样记账，故「至多一条」
 * 在全部路径成立）；发行面与提示面自身抛错被吞（logger 抛出不得中止一步——同
 * mount.mts `createSessionWarnOnce` 先例）。本件绝不抛出。
 *
 * 读数口径：`measure(session)` 的 `surfaceTokens` 是宿主对**当前 session surface**
 * （durable log 折叠面 = system / user / assistant / tool-result）的启发式估值，
 * in-history 形态下含宿主 persona 与 AGENTS.md 注入；它是点时刻快照，不是本插件
 * 注入面的真值，不进任何判据。
 *
 * 本模块零宿主依赖（防火墙规则 2；`selftest.mts` 机器扫描 import 面）。
 */

/** 宿主 `ctx.tokenMeter` 的最小结构面（本层消费面 = `measure(session)` 的 `surfaceTokens`）。 */
export interface TokenMeterLike {
	measure(session: unknown): unknown;
}

/** 读数发行面（index.mts 注入宿主服务读法与 logger；selftest 注入收集器）。 */
export interface TokenBaselineSink {
	/** 懒取宿主服务（index.mts 走 `ctx.get`）：缺席返回 `undefined`。 */
	meter(): TokenMeterLike | undefined;
	/** 读数留痕（每会话至多一行，调用方按体量给 info 档）。 */
	report(line: string): void;
	/** 降级提示（`measure` 抛错 / 返回值形状不符；每会话至多一条）。 */
	warn(message: string): void;
}

/**
 * 构造常驻注入面读数发射器：返回值为 `agent/pre-step` 的每次调用入口形参
 * （宿主 session 对象）。会话首个调用只登记、不读（头注：系统提示面此时未落盘）；
 * 同一会话此后重复出现只读一次；无会话对象静默跳过。
 */
export function createTokenBaselineReading(sink: TokenBaselineSink): (session: unknown) => void {
	/** 已见到首步的会话（首步不读——宿主系统提示面追加在其后）。 */
	const started = new WeakSet<object>();
	/** 已读过（或已判失败）的会话：读数预算与降级提示预算共用，保证每会话至多一条。 */
	const read = new WeakSet<object>();
	/** 发行/提示面自身不得抛出（logger 抛出不得中止一步；同 `createSessionWarnOnce` 先例）。 */
	const emit = (call: () => void): void => {
		try {
			call();
		} catch {
			// 提示面自身不得抛出。
		}
	};
	return (session) => {
		if (typeof session !== "object" || session === null || read.has(session)) return;
		if (!started.has(session)) {
			started.add(session);
			return;
		}
		let tokens: unknown;
		try {
			const meter = sink.meter();
			if (meter === undefined) return;
			read.add(session);
			tokens = (meter.measure(session) as { surfaceTokens?: unknown } | null | undefined)?.surfaceTokens;
		} catch (cause) {
			read.add(session);
			emit(() => sink.warn(`noogenesis token baseline unavailable (${cause instanceof Error ? cause.message : String(cause)}); observation skipped`));
			return;
		}
		if (typeof tokens !== "number") {
			emit(() => sink.warn(`noogenesis token baseline shape mismatch (surfaceTokens=${typeof tokens}); host token-meter drift, observation skipped`));
			return;
		}
		emit(() => sink.report(`noogenesis token baseline reading: surfaceTokens=${tokens} (whole hosted surface, host heuristic estimate; observation only)`));
	};
}
