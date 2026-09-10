/**
 * lint-feedback.mts — A4 写码在环规范拦回（ADR
 * 2026-09-08-lint-in-loop-feedback + 升格 ADR
 * 2026-09-09-lint-block-and-staged-hook）。
 *
 * 写码工具（write/edit）成功后同步跑仓根 oxlint：有诊断 → A4 `block` 拦回
 * （工具结果被替换为纠正消息，模型须修正才能继续）；零诊断 → void（干净
 * 代码零注入）。同文件连续 block 达上限后降级 `context`（违规仍可见、不再
 * 拦，防改不对无限重试死锁）。规范在 git 边界之前回到模型。
 *
 * 降级纪律（同 bank-pull 离线档）：策略件自身永不抛；缺 `.oxlintrc.json` /
 * oxlint 二进制、路径出仓、非 .ts/.mts、结果 isError —— 一律 void（静默不
 * 反馈），每会话至多 warn 一次。零宿主依赖（防火墙规则 2）；fs 只读。
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createSessionStore, createSessionWarnOnce } from "./mount.mjs";
import type { ToolPostPolicy } from "./mount.mjs";
import { resolveInLoopTarget } from "./engine-bridge.mjs";
import type { RepoRootConfig } from "./engine-bridge.mjs";

/** 单条 lint 诊断（行/列 1 基，与 oxlint JSON 的 `labels[0].span` 同口径）。 */
export interface LintDiagnostic {
	line: number;
	column: number;
	rule: string;
	message: string;
}

/** lint 一次执行的入参（仓根定位面：二进制 / 配置 / 目标文件 / 工作目录）。 */
export interface LintRunContext {
	bin: string;
	config: string;
	file: string;
	cwd: string;
}

/** lint 执行面（默认实现跑仓根 oxlint；测试注入桩）。 */
export type RunLint = (ctx: LintRunContext) => LintDiagnostic[];

/** 策略件注入缝：`runLint` = 执行面替换；`warn` = 降级提示落点（默认静默）。 */
export interface LintFeedbackDeps {
	runLint?: RunLint;
	warn?: (message: string) => void;
}

const LINT_EXTENSIONS = new Set([".ts", ".mts"]);
const OXLINT_BIN_REL = path.join("node_modules", "oxlint", "bin", "oxlint");
const OXLINT_CONFIG_REL = ".oxlintrc.json";
const LINT_TIMEOUT_MS = 5_000;
const MAX_FEEDBACK_LINES = 10;
/** 同文件连续 block 上限：达上限后降级 context（违规仍可见、不再拦）——防模型改不对无限重试死锁。 */
const MAX_BLOCK_PER_FILE = 3;

/** oxlint `-f json` 输出中本件消费的窄面（其余字段不读）。 */
interface OxlintJson {
	diagnostics?: Array<{
		message?: string;
		code?: string;
		labels?: Array<{ span?: { line?: number; column?: number } }>;
	}>;
}

/** 默认执行面：仓根 oxlint 单文件 JSON 模式；启动失败/无 JSON 输出即抛（策略层统一降级）。 */
function defaultRunLint({ bin, config, file, cwd }: LintRunContext): LintDiagnostic[] {
	const result = spawnSync(process.execPath, [bin, "--config", config, "--deny-warnings", "-f", "json", file], {
		cwd,
		encoding: "utf8",
		timeout: LINT_TIMEOUT_MS,
	});
	if (result.error) throw result.error;
	if (typeof result.stdout !== "string" || result.stdout.length === 0) throw new Error("oxlint produced no JSON output");
	const doc = JSON.parse(result.stdout) as OxlintJson;
	return (doc.diagnostics ?? []).map((diagnostic) => {
		const span = diagnostic.labels?.[0]?.span;
		return {
			line: span?.line ?? 0,
			column: span?.column ?? 0,
			rule: diagnostic.code ?? "unknown",
			message: diagnostic.message ?? "",
		};
	});
}

/**
 * 组装 A4 写码反馈策略。返回的策略挂进 `toolPost`（mount-policies 组装）；
 * `config` 走 M2 的 repoRoot 四级回退链，`deps` 为执行面/日志面注入缝。
 */
export function createLintFeedbackPolicies(config: RepoRootConfig, deps: LintFeedbackDeps = {}): { toolPost: ToolPostPolicy } {
	const runLint = deps.runLint ?? defaultRunLint;
	const warn = deps.warn ?? (() => {});
	const store = createSessionStore();
	interface State {
		/** 同文件连续 block 计数（文件维度防死锁；成功写码即复位）。 */
		blockCounts: Map<string, number>;
	}
	const warnOnce = createSessionWarnOnce(warn);
	const toolPost: ToolPostPolicy = (exec, result) => {
		try {
			// 目标解析前言与 export-docs 判据折叠单源（engine-bridge.resolveInLoopTarget）。
			const target = resolveInLoopTarget(config, exec, result, LINT_EXTENSIONS);
			if (target === null) return;
			const { repoRoot, abs, rel } = target;
			const bin = path.join(repoRoot, OXLINT_BIN_REL);
			const lintConfig = path.join(repoRoot, OXLINT_CONFIG_REL);
			if (!fs.existsSync(bin) || !fs.existsSync(lintConfig)) {
				warnOnce(exec.agent?.session, `noogenesis lint feedback offline: ${OXLINT_CONFIG_REL} or ${OXLINT_BIN_REL} missing under ${repoRoot}`);
				return;
			}
			const diagnostics = runLint({ bin, config: lintConfig, file: abs, cwd: repoRoot });
			if (diagnostics.length === 0) {
				// 干净写码：复位该文件计数（成功即解除死锁降级）。
				const state = store.of<State>(exec.agent?.session, () => ({ blockCounts: new Map() }));
				state.blockCounts.delete(abs);
				return;
			}
			const lines = diagnostics.slice(0, MAX_FEEDBACK_LINES).map((d) => `${rel}:${d.line}:${d.column} ${d.rule}: ${d.message}`);
			if (diagnostics.length > MAX_FEEDBACK_LINES) lines.push(`…(+${diagnostics.length - MAX_FEEDBACK_LINES} more)`);
			const state = store.of<State>(exec.agent?.session, () => ({ blockCounts: new Map() }));
			const blockCount = (state.blockCounts.get(abs) ?? 0) + 1;
			state.blockCounts.set(abs, blockCount);
			// 死锁降级：同文件连续 block 达上限后稳定降级 context（不清计数——
			// 保持降级态），直到一次干净写码复位（上方零诊断分支 delete 重武装）。
			if (blockCount > MAX_BLOCK_PER_FILE) {
				return { kind: "context", lines };
			}
			// 升格档（lint-block-and-staged-hook ADR）：机器可判违规 → block 拦回。
			return { kind: "block", feedback: lines.join("\n") };
		} catch (cause) {
			warnOnce(exec.agent?.session, `noogenesis lint feedback failed: ${cause instanceof Error ? cause.message : String(cause)}`);
			return;
		}
	};
	return { toolPost };
}
