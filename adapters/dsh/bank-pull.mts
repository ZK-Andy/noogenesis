/**
 * bank-pull.mts — 基因库只读消费的触发体（P2 ADR D2/D4 + D7：惰性 pull 一次，
 * 失败仅 warn 降级离线；触发点修正 bug-fix ADR 2026-09-06-bank-pull-session-trigger）。
 * 引擎侧执行真正的 clone/pull（dist/engine/bin.js pull，spawn 单合同不变，缓存 =
 * <repoRoot>/.noogenesis/genes-cache）；本模块只管"何时触发一次"。核心函数零宿主
 * 依赖（selftest 直测）。
 */
import { EXIT, resolveRepoRoot, sessionWorkspaceOf, explicitRepoRootOf } from "./engine-bridge.mjs";
import type { EngineResult, EngineRunner, AgentCarrier } from "./engine-bridge.mjs";
import { createInFlightGate } from "./solidify-trigger.mjs";
import type { InFlightGate, TriggerLogger } from "./solidify-trigger.mjs";

/** 引擎 pull 参数（结构化数组直传；缓存目录用引擎缺省，不双写路径事实）。 */
export function buildPullArgs(url: string): string[] {
	return ["pull", url];
}

/**
 * 惰性拉取一次：acquire 失败 = 已有在途拉取或该仓已拉过，直接跳过（独立实例——
 * 与 solidify 闸生命周期不同，共享会互吞触发）。拉取完成后**不释放**该仓闸——
 * 每插件实例每仓至多一次 pull（刷新由人重跑 pull 命令或重启会话）。引擎失败（红/
 * fail-closed）→ warn 降级离线；runEngine 自身的异常由调用方的 .catch 兜底。
 */
export async function pullBankOnce({ repoRoot, url, runEngine, logger, gate = createInFlightGate(), timeoutMs }: {
	repoRoot: string;
	url: string;
	runEngine: EngineRunner;
	logger: TriggerLogger;
	gate?: InFlightGate;
	timeoutMs?: number;
}): Promise<{ pulled: boolean; reason?: string }> {
	if (!gate.acquire(repoRoot)) return { pulled: false, reason: "in-flight" };
	const r: EngineResult = await runEngine(buildPullArgs(url), { repoRoot, timeoutMs });
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
 * 会话工作区锚定（缺席即跳过，同样不落 cwd 兜底）。两路径共享同一闸与 url
 * （闸/降级/一次性契约见 pullBankOnce 注）；传给 pullAt 的根一律先过
 * resolveRepoRoot 归一化——两路径闸键同空间（相对 repoRoot 不按宿主 cwd 解析）。
 * geneBankUrl 为 false（显式禁用）→ 不 spawn 引擎。pull 成功即回调 onPulled
 * （宿主技能缓存 invalidate，index.mjs 接线）。
 */
export function createBankPullScheduler({ config = {}, runEngine, logger, gate = createInFlightGate(), onPulled }: {
	config?: { repoRoot?: string; geneBankUrl?: string | false };
	runEngine: EngineRunner;
	logger: TriggerLogger;
	gate?: InFlightGate;
	onPulled?: () => void;
} = {} as never) {
	// 缺省 `{}` 仅在零参调用时生效；生产/selftest 均恒传完整注入面。
	const url = config.geneBankUrl;
	const pullAt = async (repoRoot: string): Promise<{ pulled: boolean; reason?: string }> => {
		if (!url) return { pulled: false, reason: "disabled" };
		const r = await pullBankOnce({ repoRoot, url, runEngine, logger, gate });
		if (r.pulled) onPulled?.();
		return r;
	};
	return {
		async pullAtLoad(): Promise<{ pulled: boolean; reason?: string }> {
			if (!explicitRepoRootOf(config)) return { pulled: false, reason: "repoRoot unknown at load" };
			return pullAt(resolveRepoRoot(config));
		},
		async pullForSession(agentCarrier?: AgentCarrier | null): Promise<{ pulled: boolean; reason?: string }> {
			const sessionCwd = sessionWorkspaceOf(agentCarrier);
			if (!sessionCwd) return { pulled: false, reason: "no session workspace" };
			return pullAt(resolveRepoRoot(config, sessionCwd));
		},
	};
}
