/**
 * engine-bridge.mjs — 适配层↔引擎唯一通道（M2 ADR M3：spawn CLI 单合同）。
 *
 * 防火墙规则 1（ADR 2026-09-06-m2-adapter-wiring）：本模块只 spawn
 * `engine/bin.js`，禁止 import 引擎模块；合同 = stdout 文本 + 退出码三档
 * （实现轮 ADR D6：0 成功 / 1 闸红 / 2 用法或 fail-closed）。
 *
 * 环境纪律（schema ADR S3 同款）：只透传 PATH / HOME / LANG；cwd 锁目标仓根
 * （防火墙规则 3：装在 DSH 侧的插件 ≠ 运行仓，repoRoot 必须显式锚定）。
 */
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ADAPTER_DIR = path.dirname(fileURLToPath(import.meta.url));

/** 引擎唯一合同面入口（包内相对锚定，与安装布局无关）。 */
export const ENGINE_ENTRY = path.join(ADAPTER_DIR, "..", "..", "engine", "bin.js");

/** 引擎退出码三档（engine 实现轮 ADR D6 的镜像单源）。 */
export const EXIT = { OK: 0, RED: 1, FAIL_CLOSED: 2 };

/** 透传给引擎进程的 env 白名单（engine 自身对孙进程同款纪律）。 */
const PASS_THROUGH_ENV = ["PATH", "HOME", "LANG"];

function minimalEnv() {
	const env = {};
	for (const key of PASS_THROUGH_ENV) {
		if (process.env[key] !== undefined) env[key] = process.env[key];
	}
	return env;
}

/**
 * 目标仓根锚定：显式 config.repoRoot 优先，其次 NOGENESIS_REPO_ROOT，
 * 兜底 process.cwd()。返回绝对路径。
 */
export function resolveRepoRoot(config = {}) {
	return path.resolve(config.repoRoot || process.env.NOGENESIS_REPO_ROOT || process.cwd());
}

/**
 * 异步执行引擎命令（模型面工具用）：结构化参数数组直传，永不 shell 拼接。
 * 超时 kill 后以 timedOut 标记返回（不抛异常——退出码语义由调用方映射）。
 */
export function runEngine(args, { repoRoot, timeoutMs = 120_000 } = {}) {
	return new Promise((resolve) => {
		const child = spawn(process.execPath, [ENGINE_ENTRY, ...args], {
			cwd: repoRoot,
			env: minimalEnv(),
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			child.kill("SIGKILL");
		}, timeoutMs);
		child.stdout.on("data", (chunk) => {
			stdout += chunk;
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk;
		});
		child.on("error", (cause) => {
			clearTimeout(timer);
			resolve({ code: EXIT.FAIL_CLOSED, stdout, stderr: `${stderr}${cause.message}\n`, timedOut: false });
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve({
				code: timedOut ? EXIT.FAIL_CLOSED : (code ?? EXIT.FAIL_CLOSED),
				stdout,
				stderr: timedOut ? `${stderr}engine timed out after ${timeoutMs}ms\n` : stderr,
				timedOut,
			});
		});
	});
}

/**
 * 同步执行引擎命令（system-prompt 节 provider 用——宿主 text provider 是同步
 * 面 dictated by the host API）。引擎无 LLM、无网络，但同步面仍强制界：
 * spawnSync timeout 到点 kill，status null → FAIL_CLOSED（与 async 面同口径）。
 */
const SYNC_TIMEOUT_MS = 60_000;

export function runEngineSync(args, { repoRoot, timeoutMs = SYNC_TIMEOUT_MS } = {}) {
	const r = spawnSync(process.execPath, [ENGINE_ENTRY, ...args], {
		cwd: repoRoot,
		env: minimalEnv(),
		stdio: ["ignore", "pipe", "pipe"],
		encoding: "utf8",
		timeout: timeoutMs,
	});
	if (r.error) {
		return { code: EXIT.FAIL_CLOSED, stdout: r.stdout ?? "", stderr: `${r.stderr ?? ""}${r.error.message}\n` };
	}
	if (r.signal) {
		return { code: EXIT.FAIL_CLOSED, stdout: r.stdout ?? "", stderr: `${r.stderr ?? ""}engine timed out after ${timeoutMs}ms (signal ${r.signal})\n` };
	}
	return { code: r.status ?? EXIT.FAIL_CLOSED, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}
