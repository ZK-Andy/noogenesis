/**
 * token-baseline.mts — 常驻注入面的宿主读数（观察面，非门槛；护栏建设轮
 * ADR 2026-09-13-guardrail-construction-round 决定 1 建议行）。
 *
 * 接线点 = `agent/pre-step`（index.mts 复用既有 A2 listener，不新增宿主
 * listener）；读数按会话至多一次——键 = 宿主 session 对象（WeakSet，GC 自清），
 * 且宿主服务缺席时**不消耗**该会话的读数预算（服务晚挂载仍可读到）。
 *
 * 降级纪律（与其余挂载面同款）：`ctx.tokenMeter` 缺席 → 静默不发行；`measure`
 * 抛错或返回值无 `surfaceTokens` 数值 → 每会话至多一条 warn（本件保证），绝不
 * 抛出、绝不阻塞一步。宿主 API 漂移的可见通道 = 该 warn；类型契约断言要引入
 * 跨代宿主依赖（断言面与运行面不同源），未立——取舍与触发条见 ADR 勘误。
 *
 * 读数口径：`measure(session)` 的 `surfaceTokens` 是**整条 hosted system 面**的
 * 启发式估值（含宿主 persona 与 AGENTS.md 注入），不是本插件注入面的真值——
 * 本行留痕供观察，不进任何判据。
 *
 * 本模块零宿主依赖（防火墙规则 2；`selftest.mts` 机器扫描 import 面）。
 */

/** 宿主 `ctx.tokenMeter` 的最小结构面（本层消费面 = `measure` 的 `surfaceTokens`）。 */
export interface TokenMeterLike {
	measure(session: unknown, requestHeader?: unknown): unknown;
}

/** 读数发行面（index.mts 注入宿主服务读法与 logger；selftest 注入收集器）。 */
export interface TokenBaselineSink {
	/** 懒取宿主服务：缺席返回 `undefined`（服务晚到也能取到，不进 `inject` 声明）。 */
	meter(): TokenMeterLike | undefined;
	/** 读数留痕（每会话至多一行，调用方按体量给 info 档）。 */
	report(line: string): void;
	/** 降级提示（`measure` 抛错 / 返回值形状不符；每会话至多一条）。 */
	warn(message: string): void;
}

/**
 * 构造常驻注入面读数发射器：返回值为 `agent/pre-step` 的每次调用入口形参
 * （宿主 session 对象），同一会话重复出现只读一次；无会话对象静默跳过。
 * 注入的 `report` / `warn` 按本仓 logger 透传惯例视为不抛（同 index.mts 各
 * 挂载点降级面）。
 */
export function createTokenBaselineReading(sink: TokenBaselineSink): (session: unknown) => void {
	const read = new WeakSet<object>();
	return (session) => {
		if (typeof session !== "object" || session === null || read.has(session)) return;
		let tokens: unknown;
		try {
			const meter = sink.meter();
			if (meter === undefined) return;
			read.add(session);
			tokens = (meter.measure(session) as { surfaceTokens?: unknown } | null | undefined)?.surfaceTokens;
		} catch (cause) {
			sink.warn(`noogenesis token baseline unavailable (${cause instanceof Error ? cause.message : String(cause)}); observation skipped`);
			return;
		}
		if (typeof tokens !== "number") {
			sink.warn(`noogenesis token baseline shape mismatch (surfaceTokens=${typeof tokens}); host token-meter drift, observation skipped`);
			return;
		}
		sink.report(`noogenesis token baseline reading: surfaceTokens=${tokens} (whole hosted surface, host heuristic estimate; observation only)`);
	};
}
