# Agent Note: 文档单源化清账——清单/计数收敛 + 评审检查项补位 + 搬迁计划下沉

Status: implemented
Review: FULL/2026-09-06/R1=ok R2=ok R3=ok

> Provenance：本仓自生决策（无上游血统）；依据 = 2026-09-06 双路文档审计（技能面/文档面子代理，结论经用户拍板进入胶囊 01 优化轮第一簇）。

## Problem

文档审计实锤四类结构性漂移，机器门禁全部漏放：

1. **质量门清单三处手抄**：根 AGENTS.md 与 README.md/README.zh.md 各持一份逐行相同的 11 行命令块；README 自称「清单单源 engine/gates.json」，但 gates.json 实际 10 条（gene-format 是白名单外独立件）——散文与单源口径不一致，且散文块与 gates.json 本身已是两个可各自漂移的家。
2. **门禁计数漂移**：feature-flow「七脚本」、session-open「十件（九个 verify）」、release-flow「九门禁」、HANDOFF「开始步骤七件」与「状态区 11 件」——五处手抄数字各说各话。
3. **「评审检查项」悬空指针**：review.md §5 契约要求 AI 兜底清单「列于根 AGENTS.md」，noo-code-review（description 与正文两处）、noo-find-simplifications 均按此指称蒸馏，但根 AGENTS.md 无该节——清单实际单家在 review.md §5 内文，指针的家缺位。
4. **放错层与边界缺失**：capsule-01-migration-plan.md（211 行、已实施冻结的过程资产）放在仓库根，tier 表无其家、不在任何预算视野；doc-standards tier 表缺 docs/research/ 行（research/method 边界未写清）；HANDOFF 位置表写「设计文档（3 份）」实际 4 份。

根因：verify-doc-budgets（词数制、剔除代码块与表格）与 verify-md-links（只验链接目标存在）防「坏形式」不防「坏结构」——手抄清单各自不超限、语义指称悬空，皆在闸外。

## Decision

1. **可执行门禁清单单一事实源 = `engine/gates.json`（`scripts/gates.py --list` 发射、`--run` 消费）**：根 AGENTS.md「质量门」节收敛为短契约（清单来源 + 运行入口 + gene-format 例外指针），删除 11 行命令块；README 双语「Gates/门禁」节删除命令块改指针；四个结构性例外（review-tier / review-brief / change-scope / gene-format）的机制说明单家在 gates.py 头注，散文不再复制。
2. **散文中的门禁计数与手抄清单全部去除**：feature-flow / session-open / release-flow 的计数改「清单见根 AGENTS「质量门」」表述；HANDOFF 状态区的门禁清单行指针化、「门禁 9→10」类变更叙事修剪；README 双语 Status 的「十一件」去除。
3. **「评审检查项（AI 兜底）」清单补位于根 AGENTS.md**（编号 + 指向规则的家；v0 三项：文档纪律语义面 / ADR 口径一致性含证据严肃性三件套 / 胶囊内容域与门禁判据口径一致）；review.md §5 保留契约与机制、内嵌清单迁出防双家；两个技能与 standard-authoring 的既有指称就此落位，不再改。
4. **HANDOFF「开始步骤」并入 session-open 卡**：HANDOFF 只留一行指针；session-open 步骤 1 同步去掉对「开始步骤」子节的引用，消除循环。
5. **capsule-01-migration-plan.md 下沉 journal/**（tier 表明载的过程资产家、入 git；`git mv` 保留历史）：根 AGENTS「参考」、README 双语 Status、HANDOFF 背景共四处入站链接同变更改写；计划内 1 处相对链接随新位置修正。
6. **doc-standards tier 表补 docs/research/ 行**（设计文档与调研：设计意图与外部解剖，非当下状态快照）；HANDOFF 位置表去「3 份」计数。
7. **gates.py `--list` 信息面容忍缺槽位**（缺值以 `<key>` 占位发射，不 fail）——散文单源声明「`--list` 发射」必须真可裸跑（实施中实测发现：带槽位门禁使裸 `--list` exit 2，声明失实）；`--run` 执行面保持缺值 fail-closed 不变，两态分离由 self-test 夹具钉住。

## Alternatives considered

- **AGENTS.md 质量门节保留完整命令块**（agent 常驻可见）。落败：AGENTS 与 gates.json 双家正是本次漂移根因（AGENTS 块已含 gates.json 外的 gene-format 行）；agent 需要清单时 `gates.py --list` 即得，session-open 卡已指路。
- **立「清单一致性」机器闸**（散文与 gates.json 交叉比对）。落败（本轮）：散文语义比对闸成本高、误报面大，违背克制性进化；先以单源消除分叉面，若再漂移再立项。
- **评审检查项清单留 review.md 单家、改三处指针**。落败：review.md §5 契约自身要求清单「列于根 AGENTS.md」（评审代理的常驻面），改指针与契约自相矛盾；且技能 description（进 DSH 目录的 ≤500 字摘要面）已按 AGENTS 指称蒸馏，改指需连带蒸馏面。
- **capsule 计划下沉 .agents/notes/archived/**。落败：archived 是 ADR 生命周期的终态，非 ADR 资产入内污染决策树语义；journal/ 是 tier 表明载的过程资产家。
- **capsule 计划原地保留**。落败：审计判定为散乱信号（tier 无家、不在预算、211 行冻结历史占仓库根），与「每个事实只有一个家」冲突。

## Related

- D7 细化 [2026-09-06-m2-adapter-wiring](../architecture/2026-09-06-m2-adapter-wiring.md)「范围附带：gates.json 单源收口」的槽位语义：彼处「缺值 fail-closed」限定为执行面（`--run`）；`--list` 信息面缺槽位占位不 fail。
- D2 以单源化方式落实 [2026-09-05-review-mechanical-gate](2026-09-05-review-mechanical-gate.md) 的「AGENTS/流程卡计数同步」实现项（收口方式从逐项补数改为清单单源 + 散文去计数）。

## Consequences

- 门禁增删从此只改 gates.json 与 gates.py 头注（例外机制），散文面不再跟改——清单漂移面收窄到单点。
- 「评审检查项」指称全部落位；评审简报的兜底清单核对项今后从根 AGENTS.md 取。
- capsule 计划从仓库根消失；考古入口 = 根 AGENTS「参考」/README 双语/HANDOFF 指针。
- 机器闸盲区（手抄清单冗余、语义指称悬空）仍在——本轮以纪律收敛而非闸封堵；一致性闸为后续候选（见 Alternatives）。
