# Agent Note: Detect 逐源裁决（二）`agent/error`——实例面全是 provider/API 失败，判不立（批次 3 序 12）

Status: implemented
Review: LIGHT/2026-09-13/语义评审（范围化子代理 R2：2 Blocker + 2 Suggestion 全采纳——宿主发射面口径收窄为「可观测子集」（四处调用仅主体异常一路落 `turn/end`，另三路被 `kick()` 吞掉且无持久记录）、P1 骨架 D2 现值残留；另两条为滚动窗条目与 §6 措辞）

Related: 站立规则 [Detect 逐源裁决（一）](2026-09-13-detect-source-verdict-session-event.md) · 批次表 [行 12](2026-09-13-feature-completion-backlog.md) · [P1 骨架 D2](2026-09-05-p1-engine-skeleton.md) · [M2 适配层](2026-09-06-m2-adapter-wiring.md) · 主设计 [§6 生命周期 / §11.1 生命周期钩子](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · [A8 撤除批](2026-09-08-a8-session-record-projection-removal.md) · [A4 拦回批](2026-09-08-lint-in-loop-feedback.md) · 宿主合同 `@deepseek-ai/dsh-agent@0.1.5-rc.2`（发射点 = 运行时包 `dsh-agent-loop@0.1.5-rc.2`）

## Problem

批次表行 12 要求逐源裁决 Detect 信号源 `agent/error`（出处 = 主设计 §6 把该事件列为 Detect 插点位；§11.1 Agent 行给它的语义 = 失败信号检测）。站立规则已由[序 11 裁决件](2026-09-13-detect-source-verdict-session-event.md) Decision 1 重拍为「自动 Detect 默认关 + 逐源过 HERO 两问」，本件只裁本源。

取证（2026-09-13，宿主 `0.1.5-rc.2`）：

- **合同**（`@deepseek-ai/dsh-agent` 类型面）：`agent/error` = 普通 `emit`（fire-and-forget，无否决位），载荷 `{agent, turn, step, error}`，`error` 声明为 `unknown`（原文 =「A step or turn errored. The machine reports a failure here even when the error has no in-turn position for a durable record.」），派发按 scope 过滤。
- **发射点**（运行时包 `dsh-agent-loop/lib/index.js:859–868`）：`throwError()` 先 `emit("agent/error", …)` 再 `throw`，抛出由 `kick()` 的驱动边界 `catch` 吞掉（`:871–873`，无否决位）；四处调用 = turn 主体未处理异常（`:982–991`）、driver 状态违约（`:920`）、`turn/start` append 失败（`:925–929`）、`turn/end` append 失败（`:998–999`）。**只有主体异常一路落持久记录**：该路设 `turnEnds = {kind:"error"}` 并由 `:994–997` 写 `turn/end {reason:{kind:"error", error:{message, code}}}`；另三路在 `turn()` 的 try 之外抛出或被自身 `catch` 吞掉，全程无 `turn/end`——与类型面注释「even when the error has no in-turn position for a durable record」同向：该事件的存在理由正是**无持久记录**的那部分失败面。
- **实例面**（本仓工作区 186 份 v3 会话卷实扫，路径 `~/.dsh/sessions/--mnt-work-Noogenesis--/<session>/session.v3.jsonl.zstd`，口径 = `turn/end` 的 `reason.kind === "error"`，即上述**可观测子集（主体异常一路）**的持久对应物；driver 违约与两条 append 失败无持久记录、结构性不可观测）：**5 份会话各 1 个错误回合，n=5**【探索性：单机单仓、样本截至 2026-09-13，消息面逐条取样】；消息三类 = `429: GoUsageLimitError（月度用量上限）` ×2、`Streaming response failed: [api_error] …` ×1、`Command Code API error 400 (BAD_REQUEST)` / `400:` 各一。**该可观测子集内全部是 provider/API 面失败**，无一例是本仓方法论面失败（lint / 注释契约 / 门禁红 / 越界写）——方法论面失败更早、更窄地落在 A3（`tools/pre-execute`）与 A4（`tools/post-execute`，其 block 档本身就会产生 `isError` 工具结果）。
- 本包现态：零 `agent/error` 监听；A2/A3/A4 三点已接（序 11 同口径）。

HERO 两问逐候选动作面过：

1. **按错误注入 gene / advice**：实例全部是配额与传输失败——正确处置在操作者侧（换模型 / 等配额 / 查 provider），宿主已 containment（回合收口 + 错误面呈现给用户）；本仓基因库是方法论基因，对 provider 错误无对应项，注入不改变任何下一步。为不存在的映射面建派生器 = 硬造不可判定信号（同 B4 M1 HERO 答案口径）。
2. **错误计数投影 / 记录件**（A8 形态）：记录落点即 A8，已封（宿主 `Session.append` 无 `ignorable` 写入口 + 读路径 fail-closed）；且主体异常一路已在 `turn/end` 持久在案（上条实例口径即从该面读出），再立记录件 = 双源零独立证伪力（序 8 同型判据）——另三路无记录且同样非方法论面，不构成记录件的独立对象。
3. **把错误写进观测面**（`observe`）：写者集合显式不含适配层（记忆线第一期 ADR：适配层不写观测面）——越权写 `.noogenesis/observations/` 破坏写者面契约。
4. **对 `agent/request-error`（重试瀑布）建面**：不在本批四源内（设计稿 §6 的 Detect 行里错误类源只有 `agent/error`），且重试策略归宿主 `dsh-llm-retry`；另立须走本批纪律外的独立裁决。

## Decision

1. **`agent/error` 判不立**：不监听该事件、不建错误派生器。依据 = 可观测子集内实例全是 provider/API 面失败（n=5，三类消息）、无方法论面失败样本；另三路（driver 违约 / 两条 append 失败）是宿主机件与状态违约，同样非方法论面且结构性无记录。可建的四条动作面分别落在「无映射面」「A8 已封」「写者面契约」「批外源」。
2. **行 12 的 HERO 两问答案**：检测的具体失败 = provider/API 面失败（配额 / 流式中断 / 请求 400，仅主体异常一路可观测）与宿主内部违约（driver 状态 / append 失败，无持久记录）——均为宿主或基础设施面，非方法论面；真出现后下一步不同的事 = 无（处置在操作者侧或宿主修复，注入 gene 不改变下一步）。
3. **与行 14 的分野在案**：工具级失败（`tool/result` isError）是更早、更窄的机器可判面，已在 A4 消费（lint / 注释契约拦回即以该档落地）；本源若开也只会复算该面。
4. **重议触发**（满足任一即重开本源并重写本件指针）：
   - **T1**：出现具名实例——某卷实证「宿主级 step/turn 错误有方法论可修根因，且代价 ≥ 一次返工」（附会话卷与错误消息）。
   - **T2**：`select` 信号词汇表出现 **error-kind 键**（如「provider 限流」「流式中断」）且存在对应该键的 gene——派生器有判据可用。
   - **T3**：宿主把 `payload.error` 收窄为具名封闭分类（`code` 集），使「错误类 → 信号键」成为确定性映射。
5. **跨源成本面**：本源可观测实例频次 = 5/186 卷（约 2.7%），监听成本本身低；判不立的理由是**动作面缺席**而非频次，故 M3 重议不因本源自动满足（仍按[序 11 裁决件](2026-09-13-detect-source-verdict-session-event.md) Decision 1 的跨源条款）。

## Alternatives considered

- **判接（监听 `agent/error`，按错误投 advice / 选 gene）**：落败——可观测子集内全为 provider 失败，基因库无对应项；错误类未成封闭分类（`error: unknown`），派生器只能硬造信号。
- **判接但只做记录（错误计数落观测面 / 事件轨）**：落败——观测面写者集合不含适配层；事件轨（A8）已被宿主约束封顶，且主体异常一路已在 `turn/end` 持久在案（另三路无记录、无独立对象）。
- **判「与 A8 同条受宿主约束不可实现」**：落败——读面（监听）按序 11 的分野在宿主合同内可接；判据是动作面缺席，不是不可实现，两者重议触发不同。
- **与序 11 合并裁四源**：落败——批次表「一件一交」；两源失败面与证据面各不相同（序 11 = 全事件流，本源 = 错误发射点 + 会话卷实例扫描）。

## Consequences

- 批次表行 12 标 done（指针 = 本件）；「未交付」计数 35 → 34；行 13–14 仍在[序 11 站立规则](2026-09-13-detect-source-verdict-session-event.md) Decision 1 下待裁。
- 机制零变化：`adapters/**`、`engine/**`、`cordis.patch.yml`、`package.json` 均不动；本件 LIGHT 档（纯文档收口，路径触发集未命中）。宿主依赖面零新增。
- 复算口径 = 宿主类型面 `agent/error` 声明 + 运行时包 `dsh-agent-loop` 的 `throwError` 四处调用（落持久记录的只有主体异常一路）+ 本仓会话卷 `turn/end reason.kind=error` 实例扫描（186 卷 / 5 命中 = 可观测子集）。
