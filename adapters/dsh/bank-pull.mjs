/**
 * bank-pull.mjs — 基因库只读消费的触发体（P2 ADR D2/D4 + D7：惰性 pull 一次，
 * 失败仅 warn 降级离线；触发点修正 bug-fix ADR 2026-09-06-bank-pull-session-trigger）。
 * 引擎侧执行真正的 clone/pull（engine/bin.js pull，spawn 单合同不变，缓存 =
 * <repoRoot>/.noogenesis/genes-cache）；本模块只管"何时触发一次"。核心函数零宿主
 * 依赖（selftest 直测）。
 */
import { EXIT, resolveRepoRoot, sessionWorkspaceOf, explicitRepoRootOf } from "./engine-bridge.mjs";
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

/**
 * 两路径触发调度（bug-fix ADR D1）：装载期只在 repoRoot **显式可知**（config/env，
 * explicitRepoRootOf——绝不落 cwd 兜底）时 pull；否则等首个 agent/created，以
 * 会话工作区锚定（缺席即跳过，同样不落 cwd 兜底）。gate 跨两路径共享——每实例
 * 每仓至多一次；pull 成功即回调 onPulled（宿主技能缓存 invalidate，index.mjs 接线）。
 * 返回 pulled/reason 报告对象，绝不抛（runEngine 自身异常由调用方 .catch 兜底）。
 */
export function createBankPullScheduler({ config = {}, runEngine, logger, gate = createInFlightGate(), onPulled } = {}) {
	const url = config.geneBankUrl;
	const pullAt = async (repoRoot) => {
		const r = await pullBankOnce({ repoRoot, url, runEngine, logger, gate });
		if (r.pulled) onPulled?.();
		return r;
	};
	return {
		enabled: Boolean(url),
		async pullAtLoad() {
			if (!url) return { pulled: false, reason: "disabled" };
			const root = explicitRepoRootOf(config);
			if (!root) return { pulled: false, reason: "repoRoot unknown at load" };
			return pullAt(root);
		},
		async pullForSession(agentCarrier) {
			if (!url) return { pulled: false, reason: "disabled" };
			const sessionCwd = sessionWorkspaceOf(agentCarrier);
			if (!sessionCwd) return { pulled: false, reason: "no session workspace" };
			return pullAt(resolveRepoRoot(config, sessionCwd));
		},
	};
}
