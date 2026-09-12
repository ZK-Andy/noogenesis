# Agent Note: ADR 终局态治理——已执行/被取代的 proposed 记录逐条收口

Status: implemented

## Problem

`.agents/notes/proposed/` 的语义恒 = 活提案（[notes/README](../../README.md)：生命周期闭集 `proposed/` → `implemented/` → `archived/`，另有 `rejected/`）。实测四件里两件已不是提案，且都不是落败提案：

- `2026-09-06-guardrail-defer-trigger`：护栏三件的时序延后决定已被 [护栏建设轮 ADR](../architecture/2026-09-13-guardrail-construction-round.md) 接管——该件就同一三件重新逐条拍板；延后件正文亦自述「不再有追随意向，保留为已消耗的提案记录」。
- `2026-09-06-collab-rebuild-impl`：B0–B5 全批闭环、`noogenesis@0.2.0` 已发版，其决定（五批分法 / lefthook / 切换断点）执行完毕；它仍是七件实现轮 ADR 的父件，未被任何单件取代。

留在 `proposed/` 的代价不是观感：读侧据此判「提案在飞」，`session-open` 与 `feature-flow` §4.6 的取代检查面也据此判活跃度——归口失真恰是延后件当初被记为缺陷的同一形态（其问题清单第一条即「归口写 M2 而无人接走」）。

## Decision

判据 = 记录的决定与备选是否已被后续记录完全承接。两件逐条处置：

- **被完全取代的 proposed → 合并删旧**：`2026-09-06-guardrail-defer-trigger` 删除，入站链重定向到承载件 [护栏建设轮 ADR](../architecture/2026-09-13-guardrail-construction-round.md)。其决定（三件延后 + 触发条件）由承载件就同一三件重新拍板；其时机取舍（「护栏要防的回归形态还没有真实样本，过早建设 = 对想象中的失败模式投资」）的原则家 = [anti-overdesign](../../../../docs/method/anti-overdesign.md)，承载件 Alternatives 末条以反面用法复述同一原则。正文全文留 git 历史。
- **决定已执行且仍是结构记录的 proposed → 转 implemented**：`2026-09-06-collab-rebuild-impl` 迁 `implemented/architecture/`，骨架按 implemented 形态改写（`## Proposal` → `## Decision`；验收与风险并为 `## Consequences`；现在时）。它是七件实现轮 ADR 的父件，无单件可取代。
- **内容不是提案的 proposed 不进本批**：`2026-09-05-evomap-evox-engine-anatomy` 是码级解剖（调研档案，非决定），终局归口留 [档案页制度批](../../../../HANDOFF-todos.md) 的 tier 拍板；`2026-09-10-memory-line-fusion-charter` 仍是活提案（记忆库线第二期未开轮）。
- **归档不随本批**：`implemented/` 记录何时走 `archived/`（已落地的决定完成且正文不再指导未来工作时）按常规归档判断另批执行——归档须同步 `scripts/archived-notes.freeze.json`，`scripts/**` 触发 FULL 三审，不夹带。

## Alternatives considered

- **按 `rejected/` 保留**：落败——`rejected/` 语义是「提案落败」，延后件赢了并被执行，挂 rejected 是换一种失真；其保留判据（仍能防重蹈覆辙）也不成立：要防的「归口写 M2 却无人接走」形态已由承载件收口。
- **原样归档（正文零编辑 + 插 `Archived:` 行）**：落败——先例适用面不同。[评审机械闸延后](../../archived/process/2026-09-05-review-mechanical-gate-deferred.md) 的延后理由（desktop 路径模式全错的教训）未被落地件承接，必须留正文；延后件的决定与备选已由承载件承接，留一件已消耗记录只增取代检查面噪声。
- **两件都转 implemented**：落败——延后件的决定语义是「等，然后再拍」，承载件已就同一三件重新拍板；同一事实两个家违根 AGENTS「每个事实只有一个家」。
- **本批顺带把转 implemented 件也归档**：落败——归档是终局冻结（Erratum 之外不可再改）；对「已执行且仍是父件」的记录，先落 implemented 让事实对齐，冻结判断留到其正文真的不再指导未来工作时。

## Consequences

- `proposed/` 恢复语义恒等：余下两件都是真的没拍完的提案。
- 删除使延后件的时机理由退出 durable 树（全文可经 git 历史取回）。若后续判定该原则需要一处可引先例，落点应是 anti-overdesign 篇正文，而非复活一条已消耗记录。
- 本批纯处置面：不动门禁、不动 `scripts/`、不动档案页制度与记忆库线。
