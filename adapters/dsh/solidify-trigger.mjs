/**
 * solidify-trigger.mjs — 写路径边界（M2 ADR 接线件 ③）：发现 + 人工确认，
 * 绝不自动写。候选 = 目标仓 staging 目录下的 `<id>.json`（engine 实现轮
 * ADR D1：候选可放 genes/ 之外）。核心函数零宿主依赖（selftest 直测）；
 * 提问/日志等宿主交互由调用方注入，注入缺席时降级为"只提醒不问"。
 */
import fs from "node:fs";
import path from "node:path";

/** staging 目录下待入档候选（*.json，字典序稳定）。目录不存在 = 无候选。 */
export function listStagingCandidates(repoRoot, stagingDir) {
	const dir = path.resolve(repoRoot, stagingDir);
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((name) => name.endsWith(".json"))
		.sort()
		.map((name) => path.join(dir, name));
}

/** solidify 引擎参数（相对 repoRoot 的候选路径；结构化数组直传）。 */
export function buildSolidifyArgs(candidatePath, actor, repoRoot) {
	return ["solidify", path.relative(repoRoot, candidatePath), "--actor", actor];
}

/** 提问兜底超时：answerer 半存活时 ask 可能永久挂起，超时按"仅提醒"降级。 */
export const ASK_TIMEOUT_MS = 300_000;

/** 提醒文案：候选清单 + 精确可复制的命令（自 buildSolidifyArgs 派生——提醒
 * 文案与实跑参数是同一事实，防双形态漂移）。 */
export function solidifyNotice(repoRoot, stagingDir, actor, candidates) {
	const rel = candidates.map((candidate) => `  ${path.relative(repoRoot, candidate)}`);
	const commands = candidates.map((candidate) => `  node engine/bin.js ${buildSolidifyArgs(candidate, actor, repoRoot).join(" ")}`);
	return [
		`Noogenesis: ${candidates.length} staged gene candidate(s) in ${stagingDir}/ await solidify (human-approved write path):`,
		...rel,
		"To archive now, approve at session end, or run:",
		...commands,
	].join("\n");
}

/**
 * 会话边界触发体。注入面：
 * - logger: {info, warn}（宿主 ctx.logger 绑定名后的对象）
 * - ask: async (question) => "archive" | "later" | null（宿主 userQuestions 封装；缺席传 null）
 * - askTimeoutMs: ask 兜底超时（默认 ASK_TIMEOUT_MS；超时按 null 处理 = 只提醒）
 * 返回 { asked, approved, archived[], failed[] }——selftest 可注入假宿主全路径驱动。
 */
export async function runSolidifyTrigger({ repoRoot, stagingDir, actor, candidates, logger, ask, runEngine, askTimeoutMs = ASK_TIMEOUT_MS }) {
	if (!candidates.length) return { asked: false, approved: false, archived: [], failed: [] };
	const notice = solidifyNotice(repoRoot, stagingDir, actor, candidates);
	let decision = null;
	if (ask) {
		let timer;
		const timeout = new Promise((resolve) => {
			timer = setTimeout(() => resolve(null), askTimeoutMs);
			if (timer.unref) timer.unref();
		});
		decision = await Promise.race([ask(candidates), timeout]).finally(() => clearTimeout(timer));
	}
	if (decision !== "archive") {
		logger.info(notice);
		return { asked: ask !== null, approved: false, archived: [], failed: [] };
	}
	const archived = [];
	const failed = [];
	for (const candidate of candidates) {
		const result = await runEngine(buildSolidifyArgs(candidate, actor, repoRoot), { repoRoot });
		if (result.code === 0) {
			archived.push(path.relative(repoRoot, candidate));
		} else {
			failed.push({ candidate: path.relative(repoRoot, candidate), code: result.code, stderr: result.stderr });
		}
	}
	const lines = [];
	if (archived.length) lines.push(`Noogenesis: solidified ${archived.length} gene(s): ${archived.join(", ")}`);
	if (failed.length) {
		lines.push(`Noogenesis: solidify failed for ${failed.length} candidate(s):`);
		for (const item of failed) lines.push(`  ${item.candidate} — exit ${item.code}: ${String(item.stderr).trim().split("\n")[0]}`);
	}
	const summary = lines.join("\n");
	(failed.length ? logger.warn : logger.info)(summary);
	return { asked: true, approved: true, archived, failed };
}
