# Agent Note: 架构规范立项（TS 分层约束 / 依赖边界 / blast-radius 影响面）

Status: implemented
Review: FULL/2026-09-10/R1=ok R2=ok R3=ok

> Provenance：本仓原创立项（2026-09-10，讨论轮拍板）。出处：用户定向「先搞定架构规范，TS 的架构规范」；[HANDOFF-todos](../../../../HANDOFF-todos.md)（D）条 + 设计稿 §10 内容域表。
> Related：写作模式单源 [standard-authoring](../../../../docs/method/standard-authoring.md)；机器面先例（判不立）C15 见 [2026-09-08-b4-mount-wiring](2026-09-08-b4-mount-wiring.md) Decision 6；「规范事前接入」余项同源见 [capsule-01-optimization-round](../../../../docs/research/capsule-01-optimization-round.md) §2.1。

## Problem

`docs/method/` 缺架构规范一篇：分层约束 / blast-radius 影响面 / 依赖边界三个内容域零规则家——分层与依赖的硬约束散在 `engine/adapters/scripts` 三个子树 AGENTS（各自只管本树失败，无通则、无新目录准入判据、无跨树依赖方向图）；blast-radius 只有 review.md §1 的定档判据（评审面），没有「改动前如何识别影响面」的方法论面；TS 特有架构面（循环依赖、导出面、发布形态）零成文。设计稿 §10 对该域的规划（机械校验 + ADR 决策）未建。机制面已先行落地（review-tier 触发集 / export-docs / adapters 防火墙 selftest）——内容域缺位使「规范事前接入」只有机器闸没有事前可读的规范文本。

## Decision

1. **落位**：新建 `docs/method/architecture-standards.md`（tier = method 正文，对齐 [doc-standards](../../../../docs/method/doc-standards.md) tier 表）；`doc-budgets.manifest.json` 增条目（max_words = 1500）。**现状地图不另立文件**——与上游 desktop 的 `architecture.md` 两文件形态不同，本仓现状契约由 README「Structure」节承载，规范篇链接之（单仓三族规模，两份现状文件即双源漂移面）。
2. **基准蒸馏（采纳原理，不照抄模板）**：基准 = Google TS Style Guide 组织面（named-only export、最小化导出面、禁 namespace/`require`、`import type`/`export type` 分野、相对路径限父级）+ TS Handbook（模块语义 / Project References 编译边界——多 tsconfig 拆分不现在做，留触发条件）+ Node ESM/package exports 发布面契约 + 上游 desktop `architecture-standards.md` 体裁（分层表 + 编号判别式规则 + 与 coding-standards 分工声明）+ 上游 DSH 分层实证（B0–B5 ADR 在案证据）。本仓形状 = 单仓三族（engine/adapters/scripts）+ docs 面与门禁面，不上 Clean/Hexagonal 的分项目模板。
3. **内容域与划界**（四题拍板已收）：
   - TS 本仓实写 + 可迁移通则提炼为判别式（对齐 c1 编码规范「蒸馏基准 + 本仓专属例外」方法）。
   - **blast-radius**：本篇写「影响面识别与边界判定通则」（合同面/机器面/数据面/散文面四类识别）；定档判据单源留 [review.md](../../../../docs/method/review.md) §1，互链不重抄。
   - **机械面**：content-only——§健康闸节只写触发条件与候选阈值方法，各带触发条件，不立闸（上帝类闸 C15 判不立合流，含 [2026-09-08-b4-mount-wiring](2026-09-08-b4-mount-wiring.md) Decision 6 双候选：上帝类闸 + 文件名契约闸；循环依赖检测——实施批实测：主链三族 2026-09-10 n=46 源文件 / 81 条相对 import 边，环 = 0、跨族边 = 0、全部可解析，无实证对象；层方向 lint；project references 拆分）。
   - **code-standards §4** 工程纪律链接表保留互链，本篇为分层/依赖通则家（§4 增一行指本篇）。
4. **文章结构**（standard-authoring §3 模板）：§1 强制力度分档（沿用 [M]/[W]/[I]/[R]，逐条停档理由）→ §2 关键约定（编号 R1… + 判别式写法，细则有家的链接）→ §3 行为契约（收窄为「边界与失败传导」：spawn 合同失败语义 / 降级纪律，指针既有 ADR 家；async/生命周期细则不属本篇）→ §4 健康闸（触发条件集）。

## Alternatives considered

- **直接按现状与自撰编写、不蒸馏权威**：落败——用户明确要求参考权威项目与官方文档；c1 先例 = 基准蒸馏社区权威 + 本仓专属例外，判据可溯源性是规范可信度的一部分。
- **纯语言中立通则**：落败——TS 特有面（import type 分野 / dist 发布面 / 编译边界）恰是本篇增量，语言中立化把它们全推给子树 AGENTS，空白依旧。
- **blast-radius 判据迁入本篇**：落败——review.md §1 是评审契约单源，迁移动评审面且 tier 闸口径联动，改动面大收益零（互链已达单源）。
- **本轮立机械闸（禁 import 环 / 层方向 lint）**：落败——C15 先例：无失控件立闸 = 防 speculative（HERO-O）；实施批实测主链零环、零跨族边，立闸无实证对象。触发条件写入健康闸节。
- **code-standards §4 链接表迁入本篇**：落败——指针层非规则正文，两篇互链已满足单源；迁移徒增跨篇耦合。
- **另立 architecture.md 现状地图（desktop 两文件形态）**：落败——本仓现状契约已有家（README），再立即双源漂移面；desktop 单项目多组件规模才需要独立现状篇。

## Consequences

- **采用面（已落地）**：`docs/method/architecture-standards.md` + manifest 增条目 + `code-standards.md` §4 增一行改指 + 根 AGENTS「评审检查项」第 3 条增架构域语义面指针；实现批 `7cf4fa1`，R1/R2 评审修复批 `4fa0e1d`。
- **评审面**：`docs/method/**` = behavior-surface FULL（verify-review-tier 机械触发）；本批 FULL 三审已收口（R1 3B/3S + R2 2B/4S + R3 2B/2S 全采纳修复），证据行在头部。
- **触发条件集（已写入 architecture-standards §4）**：上帝类闸——真实失控件出现（改写困难/评审反复抓同一文件）→ 以**届时实测** max × 1.5 为候选阈值再过判据（重测为有意决策，不用 B4 回填定数 1158×1.5：population 随演化漂移，触发时点的分布才是有效基线）；import 环检测闸——真实环出现 → 立环检测闸（实施批实测脚本面复用）；层方向 lint——家族间违规 import 出现 → 候选；project references——单 tsconfig 构建墙钟成为瓶颈 → 拆分评估；文件名契约闸——真实产物入库 → 翻案再立（C15 Decision 6 双候选之一）。
- **后续内容域**：async/生命周期行为契约细则、性能面（设计稿 §10「优雅高效实现」域）不在本篇——留待真实需要时另立。
