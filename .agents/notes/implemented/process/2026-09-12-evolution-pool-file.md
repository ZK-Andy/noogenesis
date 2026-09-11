# Agent Note: 演化轮池独立成件——候选归集面自待办区析出

Status: implemented
Review: FULL/2026-09-12/R1=ok R2=ok R3=ok

Related: 部分取代 [2026-09-12-absorption-async-round](2026-09-12-absorption-async-round.md) Decision 4（归集面自待办区迁至池件；异步准则 / 撤除主链路 / 义务归家三条决定不动）；归集面落点 = [HANDOFF-evolution-pool](../../../../HANDOFF-evolution-pool.md)；攒账步序 [feature-flow](../../../workflows/feature-flow.md) §4.6；收尾对账 [session-close](../../../workflows/session-close.md) §3；门槛单源 [发现机械化 ADR](2026-09-11-review-finding-mechanization.md) Decision 1；准则条文 [主设计 §6](../../../../docs/research/dsh-swarm-evolution-framework-design.md)；Decision 4 的延后项由 [销账 ADR](2026-09-12-evolution-pool-candidate-disposal.md) 落地。

## Problem

吸收撤除批把演化轮候选的归集面放在行动区待办件内（Decision 4：候选各写一行进 `HANDOFF-todos.md`，不新建池文件）。落地后暴露两处不成立【推断 · 未证】：

- **节奏相反而同居一簿**：待办区条数上限 16 条、开放条每行 ≤340 字，由 `verify-handoff-structure` 机器强制；池的增长由每批评审的 findings 驱动，与跨会话遗留的消化节奏无关。两者共享同一预算，池一涨就挤待办额度，反之亦然。
- **池条目的处置规则无家**：候选被演化轮吸收之后如何销账（勾账 / 删除 / 迁 ADR）与是否归档，在待办区无处承载——待办区只表达「未办」，不表达「办完的池条目去哪」。用户 2026-09-12 拍板池单独成件，行动区只留指针。

## Decision

- **归集面 = [HANDOFF-evolution-pool.md](../../../../HANDOFF-evolution-pool.md)**（HANDOFF 家庭行动区新件，仓库根）。待办区不再承载池条目，只在待办件留一行指针以保证行动区可见性。
- **攒账义务不变**：每批评审的可机械判的类 / 纪律漏项 / 带症状根因的踩坑，主会话当场各写一行进池件；开轮触发与成批处理口径照旧（步序 = `feature-flow` §4.6，门槛 = 机械化 ADR Decision 1）。
- **指针改指池件**：`feature-flow` §4.6、`session-close` §3、主设计 §6、`HANDOFF.md` 待办节与状态节、`HANDOFF-todos.md` 头部与池指针条、bank 技能 proposed ADR 的攒账入口。
- **吸收后处置本次只记录需求**：池件的「待定」节记下「候选被吸收后如何销账 / 是否归档」，不在本批设计形态（延后项已由 [销账 ADR](2026-09-12-evolution-pool-candidate-disposal.md) 随触发落地）。

## Alternatives considered

- **甲 维持待办区内（Decision 4 原样）**：落败——两套节奏共享 16 条预算，且待办件不是池处置规则的合法家（它只表达未办）。
- **乙 池入 `docs/research/`（仿 capsule-01 问题池形态）**：落败——tier 表把行动面指给 HANDOFF 家庭，`docs/research/` 禁放当下状态；且与已冻结的调研档案混层，读者分不清行动面与档案。
- **丙 池入 `.agents/`（流程面）**：落败——池是行动区数据不是流程规则；流程规则的家是 `feature-flow` §4.6。
- **丁 池件同批上机器闸（条数 / 字数预算）**：不采纳——池的合理规模尚无实测，吸收后处置规则未定，先立闸等于把未定口径固化；缺口如实记入 Consequences。

## Consequences

- 待办件回到「跨会话遗留的唯一落点」单一职责，池的增长不再挤占其条数预算。
- **池件无机器闸**（`verify-handoff-structure` 只管 `HANDOFF.md` + `HANDOFF-todos.md`）：攒账仍是主会话的手工义务，如实记，不宣称机器已盖。
- **吸收后处置规则**：本件延后（Decision 4），[销账 ADR](2026-09-12-evolution-pool-candidate-disposal.md) 随触发（首次演化轮落账，2026-09-12）落地。
- 部分取代 Decision 4 的指向面，吸收撤除批其余决定（异步准则 / 撤除主链路 / 义务归家）继续有效。
