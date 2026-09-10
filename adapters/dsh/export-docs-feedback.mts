/**
 * export-docs-feedback.mts — A4 注释面在环拦回（ADR 2026-09-10-export-docs-inloop）。
 *
 * 写码工具（write/edit）成功后同步跑仓内判据件 `scripts/verify-export-docs.mts
 * <file>`（文件目标模式）：导出函数/类缺紧邻 JSDoc → A4 `block` 拦回（工具结果
 * 被替换为纠正消息）；零违约 → void。同文件连续 block 达上限后降级 `context`
 * （违规仍可见、不再拦），一次干净写码复位——死锁纪律与 lint 判据同源单架
 * （升格 ADR 2026-09-09-lint-block-and-staged-hook）。
 *
 * 判据单源：判定逻辑与域归属都在仓内判据件（其文件目标模式单源判域），本件只做
 * 目标解析、执行与档位映射，不重写判据。在环消费协议 = 判据件 stdout 的
 * `FAIL: ` 前缀行（判据件头注同步标注）。
 *
 * 在环执行面（A4 首次执行仓内脚本，纪律四条）：文件名固定（不做通用「跑任意仓内
 * 脚本」——形态泛化判不立）、参数数组直传无 shell 拼接、`cwd` = 仓根、timeout 5s；
 * 只读判据件。env 按继承面（同 lint 判据；引擎通道的 `minimalEnv` 白名单是另一
 * 执行面，不在此件纪律面内）。
 *
 * 模型面语言：判据件违约行与降级 warn 均为英文（口径单源 = adapters/dsh/README.md
 * 「模型面字符串语言口径」行）——判据件的违约行文案由适配层消费，故其语言属该口径面。
 *
 * 降级纪律（同 lint-feedback）：策略件自身永不抛；判据件缺席、退出码 ∉ {0,1}、
 * spawn 异常 —— 一律 void + 每会话至多一条 warn（判据件故障不是写码方的违规）。
 * 零宿主依赖（防火墙规则 2）；fs 只读。
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createBlockGate, createSessionWarnOnce } from "./mount.mjs";
import type { ToolPostPolicy } from "./mount.mjs";
import { resolveInLoopTarget } from "./engine-bridge.mjs";
import type { RepoRootConfig } from "./engine-bridge.mjs";

/** 判据件一次执行的入参（判据件路径 / 目标文件 / 工作目录）。 */
export interface ExportDocsRunContext {
	script: string;
	file: string;
	cwd: string;
}

/** 判据件结果面（本件消费的窄面：退出码 + stdout 文本）。 */
export interface ExportDocsRunResult {
	code: number;
	stdout: string;
}

/** 判据件执行面（默认实现跑仓内脚本；测试注入桩）。 */
export type RunExportDocs = (ctx: ExportDocsRunContext) => ExportDocsRunResult;

/** 策略件注入缝：`runExportDocs` = 执行面替换；`warn` = 降级提示落点（默认静默）。 */
export interface ExportDocsFeedbackDeps {
	runExportDocs?: RunExportDocs;
	warn?: (message: string) => void;
}

const CODE_EXTENSIONS = new Set([".ts", ".mts"]);
const EXPORT_DOCS_SCRIPT_REL = path.join("scripts", "verify-export-docs.mts");
/** 在环消费协议（判据件 stdout 违约行前缀；见判据件头注）。 */
const FEEDBACK_PREFIX = "FAIL: ";
const RUN_TIMEOUT_MS = 5_000;
const MAX_FEEDBACK_LINES = 10;

/** 默认执行面：仓内判据件文件目标模式（node 直跑 .mts）；启动失败即抛（策略层统一降级）。 */
function defaultRunExportDocs({ script, file, cwd }: ExportDocsRunContext): ExportDocsRunResult {
	const result = spawnSync(process.execPath, [script, file], { cwd, encoding: "utf8", timeout: RUN_TIMEOUT_MS });
	if (result.error) throw result.error;
	return { code: result.status ?? -1, stdout: result.stdout ?? "" };
}

/** 违约行提取：`FAIL: ` 前缀行去前缀；无该行时给协议面提示（退出码 1 却无判据行）。 */
function feedbackLines(stdout: string): string[] {
	const lines = stdout
		.split("\n")
		.filter((line) => line.startsWith(FEEDBACK_PREFIX))
		.map((line) => line.slice(FEEDBACK_PREFIX.length));
	return lines.length > 0 ? lines : ["export-docs judge failed (exit 1 without FAIL lines — judge output protocol face, see scripts/verify-export-docs.mts)"];
}

/**
 * 组装 A4 注释面判据策略。返回的策略挂进 `toolPost`（mount-policies 组装，序在
 * lint 判据之后）；`config` 走 M2 的 repoRoot 四级回退链，`deps` 为执行面/日志面注入缝。
 */
export function createExportDocsPolicies(config: RepoRootConfig, deps: ExportDocsFeedbackDeps = {}): { toolPost: ToolPostPolicy } {
	const runExportDocs = deps.runExportDocs ?? defaultRunExportDocs;
	const warn = deps.warn ?? (() => {});
	const warnOnce = createSessionWarnOnce(warn);
	// 档位门（升格批死锁纪律单源，与 lint 判据共用）：计数协议见 mount.mts。
	const blockGate = createBlockGate();
	const toolPost: ToolPostPolicy = (exec, result) => {
		try {
			// 目标解析前言与 lint 判据折叠单源（engine-bridge.resolveInLoopTarget）。
			const target = resolveInLoopTarget(config, exec, result, CODE_EXTENSIONS);
			if (target === null) return;
			const { repoRoot, abs } = target;
			const script = path.join(repoRoot, EXPORT_DOCS_SCRIPT_REL);
			if (!fs.existsSync(script)) {
				warnOnce(exec.agent?.session, `noogenesis export-docs feedback offline: ${EXPORT_DOCS_SCRIPT_REL} missing under ${repoRoot}`);
				return;
			}
			const run = runExportDocs({ script, file: abs, cwd: repoRoot });
			if (run.code !== 0 && run.code !== 1) {
				// 退出码 2/超时/spawn 异常：判据件自身故障，不是写码方的违规；
				// 无可靠判据信息 → 不触档位门（既不拦也不复位计数）。
				warnOnce(exec.agent?.session, `noogenesis export-docs feedback skipped: judge exited ${run.code}`);
				return;
			}
			const tier = blockGate.decide(exec.agent?.session, abs, run.code === 1);
			if (tier === null) return;
			const lines = feedbackLines(run.stdout);
			const capped = lines.slice(0, MAX_FEEDBACK_LINES);
			if (lines.length > MAX_FEEDBACK_LINES) capped.push(`…(+${lines.length - MAX_FEEDBACK_LINES} more)`);
			// 死锁降级：同文件连续 block 达上限后稳定降级 context（保持降级态），
			// 直到一次干净写码复位（`decide` 的 hit=false 分支）。
			if (tier === "context") return { kind: "context", lines: capped };
			return { kind: "block", feedback: capped.join("\n") };
		} catch (cause) {
			warnOnce(exec.agent?.session, `noogenesis export-docs feedback failed: ${cause instanceof Error ? cause.message : String(cause)}`);
			return;
		}
	};
	return { toolPost };
}
