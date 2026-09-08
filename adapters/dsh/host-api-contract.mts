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
 * - 工具 exec/result 形状：`mount.mts` 的 `ToolExecLike` / `ToolResultLike`（策略件入参）；
 * - 决策判别式：`PreToolDecision` 三态、`PostToolDecision.additionalContexts`；
 * - 工厂入参/返回：`defineTool`（`tools.mts`）、`createUserMessage`（`index.mts`）。
 *
 * 防火墙面：本件是带宿主 **type-only** import 的模块之一（ADR Decision 3）；
 * adapter selftest 机器断言「值 import 仅 `index.mts`、type-only import 闭集
 * = 本件 + `selftest.mts` + `tools.mts`」。
 */
import type { Events } from "@deepseek-ai/cordis";
import type { PostToolDecision, PreToolDecision, ToolDefinition, ToolExecution, ToolExecutionResult, defineTool } from "@deepseek-ai/dsh-tools";
import type { createUserMessage } from "@deepseek-ai/dsh-llm";
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

// ── 策略件入参：宿主 payload 必须落在本层窄类型内（漂移即红）────────────
type _ToolExecutionShape = Assert<ToolExecution extends ToolExecLike ? true : false>;
type _ToolResultShape = Assert<ToolExecutionResult extends ToolResultLike ? true : false>;

// ── 决策判别式：index.mts 的 deny / ask / block / context 消费面 ──────────
type _PreToolAllow = Assert<"allow" extends PreToolDecision["kind"] ? true : false>;
type _PreToolDeny = Assert<Extract<PreToolDecision, { kind: "deny" }>["reason"] extends string ? true : false>;
type _PreToolAsk = Assert<"ask" extends PreToolDecision["kind"] ? true : false>;
type _PostToolBlock = Assert<"block" extends PostToolDecision["kind"] ? true : false>;
type _PostToolContext = Assert<"additionalContexts" extends keyof PostToolDecision ? true : false>;

// ── 工厂入参 / 返回形状 ──────────────────────────────────────────────────
type _DefineToolReturn = Assert<ReturnType<typeof defineTool> extends ToolDefinition ? true : false>;
type _UserMessageInput = Assert<
	{ content: Array<{ type: "text"; text: string }>; source: { kind: "plugin"; plugin: string } } extends Parameters<typeof createUserMessage>[0] ? true : false
>;

export {};
