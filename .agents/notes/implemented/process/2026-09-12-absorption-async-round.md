# Agent Note: 吸收撤出变更主链路——演化动作面改为异步归集轮

Status: implemented
Review: FULL/2026-09-12/pending（三重审核进行中，收口时回填真实结论）

Related: 被撤件 [吸收阶段 ADR](../../archived/process/2026-09-11-absorption-stage.md)（归档冻结）；准则条款家 [主设计 §6「关键纪律」](../../../../docs/research/dsh-swarm-evolution-framework-design.md)；动作面 [feature-flow](../../../workflows/feature-flow.md) §4.6 与 [session-close](../../../workflows/session-close.md) §3；门槛单源 [发现机械化 ADR](2026-09-11-review-finding-mechanization.md) Decision 1；写作规则 [阶段卡结构 ADR](2026-09-11-stage-card-structure.md)（铁律 7 与根 AGENTS 检查项第 6 条保留）；归集面 [HANDOFF-todos](../../../../HANDOFF-todos.md)；过程留痕 [journal 2026-09 卷](../../../../journal/2026-09.md)。

## Problem

吸收阶段（`feature-flow` §5：出账 → 呈报与确认〔关口〕 → 逐出口执行 → 回执）落在变更主链路内、提交之前。两道在册实证后果：

- **交付链被非交付动作阻塞**：关口规定整账经用户确认前不得执行出口、不得提交与推送；四条出口里三条（cookbook 踩坑 / 流程卡纪律 / 就地修）是本批可当场完成的动作，却要占一次人工往返。
- **投入产出不成立**：首例整账 14 类归口——新立机械校验出口 0、流程卡纪律 2，其余为不入库或语义面就地修（[journal 2026-09 卷](../../../../journal/2026-09.md)）；同批两处「先提交推送、后汇报」，关口在实际执行里被绕过。

**根因【推断 · 未证】**：本仓的演化动作有两处落点而节奏相反——引擎面的 gene solidify 挂 `agent/disposed`（会话末、人工确认，[主设计](../../../../docs/research/dsh-swarm-evolution-framework-design.md) §6 与 [蓝图](../../../../docs/research/framework-rebuild-blueprint.md) §7 A7）；内容面的四出口在批次内同步执行且阻塞提交。「演化动作面异步于变更批次」缺成文准则，同一处机制在两天内三次改向（子步 → 同级阶段 + 关口 → 撤除）。

## Decision

**1. 准则成文**：演化动作面——门禁 / 流程卡 / 规则 / cookbook / 基因的**框架级**改动——异步于变更批次；与批次同步的只有本批的裁决（逐条采纳 / 拒绝）与本批缺陷的就地修。框架级改动归集后由独立演化轮成批处理。

**2. 吸收撤出主链路**：`feature-flow` 删「吸收」节，后续节号回退（提交 → 推送 + 观察 CI → 收尾）。随节撤除的机制件 = 四步序、人工关口、吸收账回执、吸收收口提交（第二提交时刻）、收尾前置门里的吸收绑定。

**3. 义务各有其家，不新造载体**：逐条裁决 = [review.md](../../../../docs/method/review.md) §6「主会话裁决」；拍板结论只落 durable 四家 = [session-close](../../../workflows/session-close.md) §3；立闸门槛（判据稳定 + 噪声实测过关）= [发现机械化 ADR](2026-09-11-review-finding-mechanization.md) Decision 1，条文不动。

**4. 归集面 = [HANDOFF-todos](../../../../HANDOFF-todos.md)**：每批评审发现的**类**与可机械化候选，由主会话当场写一行进待办区（不新建池文件、不新建目录）；攒到可拍板或用户点名即开演化轮，成批落闸 / 落卡 / 落条目。

**5. 归档日判据的时区口径对齐（本批阻塞项的就地修）**：`verify-archived-agent-notes` 的 `Archived:` 日期改按 ≤ today_utc+1 判（与 [verify-adr-format](../../../../scripts/verify-adr-format.mts) 的笔记日期同口径，自测夹具补「+1 通过 / +2 被拒」两例）——被撤件归档在本机 CST 00:00–08:00 窗口会把「本地今日」判成未来，逼出 UTC 昨日的假归档日。

## Alternatives considered

- **甲 保留吸收节、只删人工关口与提交绑定**：落败——阶段仍在主链路内，「框架级改动随批次同步执行」这一根因不变；逐条裁决已有家（review.md §6），剩下的是重复面。
- **乙 彻底删除吸收概念（四出口与类记一并停）**：落败——「什么时候立闸」的动作通路随之消失，门槛变成无人执行的判据；Decision 4 是该通路成本最低的载体。
- **丙 改成批次内零关口自查**：落败——同一批既产 findings 又产框架级改动，等于把演化动作拉回同步面；无产出面时类记与候选随会话蒸发。
- **丁 归集面单开档案页 / 池文件**：落败——超出当前体量（用不上不写）；HANDOFF-todos 已有条数预算与结构闸，够用。

## Consequences

- 批次完成判据 = 评审通过 + 修复收口 + CI 绿（`feature-flow` §7）；收尾汇报不再含吸收账回执字段。
- 框架级改动的节奏与 gene solidify 对齐：异步、成批、可由用户一次拍板。本撤除批即演化轮的形态——用户点名立项、独立成批、走完整评审，不搭在其他变更批次上。
- **明确缺口**：门槛保留而动作通路改由待办区承载——待办区没人攒，门槛就不会被触发；如实记，不宣称机器已盖。
- 阶段卡结构规范继续适用：`feature-flow` §4.6 按步序 + 角色位写，无关口（关口只存在于演化轮的拍板处）。
- 发现类与复发计数仍是演化轮的输入（家 = journal 月卷 + 待办区），不再是批次内的固定产出。
