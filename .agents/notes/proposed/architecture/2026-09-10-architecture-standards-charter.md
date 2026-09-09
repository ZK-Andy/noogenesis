# Agent Note: 架构规范立项（TS 分层约束 / 依赖边界 / blast-radius 影响面）

Status: proposed

> Provenance：本仓原创立项（2026-09-10，讨论轮拍板）。出处：用户定向「先搞定架构规范，TS 的架构规范」；[HANDOFF-todos](../../../../HANDOFF-todos.md)（D）条 + 设计稿 §10 内容域表。
> Related：写作模式单源 [standard-authoring](../../../../docs/method/standard-authoring.md)；机器面先例（判不立）C15 见 [2026-09-08-b4-mount-wiring](../../implemented/architecture/2026-09-08-b4-mount-wiring.md) Decision 6；「规范事前接入」余项同源见 [capsule-01-optimization-round](../../../../docs/research/capsule-01-optimization-round.md) §2.1。

## Problem

`docs/method/` 缺架构规范一篇：分层约束 / blast-radius 影响面 / 依赖边界三个内容域零规则家——分层与依赖的硬约束散在 `engine/adapters/scripts` 三个子树 AGENTS（各自只管本树失败，无通则、无新目录准入判据、无跨树依赖方向图）；blast-radius 只有 review.md §1 的定档判据（评审面），没有「改动前如何识别影响面」的方法论面；TS 特有架构面（循环依赖、导出面、发布形态）零成文。设计稿 §10 对该域的规划（机械校验 + ADR 决策）未建。机制面已先行落地（review-tier 触发集 / export-docs / adapters 防火墙 selftest）——内容域缺位使「规范事前接入」只有机器闸没有事前可读的规范文本。

## Proposal

1. **落位**：新建 `docs/method/architecture-standards.md`（tier = method 正文，对齐 [doc-standards](../../../../docs/method/doc-standards.md) tier 表）；`doc-budgets.manifest.json` 增条目（实施批随变更）。**现状地图不另立文件**——与上游 desktop 的 `architecture.md` 两文件形态不同，本仓现状契约由 README 结构节承载，规范篇链接之（单仓三族规模，两份现状文件即双源漂移面）。
2. **基准蒸馏（采纳原理，不照抄模板）**：基准 = Google TS Style Guide 组织面（named-only export、最小化导出面、禁 namespace/`require`、`import type`/`export type` 分野、相对路径限父级）+ TS Handbook（模块语义 / Project References 编译边界——多 tsconfig 拆分**不现在做**，留触发条件）+ Node ESM/package exports 发布面契约 + 上游 desktop `architecture-standards.md` 体裁（分层表 + 编号判别式规则 + 与 coding-standards 分工声明）+ 上游 DSH 分层实证（B0–B5 ADR 在案证据）。本仓形状 = 单仓三族（engine/adapters/scripts）+ docs 面与门禁面，不上 Clean/Hexagonal 的分项目模板。
3. **内容域与划界**（四题拍板已收）：
   - TS 本仓实写 + 可迁移通则提炼为判别式（对齐 c1 编码规范「蒸馏基准 + 本仓专属例外」方法）。
   - **blast-radius**：本篇写「影响面识别与边界判定通则」（合同面/机器面/数据面/散文面四类识别）；定档判据单源留 [review.md](../../../../docs/method/review.md) §1，互链不重抄。
   - **机械面**：content-only——§健康闸节只写触发条件与候选阈值方法（上帝类闸 C15 判不立合流；循环依赖检测——主链现状无已知 import 环【推断 · 未证，实施批实测】；层方向 lint；project references 拆分），各带触发条件，不立闸。
   - **code-standards §4** 工程纪律链接表保留互链，本篇为分层/依赖通则家（§4 改一行指本篇）。
4. **文章结构**（standard-authoring §3 模板）：§1 强制力度分档（沿用 [M]/[W]/[I]/[R]，逐条停档理由）→ §2 关键约定（编号 R1… + 判别式写法，细则有家的链接）→ §3 行为契约（本轮收窄为「边界与失败传导」：spawn 合同失败语义 / 降级纪律，指针既有 ADR 家；async/生命周期细则不在本轮）→ §4 健康闸（触发条件集）。

## Alternatives considered

- **直接按现状与自撰编写、不蒸馏权威**：落败——用户明确要求参考权威项目与官方文档；c1 先例 = 基准蒸馏社区权威 + 本仓专属例外，判据可溯源性是规范可信度的一部分。
- **纯语言中立通则**：落败——TS 特有面（import type 分野 / dist 发布面 / 编译边界）恰是本篇增量，语言中立化把它们全推给子树 AGENTS，空白依旧。
- **blast-radius 判据迁入本篇**：落败——review.md §1 是评审契约单源，迁移动评审面且 tier 闸口径联动，改动面大收益零（互链已达单源）。
- **本轮立机械闸（禁 import 环 / 层方向 lint）**：落败——C15 先例：无失控件立闸 = 防 speculative（HERO-O）；现状无已知环【推断 · 未证】，立闸无实证对象。触发条件写入健康闸节。
- **code-standards §4 链接表迁入本篇**：落败——指针层非规则正文，两篇互链已满足单源；迁移徒增跨篇耦合。
- **另立 architecture.md 现状地图（desktop 两文件形态）**：落败——本仓现状契约已有家（README），再立即双源漂移面；desktop 单项目多组件规模才需要独立现状篇。

## Consequences

- **采用面（实施批）**：新建 `docs/method/architecture-standards.md` + `doc-budgets.manifest.json` 增条目 + `code-standards.md` §4 一行改指 + 根 AGENTS「评审检查项」第 3 条口径核对（胶囊内容域与门禁判据一致性——新篇入 docs/method 后触发面变化核对）。
- **评审面**：`docs/method/**` = behavior-surface FULL（verify-review-tier 机械触发）；实施批走 FULL 三审，本 ADR 随批收口翻 implemented。
- **触发条件集（写入健康闸节）**：真实 import 环出现 → 立环检测闸；真实失控件（改写困难/评审反复抓同一文件）→ 上帝类闸候选阈值 max×1.5 过判据；家族间违规 import 出现 → 层方向 lint 候选；单 tsconfig 增量编译成为瓶颈 → project references 拆分评估。
- **后续内容域**：async/生命周期行为契约细则、性能面（设计稿 §10「优雅高效实现」域）不在本轮——留待真实需要时另立。
