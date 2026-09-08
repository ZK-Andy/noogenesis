/**
 * index.mts — 插件入口（cordis 装载契约：name / inject / apply）。
 * 宿主运行时依赖收敛：@deepseek-ai/dsh-tools（defineTool，经依赖注入进
 * tools.mts）+ @deepseek-ai/dsh-llm（createUserMessage——注入消息的冻结/id/
 * source 形态是宿主合同，B4 ADR Decision 2），其余模块零宿主依赖，
 * adapters/dsh/selftest.mts 可脱离 DSH 直测（防火墙规则 2；selftest 机器
 * 扫描本目录 import 面强制）。
 * inject 不含 userQuestions——提问是可选能力，disposal 时对 ctx.userQuestions
 * 懒取用（cordis 对缺席的注入服务会推迟整个插件装载，声明注入反而让
 * 「提问面缺席 → 只提醒」降级不可达）。
 *
 * 配置面（8 字段 + 缺省 + 失败模式）单一事实源：./README.md「配置」表；
 * 校验实现在 ./config.mts（fail-closed，selftest 直测）。
 */
import { defineTool } from "@deepseek-ai/dsh-tools";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { runEngine, runEngineSync, resolveRepoRoot, sessionWorkspaceOf } from "./engine-bridge.mjs";
import type { AgentCarrier } from "./engine-bridge.mjs";
import { registerNooTools } from "./tools.mjs";
import type { ToolHost } from "./tools.mjs";
import { BASE_SECTION, hitsSectionText } from "./section.mjs";
import { runSolidifyTrigger, listStagingCandidates, createInFlightGate, ASK_TIMEOUT_MS } from "./solidify-trigger.mjs";
import { createBankPullScheduler } from "./bank-pull.mjs";
import { registerBankSkills } from "./skill-provider.mjs";
import { validateConfig } from "./config.mjs";
import { mergePreStep, mergeSessionStart, mergeToolPost, mergeToolPre } from "./mount.mjs";
import type { PreStepPayload, SessionStartPayload, ToolExecLike, ToolResultLike } from "./mount.mjs";
import { createMountPolicies } from "./mount-policies.mjs";

export const name = "noogenesis";

export const inject = ["tools", "systemPrompt"];

/** 宿主 ctx 的最小结构面（本模块消费的注入服务；类型为本地窄合同，不引宿主类型）。 */
interface HostContext extends ToolHost {
	logger(name: string): { info: (message: string) => void; warn: (message: string) => void };
	provide(name: string, value: unknown): void;
	on(event: string, listener: (payload: any, ...rest: any[]) => unknown): void;
	systemPrompt: { section(section: { name: string; order: number; text: string | (() => string) }): void };
	userQuestions?: { ask(question: { questions: Array<{ id: string; question: string; options: Array<{ label: string }> }> }): Promise<any> };
}

/** solidify 问答宿主决策（archive = 入档；later/null = 只提醒）。 */
type AskDecision = "archive" | "later" | null;

/** 注入消息 source 标签（hooks-claude-code 同款形态：kind plugin + 插件名）。 */
const PLUGIN_SOURCE = { kind: "plugin", plugin: "noogenesis" } as const;

/**
 * 建议档消息构造（A2 追加 / A4 附加上下文 / A5 会话开始注入共用）：
 * createUserMessage（宿主工厂）+ 多行合一条消息（多行多消息会放大模型面
 * 噪音；单条多 text part 与 hooks 桥 contextFrom 同形态）。
 */
function adviceMessage(lines: string[]): unknown {
	return createUserMessage({
		content: lines.map((text) => ({ type: "text" as const, text })),
		source: PLUGIN_SOURCE,
	});
}

/**
 * userQuestions 封装：disposal 时懒取用（缺席/不可用 → null → 降级只提醒）。
 * ask 兜底 ASK_TIMEOUT_MS——应答方半存活时 ask 可能永久挂起（emitDisposed
 * 不 await listener promise，挂起不阻塞关停但闭包驻留），超时按"仅提醒"处理；
 * 迟到的真实回答被丢弃，提醒文案里已带可手跑的精确命令。
 */
function askFactory(ctx: HostContext): (candidates: string[]) => Promise<AskDecision> {
	return async (candidates) => {
		const userQuestions = ctx.userQuestions;
		if (!userQuestions) return null;
		let timer: ReturnType<typeof setTimeout> | undefined;
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
			const item = answer.answers?.find((entry: any) => entry.id === "noo-solidify");
			return item?.selected?.includes("Archive now") ? "archive" : "later";
		} catch (cause) {
			ctx.logger("noogenesis").warn(`noo-solidify ask unavailable (${cause instanceof Error ? cause.message : String(cause)}); falling back to notice`);
			return null;
		} finally {
			clearTimeout(timer);
		}
	};
}

/**
 * 插件入口（cordis apply 合同）：装载时校验配置并接线全部注册面；config 违约抛
 * Error（fail-closed，不半启用）。
 */
export function apply(ctx: HostContext, config: unknown = {}): void {
	const cfg = validateConfig(config);
	const repoRoot = resolveRepoRoot(cfg);
	const logger = ctx.logger("noogenesis");

	// 逐次解析（部署收口 ADR 2026-09-06-adapter-deploy-hardening）：工具体吃
	// exec.agent 的会话工作区走四级回退链——多 agent 异仓各归各仓；无会话
	// 上下文的调用面（如 selftest 静态注入）退化为入口静态锚定。
	const repoRootFor = (exec?: AgentCarrier | null) => resolveRepoRoot(cfg, sessionWorkspaceOf(exec));

	ctx.provide("noogenesis", { repoRoot, runEngine });

	// 技能随库分发（skills-ride-bank ADR）：provider 读 genes-cache/.agents/skills，
	// rank 600（用户/项目同名可遮蔽）；宿主 skills 面缺席/注册失败 → 内部 warn
	// 降级不阻塞装载。invalidate 钩子必须在 pull 块之前取得——pull 成功落地后
	// bump 宿主 catalog revision，pull 前已被 list 过的 cwd 无需重启即重发现技能面。
	const bankSkills = registerBankSkills(ctx, { config: cfg, logger });

	// P2 只读消费 + 触发点修正（D7 + bank-pull.mts 头注）：geneBankUrl 缺省官方库
	// （false 显式禁用）。装载期 repoRoot 显式可知（config/env）→ 装载触发；否则
	// 首个 agent/created 以会话工作区锚定触发（缺席跳过，绝不落 cwd 兜底）。闸跨
	// 两路径共享——每实例每仓至多一次；失败仅 warn 降级离线，绝不阻塞会话；成功 →
	// 技能面缓存失效刷新。
	const bankPull = createBankPullScheduler({ config: cfg, runEngine, logger, onPulled: bankSkills.invalidate });
	const onCrash = (cause: unknown) => {
		logger.warn(`noogenesis bank pull crashed: ${cause instanceof Error ? cause.message : String(cause)}`);
	};
	bankPull.pullAtLoad().catch(onCrash);
	ctx.on("agent/created", (payload) => {
		bankPull.pullForSession(payload).catch(onCrash);
	});

	ctx.systemPrompt.section({ name: "tool:noogenesis", order: cfg.sectionOrder, text: BASE_SECTION });
	ctx.systemPrompt.section({
		name: "tool:noogenesis:hits",
		order: cfg.sectionOrder + 1,
		// 空 injectSignals 短路：未声明信号就不喂引擎（select 空键必 exit 2，
		// 纯浪费一子进程/每次 prompt 组装）。
		text: () => (cfg.injectSignals.length ? hitsSectionText(runEngineSync(["select", ...cfg.injectSignals], { repoRoot }), { maxGenes: cfg.maxIndexGenes }) : ""),
	});

	registerNooTools(ctx, { defineTool, runEngine, repoRoot: repoRootFor });

	// ── 挂载面接线（B4 ADR Decision 1–2 + Decision 7 档位纪律：能力层
	// mount.mts 合并器 + 策略层 mount-policies.mts；首批全部建议档——记录档
	// 面已随撤除批退役（撤除 ADR），零阻断路径——A3/A4 的 deny/block 能力
	// 由合并器单源承载，首批策略件不使用）。每挂载点恰一个 ctx.on
	// listener，策略件增挂只动 mount-policies.mts，不复制宿主接线；logger
	// 透传给策略层降级提示（A4 写码反馈缺 lint 基建时每会话至多一条 warn）。 ──
	const mounts = createMountPolicies(cfg, { warn: (message) => logger.warn(message) });

	// A5 会话开始时刻（agent/session-start，hooks 桥四类时刻的会话开始位）：
	// 非阻塞 inject 能力；异常 catch → warn 降级（hook-protocol 非阻断语义）。
	ctx.on("agent/session-start", (payload: SessionStartPayload) => {
		try {
			const lines = mergeSessionStart(mounts.sessionStart, payload);
			if (lines.length && payload.agent?.inject) payload.agent.inject(adviceMessage(lines));
		} catch (cause) {
			logger.warn(`noogenesis session-start mount failed: ${cause instanceof Error ? cause.message : String(cause)}`);
		}
	});

	// A2 一步前（agent/pre-step waterfall）：透传 → 合并策略决策；reject 档
	// 由合并器单源承载（首批不用）；建议行合一条消息追加到 enter messages。
	// 合并/消息构造异常 → warn 降级返回 downstream（降级纪律：绝不阻塞一步）。
	ctx.on("agent/pre-step", async (payload: PreStepPayload, next: () => Promise<{ kind: string; messages?: unknown[] }>) => {
		const downstream = await next();
		if (downstream.kind === "reject") return downstream;
		try {
			const merged = mergePreStep(mounts.preStep, payload);
			if (merged.reject !== undefined) return { kind: "reject" };
			if (downstream.kind !== "enter" || merged.advice.length === 0) return downstream;
			return { ...downstream, messages: [...(downstream.messages ?? []), adviceMessage(merged.advice)] };
		} catch (cause) {
			logger.warn(`noogenesis pre-step mount failed: ${cause instanceof Error ? cause.message : String(cause)}`);
			return downstream;
		}
	});

	// A3 工具前（tools/pre-execute waterfall）：deny/ask 决策由合并器单源承载
	// （首批策略件零使用）；无策略决策 → next() 透传。合并异常 → warn 降级
	// 仍达 next()（降级纪律：合并失败不得意外阻断工具调用）。
	ctx.on("tools/pre-execute", async (exec: ToolExecLike, next: () => Promise<unknown>) => {
		let merged;
		try {
			merged = mergeToolPre(mounts.toolPre, exec);
		} catch (cause) {
			logger.warn(`noogenesis tool-pre mount failed: ${cause instanceof Error ? cause.message : String(cause)}`);
			return next();
		}
		if (merged.deny !== undefined) return { kind: "deny", reason: merged.deny };
		if (merged.ask !== undefined) return { kind: "ask", ...(merged.ask ? { reason: merged.ask } : {}) };
		return next();
	});

	// A4 工具后（tools/post-execute waterfall）：block/附加上下文由合并器单源
	// 承载（现存策略件用 context 档，block 能力位零使用）；上下文行合一条消息前置。
	// 合并异常 → warn 降级返回下游结果。
	ctx.on("tools/post-execute", async (exec: ToolExecLike, result: ToolResultLike, next: () => Promise<{ kind: string; additionalContexts?: unknown[] }>) => {
		let merged;
		try {
			merged = mergeToolPost(mounts.toolPost, exec, result);
		} catch (cause) {
			logger.warn(`noogenesis tool-post mount failed: ${cause instanceof Error ? cause.message : String(cause)}`);
			return next();
		}
		if (merged.block !== undefined) return { kind: "block", feedback: [{ type: "text", text: merged.block }] };
		const downstream = await next();
		if (merged.context.length === 0) return downstream;
		return { ...downstream, additionalContexts: [adviceMessage(merged.context), ...(downstream.additionalContexts ?? [])] };
	});

	// 挂载面 A6/A8 记录投影已撤（ADR 2026-09-08-a8-session-record-projection-removal：
	// 宿主读路径对未标 ignorable 的下游插件事件类型 fail-closed，Session.append
	// 无 ignorable 写入口）；存留挂载面 = A2/A3/A4/A5 四点 + 挂载点各自降级。

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
