/**
 * index.mjs — 插件入口（cordis 装载契约：name / inject / apply；Config 手工
 * 校验 fail-closed，不引 schemastery——宿主依赖收敛面只有 @deepseek-ai/dsh-tools，
 * 经依赖注入进 tools.mjs）。其余模块全部零宿主依赖，adapters/dsh/selftest.mjs
 * 可脱离 DSH 直测（防火墙规则 2；selftest 机器扫描本目录 import 面强制）。
 *
 * 配置（profile patch 里插件 row 的 config 字段；全部可选）：
 * - repoRoot: 目标仓根（引擎与基因库所在）。缺省依次回退 NOGENESIS_REPO_ROOT、
 *   process.cwd()——装在 DSH 侧的插件 ≠ 运行仓，部署时必须显式锚定。
 * - sectionOrder: system-prompt 基座节 order（默认 120；命中节 = +1）。
 * - injectSignals: 常驻命中节的显式信号（默认 [] → 命中节零 token）。
 * - stagingDir: 待入档候选目录（相对 repoRoot，默认 genes-staging）。
 * - askOnDispose: 会话结束发现候选时是否提问人工确认（默认 true）。
 * - actor: solidify --actor 名（默认 noogenesis）。
 * - maxIndexGenes: 命中节行数封顶（默认 12）。
 */
import { defineTool } from "@deepseek-ai/dsh-tools";
import { runEngine, runEngineSync, resolveRepoRoot } from "./engine-bridge.mjs";
import { registerNooTools } from "./tools.mjs";
import { BASE_SECTION, hitsSectionText } from "./section.mjs";
import { runSolidifyTrigger, listStagingCandidates } from "./solidify-trigger.mjs";
import { validateConfig } from "./config.mjs";

export const name = "noogenesis";

export const inject = ["tools", "systemPrompt", "userQuestions"];

/** userQuestions 封装：缺席（无该服务的 profile）返回 null → 降级为只提醒。 */
function askFactory(ctx, repoRoot) {
	if (!ctx.userQuestions) return null;
	return async (candidates) => {
		try {
			const answer = await ctx.userQuestions.ask({
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
			});
			const item = answer.answers?.find((entry) => entry.id === "noo-solidify");
			return item?.selected?.includes("Archive now") ? "archive" : "later";
		} catch (cause) {
			ctx.logger("noogenesis").warn(`noo-solidify ask unavailable (${cause instanceof Error ? cause.message : String(cause)}); falling back to notice`);
			return null;
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
		text: () => hitsSectionText(runEngineSync(["select", ...cfg.injectSignals], { repoRoot }), { maxGenes: cfg.maxIndexGenes }),
	});

	registerNooTools(ctx, { defineTool, runEngine, repoRoot });

	ctx.on("agent/disposed", () => {
		const candidates = listStagingCandidates(repoRoot, cfg.stagingDir);
		if (!candidates.length) return;
		runSolidifyTrigger({
			repoRoot,
			stagingDir: cfg.stagingDir,
			actor: cfg.actor,
			candidates,
			logger,
			ask: cfg.askOnDispose ? askFactory(ctx, repoRoot) : null,
			runEngine,
		}).catch((cause) => {
			logger.warn(`noogenesis solidify trigger failed: ${cause instanceof Error ? cause.message : String(cause)}`);
		});
	});

	logger.info(`noogenesis wired (repoRoot=${repoRoot}, injectSignals=${cfg.injectSignals.length}, stagingDir=${cfg.stagingDir})`);
}
