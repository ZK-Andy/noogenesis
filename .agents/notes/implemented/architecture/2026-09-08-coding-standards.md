# Agent Note: 编码规范内容域补建——c1 文档约定 + 注释成文（零工具）/ c2 oxlint + 公共 API 注释强制

Status: implemented
Review: FULL/2026-09-08/R1=ok R2=ok R3=ok

## Problem

- 主设计 §10 内容域表列「代码规范」（编码约定、评审清单 → 可 lint/typecheck 机械校验）自 P1 起规划在案、至今未建；「编码规范、注释规范等没有接入协作体系」出自问题池用户原话（[capsule-01-optimization-round.md](../../../../docs/research/capsule-01-optimization-round.md) §1.2，2026-09-06），非主设计原文。
- 现状家底（2026-09-08 实测）：全栈 TS 已随 B1–B5 收官（engine/adapters/scripts 均 `.ts/.mts`，dist 发布面，node ≥22 原生 type stripping）；但 13 条门禁清单**零 lint/format**，仅 `ts-typecheck`（strict）兜类型层；无 `.editorconfig`/prettier/eslint/oxlint。
- 真实编码约束**散落多处**（引擎零依赖、`.mts` 显式 ESM、防火墙只 spawn 引擎、`exec.arguments` 宿主合同形状教训、夹具纪律、退出码 0/1/2 语义等），agent 写码时无单源可读；「每事实只有一个家」纪律在此域尚未落地。
- 注释契约半建：`noo-prose-standard` 已覆盖「何时需要注释」散文面（公共 API 契约注释判据），但无成文规范、无机器强制档，标准与现状未分离（standard-authoring §2 口径）。

## Decision

**批次化（用户拍板 2026-09-08）：c1 文档约定 + 注释成文（零依赖零工具）；c2 接 oxlint + 公共 API 注释机器强制（2026-09-08 交付）。**

### c1（已交付，零新依赖）

1. **新建 `docs/method/code-standards.md`（编码规范正文）**，**注释为主体**。结构（用户拍板 2026-09-08：注释为主要内容、规范正文完整）：
   - **注释规范（最大内容块，独立成文）**：公共 API 契约注释判据（自 `noo-prose-standard`「按位置」节收编为家 + 扩写，该技能代码注释条目改指此处）、何时写/不写注释、注释不写什么（推理转写/变更史/slop，承接 doc-standards 铁律与 CoT 治理）、档位声明；
   - **命名与结构约定**：标识符、文件组织、模块边界（判别式写法，可判定「是否违反」）；
   - **格式与风格**：c1 批零 lint 工具，先落可判别式约定，工具化升档排 c2（条目落「留评审」档）；
   - **评审兜底**：上述语义面（机器盖不住）条目列入根 [AGENTS.md](../../../../AGENTS.md)「评审检查项」第 4 条（兜底清单单源在根 AGENTS，机制见 [review.md](../../../../docs/method/review.md) §5）；
   - 工程纪律（引擎零依赖/防火墙只 spawn 引擎/夹具纪律/退出码语义等）**不占正文主体**——已有家 AGENTS/ADR，只留链接（每事实一个家）。

2. **基准 = 蒸馏权威规范为子集 + 本仓专属例外（用户拍板 2026-09-08）**：参照 desktop C# 规范先例（采用 dotnet/runtime + MS 约定、否决自创阈值），TS 世界的对应物 = 以社区权威（Google TS Style Guide / oxlint 推荐规则集）为基准，按本仓实际蒸馏成子集 + 本仓专属例外；不逐字节搬、不按自创阈值立规则（对齐 HERO）。

c1 已落地验证（2026-09-08，FULL 三审 R1 1B/4S、R2 1B/4S、R3 2B/3S 全采纳收口）：`code-standards.md` 存在且入 doc-budgets manifest（预算 1500 词）；条目全部带档位声明 + 停档理由 + 判别式；根 AGENTS「评审检查项」第 4 条在位且路由自洽；零新 devDependency、gates.json 零改动；md-links/doc-budgets/adr-format/tsc 全绿。

class 归 `architecture/` 的自证：本 ADR 拍板的是内容域结构面（方法论正文新增内容域 + 兜底清单接线 + 门禁判据分档），非纯流程动作——desktop 先例 `2026-08-30-csharp-coding-standard` 落 `process/` 源于其只搬既有标准、无此结构面。

### c2（已交付 2026-09-08，另立 ADR）

- 立项与取舍见 [c2 ADR](2026-09-08-c2-lint-enforcement.md)（同目录）：oxlint 显式白名单 + 导出面契约注释闸落地；2.1 存在性 / 2.3 词面 / §3 机械子集升 `[M]`，2.4 留 `[R]`（无工具判据，理由在该 ADR）。

## Alternatives considered

- **先工具强制（oxlint 直接进本批）**：落败——规则一次调不完、对想象中失败面投资（HERO-O），且编码约定尚未成文、无「为什么停在这档」的判定基础；工具面应承接已写明的约定而非凭空立规则。
- **文档 + 工具同步（合并一批）**：落败——工作量最大、c2 的规则调优需以 c1 成文条目的档位声明为输入，批次化让每批可独立验收（feature-flow 局部交付）。
- **只写通用 TS 风格指南**：落败——TS 风格教科书属通用知识非本仓约束；本仓真实的坑是散落的专属契约（零依赖/.mts/防火墙/宿主合同），收编这些才符合「每事实一个家」与 HERO。修正（2026-09-08 用户校准）：**工程纪律收编 ≠ 编码规范主体**——规范正文以「注释为最大块 + 命名/格式/结构」为主，工程纪律只留链接，防把规范写成工程纪律目录。
- **注释契约并入 noo-prose-standard 技能、不成文不强制**：落败（用户拍板 T3 反向）——散文技能是自觉面，公共 API 契约注释须有可引用成文 + 后续可机器强制（c2），才能从「半建」转「成文」。

## Consequences

- 编码/注释规范从「半建 + 散落」转「单源成文 + 档位声明」，agent 写码可查、评审有兜底。
- c1 为纯文档变更，已按 docs 门禁与 FULL 三审收口（含前提：编码规范属方法论正文，落 docs/method/，非 research）。
- c2 已引依赖（oxlint，devDependency 精确钉版）并过 P1 骨架 D1「引擎零依赖」边界：工具链在 scripts/ 面、engine 运行时零依赖不变（B1 工具链豁免先例），HERO 判据见 [c2 ADR](2026-09-08-c2-lint-enforcement.md)；adapters 防火墙允许集不受影响（依赖落在 scripts/ 面，见 [m2 ADR](2026-09-06-m2-adapter-wiring.md)）。
