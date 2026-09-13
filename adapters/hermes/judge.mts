/**
 * judge.mts — Hermes 第二宿主的写码在环判据（批次 7 序 35 ADR）。
 *
 * 与 DSH 侧 A4 同判据、不同接线面：把「拟写入内容」先落临时文件，跑仓根 oxlint
 * （`--deny-warnings -f json`）与仓内判据件 `scripts/verify-export-docs.mts`，任一
 * 命中即产出 block 消息，供 shell hook 在 `pre_tool_call` 上拦回。判据面一字未改
 * （判据单源仍是那些脚本与配置），本件只换接线。
 *
 * 降级纪律（同 DSH 侧离线档）：策略件自身永不抛；缺 `.oxlintrc.json` / oxlint 二进制
 * / 判据件、目标出仓、非 `.ts`/`.mts`、子进程异常或超时——一律 fail-open 返回 null
 * （Hermes 侧记 warn 或静默，绝不阻断）。零宿主依赖（adapters/AGENTS 防火墙规则 2）。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const JUDGED_EXTENSIONS = new Set([".ts", ".mts"]);
const OXLINT_BIN_REL = path.join("node_modules", "oxlint", "bin", "oxlint");
const OXLINT_CONFIG_NAME = ".oxlintrc.json";
const EXPORT_DOCS_SCRIPT_REL = path.join("scripts", "verify-export-docs.mts");
const RUN_TIMEOUT_MS = 5_000;
const MAX_MESSAGE_LINES = 10;
const MAX_MESSAGE_CHARS = 2_000;
const TEMP_PREFIX = "noogenesis-hermes-hook-";

/** 单条 lint 诊断（行/列 1 基，与 oxlint JSON 的 `labels[0].span` 同口径）。 */
interface LintDiagnostic {
	line: number;
	column: number;
	rule: string;
	message: string;
}

/** 判据结果：`null` = 放行（含全部降级面）；字符串 = block 消息正文。 */
export type Verdict = string | null;

/**
 * 从 `start` 向上找最近的仓根（判据 = 该目录含 `.oxlintrc.json`）；找不到返回 null。
 */
export function resolveRepoRoot(start: string): string | null {
	let dir: string;
	try {
		dir = path.resolve(start);
	} catch {
		return null;
	}
	for (;;) {
		if (fs.existsSync(path.join(dir, OXLINT_CONFIG_NAME))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

/** 单次子进程运行面（stub 注入缝：自测替换 `judgeProposedWrite` 的执行面用）。 */
export interface RunContext {
	repoRoot: string;
	file: string;
}

/** 跑仓根 oxlint 单文件 JSON 模式；任何不确定面返回空数组（交给上层的 fail-open）。 */
function runLint({ repoRoot, file }: RunContext): LintDiagnostic[] {
	const bin = path.join(repoRoot, OXLINT_BIN_REL);
	const config = path.join(repoRoot, OXLINT_CONFIG_NAME);
	if (!fs.existsSync(bin) || !fs.existsSync(config)) return [];
	try {
		const result = spawnSync(process.execPath, [bin, "--config", config, "--deny-warnings", "-f", "json", file], {
			cwd: repoRoot,
			encoding: "utf8",
			timeout: RUN_TIMEOUT_MS,
		});
		if (result.error !== undefined && result.error !== null) return [];
		if (typeof result.stdout !== "string" || result.stdout.length === 0) return [];
		const doc = JSON.parse(result.stdout) as {
			diagnostics?: Array<{ message?: string; code?: string; labels?: Array<{ span?: { line?: number; column?: number } }> }>;
		};
		return (doc.diagnostics ?? []).map((diagnostic) => {
			const span = diagnostic.labels?.[0]?.span;
			return {
				line: span?.line ?? 0,
				column: span?.column ?? 0,
				rule: diagnostic.code ?? "unknown",
				message: diagnostic.message ?? "",
			};
		});
	} catch {
		return [];
	}
}

/** 跑仓内导出面判据件（exit 1 = 违约，取其 FAIL 行）；判据件缺席或自身故障返回空数组。 */
function runExportDocs({ repoRoot, file }: RunContext): string[] {
	const script = path.join(repoRoot, EXPORT_DOCS_SCRIPT_REL);
	if (!fs.existsSync(script)) return [];
	try {
		const result = spawnSync(process.execPath, [script, file], {
			cwd: repoRoot,
			encoding: "utf8",
			timeout: RUN_TIMEOUT_MS,
		});
		if (result.status !== 1) return [];
		const stdout = typeof result.stdout === "string" ? result.stdout : "";
		return stdout
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.startsWith("FAIL"))
			.slice(0, MAX_MESSAGE_LINES);
	} catch {
		return [];
	}
}

/** 目标是否落在仓内（相对路径不以 `..` 开头且非绝对）。 */
function isInsideRepo(repoRoot: string, abs: string): boolean {
	const rel = path.relative(repoRoot, abs);
	return rel.length > 0 && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * 判一次「拟写入」：返回 block 消息或 null（放行）。
 * 只判 `.ts`/`.mts` 且在仓内的目标；判据命中 = oxlint 诊断 ∪ 导出面 FAIL 行。
 */
export function judgeProposedWrite(cwd: string, filePath: string, content: string): Verdict {
	if (typeof cwd !== "string" || typeof filePath !== "string" || typeof content !== "string") return null;
	const ext = path.extname(filePath).toLowerCase();
	if (!JUDGED_EXTENSIONS.has(ext)) return null;
	const repoRoot = resolveRepoRoot(cwd);
	if (repoRoot === null) return null;
	const abs = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
	if (!isInsideRepo(repoRoot, abs)) return null;
	let tempDir: string | null = null;
	try {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), TEMP_PREFIX));
		const candidate = path.join(tempDir, "candidate" + ext);
		fs.writeFileSync(candidate, content, "utf8");
		const ctx: RunContext = { repoRoot, file: candidate };
		const diagnostics = runLint(ctx);
		const exportFailures = diagnostics.length > 0 ? [] : runExportDocs(ctx);
		const lines = [
			...diagnostics.map((d) => `${d.line}:${d.column} ${d.rule}: ${d.message}`),
			...exportFailures,
		].slice(0, MAX_MESSAGE_LINES);
		if (lines.length === 0) return null;
		const rel = path.relative(repoRoot, abs);
		const message = [
			`noogenesis: proposed write to ${rel} fails the repo machine gates.`,
			...lines.map((line) => `- ${line}`),
			"Fix the reported violations and write again; the same judgement runs on every .ts/.mts write inside the repository.",
		].join("\n");
		return message.length > MAX_MESSAGE_CHARS ? message.slice(0, MAX_MESSAGE_CHARS) : message;
	} catch {
		return null;
	} finally {
		if (tempDir !== null) {
			try {
				fs.rmSync(tempDir, { recursive: true, force: true });
			} catch {
				/* 临时目录清理失败不影响判据结果 */
			}
		}
	}
}
