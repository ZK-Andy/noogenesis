/**
 * bank-pull.mjs — 基因库只读消费的触发体（P2 ADR D2/D4 + D7：adapter 惰性
 * pull 一次，失败仅 warn 降级离线）。引擎侧执行真正的 clone/pull（engine/bin.js
 * pull，spawn 单合同不变，缓存 = <repoRoot>/.noogenesis/genes-cache）；本模块
 * 只管"何时触发一次"。核心函数零宿主依赖（selftest 直测）。
 */
import { EXIT } from "./engine-bridge.mjs";
import { createInFlightGate } from "./solidify-trigger.mjs";

/** 引擎 pull 参数（结构化数组直传；缓存目录用引擎缺省，不双写路径事实）。 */
export function buildPullArgs(url) {
	return ["pull", url];
}

/**
 * 惰性拉取一次：acquire 失败 = 已有在途拉取，直接跳过（独立实例——与 solidify
 * 闸生命周期不同，共享会互吞触发）。拉取完成后**不释放**该仓闸——每插件实例
 * 每仓至多一次 pull（刷新由人重跑 pull 命令或重启会话）。引擎失败（红/
 * fail-closed）→ warn 降级离线；runEngine 自身的异常由调用方的 .catch 兜底。
 */
export async function pullBankOnce({ repoRoot, url, runEngine, logger, gate = createInFlightGate(), timeoutMs }) {
	if (!gate.acquire(repoRoot)) return { pulled: false, reason: "in-flight" };
	const r = await runEngine(buildPullArgs(url), { repoRoot, timeoutMs });
	if (r.code === EXIT.OK) {
		logger.info(`noogenesis bank pulled: ${r.stdout.trim().split("\n").join(" | ")}`);
		return { pulled: true };
	}
	logger.warn(`noogenesis bank pull failed (exit ${r.code}); continuing offline: ${r.stderr.trim() || r.stdout.trim() || "(no output)"}`);
	return { pulled: false, reason: `exit ${r.code}` };
}
