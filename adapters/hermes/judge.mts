/**
 * judge.mts — Hermes 第二宿主的写码在环判据（批次 7 序 35 ADR）。
 *
 * 与 DSH 侧 A4 的 lint 半判据同判据、不同接线面：把「拟写入内容」先落临时文件，跑
 * 仓根 oxlint（`--config .oxlintrc.json --deny-warnings -f json`），有诊断即产出 block
 * 消息，供 shell hook 在 `pre_tool_call` 上拦回。
 *
 * 降级纪律（同 DSH 侧离线档）：策略件自身永不抛；缺 oxlint 二进制或配置、目标出仓、
 * 非 `.ts`/`.mts`、子进程异常或超时——一律 fail-open 返回 null（Hermes 侧静默，绝不
 * 阻断）。零宿主依赖（adapters/AGENTS 防火墙规则 2）。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const JUDGED_EXTENSIONS = new Set([".ts", ".mts"]);
const OXLINT_BIN_REL = path.join("node_modules", "oxlint", "bin", "oxlint");
const OXLINT_CONFIG_NAME = ".oxlintrc.json";
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

/** 从 `start` 向上找最近的仓根（判据 = 该目录含 `.oxlintrc.json`）；找不到返回 null。 */
function resolveRepoRoot(start: string): string | null {
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

/** 跑仓根 oxlint 单文件 JSON 模式；任何不确定面返回空数组（交给上层 fail-open）。 */
function runLint(repoRoot: string, file: string): LintDiagnostic[] {
	const bin = path.join(repoRoot, OXLINT_BIN_REL);
	if (!fs.existsSync(bin)) return [];
	try {
		const result = spawnSync(
			process.execPath,
			[bin, "--config", path.join(repoRoot, OXLINT_CONFIG_NAME), "--deny-warnings", "-f", "json", file],
			{ cwd: repoRoot, encoding: "utf8", timeout: RUN_TIMEOUT_MS },
		);
		if (result.error !== undefined) return [];
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

/** 目标是否落在仓内（相对路径不以 `..` 开头且非空）。 */
function isInsideRepo(repoRoot: string, abs: string): boolean {
	const rel = path.relative(repoRoot, abs);
	return rel.length > 0 && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * 判一次「拟写入」：返回 block 消息或 null（放行）。
 * 只判 `.ts`/`.mts` 且在仓内的目标；判据命中 = 仓根 oxlint 有诊断。
 */
export function judgeProposedWrite(cwd: string, filePath: string, content: string): string | null {
	if (typeof cwd !== "string" || typeof filePath !== "string" || typeof content !== "string") return null;
	const ext = path.extname(filePath).toLowerCase();
	if (!JUDGED_EXTENSIONS.has(ext)) return null;
	const repoRoot = resolveRepoRoot(cwd);
	if (repoRoot === null) return null;
	const abs = path.resolve(cwd, filePath);
	if (!isInsideRepo(repoRoot, abs)) return null;
	let tempDir: string | null = null;
	try {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), TEMP_PREFIX));
		const candidate = path.join(tempDir, "candidate" + ext);
		fs.writeFileSync(candidate, content, "utf8");
		const diagnostics = runLint(repoRoot, candidate);
		if (diagnostics.length === 0) return null;
		const lines = diagnostics.slice(0, MAX_MESSAGE_LINES).map((d) => `${d.line}:${d.column} ${d.rule}: ${d.message}`);
		if (diagnostics.length > MAX_MESSAGE_LINES) lines.push(`…(+${diagnostics.length - MAX_MESSAGE_LINES} more)`);
		const rel = path.relative(repoRoot, abs);
		const message = [
			`noogenesis: proposed write to ${rel} fails the repo lint gate.`,
			...lines,
			"Fix the reported violations and write again; the same lint gate runs on every .ts/.mts write inside the repository.",
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
