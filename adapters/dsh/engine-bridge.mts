/**
 * engine-bridge.mts — 适配层↔引擎唯一通道（M2 ADR M3：spawn CLI 单合同）。
 *
 * 防火墙规则 1（ADR 2026-09-06-m2-adapter-wiring）：本模块只 spawn
 * `dist/engine/bin.js`，禁止 import 引擎模块；合同 = stdout 文本 + 退出码三档
 * （实现轮 ADR D6：0 成功 / 1 闸红 / 2 用法或 fail-closed）。
 *
 * 环境纪律（schema ADR S3 同款）：只透传 PATH / HOME / LANG；cwd 锁目标仓根
 * （防火墙规则 3：装在 DSH 侧的插件 ≠ 运行仓——四级回退链见 resolveRepoRoot）。
 */
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ADAPTER_DIR = path.dirname(fileURLToPath(import.meta.url));

/**
 * 引擎唯一合同面入口（包内相对锚定，与安装布局无关）。运行形态（B2 ADR）：
 * TS 件走 dist——本相对式在 dist/adapters/dsh 下自指 `dist/engine/bin.js`（engine/adapters
 * 族钉 dist 跑，B2 ADR 两族分野）；防火墙规则 1 语义不变。
 */
export const ENGINE_ENTRY = path.join(ADAPTER_DIR, "..", "..", "engine", "bin.js");

/** 引擎退出码三档（engine 实现轮 ADR D6 的镜像单源）。 */
export const EXIT = { OK: 0, RED: 1, FAIL_CLOSED: 2 } as const;

/** 引擎一次执行的结果面（退出码 + stdout/stderr 文本；合同单源）。 */
export interface EngineResult {
	code: number;
	stdout: string;
	stderr: string;
}

/** runEngine 注入面形状（engine-bridge 实现与其满足；solidify/bank-pull/tools 共用）。 */
export type EngineRunner = (args: string[], opts?: { repoRoot?: string; timeoutMs?: number }) => Promise<EngineResult>;

/** 透传给引擎进程的 env 白名单（engine 自身对孙进程同款纪律）。 */
const PASS_THROUGH_ENV = ["PATH", "HOME", "LANG"] as const;

function minimalEnv(): Record<string, string> {
	const env: Record<string, string> = {};
	for (const key of PASS_THROUGH_ENV) {
		const value = process.env[key];
		if (value !== undefined) env[key] = value;
	}
	return env;
}

/** 会话工作区载体形状（宿主 exec / 事件 payload 的最小结构面；全字段可选）。 */
export interface AgentCarrier {
	agent?: { session?: { header?: { cwd?: string } } };
}

/**
 * 会话工作区提取（工具体 / 事件面的唯一会话 cwd 源，与官方 bash 工具同源同款）：
 * 吃 exec / 事件 payload 整体（`<…>.agent.session.header.cwd`）。任何一环缺席
 * → undefined，由 resolveRepoRoot 回退链兜底。纯函数，selftest 直测。
 */
export function sessionWorkspaceOf(agentCarrier?: AgentCarrier | null): string | undefined {
	const cwd = agentCarrier?.agent?.session?.header?.cwd;
	return typeof cwd === "string" && cwd.length > 0 ? cwd : undefined;
}

/** 显式锚定配置面（config.repoRoot 为唯一 config 级锚点）。 */
export interface RepoRootConfig {
	repoRoot?: string;
}

/**
 * 显式锚定提取（bank-pull 触发面专用）：config → env → undefined——**无 cwd
 * 兜底**。装载期 cwd 与用户仓无关（宿主进程 cwd），拿它当 pull 目标会把缓存
 * 落进错位目录（bug-fix ADR 2026-09-06-bank-pull-session-trigger 的根因面）；
 * 只有显式锚定才允许装载期动作。resolveRepoRoot 是本函数的超集（补会话工作区
 * 与 cwd 两级），链语义单源在此。
 */
export function explicitRepoRootOf(config: RepoRootConfig = {}): string | undefined {
	return config.repoRoot || process.env.NOGENESIS_REPO_ROOT || undefined;
}

/**
 * 目标仓根锚定（部署收口 ADR 2026-09-06-adapter-deploy-hardening 四级链）：
 * 显式 config.repoRoot 优先，其次 NOGENESIS_REPO_ROOT，再次会话工作区
 * （工具体/disposal 面逐次传入——装在 DSH 侧的插件 ≠ 运行仓，且多 agent
 * 异仓各归各仓），兜底 process.cwd()。返回绝对路径。
 */
export function resolveRepoRoot(config: RepoRootConfig = {}, sessionCwd?: string): string {
	return path.resolve(explicitRepoRootOf(config) || sessionCwd || process.cwd());
}

/** 路径归属判定：`abs` 在 `repoRoot` 内（含根自身）；出仓面不反馈。策略件共用（lint 反馈 / 技能触点提醒）。 */
export function isInsideRepo(repoRoot: string, abs: string): boolean {
	const rel = path.relative(repoRoot, abs);
	return rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

/** 在环判据的写码目标（A4 面判据共用：仓根 / 绝对路径 / 仓根相对路径）。 */
export interface InLoopTarget {
	repoRoot: string;
	abs: string;
	rel: string;
}

/** 在环目标解析入参窄面（与 mount.mts 的 `ToolExecLike` 结构相容，免跨件类型依赖）。 */
export interface InLoopExecLike {
	name?: string;
	arguments?: unknown;
	agent?: { session?: { header?: { cwd?: string } } };
}

/**
 * A4 在环判据的写码目标解析（lint / export-docs 两判据共用前言，折叠单源）：非
 * write/edit、参数面缺 `file_path`、`result.isError`、出仓、扩展名 ∉ `extensions`
 * —— 一律 null（判据对它们无语义）。`rel` 供反馈行格式化（POSIX 无关，同 lint 口径）。
 */
export function resolveInLoopTarget(
	config: RepoRootConfig,
	exec: InLoopExecLike,
	result: { isError?: boolean },
	extensions: ReadonlySet<string>,
): InLoopTarget | null {
	if (exec.name !== "write" && exec.name !== "edit") return null;
	const args = exec.arguments;
	if (typeof args !== "object" || args === null) return null;
	const filePath = (args as Record<string, unknown>).file_path;
	if (typeof filePath !== "string") return null;
	if (result.isError === true) return null;
	const sessionCwd = sessionWorkspaceOf(exec);
	const repoRoot = resolveRepoRoot(config, sessionCwd);
	const abs = path.resolve(sessionCwd ?? repoRoot, filePath);
	if (!isInsideRepo(repoRoot, abs)) return null;
	if (!extensions.has(path.extname(abs))) return null;
	return { repoRoot, abs, rel: path.relative(repoRoot, abs) };
}

/** 引擎执行兜底超时（async/sync 两面各一档；超时 kill → FAIL_CLOSED）。 */
const ASYNC_TIMEOUT_MS = 120_000;
const SYNC_TIMEOUT_MS = 60_000;

/**
 * 异步执行引擎命令（模型面工具用）：结构化参数数组直传，永不 shell 拼接。
 * 超时 kill 后以 timedOut 标记返回（不抛异常——退出码语义由调用方映射）。
 */
export function runEngine(args: string[], { repoRoot, timeoutMs = ASYNC_TIMEOUT_MS }: { repoRoot?: string; timeoutMs?: number } = {}): Promise<EngineResult & { timedOut: boolean }> {
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
export function runEngineSync(args: string[], { repoRoot, timeoutMs = SYNC_TIMEOUT_MS }: { repoRoot?: string; timeoutMs?: number } = {}): EngineResult {
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
