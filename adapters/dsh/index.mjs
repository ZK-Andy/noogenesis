/**
 * index.mjs — 插件入口（cordis 装载契约：name / inject / apply）。
 * 宿主运行时依赖收敛：唯一 import @deepseek-ai/dsh-tools（defineTool，经
 * 依赖注入进 tools.mjs）；其余模块零宿主依赖，adapters/dsh/selftest.mjs 可
 * 脱离 DSH 直测（防火墙规则 2；selftest 机器扫描本目录 import 面强制）。
 * inject 不含 userQuestions——提问是可选能力，disposal 时对 ctx.userQuestions
 * 懒取用（cordis 对缺席的注入服务会推迟整个插件装载，声明注入反而让
 * 「提问面缺席 → 只提醒」降级不可达）。
 *
 * 配置面（8 字段 + 缺省 + 失败模式）单一事实源：./README.md「配置」表；
 * 校验实现在 ./config.mjs（fail-closed，selftest 直测）。
 */
import { defineTool } from "@deepseek-ai/dsh-tools";
import { runEngine, runEngineSync, resolveRepoRoot, sessionWorkspaceOf } from "./engine-bridge.mjs";
import { registerNooTools } from "./tools.mjs";
import { BASE_SECTION, hitsSectionText } from "./section.mjs";
import { runSolidifyTrigger, listStagingCandidates, createInFlightGate, ASK_TIMEOUT_MS } from "./solidify-trigger.mjs";
import { pullBankOnce } from "./bank-pull.mjs";
import { registerBankSkills } from "./skill-provider.mjs";
import { validateConfig } from "./config.mjs";

export const name = "noogenesis";

export const inject = ["tools", "systemPrompt"];

/**
 * userQuestions 封装：disposal 时懒取用（缺席/不可用 → null → 降级只提醒）。
 * ask 兜底 ASK_TIMEOUT_MS——应答方半存活时 ask 可能永久挂起（emitDisposed
 * 不 await listener promise，挂起不阻塞关停但闭包驻留），超时按"仅提醒"处理；
 * 迟到的真实回答被丢弃，提醒文案里已带可手跑的精确命令。
 */
function askFactory(ctx) {
	return async (candidates) => {
		const userQuestions = ctx.userQuestions;
		if (!userQuestions) return null;
		let timer;
		const timeout = new Promise((resolve) => {
			timer = setTimeout(() => resolve(null), ASK_TIMEOUT_MS);
			if (timer.unref) timer.unref();
		});
		try {
			const answer = await Promise.race([
				userQuestions.ask({
					questions: [
						{
							id: "noo-solidify",
							question: `Noogenesis: ${candidates.length} staged gene candidate(s) await solidify (write path). Archive now?`,
							options: [
								{ label: "Archive now" },
								{ label: "Remind only" },
							],
						},
					],
				}),
				timeout,
			]);
			if (!answer) return null;
			const item = answer.answers?.find((entry) => entry.id === "noo-solidify");
			return item?.selected?.includes("Archive now") ? "archive" : "later";
		} catch (cause) {
			ctx.logger("noogenesis").warn(`noo-solidify ask unavailable (${cause instanceof Error ? cause.message : String(cause)}); falling back to notice`);
			return null;
		} finally {
			clearTimeout(timer);
		}
	};
}

export function apply(ctx, config = {}) {
	const cfg = validateConfig(config);
	const repoRoot = resolveRepoRoot(cfg);
	const logger = ctx.logger("noogenesis");

	// 逐次解析（部署收口 ADR 2026-09-06-adapter-deploy-hardening）：工具体吃
	// exec.agent 的会话工作区走四级回退链——多 agent 异仓各归各仓；无会话
	// 上下文的调用面（如 selftest 静态注入）退化为入口静态锚定。
	const repoRootFor = (exec) => resolveRepoRoot(cfg, sessionWorkspaceOf(exec));

	ctx.provide("noogenesis", { repoRoot, runEngine });

	// 技能随库分发（skills-ride-bank ADR）：provider 读 genes-cache/.agents/skills，
	// rank 600（用户/项目同名可遮蔽）；宿主 skills 面缺席/注册失败 → 内部 warn
	// 降级不阻塞装载。invalidate 钩子必须在 pull 块之前取得——pull 成功落地后
	// bump 宿主 catalog revision，pull 前已被 list 过的 cwd 无需重启即重发现技能面。
	const bankSkills = registerBankSkills(ctx, { config: cfg, logger });

	// P2 只读消费（D7 + bank-pull.mjs 头注）：geneBankUrl 在场 → 装载时惰性
	// pull 一次，失败仅 warn 降级离线，绝不阻塞会话；成功 → 技能面缓存失效刷新。
	if (cfg.geneBankUrl) {
		pullBankOnce({ repoRoot, url: cfg.geneBankUrl, runEngine, logger })
			.then((result) => {
				if (result.pulled) bankSkills.invalidate();
			})
			.catch((cause) => {
				logger.warn(`noogenesis bank pull crashed: ${cause instanceof Error ? cause.message : String(cause)}`);
			});
	}

	ctx.systemPrompt.section({ name: "tool:noogenesis", order: cfg.sectionOrder, text: BASE_SECTION });
	ctx.systemPrompt.section({
		name: "tool:noogenesis:hits",
		order: cfg.sectionOrder + 1,
		// 空 injectSignals 短路：未声明信号就不喂引擎（select 空键必 exit 2，
		// 纯浪费一子进程/每次 prompt 组装）。
		text: () => (cfg.injectSignals.length ? hitsSectionText(runEngineSync(["select", ...cfg.injectSignals], { repoRoot }), { maxGenes: cfg.maxIndexGenes }) : ""),
	});

	registerNooTools(ctx, { defineTool, runEngine, repoRoot: repoRootFor });

	// 写路径唯一触发点：agent/disposed。repoRoot 按 dispose 的那个 agent 逐次
	// 解析（payload 携带 { agent }，与 auto 触发面同款实证）——异仓会话各归
	// 各仓；in-flight 去重逐仓隔离：同仓近同时 dispose 不重复弹问/重复入档
	// （重复跑会把已入档候选撞成 exit 2 假失败），异仓互不阻塞（ask 窗口可达
	// 5 分钟，全局旗标会把异仓提示静默丢掉）。
	const solidifyGate = createInFlightGate();
	ctx.on("agent/disposed", (payload) => {
		const disposalRepoRoot = resolveRepoRoot(cfg, sessionWorkspaceOf(payload));
		if (!solidifyGate.acquire(disposalRepoRoot)) return;
		let candidates;
		try {
			candidates = listStagingCandidates(disposalRepoRoot, cfg.stagingDir);
		} catch (cause) {
			// staging 扫描同步抛错（readdirSync EACCES 等）：释放该仓闸 + warn 留痕
			// （降级纪律），绝不把该仓写路径永久静音。
			solidifyGate.release(disposalRepoRoot);
			logger.warn(`noogenesis solidify staging scan failed for ${disposalRepoRoot}: ${cause instanceof Error ? cause.message : String(cause)}`);
			return;
		}
		if (!candidates.length) {
			solidifyGate.release(disposalRepoRoot);
			return;
		}
		runSolidifyTrigger({
			repoRoot: disposalRepoRoot,
			stagingDir: cfg.stagingDir,
			actor: cfg.actor,
			candidates,
			logger,
			ask: cfg.askOnDispose ? askFactory(ctx) : null,
			runEngine,
		}).catch((cause) => {
			logger.warn(`noogenesis solidify trigger failed: ${cause instanceof Error ? cause.message : String(cause)}`);
		}).finally(() => {
			solidifyGate.release(disposalRepoRoot);
		});
	});

	logger.info(`noogenesis wired (repoRoot=${repoRoot}, injectSignals=${cfg.injectSignals.length}, stagingDir=${cfg.stagingDir})`);
}
