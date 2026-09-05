/**
 * bank-pull.mjs — 基因库只读消费的触发体（P2 ADR 2026-09-06-p2-shared-consumer
 * D2/D4 + 实现轮拍板 C：adapter 惰性 pull）。
 *
 * 引擎侧执行真正的 clone/pull（engine/bin.js pull，spawn 单合同不变，缓存 =
 * <repoRoot>/.noogenesis/genes-cache）；本模块只管"何时触发一次"：
 * config.geneBankUrl 在场 → 插件装载时惰性拉取一次（逐仓 in-flight 去重）。
 * 失败仅 warn 降级离线（select/propose 行为与无缓存完全一致），绝不阻塞会话
 * ——拉取是便利面不是正确性面（D2 只读消费，本仓基因始终在场）。
 * 核心函数零宿主依赖（selftest 直测）；runEngine/logger 由调用方注入。
 */
import { EXIT } from "./engine-bridge.mjs";

/** 引擎 pull 参数（结构化数组直传；缓存目录用引擎缺省，不双写路径事实）。 */
export function buildPullArgs(url) {
	return ["pull", url];
}

/**
 * 逐仓 in-flight 闸（与 solidify 触发体同形）：同一仓根并发只放行一次。
 * 与 solidify 闸分开实例化——两个触发体生命周期不同（pull 每插件实例一次，
 * solidify 每 dispose 一次），共享闸会互相吞触发。
 */
export function createBankGate() {
	const inFlight = new Set();
	return {
		acquire(repoRoot) {
			if (inFlight.has(repoRoot)) return false;
			inFlight.add(repoRoot);
			return true;
		},
		release(repoRoot) {
			inFlight.delete(repoRoot);
		},
	};
}

/**
 * 惰性拉取一次：acquire 失败 = 已有在途拉取，直接跳过。拉取完成后**不释放**
 * 该仓闸——每插件实例每仓至多一次 pull（刷新由人重跑 pull 命令或重启会话）。
 * 引擎失败（红/fail-closed）→ warn 降级离线；runEngine 自身的异常由调用方的
 * .catch 兜底（本函数只保证"不因拉取挂掉会话"到引擎合同边界为止）。
 */
export async function pullBankOnce({ repoRoot, url, runEngine, logger, gate = createBankGate(), timeoutMs }) {
	if (!gate.acquire(repoRoot)) return { pulled: false, reason: "in-flight" };
	const r = await runEngine(buildPullArgs(url), { repoRoot, timeoutMs });
	if (r.code === EXIT.OK) {
		logger.info(`noogenesis bank pulled: ${r.stdout.trim().split("\n").join(" | ")}`);
		return { pulled: true };
	}
	logger.warn(`noogenesis bank pull failed (exit ${r.code}); continuing offline: ${r.stderr.trim() || r.stdout.trim() || "(no output)"}`);
	return { pulled: false, reason: `exit ${r.code}` };
}
