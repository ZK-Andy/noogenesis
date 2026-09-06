# Agent Note: 护栏建设时序拍板——三件护栏延后，触发条件 = 首个胶囊优化完成

Status: proposed

## Problem

P1 骨架 ADR（[2026-09-05-p1-engine-skeleton](../../implemented/architecture/2026-09-05-p1-engine-skeleton.md)）「遗留面」把护栏三件归口写「M2」，但 M2 拍板与实现均为最小四件（system-prompt 节 / noo_* 三工具 / solidify 触发；Detect 显式不做，见 [2026-09-06-m2-adapter-wiring](../../implemented/architecture/2026-09-06-m2-adapter-wiring.md)），护栏实际未被 M2 接走。护栏清单不完整本身不是缺陷（逐项后置均有拍板），但归口标签失真——读起来像「已安排给 M2」，实际是悬空。当前实际暴露面：

- **token 基线不变量只有代理层**：主设计 §6 护栏 6（演化不得抬高常驻注入基线）的测量源缺位，仅 doc-budgets 字数代理在 CI 真强制；基因注入节是否抬高会话常驻 token 基线零测量。
- **严格改进正向度量 open**：骨架 D4 单源（「M2 重议」），候选信号（评审 Blocker 数追踪、token 常驻度量）未重议过。
- **canary 进程隔离无对应形态**：M2 = spawn 每调用一子进程，无常驻进程可挂 canary。
- **dsh-token-meter API 漂移（实测）**：设计稿 §6/§11/§11 表写 `estimateContent`/`contextBreakdown`/`contextPressure`，实物 `@deepseek-ai/dsh-token-meter@0.1.2-rc.1`（DSH 安装内实测）导出 `measure(session, requestHeader?)` / `estimateMessage(message)` + breakdown/usage 两个 projection 模块；设计稿写的是想象 API 名。

## Proposal

**用户拍板（2026-09-06）：护栏三件（dsh-token-meter 真测量层 / 严格改进正向度量 / canary 进程隔离）确认需要，但延后建设；触发条件 = 第一个胶囊优化完成后。**

- **触发参照交叉链接（2026-09-06）**：charter [2026-09-06-framework-rebuild-charter](../../implemented/architecture/2026-09-06-framework-rebuild-charter.md) 把优化路线升格为推倒重建（先框架、后协作层）——本 ADR 触发点语义 = 重建路线下的首个胶囊优化完成，护栏建设排在协作层重建收口之后；对齐随本 ADR 收口批落定。

- 本 ADR 收口转 implemented 时，同步把骨架 ADR「遗留面」三项的归口「M2」修正为「首个胶囊优化完成后触发」（本 ADR 为该归口的修正单源，骨架 ADR 处只留指针）。
- 遗留面其余项**不在本拍板内**（非护栏）：js-yaml 例外权 + YAML 迁移器（书写卫生）、Detect 信号源（D2 禁区，行为面）——维持各自归口，对账余项见 HANDOFF-todos；流程卡「谁来喂信号」增强已落地（session-open 卡喂信号条，2026-09-06，不再是对账余项）。
- 设计稿 §6/§11 三处 API 名修正随护栏建设轮执行（以实测导出 `measure` / `estimateMessage` 为准）。
- 触发点到达时走立项讨论轮：逐件拍板（接入形态、验收口径、与 doc-budgets 两层口径的关系），再进实现轮。

## Alternatives considered

- **M2 补建三件护栏**（按原归口字面执行）：落败——护栏是防护性投入，胶囊 01 尚未经真实优化轮使用，护栏要防的回归形态（常驻注入膨胀、改动劣化）还没有真实样本；过早建设 = 对想象中的失败模式投资，且抬高 P1「最小闭环」纪律的违背成本。
- **立即建最小 token 测量**（只接 `estimateMessage` 量常驻节）：落败——半建状态的测量层既打破引擎零依赖边界（token-meter 是宿主插件依赖，属适配层资产），也给不出完整 pressure/surface 口径；要么不建要么建全，触发时一并做。
- **宣布护栏不需要**：落败——用户明确「护栏是需要的」；放弃与主设计 §13 风险清单（token 膨胀 / 演化方向失控）直接冲突，只是时序问题。

## Acceptance criteria

- 触发点（首个胶囊优化完成）到来时，存在护栏建设轮（立项讨论 → 拍板 → 实现），三件护栏逐条收口，骨架 ADR 遗留面归口随收口修正。
- 触发点之前，HANDOFF-todos 中护栏项归口指向本 ADR，不再出现「M2」失真标签。

## Risks

- 触发条件「第一个胶囊优化完成」判定标准模糊（何为「优化完成」）——触发时须先拍验收口径，否则护栏建设可能被无限顺延。
- 触发前若基因真把常驻注入推高，无机器闸拦截，只靠 doc-budgets 字数代理与人工评审兜底——已知缺口，显式接受。
