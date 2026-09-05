/**
 * index.mjs — 插件入口（cordis 装载契约：name / inject / apply）。
 * 宿主运行时依赖收敛：唯一 import @deepseek-ai/dsh-tools（defineTool，经
 * 依赖注入进 tools.mjs）；其余模块零宿主依赖，adapters/dsh/selftest.mjs 可
 * 脱离 DSH 直测（防火墙规则 2；selftest 机器扫描本目录 import 面强制）。
 * inject 不含 userQuestions——提问是可选能力，disposal 时对 ctx.userQuestions
 * 懒取用（cordis 对缺席的注入服务会推迟整个插件装载，声明注入反而让
 * 「提问面缺席 → 只提醒」降级不可达）。
 *
 * 配置面（7 字段 + 缺省 + 失败模式）单一事实源：./README.md「配置」表；
 * 校验实现在 ./config.mjs（fail-closed，selftest 直测）。
 */
import { defineTool } from "@deepseek-ai/dsh-tools";
import { runEngine, runEngineSync, resolveRepoRoot } from "./engine-bridge.mjs";
import { registerNooTools } from "./tools.mjs";
import { BASE_SECTION, hitsSectionText } from "./section.mjs";
import { runSolidifyTrigger, listStagingCandidates, ASK_TIMEOUT_MS } from "./solidify-trigger.mjs";
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

	ctx.provide("noogenesis", { repoRoot, runEngine });

	ctx.systemPrompt.section({ name: "tool:noogenesis", order: cfg.sectionOrder, text: BASE_SECTION });
	ctx.systemPrompt.section({
		name: "tool:noogenesis:hits",
		order: cfg.sectionOrder + 1,
		// 空 injectSignals 短路：未声明信号就不喂引擎（select 空键必 exit 2，
		// 纯浪费一子进程/每次 prompt 组装）。
		text: () => (cfg.injectSignals.length ? hitsSectionText(runEngineSync(["select", ...cfg.injectSignals], { repoRoot }), { maxGenes: cfg.maxIndexGenes }) : ""),
	});

	registerNooTools(ctx, { defineTool, runEngine, repoRoot });

	// 写路径唯一触发点：agent/disposed。in-flight 去重——多 agent 近同时
	// dispose 时不重复弹问、不重复跑 solidify（重复跑会把已入档候选撞成
	// exit 2 假失败）。
	let solidifyInFlight = false;
	ctx.on("agent/disposed", () => {
		if (solidifyInFlight) return;
		const candidates = listStagingCandidates(repoRoot, cfg.stagingDir);
		if (!candidates.length) return;
		solidifyInFlight = true;
		runSolidifyTrigger({
			repoRoot,
			stagingDir: cfg.stagingDir,
			actor: cfg.actor,
			candidates,
			logger,
			ask: cfg.askOnDispose ? askFactory(ctx) : null,
			runEngine,
		}).catch((cause) => {
			logger.warn(`noogenesis solidify trigger failed: ${cause instanceof Error ? cause.message : String(cause)}`);
		}).finally(() => {
			solidifyInFlight = false;
		});
	});

	logger.info(`noogenesis wired (repoRoot=${repoRoot}, injectSignals=${cfg.injectSignals.length}, stagingDir=${cfg.stagingDir})`);
}
