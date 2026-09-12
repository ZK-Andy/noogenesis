# HANDOFF-evolution-pool — 演化轮池（候选归集区）

> 本件 = 演化轮候选的**归集面**（HANDOFF 家庭行动区的第二件）；规则与步序单源 = [feature-flow](.agents/workflows/feature-flow.md) §4.6（攒账三类 / 开轮触发 / 成批处理 / 销账）；「候选」节语义恒 = 未处理项（销账 = 处理完即删，口径单源 = [销账 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-candidate-disposal.md)）。
> 归集面决策 = [池件 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-file.md)；立闸门槛单源 = [发现机械化 ADR](.agents/notes/implemented/process/2026-09-11-review-finding-mechanization.md) Decision 1；准则条文 = [主设计 §6](docs/research/dsh-swarm-evolution-framework-design.md)。

## 候选

- **（2026-09-13）简化候选：同族原语的第三份拷贝已到共享件拐点**：症状 = `engine/mutation.ts` 的身份/读入外壳与 `capsule.ts`/`gene.ts` 逐字节同形（`validate*` 字段守卫 10 行、`read*` 读入抛物、`assert*IdUnique`、`*Path` 四组），`recordMutation` 与 `recordCapsule` 只差一行引用校验；`verify-gene-format.mts` 的 mutations 布局段与 capsules 段约 2/3 行是标识符替换，复算段同理。抽 `engine/protocol.ts` / 按 `{dir,noun,idKey,shaKey}` 参数化闸件段的收益 = 消除第三份拷贝且错误文案可保面名；代价 = 回触已冻结的 `gene.ts`/`capsule.ts` 与 py-parity 移植件「每面一段」的直读形状。触发 = 第 4 个原语落地前（序 3 或后续）。出处 = 批次 1 序 2 R1 评审 Suggestion 1/2。

- **（2026-09-13）契约候选：`capsule add` / `mutation add` 静默吞多余位置参数与重复 `--actor`**：症状 = `mutation add m.json --actor t extra.json` → exit 0（`extra.json` 被吞）、`--actor a --actor b` → exit 0 且事件 `actor='a'`；两命令同款（既有形态，非本批引入）。判据面 = 位置参数筛选式 `rest.find(...)` 无「恰一个候选」收窄、旗标无重复计数。若判为契约缺陷应与两条命令同批收紧（多余/未知参数 → exit 2），并同步 `engine/README.md` 合同面。出处 = 批次 1 序 2 R2 评审 Suggestion 4。

- **（2026-09-13）踩坑候选【探索性 n=1】：bash 调用之间的 `/tmp` 不持久**：症状 = 第一次 `bash` 调用把待改文件备份到 `/tmp` 后，第二次调用 `cp /tmp/... ` 报 `no such file`——变异检查的恢复步骤失效，在审/在改文件停在变异态（本会话实测一次，靠逐行反向编辑才复原；`git status` 与 `git diff` 即对账出口）。根因（【推断 · 未证】）= 会话沙箱每次 `bash` 调用使用独立临时面。规避 = 备份、变异、恢复、对账放**同一次**调用内完成；跨调用一律以 git 为恢复面（提交后再变异，或 `git checkout -- <path>`）。是否入 [cookbook](docs/cookbook.md)（[门禁] 条已有同族「变异副本落点」条目）= 待判，先攒账。出处 = 批次 1 序 2 R2 收口变异复核。

- **（2026-09-13）踩坑候选：`git add` 后 commit 失败会留下暂存态残留**：症状 = 入档命令（solidify / capsule add）commit 挂红后回滚了工作树文件，索引里仍留 `AD <path>`，下一次任何提交都会把已回滚的记录扫入（HEAD 与工作树分叉）；根因 = 回滚只清写面不清索引。本批已就地修（`commitPaths` 失败时 `git reset -- <本函数 paths>`，两侧夹具断言 `--cached` 无残留）。未机械化面 = 此教训是否该入 [cookbook](docs/cookbook.md)（该件 2688/2700 词，无余量）。出处 = 批次 1 序 1 R1 评审 Suggestion 1。

- **（2026-09-13）机械化候选：「判据分支是否都有可证伪夹具」可静态抽查**：形态 = 对新增判据逐分支做「只删该分支」变异后跑 `--self-test`，仍全绿即该分支无夹具（本批 12 处变异命中 9 处，已补 8 组）。成本 = 每次变异一跑，判据是否稳定到可上闸待实测。出处 = 批次 1 序 1 R2 评审 Suggestion 1。

- **（2026-09-13）纪律漏项候选：implemented ADR 里作为「决策时记录」的外部版本串，是否豁免「与上线现实同步」——口径未成文**：症状 = 本批把宿主 peer 从 `^0.1.0-rc.8` 升到 `^0.1.5-rc.2`（[升代 ADR](.agents/notes/implemented/architecture/2026-09-13-host-peer-generation-upgrade.md)），而 `b4-mount-wiring` 与 `m2-adapter-wiring` 仍以当时的 peer 串叙述；`.agents/notes/README.md` 的维护纪律只写「文件移动/改名/改默认值时同变更改写（只改事实，不改决定）」，对「决策时观测到的外部版本值」无判据。本批 R1 评审（Suggestion 5）以「决策时记录」分类放行，且先例自洽（M2 的 `^0.1.0-rc.6` 未随 B4 改写），但该分类此前只存在于本批 ADR 的影响面清账表。同类第二例 = cookbook 条的前提句在本批失效（R2 Suggestion 2，已就地转历史态）。触发 = 第二次遇到同类外部值需要同步时（或 notes/README 维护纪律下一轮修订）。出处 = 演化轮池归集（feature-flow §4.6.2）。

- **（2026-09-13）机械化候选：「CI self-test 抽查清单 ↔ `scripts/verify-*.mts`」可静态判**：形态 = 扫 `.github/workflows/validate.yml` self-test 块的命令集，与 `ls scripts/verify-*.mts` 对照（例外面具名：共享件 `mdref` / `pypara` / `srctree` 与 `change-scope.mts` 无 `--self-test` 入口、`gen-manifest.mts` 非 verify-*）。出处 = 演化轮落账批 R2 Blocker（新闸 `host-service-reads` 是清单里唯一缺席的 verify-* 件，而该块行注释自称「清单与 `scripts/*.mts` 一一对应」）——本批只采纳一行登记修法，判据稳定后开轮落闸。

- **（2026-09-13）护栏轮之经验：`git add -A` 在多会话共用工作树下会卷走他人在飞改动**：本会话与他会话并行时实际发生（他方 `section.mts` 未提交改动被卷，档位闸拦下后 `reset --soft` 退回）——纪律面已落 [cookbook](docs/cookbook.md)「协作」条；未机械化面 = 「提交前工作树里出现非己方路径」是否值得上闸（机械判定的代价：无法区分合法协同与误卷）。出处 = [护栏建设轮 ADR](.agents/notes/implemented/architecture/2026-09-13-guardrail-construction-round.md) 收口批。
- **（2026-09-13）`verify-review-tier` 在「proposed → implemented 迁移提交」上会把本批证据判为缺**：迁移提交只含 ADR 的改名与新 Review 行时，工作树态（未提交改名）下 `<since>..HEAD` 的 per-path diff 为空 → 证据判负；提交后即刻转绿（本会话实遇，收口提交后 `--enforce` 通过）。判据是否需要把「工作树rename + 同路径新增行」计入 = 待判；当前处置 = 先提交再核（顺序纪律，无需改闸）。出处 = [机械化 ADR](.agents/notes/implemented/process/2026-09-11-review-finding-mechanization.md) 门禁判据类。

## 待定（已记录的需求，待后续拍板）

- **池件自身的机器面**：条数 / 字数预算是否上闸（形态参照 [verify-handoff-structure](scripts/verify-handoff-structure.mts)），待池规模有实测再判。
