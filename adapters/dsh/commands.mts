/**
 * commands.mts — /evolve 命令面（批次 9 序 44 命令面 ADR）：宿主命令注册的
 * 能力层。零宿主依赖——CommandDefinition / CommandInvocation / CommandResult
 * 全部是本地窄合同（形状对齐 @deepseek-ai/dsh-commands 真实源码核准面，
 * selftest 可假件全路径驱动）；动词 dispatch 退出码三档语义与 tools.mts 同
 * 映射：0 = 结果文本，1 = 红是结论（文本返回不抛），2 = 环境性失败抛错（宿主
 * 把抛错 settle 成 kind: 'error'）。
 * 三动词：list（只读盘点 = 引擎 list + staging 面）/ verify <domain>/<id>
 * （evaluate 全集在用户位）/ wrapup（会话边界 solidify 的人工入口——既有
 * runSolidifyTrigger 的命令位复用，共享同一 in-flight 闸与 ask 面）。
 * consolidate 与 benchmark 已判不立（命令面 ADR D3/D4），不进 dispatch。
 */
import { listStagingCandidates, runSolidifyTrigger } from "./solidify-trigger.mjs";
import type { EngineRunner, AgentCarrier } from "./engine-bridge.mjs";

/** 与宿主 @deepseek-ai/dsh-commands 合同对齐的本地窄结果面。 */
export type EvolveCommandResult = { kind: "success"; text?: string } | { kind: "error"; text: string };

/** 宿主命令 registry 的最小结构面（ctx.get("commands") 懒取用；缺席 = undefined）。 */
export interface CommandRegistryLike {
	register(definition: {
		name: string;
		description: string;
		input?: { hint: string };
		handler(invocation: AgentCarrier & { rawInput: string }): EvolveCommandResult | Promise<EvolveCommandResult>;
	}): unknown;
}

/** 命令面注入集（全依赖注入；提问/日志等宿主交互由调用方注入，缺席各自降级）。 */
export interface EvolveCommandDeps {
	/** 逐调用解析宿主 commands 服务（懒取用口径；undefined = 服务缺席，注册降级）。 */
	getRegistry(): CommandRegistryLike | undefined;
	repoRootOf(carrier?: AgentCarrier | null): string;
	runEngine: EngineRunner;
	stagingDir: string;
	actor: string;
	/** 提问面（会话结束确认的同款封装；null = 缺席降级只提醒）。 */
	ask: ((candidates: string[]) => Promise<"archive" | "later" | null>) | null;
	/** 与 agent/disposed solidify 触发共享的逐仓 in-flight 闸（防双跑撞候选 exit 2）。 */
	gate: { acquire(repoRoot: string): boolean; release(repoRoot: string): void };
	warn(message: string): void;
}

const EVOLVE_NAME = "evolve" as const;

/** /evolve 的帮助文本（单行 usage 表；无入参/未知词报道共用，勿改行序——selftest 金样按序拼行）。 */
export function evolveHelp(): string {
	return [
		"Usage: /evolve [list | verify <domain>/<id> | wrapup]",
		"  list            read-only inventory: genes (cache-marked) / capsules / mutations / staged candidates",
		"  verify <ref>    run gates.json full set on one gene; the report is the verdict (red is a result, not an error)",
		"  wrapup          solidify staged candidates for this repo (same human-approval flow as session end)",
	].join("\n");
}

/** verify 的 ref 形校验（与 tools.mts requireGeneRef 同款正则；形错当结果文本，不抛）。 */
function parseVerifyRef(rawInput: string): { ok: true; ref: string } | { ok: false; text: string } {
	const ref = rawInput.trim();
	if (!/^[a-z0-9]+(-[a-z0-9]+)*\/[a-z0-9]+(-[a-z0-9]+)*$/.test(ref)) {
		return { ok: false, text: "verify needs a gene ref as <domain>/<id> (lowercase kebab)" };
	}
	return { ok: true, ref };
}

/** staging 相对路径行（list 尾段；复用 solidify-trigger 唯一扫描源）。 */
function stagingLines(repoRoot: string, stagingDir: string): string[] {
	return listStagingCandidates(repoRoot, stagingDir).map((candidate) => "staged candidate " + relativeTo(repoRoot, candidate));
}

function relativeTo(repoRoot: string, target: string): string {
	const norm = target.replace(/\\/g, "/");
	const root = repoRoot.replace(/\\/g, "/").replace(/\/+$/, "");
	return norm.startsWith(root + "/") ? norm.slice(root.length + 1) : norm;
}

/**
 * 注册 /evolve（幂等：registry 缺席先 warn 一次并返回未注册；返回的 tryRegister
 * 供入口在 agent/created 时对晚到服务补注册——同 skills 注册的可重试口径）。
 */
export function registerEvolveCommand(deps: EvolveCommandDeps): { registered: boolean; tryRegister(): boolean } {
	let registered = false;
	let warned = false;
	const tryRegister = (): boolean => {
		if (registered) return true;
		const registry = deps.getRegistry();
		if (!registry) {
			if (!warned) {
				warned = true;
				deps.warn("/evolve command surface unavailable: host commands service missing (advisory face only; skipped)");
			}
			return false;
		}
		registry.register({
			name: EVOLVE_NAME,
			description: "Noogenesis evolution state: list genes, verify one gene against gates, wrap up staged candidates",
			input: { hint: "[list | verify <domain>/<id> | wrapup]" },
			handler: (invocation) => handleEvolveCommand(invocation, deps),
		});
		registered = true;
		return true;
	};
	return { registered: tryRegister(), tryRegister };
}

/** 动词 dispatch（拆出供 selftest 直测；抛错路径只覆盖引擎 fail-closed，宿主 settle error）。invocation 整体即 carrier 形状（整体带 .agent，sessionWorkspaceOf 同款）。 */
export async function handleEvolveCommand(invocation: AgentCarrier & { rawInput: string }, deps: EvolveCommandDeps): Promise<EvolveCommandResult> {
	const trimmed = invocation.rawInput.trim();
	const verb = trimmed.split(/\s+/)[0] ?? "";
	const rest = trimmed.slice(verb.length).trim();
	const repoRoot = deps.repoRootOf(invocation);

	if (verb === "" || verb === "help") {
		return { kind: "success", text: evolveHelp() };
	}

	if (verb === "list") {
		const result = await deps.runEngine(["list"], { repoRoot });
		if (result.code === 2) throw new Error(`/evolve list: engine fail-closed (exit 2) — ${(result.stderr || result.stdout || "").trim()}`);
		return { kind: "success", text: [result.stdout.trimEnd(), ...stagingLines(repoRoot, deps.stagingDir)].join("\n") + "\n" };
	}

	if (verb === "verify") {
		const parsed = parseVerifyRef(rest);
		if (!parsed.ok) return { kind: "error", text: parsed.text };
		const result = await deps.runEngine(["evaluate", parsed.ref], { repoRoot });
		if (result.code === 2) throw new Error(`/evolve verify: engine fail-closed (exit 2) — ${(result.stderr || result.stdout || "").trim()}`);
		const verdict = result.code === 0 ? "GREEN" : "RED";
		const body = result.stdout.trim() || (result.stderr || "").trim();
		return { kind: "success", text: `/evolve verify ${parsed.ref} -> ${verdict}\n${body}\n` };
	}

	if (verb === "wrapup") {
		if (!deps.gate.acquire(repoRoot)) return { kind: "error", text: "/evolve wrapup: a solidify flow is already in flight for this repo" };
		try {
			const candidates = listStagingCandidates(repoRoot, deps.stagingDir);
			if (!candidates.length) {
				return { kind: "success", text: `/evolve wrapup: no staged candidates in ${deps.stagingDir}/ for this repo\n` };
			}
			const notice = [
				`/evolve wrapup: ${candidates.length} staged candidate(s) await solidify (human-approved write path):`,
				...candidates.map((candidate) => `  ${relativeTo(repoRoot, candidate)}`),
			].join("\n") + "\n";
			const outcome = await runSolidifyTrigger({
				repoRoot,
				stagingDir: deps.stagingDir,
				actor: deps.actor,
				candidates,
				logger: {
					info: (message) => void message,
					warn: (message) => deps.warn(message),
				},
				ask: deps.ask,
				runEngine: deps.runEngine,
			});
			return {
				kind: "success",
				text: notice + (outcome.approved
					? `/evolve wrapup: archived ${outcome.archived.length}; failed ${outcome.failed.length}\n`
					: `/evolve wrapup: not approved (ask ${outcome.asked ? "answered later" : "unavailable or dismissed"}; notice stands)\n`),
			};
		} finally {
			deps.gate.release(repoRoot);
		}
	}

	return { kind: "error", text: `/evolve: unknown verb "${verb}"\n${evolveHelp()}` };
}
