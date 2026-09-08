/**
 * host-api-contract.mts — 宿主 API 类型契约断言（轨道 B-1；ADR
 * 2026-09-08-coding-enforcement-track-b）。
 *
 * 纯类型件：零运行时代码、零运行时 import（`import type` 在发射期擦除，dist
 * 产物为空模块）。判据 = `tsc --noEmit`（`ts-typecheck` 闸）——上游
 * `@deepseek-ai/*` 合同漂移即编译红，不新增门禁脚本、不新增 self-test。
 *
 * 断言面 = 本适配层实际依赖的宿主合同（逐条对应消费点）：
 * - 事件键 `Events`：`index.mts` 的 `ctx.on` 注册面；
 * - 工具 exec/result 形状：**键存在性**（宿主改名/删键即红）与**形状相容**
 *   （本层窄类型不得窄于宿主形状；对应 `mount.mts` 的 `ToolExecLike` /
 *   `ToolResultLike`）——两组互补，缺一有盲区；
 * - 决策判别式：`PreToolDecision` 三态、`PostToolDecision` 的 accept/block 与
 *   `additionalContexts`（`index.mts` 的消费面）。
 *
 * `defineTool` / `createUserMessage` 不在断言面：两者的真实调用点
 * （`tools.mts` / `index.mts`）由编译器按同一参数类型检查，再断一遍零证伪力。
 *
 * 防火墙面：本件是带宿主 **type-only** import 的模块之一（ADR Decision 3）；
 * adapter selftest 机器断言「值 import 仅 `index.mts`、type-only import 闭集
 * = 本件 + `selftest.mts` + `tools.mts`」（静态 / 动态 / re-export 三形态同扫）。
 */
import type { Events } from "@deepseek-ai/cordis";
import type { PostToolDecision, PreToolDecision, ToolExecution, ToolExecutionResult } from "@deepseek-ai/dsh-tools";
import type { ToolExecLike, ToolResultLike } from "./mount.mjs";

/** 断言助手：条件为假时 `tsc` 报「`false` 不满足 `true` 约束」。 */
type Assert<T extends true> = T;

// ── 事件键：index.mts 的六个 ctx.on 注册面 ───────────────────────────────
type _AgentPreStep = Assert<"agent/pre-step" extends keyof Events ? true : false>;
type _AgentSessionStart = Assert<"agent/session-start" extends keyof Events ? true : false>;
type _AgentCreated = Assert<"agent/created" extends keyof Events ? true : false>;
type _AgentDisposed = Assert<"agent/disposed" extends keyof Events ? true : false>;
type _ToolsPreExecute = Assert<"tools/pre-execute" extends keyof Events ? true : false>;
type _ToolsPostExecute = Assert<"tools/post-execute" extends keyof Events ? true : false>;

// ── 工具 exec 形状：键存在（宿主改名/删键即红）──────────────────────────
type _ExecNameKey = Assert<"name" extends keyof ToolExecution ? true : false>;
type _ExecArgumentsKey = Assert<"arguments" extends keyof ToolExecution ? true : false>;
type _ExecAgentKey = Assert<"agent" extends keyof ToolExecution ? true : false>;
type _ExecSignalKey = Assert<"signal" extends keyof ToolExecution ? true : false>;

// ── 工具 result 形状：键存在 ─────────────────────────────────────────────
type _ResultIsErrorKey = Assert<"isError" extends keyof ToolExecutionResult ? true : false>;
type _ResultContentKey = Assert<"content" extends keyof ToolExecutionResult ? true : false>;

// ── 形状相容：本层窄类型不得窄于宿主形状（宿主放宽/换型即红）────────────
type _ExecShape = Assert<ToolExecution extends ToolExecLike ? true : false>;
type _ResultShape = Assert<ToolExecutionResult extends ToolResultLike ? true : false>;

// ── 决策判别式：index.mts 的 deny / ask / block / context 消费面 ──────────
type _PreToolAllow = Assert<"allow" extends PreToolDecision["kind"] ? true : false>;
type _PreToolDeny = Assert<Extract<PreToolDecision, { kind: "deny" }>["reason"] extends string ? true : false>;
type _PreToolAsk = Assert<"ask" extends PreToolDecision["kind"] ? true : false>;
type _PostToolAccept = Assert<"accept" extends PostToolDecision["kind"] ? true : false>;
type _PostToolBlock = Assert<"block" extends PostToolDecision["kind"] ? true : false>;
type _PostToolContext = Assert<"additionalContexts" extends keyof PostToolDecision ? true : false>;

export {};
