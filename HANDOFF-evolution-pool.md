# HANDOFF-evolution-pool — 演化轮池（候选归集区）

> 本件 = 演化轮候选的**归集面**（HANDOFF 家庭行动区的第二件）；规则与步序单源 = [feature-flow](.agents/workflows/feature-flow.md) §4.6（攒账三类 / 开轮触发 / 成批处理 / 销账）；「候选」节语义恒 = 未处理项（销账 = 处理完即删，口径单源 = [销账 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-candidate-disposal.md)）。
> 归集面决策 = [池件 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-file.md)；立闸门槛单源 = [发现机械化 ADR](.agents/notes/implemented/process/2026-09-11-review-finding-mechanization.md) Decision 1；准则条文 = [主设计 §6](docs/research/dsh-swarm-evolution-framework-design.md)。

## 候选

- **（2026-09-13，序 3 更新）简化候选：同族原语的第三份拷贝已到共享件拐点**：症状 = `engine/mutation.ts` 的身份/读入外壳与 `capsule.ts`/`gene.ts` 逐字节同形（`validate*` 字段守卫 10 行、`read*` 读入抛物、`assert*IdUnique`、`*Path` 四组），`recordMutation` 与 `recordCapsule` 只差一行引用校验；`verify-gene-format.mts` 的 mutations 布局段与 capsules 段约 2/3 行是标识符替换，复算段同理（`<domain>/<id>` 正则一项已随批次 1 序 3 折叠为 `engine/util.ts` 的 `KEBAB_REF_RE` 单一来源，不在本候选内）。抽 `engine/protocol.ts` / 按 `{dir,noun,idKey,shaKey}` 参数化闸件段的收益 = 消除第三份拷贝且错误文案可保面名；代价 = 回触已冻结的 `gene.ts`/`capsule.ts` 与 py-parity 移植件「每面一段」的直读形状。触发 = 第 4 个原语落地前。出处 = 批次 1 序 2 R1 评审 Suggestion 1/2 + 序 3 R1 Suggestion 1。

- **（2026-09-13，序 4 更新：n=2；序 5 更新：n=3）纪律漏项候选：已收口泳道的简报会挡住下一路的发射闸**：症状 = R1/R2 收口提交后 HEAD 前移，留在 `.review-briefs/` 的两份已收口简报仍被 `verify-review-brief --enforce` 的「brief head 须钉住本仓 HEAD」判据扫到而报红（序 3 与序 4 两次实测）。序 5 实测第二形态：**先归档已收口简报**再发射 R3 时，默认泳道推导（FULL → R1,R2,R3）改判「R1/R2 missing brief」——两条路都需显式 `--lanes R3` 才过。判据面 = 该闸按文件夹里的全部简报判 head 与存在性，而非按本次发射的泳道；当前处置 = 收口一路即归档一路 + 发射时显式 `--lanes`（序 4、序 5 各一次即成）。是否该按 `--lanes` 收窄目录扫描待判。出处 = 批次 1 序 3/序 4/序 5 三审发射。

- **（2026-09-13）纪律漏项候选：转写他件决定的处置时，指针错挂在主题相近的 ADR 上**：症状 = 序 5 把「评分不做触发面」的归属写成序 5 ADR（该 ADR 全文无此决定，其自身把该判据指向护栏建设轮 Decision 2），序 4 ADR 遗留面同错——三审 R3 Blocker（本批已就地修，两处改指所有者）。根因 = 按主题相近而非按决策所有者指路；与评审检查项 #2「ADR 口径一致性」同面但更窄（只涉跨件归口指针）。同族第二形态（批次 3 序 11 R2 Blocker 1）= 引设计稿章节号错挂（把 §11.1 钩子表的 Session 语义记成 §4.2「双态定位」），同靠 R2 抓到。是否值得机械化（如「所有 ADR 引用的判据名须出现在被引 ADR 或由被引 ADR 再指」）待判。出处 = 批次 1 序 5 R3 评审 Blocker 1 + 批次 3 序 11 R2 评审 Blocker 1。

- **（2026-09-13）踩坑候选：git 路径输出不能 trim**：症状 = 带前导/尾随空白的文件名（如 ` lead.txt`）被 `line.trim()` 改写后，`readFileSync` 读不到实际文件，未跟踪行数静默少算为 0（序 4 三审 R2 临时仓实证：`files 1, lines +0/-0`）。根因 = 路径是字节串不是可随意规整的文本；规避 = 按行原样取用、只用 `filter(Boolean)` 去空行。未机械化面 = 是否入 [cookbook](docs/cookbook.md)（该件 2688/2700 词，无余量）。出处 = 批次 1 序 4 R2 评审 Suggestion 1（本批已就地修 + 加空白边界夹具）。

- **（2026-09-13）契约候选：`capsule add` / `mutation add` 静默吞多余位置参数与重复 `--actor`**：症状 = `mutation add m.json --actor t extra.json` → exit 0（`extra.json` 被吞）、`--actor a --actor b` → exit 0 且事件 `actor='a'`；两命令同款（既有形态，非本批引入）。判据面 = 位置参数筛选式 `rest.find(...)` 无「恰一个候选」收窄、旗标无重复计数。若判为契约缺陷应与两条命令同批收紧（多余/未知参数 → exit 2），并同步 `engine/README.md` 合同面。出处 = 批次 1 序 2 R2 评审 Suggestion 4。

- **（2026-09-13）踩坑候选【探索性 n=1】：bash 调用之间的 `/tmp` 不持久**：症状 = 第一次 `bash` 调用把待改文件备份到 `/tmp` 后，第二次调用 `cp /tmp/... ` 报 `no such file`——变异检查的恢复步骤失效，在审/在改文件停在变异态（本会话实测一次，靠逐行反向编辑才复原；`git status` 与 `git diff` 即对账出口）。根因（【推断 · 未证】）= 会话沙箱每次 `bash` 调用使用独立临时面。规避 = 备份、变异、恢复、对账放**同一次**调用内完成；跨调用一律以 git 为恢复面（提交后再变异，或 `git checkout -- <path>`）。是否入 [cookbook](docs/cookbook.md)（[门禁] 条已有同族「变异副本落点」条目）= 待判，先攒账。出处 = 批次 1 序 2 R2 收口变异复核。

- **（2026-09-13）踩坑候选：`git add` 后 commit 失败会留下暂存态残留**：症状 = 入档命令（solidify / capsule add）commit 挂红后回滚了工作树文件，索引里仍留 `AD <path>`，下一次任何提交都会把已回滚的记录扫入（HEAD 与工作树分叉）；根因 = 回滚只清写面不清索引。本批已就地修（`commitPaths` 失败时 `git reset -- <本函数 paths>`，两侧夹具断言 `--cached` 无残留）。未机械化面 = 此教训是否该入 [cookbook](docs/cookbook.md)（该件 2688/2700 词，无余量）。出处 = 批次 1 序 1 R1 评审 Suggestion 1。

- **（2026-09-13）机械化候选：「判据分支是否都有可证伪夹具」可静态抽查**：形态 = 对新增判据逐分支做「只删该分支」变异后跑 `--self-test`，仍全绿即该分支无夹具（本批 12 处变异命中 9 处，已补 8 组）。成本 = 每次变异一跑，判据是否稳定到可上闸待实测。出处 = 批次 1 序 1 R2 评审 Suggestion 1。

- **（2026-09-13）纪律漏项候选：implemented ADR 里作为「决策时记录」的外部版本串，是否豁免「与上线现实同步」——口径未成文**：症状 = 本批把宿主 peer 从 `^0.1.0-rc.8` 升到 `^0.1.5-rc.2`（[升代 ADR](.agents/notes/implemented/architecture/2026-09-13-host-peer-generation-upgrade.md)），而 `b4-mount-wiring` 与 `m2-adapter-wiring` 仍以当时的 peer 串叙述；`.agents/notes/README.md` 的维护纪律只写「文件移动/改名/改默认值时同变更改写（只改事实，不改决定）」，对「决策时观测到的外部版本值」无判据。本批 R1 评审（Suggestion 5）以「决策时记录」分类放行，且先例自洽（M2 的 `^0.1.0-rc.6` 未随 B4 改写），但该分类此前只存在于本批 ADR 的影响面清账表。同类第二例 = cookbook 条的前提句在本批失效（R2 Suggestion 2，已就地转历史态）。触发 = 第二次遇到同类外部值需要同步时（或 notes/README 维护纪律下一轮修订）。出处 = 演化轮池归集（feature-flow §4.6.2）。

- **（2026-09-13）机械化候选：「CI self-test 抽查清单 ↔ `scripts/verify-*.mts`」可静态判**：形态 = 扫 `.github/workflows/validate.yml` self-test 块的命令集，与 `ls scripts/verify-*.mts` 对照（例外面具名：共享件 `mdref` / `pypara` / `srctree` 与 `change-scope.mts` 无 `--self-test` 入口、`gen-manifest.mts` 非 verify-*）。出处 = 演化轮落账批 R2 Blocker（新闸 `host-service-reads` 是清单里唯一缺席的 verify-* 件，而该块行注释自称「清单与 `scripts/*.mts` 一一对应」）——本批只采纳一行登记修法，判据稳定后开轮落闸。

- **（2026-09-13）护栏轮之经验：`git add -A` 在多会话共用工作树下会卷走他人在飞改动**：本会话与他会话并行时实际发生（他方 `section.mts` 未提交改动被卷，档位闸拦下后 `reset --soft` 退回）——纪律面已落 [cookbook](docs/cookbook.md)「协作」条；未机械化面 = 「提交前工作树里出现非己方路径」是否值得上闸（机械判定的代价：无法区分合法协同与误卷）。出处 = [护栏建设轮 ADR](.agents/notes/implemented/architecture/2026-09-13-guardrail-construction-round.md) 收口批。
- **（2026-09-13）`verify-review-tier` 在「proposed → implemented 迁移提交」上会把本批证据判为缺**：迁移提交只含 ADR 的改名与新 Review 行时，工作树态（未提交改名）下 `<since>..HEAD` 的 per-path diff 为空 → 证据判负；提交后即刻转绿（本会话实遇，收口提交后 `--enforce` 通过）。判据是否需要把「工作树rename + 同路径新增行」计入 = 待判；当前处置 = 先提交再核（顺序纪律，无需改闸）。出处 = [机械化 ADR](.agents/notes/implemented/process/2026-09-11-review-finding-mechanization.md) 门禁判据类。
- **（2026-09-13）纪律漏项候选：批次表「行标 done 的时点」口径未成文**：症状 = 批次 2 序 7 的 R3 依前例（序 4 `d1d57f7`、序 5 `05e64d1` 均在实现提交标 done）判「实现提交即标 done」，而本批按「评审收口提交」处置；两种做法各自可自洽，但判据不在任何卡上，每次靠回溯 git 举证。待判 = 口径成文（实现提交标 done 还是收口标 done，及与 Review 行的先后）。出处 = 批次 2 序 7 R3 Blocker 1。
- **（2026-09-13）纪律漏项候选：部分取代 implemented 笔记时「被取代件现值同步」靠人工/评审抓**：症状 = 批次 2 序 7 的 R3 一次抓到两件（A8 ADR 三处现值失真：`MountPolicySet` 撤 `turnStopping` / `agent/turn-stopping` listener 删除 / 六点接线条目改四点；评审实质执行 ADR 的停止前候选档位口径与本批 A6 结论相反），均靠评审逐条对读而非机器。第三例（批次 3 序 12 R2 Blocker 2）= P1 骨架 D2 现值句「余三源（行 12–14）待裁」未随行 12 收口同步（序 11 的「同上」候选同族）；**第四例（批次 3 序 13 R2 Blocker 1）= 同一句改后仍留「行 12 … 余两源（行 13–14）」，同一泳道连续两批漏同步**——该句已成「每次收口必改」的高频面，值得优先机械化（如把「行 N 已判不立 / 余 M 源」句移出 ADR 正文、只留批次表指针）。同族第二形态（批次 3 序 13 R2 Blocker 2）= 批次表自身 Consequences「封条纪律」行「行 13–14 可裁决」未随行 13 推进（序 12 实现提交曾把该行由 12–14 推进为 13–14，即该行样本本身有前置同步记录）。可机械化面待判 = 新 ADR 的 Related 指向的 implemented 件里，被新决定证伪的句子能否静态判（如与新增面同名的关键词共现）。出处 = 批次 2 序 7 R3 Blocker 2/3 + 批次 3 序 12 R2 Blocker 2 + 批次 3 序 13 R2 Blocker 1/2。
- **（2026-09-13）纪律漏项候选：表内行备注「同上」在相邻行改写后继承语义**：症状 = 批次表行 11 备注由「逐源答 HERO 两问」改写成 done 叙述后，行 12–14 的「同上」被读成已收口，与同表「未交付：余 35 项」直接冲突（批次 3 序 11 R2 Blocker 2，本批已就地修——三行回填显式备注）。根因 = 表内跨行占位引用随被引行内容漂移；是否机械化（「同上」行须与被引行同态，或表内禁跨行占位）待判。出处 = 批次 3 序 11 R2 评审 Blocker 2。
- **（2026-09-13）纪律漏项候选：以「可观测子集」反推「发射面全集」**：症状 = 批次 3 序 12 用 `turn/end reason.kind=error`（`agent/error` 四处发射点中只有主体异常一路落该记录）的扫描读数叙述整个发射面（R2 Blocker 1，本批已就地收窄为「可观测子集」并限定各引用句）；类型面注释「even when the error has no in-turn position for a durable record」正是反证。根因 = 便捷的持久对应物被当成全集的观测面；可机械化面待判 = 证据句里的「全部/全为/即该面的…」是否须同句声明覆盖范围。出处 = 批次 3 序 12 R2 评审 Blocker 1。

- **（2026-09-13）纪律漏项候选：逐桶计数的口径未随件固化**：症状 = 批次 3 序 14 的 ADR 给出 435 条失败的面分解，但只写了桶名与数字、没给判据规则；R2 评审按「同口径」复算得 A4=181 / fs=164（件写 184/162），且「实测 15 种 code」在件自带样本上实为 **12 种**（评审独立复算 + 本批反查一致）；另有一桶「工具合同/权限面 4」与同件自报 `update_goal` 6 直接矛盾（R2 Blocker 1）——判不立结论未被推翻（聚合面 A4 + 宿主 fs ≈ 80.5% 稳），但逐桶值当时不可复算。规避 = 读数类证据句必须同时给判据规则（或脚本面），逐桶值一律纳入【探索性】；触发 = 下次写「分类计数」类证据面时。出处 = 批次 3 序 14 R2 评审 Blocker 1 + Suggestion 1/2。

- **（2026-09-13）纪律漏项候选：带小数的聚合读数被复制到多家，可复现性弱**：症状 = 序 14 的精确百分比（42.3% / 37.2%）同时出现在 ADR、批次表行备注、HANDOFF ⏭ 与当前状态条共 4 家；R2 评审「检查项① 文档纪律」指出单源纪律下这等于把一个弱可复现读数复制成四个家，且任一家口径修正即产生漂移面。规避候选 = 精确读数单源在 ADR，他处只留整数近似或指针；触发 = 下次跨家复制带小数的聚合读数时。出处 = 批次 3 序 14 R2 评审报告（检查项① 观察条）。

## 待定（已记录的需求，待后续拍板）

- **池件自身的机器面**：条数 / 字数预算是否上闸（形态参照 [verify-handoff-structure](scripts/verify-handoff-structure.mts)），待池规模有实测再判。
