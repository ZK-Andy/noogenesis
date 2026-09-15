/**
 * log-sink.mts — 插件日志的落盘通道（观察面；零宿主依赖，可脱离 DSH 自测）。
 *
 * 宿主 `ctx.logger` 在本 profile 只有 cordis 内存环一个 exporter（进程退出即丢），
 * 桌面壳只把 dsh 子进程 stderr 收进内存尾、且仅在退出/失败时落 `host.log`——适配层
 * info/warn 在装机形态下零观察面（ADR 2026-09-16-plugin-log-sink 的 Problem）。
 *
 * 本件把每条消息按行追加到 `<DSH_HOME>/logs/noogenesis.log`（`[<ISO8601>] <message>`），
 * 再把**原样**消息转交宿主 logger（不夺通道：宿主将来接上 exporter 时两边都收）。
 * 落盘是 best-effort——目录、追加、宿主发行任一步失败都静默：本通道是插件侧最后的
 * 观察面，抛错会把「留痕失败」变成「一步失败」，与各挂载点「降级不阻断」纪律相反。
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

/** 宿主 logger 面（本层透传 + 落盘的最小消费面；`ctx.logger(name)` 的形状）。 */
export interface LogTarget {
	/** 发行一条信息级留痕（读数、装载、pull 成功等）。 */
	info(message: string): void;
	/** 发行一条降级/诊断留痕（能力位缺席、挂载异常、闸离线等）。 */
	warn(message: string): void;
}

/** 落盘面（自测注入；缺省 = `node:fs` 同步追加，失败原样抛给 `createLogSink` 吞掉）。 */
export type LogWriter = (file: string, line: string) => void;

/**
 * 落盘文件路径：`<DSH_HOME>/logs/noogenesis.log`。取值与归一化对齐宿主
 * `resolveDshHome`（`@deepseek-ai/dsh-home-paths`）：`DSH_HOME` 缺席或只有空白 →
 * `<home>/.dsh`；`~` / `~/` / `~\` 前缀按 OS home 展开；结果绝对化——相对值与
 * `~` 不归一会让落点随宿主进程 cwd 漂移（dsh 常从项目目录启动，即在仓内造出字面
 * `~` 目录，且复验判据声明的观测面找不到文件）。`DSH_HOME` 来自宿主进程环境：
 * 桌面壳 spawn 时写入其生效 home，headless 下由启动器或用户设；宿主自身只读它。
 */
export function resolveLogFile(env: Record<string, string | undefined> = process.env, home: string = homedir()): string {
	const configured = env.DSH_HOME?.trim();
	const base = configured ? expandHome(configured, home) : join(home, ".dsh");
	return join(resolve(base), "logs", "noogenesis.log");
}

/**
 * 造一个同时落盘的 logger：每条消息追加一行 `[<ISO8601>] <message>`，随后原样转交
 * `target`。建目录在造件时试一次；追加与宿主发行各自吞错，互不牵连——写失败不影响
 * 宿主发行，宿主发行抛错不影响落盘，两者都不上抛。
 *
 * @param target 宿主 logger（`ctx.logger(name)` 返回值）；消费面只有 info/warn。
 * @param file 落盘文件；缺省 = {@link resolveLogFile}（读 `DSH_HOME` 的环境值）。
 * @param append 落盘实现；自测注入收集器即可，不触真实文件系统。
 */
export function createLogSink({ target, file = resolveLogFile(), append = appendLine }: { target: LogTarget; file?: string; append?: LogWriter }): LogTarget {
	try {
		mkdirSync(dirname(file), { recursive: true });
	} catch {
		// 目录建不出来时后续追加同样静默失败；装载期不得因观察面抛错。
	}
	const emit = (level: keyof LogTarget, message: string): void => {
		try {
			append(file, `[${new Date().toISOString()}] ${message}\n`);
		} catch {
			// 观察面自身故障没有更高观察面；抛错会变成一步失败。
		}
		try {
			target[level](message);
		} catch {
			// 宿主发行面抛错不得中止一步（同 token-baseline / sessionWarnOnce 先例）。
		}
	};
	return {
		info: (message) => emit("info", message),
		warn: (message) => emit("warn", message),
	};
}

/** `~` / `~/` / `~\` 前缀按 OS home 展开（与宿主 `expandHomePath` 同形；其余值原样返回）。 */
function expandHome(value: string, home: string): string {
	if (value === "~") return home;
	if (value.startsWith("~/") || value.startsWith("~\\")) return join(home, value.slice(2));
	return value;
}

/** 缺省追加面：同步追加（每会话行数为 O(1)、行短，异步面不成比例）。 */
function appendLine(file: string, line: string): void {
	appendFileSync(file, line);
}
