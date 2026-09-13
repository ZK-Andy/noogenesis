# Agent Note: Detect 逐源裁决（四）`tool/result`——结果面已由 A4 在消费，判不立（批次 3 序 14）

Status: implemented
Review: LIGHT/2026-09-13/pending

Related: 站立规则 [Detect 逐源裁决（一）](2026-09-13-detect-source-verdict-session-event.md) · 前源 [(二) `agent/error`](2026-09-13-detect-source-verdict-agent-error.md) / [(三) `agent/turn-stopping`](2026-09-13-detect-source-verdict-turn-stopping.md) · 批次表 [行 14](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · [P1 骨架 D2](2026-09-05-p1-engine-skeleton.md) · [M2 适配层](2026-09-06-m2-adapter-wiring.md) · A4 三件 [轨道 A ADR](2026-09-08-lint-in-loop-feedback.md) / [升格批](2026-09-09-lint-block-and-staged-hook.md) / [注释面扩面批](2026-09-10-export-docs-inloop.md) · [B4 挂载面 ADR](2026-09-08-b4-mount-wiring.md)（A3 能力位）· [A8 撤除批](2026-09-08-a8-session-record-projection-removal.md) · [M3 重拍 ADR](2026-09-13-m3-review-record-verdict.md) · 主设计 [§6 生命周期 / §11.1 生命周期钩子](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 蓝图 [§7 挂载面 A4 行 / §9 不做清单](../../../../docs/research/framework-rebuild-blueprint.md) · 宿主合同 `@deepseek-ai/dsh-session@0.1.5-rc.2`（事件 kind）+ `@deepseek-ai/dsh-tools@0.1.5-rc.2`（live 结果 hook）

## Problem

批次表行 14 要求逐源裁决 Detect 信号源 `tool/result`（出处 = 主设计 §6 Detect 行四源之末；§11.1 Tool 行给该面的语义 = 「工具结果信号、代码分发边界注入」）。站立规则 = [序 11 裁决件](2026-09-13-detect-source-verdict-session-event.md) Decision 1「自动 Detect 默认关 + 逐源过 HERO 两问」。本件是四源末件，裁毕即行 11–14 全裁。

**先立分野（两个同名面）**：`tool/result` 在宿主侧存在两个面——

- **持久事件 kind**（`@deepseek-ai/dsh-session` 类型面 `lib/types/types.d.ts:351–363`）：`SurfaceEventType` 之一，执行完成后由工具运行时 append，载荷 `{turn, step, message: ToolResultMessage, error?: {name, code}, meta?}`；失败的机器可读位 = `message.content[]` 的 `isError: true`，`error` 身份「allowed only when the tool-result block has `isError: true`」。它只出现在**会话日志流**里，读法即 `session/event` 订阅。
- **live 结果 hook**（`@deepseek-ai/dsh-tools` 类型面 `lib/types/index.d.ts:61`）：`tools/post-execute` = 带 `next` 的 waterfall，参数 `(exec, result: ToolExecutionResult, next)`，**A4 已订阅**（`adapters/dsh/index.mts:262`），`isError` 是 `ToolResultLike` 的消费键之一（`mount.mts:60–62`，`host-api-contract.mts:54` 有键存在性断言）。

故本源无论走哪条路都撞既有面：走日志流 = 序 11 已判 `session/event` 判不立（`tool/result` 只是该流的一个 kind，同一订阅面不带来独有信号）；走 live hook = A4 就是消费该结果对象的策略面。

实例面（本仓工作区 189 个 v3 会话卷实扫；口径 = `tool/result` 记录的 `isError` 真值与文本分类）【探索性：单机单仓、样本截至 2026-09-13、逐卷全量读取】：

- **总结果 13,787 条，失败 435 条（3.16%）**；按工具 = `edit` 369 / `write` 32 / `read` 11 / `job_output` 6 / `update_goal` 6 / `web_fetch` 4，其余 ≤2。
- 435 条失败的面分解：**A4 判据反馈（lint / 注释契约文本）184（42.3%）**——即本插件 A4 `block` 拦回自己产出的结果（样例 `engine/selftest.ts:17:5 eslint(no-unused-vars): …`）；**宿主 fs 观察面策略（read-before-write / stale）162（37.2%）**；编辑/读取未命中等模型可自纠项 43；web/provider 面 5；工具合同 / 权限面（子代理取消、goal 权威、问询中止）4；其他 37。
- 即：**近八成失败结果要么是本插件 A4 自己的产出，要么是宿主侧策略或模型可见自纠项**——不存在「A3 / A4 接不住的方法论面工具失败」这一类。

HERO 两问逐候选动作面过（检测到什么具体失败 → 真出现后下一步做什么不同）：

1. **通用工具失败 → gene / advice 注入**：第一问无具名映射——失败分类是工具自有的开集 `error.name/code`（实测 15 种 code，`read` / `edit` / `write` / `web_*` / `update_goal` / `list_agents` 各不相同），`select` 的信号合同是字面短语且基因库无按工具错误码索引的项；且失败结果本身就对模型可见（工作区 fs-observation-policy、编辑未命中的纠正指引都在结果文本里），注入不改变任何下一步。第二问 = 无。
2. **结果面失败派生器（复算 A4 判据）**：A4 已在同一结果对象上以 `block` / `context` 两档处置机器可判违规（lint + 注释契约，[轨道 A](2026-09-08-lint-in-loop-feedback.md) / [升格批](2026-09-09-lint-block-and-staged-hook.md) / [扩面批](2026-09-10-export-docs-inloop.md)）；实测失败面 42.3% 就是该判据的产出——再派生一份信号即复算 A4，双源、零独立证伪力（[序 8](2026-09-13-m3-review-record-verdict.md) 同型判据）。
3. **循环重复 / repeat-tool-reminder**（`tool/call` 名序列 + `tool/result`）：蓝图 §9「不做清单」在案，[序 11 裁决件](2026-09-13-detect-source-verdict-session-event.md) Problem 候选 3 已裁；本仓无长挂调用场景。
4. **记录件 / 观测面**：记录落点即 A8，已封；观测面写者集合显式不含适配层（记忆线第一期 ADR）——双源与越权各一条。且 `tool/result` 已在会话日志持久在案（本件实例口径即从该面读出）。
5. **A3 前置面补充**（`tools/pre-execute`）：A3 已接，其 deny / ask 能力位仍零策略（[B4 挂载面 ADR](2026-09-08-b4-mount-wiring.md)）——这是比结果面更早的同一类守卫位，需要新增工具级守卫时应落在该点（前置、可阻断），不在结果面派生信号。

## Decision

1. **`tool/result` 判不立**：不订阅该 kind、不派生工具结果信号、不增挂结果面策略；A4 现有 block / context 判据维持不变。依据 = 结果对象已被 A4 在更早、更窄的 live hook 上消费（实测失败面 42.3% 即 A4 自身产出，另 37.2% 为宿主 fs 策略），HERO 第一问无 A3 / A4 接不住的具名失败，第二问随之无行动面。
2. **行 14 的 HERO 两问答案**：检测的具体失败 = 未命名（四候选分别落「工具错误码开集无 gene 映射 + 失败已模型可见」「A4 已在消费同一结果对象」「蓝图 §9 不做清单」「A8 已封 + 写者面契约」；另指明更早的落点 = A3 前置面）；真出现后下一步不同的事 = 无（判不立即无行动面）。
3. **四源裁决收口**：行 11–14（`session/event` / `agent/error` / `agent/turn-stopping` / `tool/result`）**全部判不立**，站立规则不变——引擎信号入口维持显式喂入为唯一合同面，自动 Detect 默认关；后续任一源解除须重走本组独立裁决件。批次 3 下一件 = 行 15 情境按需注入，仍受「自动 Detect 默认关」约束、须自身过 HERO 另案。
4. **重议触发**（满足任一即重开本源并重写本件指针）：
   - **T1**：出现具名实例——某卷实证「工具结果面存在 A3 / A4 接不住的方法论失败信号（非 lint / 注释契约 / 门禁红），代价 ≥ 一次返工」（附会话卷与结果文本）。
   - **T2**：宿主把 `tool/result` 的 `error` 收窄为封闭分类（`name`/`code` 成有限集）**且** `select` 信号词汇表出现对应该分类的信号键与基因——派生器有判据可用。
   - **T3**：宿主拆分结果面（如为失败结果提供独立于 `tools/post-execute` 的窄订阅面），使结果信号的消费成本面重估。
5. **跨源成本面**：本源频次为四源最高（13,787 结果 / 189 卷，失败 435），但监听面 = A4 已在场的同一 hook，成本零增量；判不立的理由是**动作面缺席**而非频次，故 M3 重议不因本源自动满足（仍按[序 11 裁决件](2026-09-13-detect-source-verdict-session-event.md) Decision 1 的跨源条款：新增回调面才构成频次信号）。

## Alternatives considered

- **判接（订阅 `session/event` 的 `tool/result` kind，从结果流派生信号）**：落败——序 11 已判 `session/event` 判不立，本 kind 不带来该流之外的新信号；机器可判角落已在 A3 / A4，prose 分类面已两判不可判。
- **判接但在 `tools/post-execute` 增挂结果面策略**：落败——该 hook 就是 A4，现有判据（lint / 注释契约）已在同一结果对象上 block / 拦回；再挂一份策略即与 A4 双源，且新增面必须自证增量失败面，实测无。
- **判「与 A8 同条受宿主约束不可实现」**：落败——live 读面（`tools/post-execute`）在宿主合同内且已在场；判据是动作面缺席而非不可实现，两者重议触发不同。
- **把「通用工具失败」折算成 gene 信号**：落败——错误码是工具自有开集（实测 15 种），`select` 为字面匹配且基因库无按错误码索引项；失败文本已对模型可见，注入不改变下一步。
- **本件顺带把 A3 的 deny / ask 能力位启用**：落败——A3 是前置阻断位、与本源（结果面）不同面；启用须过自身 HERO 并配防死锁面（A6 同类纪律），触发条未满足即挂 = 造不可判信号。

## Consequences

- 批次表行 14 标 done（指针 = 本件）；「未交付」计数 33 → 32；行 11–14 四源裁决组收口，批次 3 下一件 = 行 15。
- 机制零变化：`adapters/**`、`engine/**`、`cordis.patch.yml`、`package.json` 均不动；A4 判据与档位不变。本件 LIGHT 档（纯文档收口，路径触发集未命中）。宿主依赖面零新增。
- 复算口径 = 宿主 `tool/result` 事件声明（`dsh-session/lib/types/types.d.ts:351–363`）+ `tools/post-execute` waterfall 合同（`dsh-tools/lib/types/index.d.ts:61`）+ 本仓 A4 订阅点与 `isError` 消费键（`adapters/dsh/index.mts:262`、`mount.mts:60–62`、`host-api-contract.mts:54`）+ 本仓会话卷 `tool/result` 扫描（189 卷 / 13,787 结果 / 435 失败，按 `isError` 真值与文本分类）。
