# 会话收尾检查单（session-close）

> Provenance：蒸馏自 dotnet-deepseek-harness-desktop（MIT，2026-09-05）；差异：README 双语核对 → 单语核对；untracked 预期清单随 journal 入 git 调整。
>
> 每个开发批次完成或会话结束时执行（长会话可多轮触发，由 feature-flow 调用）；全部完成才算收尾。教训（源仓实证）：收尾清单没有的项就没人更新——README 徽章曾漂移数月无人察觉。

1. **提交对账**：`git log` 本会话全部提交 vs HANDOFF 最新记录——每条提交必须能对应到交接条目。
2. **技能与评审机器面对账（M1 守卫③ + 评审对账）**：grep 本会话宿主日志 `tool/result` 事件文本中的技能调用痕迹，列出本会话实际载过哪些技能；「该载未载」的裁断不自动化——对照本会话任务型留人/评审判断（证据面 = 宿主日志，A8 撤除后既定口径；拍板单源 = [M1 立项 ADR](../notes/implemented/architecture/2026-09-10-m1-guard-anti-overdesign.md) Decision 1③）。同面增 grep 评审机器面闭集标记（`verify-review-brief` / `verify-review-tier` / `gates --run`），对照本会话 ADR Review 行与收口条目——**「声称 FULL 收口但评审无机器面痕迹」即假完成**，补跑评审或显式降档后才算收口；跨会话评审（评审在先前会话完成、收口在续接会话执行）的标记经 Review 行日期与收口条目在案即视同有证据，不因本会话日志零标记误判（拍板单源 = [评审实质执行 ADR](../notes/implemented/architecture/2026-09-10-review-execution-reconciliation.md)）。
3. **决策落档（结论只落 durable 四家）**：本轮拍板结论是否已进 ADR / `docs/cookbook.md` / README / AGENTS？没有则补。**吸收对账**：本会话跑过评审的，[吸收阶段](feature-flow.md) §5 是否按步序走完——吸收账是否已出、**是否已呈用户确认（关口）**、四出口是否**已执行**（按 §5 回执逐条核落点）、发现的类是否已记入 journal（账与步序形态单源 = §5；判据与门槛单源 = [机械化 ADR](../notes/implemented/process/2026-09-11-review-finding-mechanization.md)）。**结论只落 durable 四家，不落 HANDOFF 滚动窗**——滚动窗不复述结论；凡待跨会话用的复现细节/取证点/判据，正文进 durable 家，滚动窗与待办区只留指针。
4. **待办对账（跨会话遗留的唯一落点）**：`HANDOFF-todos.md` 增删——本轮产生的跨会话遗留/观察/待复现项（够不上「结论/决策」的那类）**必须写进待办区**（写清受影响面与前置研究点；`[ ]` 条 ≤340 字、`[x]` 压缩为一行指针），不留滚动窗副本。
5. **README 核对（强制，每次收尾必做）**：核对 `README.md` 与 shipped 现实——计数、功能清单、结构表述；**有漂移即修正并随本批次提交**；无漂移也须在收尾汇报中显式说明「README 核对无变更」。
6. **未推送提醒**：本地领先 origin 的提交数如实告知用户；是否推送由用户定或按既定惯例。
7. **工作树确认**：`git status` 干净；untracked 仅限预期清单（`.cache/`、`node_modules/` 等被忽略目录）。
8. **journal 叙事**：本会话过程叙事追加至 `journal/` 当月卷（`YYYY-MM.md`，不存在则创建）；只记过程，不复述 durable 结论。
9. **交接条目**：HANDOFF「交接更新记录」滚动窗追加本会话**精条目**——日期｜类型｜**指向 ADR 的一行主题（不复述结论）**｜关键提交哈希（对账锚点）｜README 核对结论一行。**前置判据（fail-loud）**：凡本轮拍板的结论必须已在步骤 3 落 durable 家；未落则先补 ADR，不得以收紧条目代替。
10. **收尾汇报**：向用户汇报时附「待办全景速览」——按 A 待拍板 / B 待复验 / C 随手候选 / D 远期 四分类（速览视角，完整待办以待办区为准）；**附「吸收账回执」**（每条出口的落点与用户确认状态，源 = §5 第 4 步）；README 核对结论一并说明。
