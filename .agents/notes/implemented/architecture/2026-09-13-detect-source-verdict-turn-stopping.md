# Agent Note: Detect 逐源裁决（三）`agent/turn-stopping`——回合关闭边界非失败面，判不立（批次 3 序 13）

Status: implemented
Review: LIGHT/2026-09-13/语义评审（范围化子代理 R2：2 Blocker + 3 Suggestion 全采纳——P1 骨架残留现值句 + 批次表封条行未随行 13 推进；行号偏一 / `max-tokens` n=0 证据口径 / M3 Decision 指针两处）

Related: 站立规则 [Detect 逐源裁决（一）](2026-09-13-detect-source-verdict-session-event.md) · 前源 [Detect 逐源裁决（二）](2026-09-13-detect-source-verdict-agent-error.md) · 批次表 [行 13](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · [A6 能力位 ADR](2026-09-13-a6-turn-stopping-mount.md)（同一挂载点的投递通道面）· [M3 重拍 ADR](2026-09-13-m3-review-record-verdict.md) · [P1 骨架 D2](2026-09-05-p1-engine-skeleton.md) · [M2 适配层](2026-09-06-m2-adapter-wiring.md) · [A8 撤除批](2026-09-08-a8-session-record-projection-removal.md) · 主设计 [§6 生命周期 / §11.1 生命周期钩子](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 蓝图 [§7 挂载面 A6 行](../../../../docs/research/framework-rebuild-blueprint.md) · 对账步 [session-close](../../../workflows/session-close.md) §2 · 宿主合同 `@deepseek-ai/dsh-agent@0.1.5-rc.2`（发射点 = 运行时包 `dsh-agent-loop@0.1.5-rc.2`）

## Problem

批次表行 13 要求逐源裁决 Detect 信号源 `agent/turn-stopping`（出处 = 主设计 §6 Detect 行四源之一；§11.1 Agent 行给该钩子的语义 = 回合边界触发演化判断 / 失败信号检测；蓝图 §7 A6 行给同一挂载点的具名失败 = 「收尾检查单漏跑」）。站立规则 = [序 11 裁决件](2026-09-13-detect-source-verdict-session-event.md) Decision 1「自动 Detect 默认关 + 逐源过 HERO 两问」，本件只裁本源。

**先立分野（否则与序 7 撞名）**：序 7 已把 `agent/turn-stopping` 的**能力位**接线——`ctx.on` 单 listener 在场、`turnStopping: []` 零策略（[A6 能力位 ADR](2026-09-13-a6-turn-stopping-mount.md)）。本件裁的是**自动 Detect 信号源**：是否在该点派生信号喂 `select` / 触发演化判断、或增挂停止前策略。能力位 = 投递通道（`steer`），信号源 = 检测面，两者相邻不同面；故本源判不立**不**表现为「不订阅」——listener 已在场，判不立 = 不增任何信号派生与策略。

取证（2026-09-13，宿主 `0.1.5-rc.2`）：

- **合同**（`@deepseek-ai/dsh-agent` 类型面 `lib/types/runtime-types.d.ts:379–400`）：`agent/turn-stopping` = `@mode serial`，payload `{agent, turn, signal}`，listener 签名 `(payload) => Promise<void> | void`——**无 `next`、不接决策返回值**；时刻 = 「模型不再欠响应（无在场工具调用、无新 steering）」的回合关闭前，在边界提交前 await；「object 的 listener 用 `agent.steer(...)`，机器重读 inbox」。载荷**不含任何失败位 / 原因字段**；`signal` = 当前回合的 abort 信号。
- **发射点**（运行时包 `dsh-agent-loop/lib/index.js:966–971`）：回合循环内 `if (turnEnds && this.inbox.nextStep.length === 0) await this.dispatch.serial("agent/turn-stopping", {turn, signal})`，随后重读 `inbox.nextStep.length === 0` 决定 break。可达的 `turnEnds` 只有两种——`completed` 与 `max-tokens`（由 `:1115–1119` 的 `step()` 返回）；`blocked` 在 `:942–944` 直接 `return false`、`aborted` / `error` 在 `:976–991` 的 catch 里赋值后抛出，**两者都不过此派发点**。故该事件 = 「跑过至少一步、且收口时 inbox 空」的**正常回合关闭边界**，不是失败通报。
- **实例面**（本仓工作区 188 个卷目录，其中 186 份含回合记录的 v3 会话卷实扫；路径 `~/.dsh/sessions/--mnt-work-Noogenesis--/<session>/session.v3.jsonl.zstd`，口径 = `turn/end` 的 `reason.kind`）【探索性：单机单仓、样本截至 2026-09-13、逐卷全量读取】：回合 587，其中 `completed` **548（93.4%）** / `aborted` 34 / `error` 5，**`max-tokens` 0**。即本源事件的可达面就是「绝大多数正常回合」——把它当失败信号读，等价于对 93% 的正常回合报警。
- 本包现态：A6 单 listener 在场、零策略（`mount-policies.mts:195` `turnStopping: []`）；engine `select` 的信号合同 = 字面信号短语精确匹配，唯一入口 = 显式喂入（序 11 Decision 1）。

HERO 两问逐候选动作面过（检测到什么具体失败 → 真出现后下一步做什么不同）：

1. **停止前续跑守卫**（`steer`，蓝图 §7 A6 行的具名失败「收尾检查单漏跑」）：第一问判不出——载荷只有 `{agent, turn, signal}`，每个正常回合都过此点（实测 93% 回合面），「本回合该不该续跑 / 该不该补收尾」是任务语义判断而非机器可读位；要条件发行就得把 assistant 文本或轨迹分类成信号，即 prose 分类——[B4 挂载面 ADR](2026-09-08-b4-mount-wiring.md) 的 M1 HERO 答案与序 11 已两次判「硬造不可判定信号」。无条件发行则第二问代价直接兑现：停止前唯一档位是续跑档，每次投递 = 额外模型步与 token（A6 能力位 ADR Decision 3，该点无 advice 面）。同一失败面的承接面已在案且触发未到——`session-close` §2 的 ③ 对账零代码承接（[M3 重拍 ADR](2026-09-13-m3-review-record-verdict.md) Decision 2）；② 收口触点提醒维持缓议、停止前 lint / 门禁扫描维持不做（两者档位与触发 = 同件 Decision 3；触发分别 = ③ 抓到真实漏网、出现「不推送就交付」的实际会话）。
2. **回合边界演化判断**（主设计 §11.1 Agent 行的语义）：第一问无可命名答案——「回合关闭」本身是正常态，派生器同样只剩 prose 分类。且演化动作面按纪律异步于变更批次（主设计 §6「关键纪律」第 5 条 + [吸收撤除 ADR](../process/2026-09-12-absorption-async-round.md)），把演化判断挂到每回合边界 = 每回合回调与频次抬升——正是 M3 重议信号。
3. **回合成本 / 边界记录件**：记录落点即 A8，已封；观测面写者集合显式不含适配层（记忆线第一期 ADR）——越权写破坏写者面契约。且 `turn/end` 已把每次收口的 `reason` 持久在案（本件实例口径即从该面读出），再立记录件 = 双源、零独立证伪力（[序 8](2026-09-13-m3-review-record-verdict.md) 同型判据）。
4. **`max-tokens` 截断面**（本源可达的唯二 `turnEnds` 之一）：第一问**可**命名——「模型输出被 token 上限截断」；但实测 **n=0**（全卷 587 回合的 `turn/end reason.kind` 全量扫描零 `max-tokens`）【探索性：样本面同前】，宿主已把 finish reason 呈现在消息与 UI 面，处置（继续 / 改写 prompt / 换模型）在操作者侧且非方法论面——为未观测面建派生器即防过度设计所禁的投机建设。
- **机器可判角落**（工具名 / 写入路径 / 命令 / 失败位）已在 A3 / A4 的 exec 面——更近、更窄、已在场；本源是更宽的第二宿主面，不带来独有信号。

## Decision

1. **`agent/turn-stopping` 判不立**：不派生 Detect 信号、不增挂停止前策略；现有 A6 能力位维持零策略。依据 = HERO 第一问无具名答案（该事件是 93.4% 正常回合的关闭边界，载荷无失败位；唯一非 `completed` 的可达子面 `max-tokens` 实测 n=0【探索性：样本面见 Problem】），第二问随之无行动面。
2. **行 13 的 HERO 两问答案**：检测的具体失败 = 未命名（四候选分别落在「任务语义不可判」「演化动作异步纪律 + 无判据」「A8 已封 + 写者面契约」「未观测面 n=0」）；真出现后下一步不同的事 = 无（判不立即无行动面）。
3. **与序 7 的分野在案**：序 7 = 投递通道接线（零策略能力位，已交付）；本件 = 信号源裁决（不派生）。本件因此不改 `adapters/**` 一行；A6 策略面三条候选的档位、触发与接线候选指针单源仍在 [A6 能力位 ADR](2026-09-13-a6-turn-stopping-mount.md) Decision 2 + [M3 重拍 ADR](2026-09-13-m3-review-record-verdict.md) Decision 3。
4. **重议触发**（满足任一即重开本源并重写本件指针）：
   - **T1**：出现具名实例——某卷实证「回合在应收尾处停止、代价 ≥ 一次返工」，且该失败面 A3 / A4 与 `session-close` ③ 接不住（附会话卷）。
   - **T2**：`select` 合同面扩出**回合边界类**非自然语言信号键（如 `max-tokens` / 回合数阈值）且存在对应该键的 gene——派生器有判据可用。
   - **T3**：宿主把 `payload` 扩出机器可读的收口分类（如 finish reason / `turnEnds.kind`），使「停止类 → 信号键」成为确定性映射。
5. **跨源成本面**：本源可观测频次为四源最高（≈548 次 / 186 卷），但监听成本本身为零增量（A6 listener 已在场）；判不立的理由是**动作面缺席**而非频次，故 M3 重议不因本源自动满足（仍按[序 11 裁决件](2026-09-13-detect-source-verdict-session-event.md) Decision 1 的跨源条款：新增回调面才构成频次信号）。

## Alternatives considered

- **判接（在停止前派生信号喂 `select` / 挂续跑守卫）**：落败——HERO 第一问无具名答案；条件发行需要 prose 分类（已两次判不可判），无条件发行 = 每回合多一步模型步与 token（该点无 advice 档）。
- **判接但只做记录件（回合边界事件计数落观测面 / 事件轨）**：落败——观测面写者集合不含适配层；事件轨（A8）已被宿主约束封顶；且 `turn/end` 的 `reason` 已在会话日志持久在案（本件实例口径的来源），再立一份记录件 = 双源、零独立证伪力。
- **判「与 A8 同条受宿主约束不可实现」**：落败——读面（监听）在宿主合同内可接（A6 listener 已在场即实证）；判据是动作面缺席而非不可实现，两者重议触发不同。
- **本件顺带把 A6 的停止前策略挂上（复用「收尾检查单漏跑」）**：落败——该失败面的承接面与触发条已在案（M3 重拍 ADR Decision 2/3 + A6 能力位 ADR Decision 2），触发未满足即挂 = 造不可判信号；且本件是信号源裁决，越界改策略面会与序 7 的评审边界重叠。
- **与行 14 合并裁两源**：落败——批次表「一件一交」；两源失败面与证据面不同（本源 = 回合关闭边界 + 会话卷回合扫描，行 14 = 工具结果 `isError` + A4 已在消费）。

## Consequences

- 批次表行 13 标 done（指针 = 本件）；「未交付」计数 34 → 33；行 14 仍在[序 11 站立规则](2026-09-13-detect-source-verdict-session-event.md) Decision 1 下待裁。
- 机制零变化：`adapters/**`、`engine/**`、`cordis.patch.yml`、`package.json` 均不动；A6 listener 维持零策略。本件 LIGHT 档（纯文档收口，路径触发集未命中）。宿主依赖面零新增。
- 复算口径 = 宿主类型面 `agent/turn-stopping` 声明（`dsh-agent/lib/types/runtime-types.d.ts:379–400`）+ 运行时包 `dsh-agent-loop/lib/index.js` 派发点 `:966–971` 与 `turnEnds` 可达集 `:1115–1119`（`blocked` / `aborted` / `error` 不经此）+ 本仓会话卷 `turn/end reason` 扫描（186 卷 / 587 回合 = 548 `completed` + 34 `aborted` + 5 `error`，`max-tokens` 0）+ 本仓策略面（`grep -n "turnStopping" adapters/dsh/mount-policies.mts` → 零策略空集）。
