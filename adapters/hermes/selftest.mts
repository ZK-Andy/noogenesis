/**
 * selftest.mts — Hermes 写码在环判据自测（批次 7 序 35 ADR）。
 *
 * 面 = 已构建入口 `dist/adapters/hermes/hook.mjs` 的进程级 e2e：喂 fixture stdin，
 * 断言 stdout 与退出码（无需 Hermes 在场）。运行：`node dist/adapters/hermes/selftest.mjs`。
 */
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const HOOK = path.join(HERE, "hook.mjs");
const CLEAN_TS = "/** Adds one. */\nexport function ok(a: number): number { return a + 1; }\n";
const VIOLATING_TS = "export function bad(): number { var x = 1; return x; }\n";

/** 喂一份 stdin 载荷给 hook，返回 stdout 与退出码。 */
function runHook(payload: unknown): { stdout: string; code: number | null } {
	const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
	const result = spawnSync(process.execPath, [HOOK], { cwd: REPO_ROOT, input: raw, encoding: "utf8", timeout: 30_000 });
	return { stdout: result.stdout ?? "", code: result.status };
}

let assertions = 0;
/** 断言：hook 零输出且 exit 0（放行面）。 */
function expectPass(label: string, payload: unknown): void {
	const { stdout, code } = runHook(payload);
	assert.equal(code, 0, label + ": exit 0");
	assert.equal(stdout.trim(), "", label + ": no output");
	assertions++;
}

const base = { hook_event_name: "pre_tool_call", tool_name: "write_file", cwd: REPO_ROOT };

expectPass("non-write tool", { ...base, tool_name: "terminal", tool_input: { path: "a.ts", content: VIOLATING_TS } });
expectPass("non-pre_tool_call event", { ...base, hook_event_name: "on_session_start", tool_input: { path: "a.ts", content: VIOLATING_TS } });
expectPass("non-ts target", { ...base, tool_input: { path: "docs/notes.md", content: VIOLATING_TS } });
expectPass("target outside repo", { ...base, tool_input: { path: "/tmp/outside.ts", content: VIOLATING_TS } });
expectPass("empty stdin", "");
expectPass("malformed stdin", "{not json");
expectPass("clean ts content", { ...base, tool_input: { path: "sample.ts", content: CLEAN_TS } });
expectPass("missing tool_input fields", { ...base, tool_input: { path: "sample.ts" } });

{
	const { stdout, code } = runHook({ ...base, tool_input: { path: "sample.ts", content: VIOLATING_TS } });
	assert.equal(code, 0, "violating write: exit 0");
	const parsed = JSON.parse(stdout) as { action?: string; message?: string };
	assert.equal(parsed.action, "block", "violating write: block action");
	assert.match(parsed.message ?? "", /noogenesis: proposed write to sample\.ts/, "violating write: message names the target");
	assert.match(parsed.message ?? "", /no-var/, "violating write: message carries the lint rule");
	assertions += 4;
}

console.log("hermes hook selftest: OK (" + assertions + " assertions)");
