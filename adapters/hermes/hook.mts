/**
 * hook.mts — Hermes 第二宿主 shell hook 入口（批次 7 序 35 ADR）。
 *
 * 接线面 = Hermes shell hooks（`~/.hermes/config.yaml` 的 `hooks:` 块，子进程 +
 * stdin/stdout JSON 协议）。本入口只认 `pre_tool_call` + `write_file`：
 * 判据命中即回 Hermes wire shape 的 block，其余一律零输出。
 *
 * 纪律：进程永远 exit 0；任何解析/判据异常都走 fail-open（零输出）。判据本体 =
 * `judge.mjs`（零宿主依赖）。
 */
import fs from "node:fs";
import { judgeProposedWrite } from "./judge.mjs";

/** Hermes shell hook stdin 载荷中本件消费的窄面。 */
interface HookPayload {
	hook_event_name?: unknown;
	tool_name?: unknown;
	tool_input?: unknown;
	cwd?: unknown;
}

/** 读尽 stdin（fd 0）；读不到返回空串。 */
function readStdin(): string {
	try {
		return fs.readFileSync(0, "utf8");
	} catch {
		return "";
	}
}

/** 单次 hook 调用：返回要写往 stdout 的 JSON 行，或 null（零输出）。 */
function decide(raw: string): string | null {
	const payload = JSON.parse(raw) as HookPayload;
	if (payload.hook_event_name !== "pre_tool_call" || payload.tool_name !== "write_file") return null;
	const cwd = typeof payload.cwd === "string" ? payload.cwd : "";
	const input = payload.tool_input;
	if (cwd.length === 0 || input === null || typeof input !== "object") return null;
	const record = input as Record<string, unknown>;
	const filePath = record.path;
	const content = record.content;
	if (typeof filePath !== "string" || typeof content !== "string") return null;
	const verdict = judgeProposedWrite(cwd, filePath, content);
	return verdict === null ? null : JSON.stringify({ action: "block", message: verdict });
}

/** 入口：读载荷 → 判据 → 写响应；异常吞掉并 exit 0（fail-open，绝不阻断宿主）。 */
function main(): void {
	let out: string | null = null;
	try {
		out = decide(readStdin());
	} catch {
		out = null;
	}
	if (out !== null) process.stdout.write(out + "\n");
}

main();
