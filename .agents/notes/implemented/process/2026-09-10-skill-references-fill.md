# Agent Note: 既有技能 references/ 实拆补全（trim-cot-leakage + prose-standard）

Status: implemented
Review: LIGHT/2026-09-10/语义评审（范围化子代理：4 Blocker + 5 Suggestion 全采纳收口——上游残留表面 7 处改写为本仓真面、§3.4 死锚、推迟点错家、裸序号措辞、行数出处、§ 指位、keep 三清单单源、误报族标上游主体）

> Provenance：本仓原创内容批（2026-09-10）。触发出处：[B0 框架结构 ADR 件 4](../architecture/2026-09-08-b0-framework-structure.md) 的实拆触发条件（正文超预算或需携带模板/清单）——本批命中后者（携带示例库/扫描清单）；capsule 问题池 [§2.2-4/§3.5](../../../../docs/research/capsule-01-optimization-round.md) 合并账。用户拍板（2026-09-10）：暂不新增技能，先补既有技能 references/。
> Related：references/ 形态规则（判据与不实拆决定）见 [2026-09-08-b0-framework-structure](../architecture/2026-09-08-b0-framework-structure.md)（本件是其「实拆随真实需求另起」的兑现，非取代）；技能前缀与引入纪律见 [2026-09-05-skill-prefix-noo](2026-09-05-skill-prefix-noo.md)。

## Problem

B0 批为 `references/` 形态立了机器判据（拆了必须非空且被 SKILL.md 链接）并拍板「不实拆」，依据是 noo-doc-standards 单件实测无携带需求。但触发条件在两个技能上真实发生：

- **noo-trim-cot-leakage**：扫描审计需要两份随身材料——泄漏↔修复对照示例库（判定测试靠例句校准，正文 45 行装不下）与 grep 扫描电池（模式 + 排除面 + 已裁误报族，工作流第 2 步的执行件）。上游 `dsh-trim-cot-leakage` 正是这两个文件承载（deepseek-ai/deepseek-harness 克隆实测 wc -l：examples 275 行 + recall-batteries 52 行；desktop 等本地旧拷贝为 253/43，版本有差）；我方移植时未带，技能成了纯判据件（正文连一个示例都没有）。
- **noo-prose-standard**：「砍过头/均衡/写过头」三分对照是判别「词数变小不是改进」的校准材料（同一克隆实测 examples 169 行）；我方 SKILL.md 只有命题规则，无对照例。

其余五件不补：noo-doc-standards 的上游分册内容在本仓有更具体的家（docs/method/ 各篇，链接已通）；archive-agent-notes / code-review / find-simplifications / pre-push-checks 无上游 references 先例、亦无携带需求——预铺即违「用不上不写」。

## Decision

1. **两件补 `references/`，提炼后搬迁非逐字搬运**：
   - `noo-trim-cot-leakage/references/examples.md`（泄漏↔修复对照 + 过度纠偏陷阱）——示例全部改写为本仓表面（ADR 路径引用、HANDOFF/capsule 问题池、引擎代码注释），并按本仓体裁校准：本仓设计稿/蓝图/问题池均已提交，§ 与里程碑（B0–B5/M1）引用有主，死引用判据按「HEAD 可解析」不按模式形态。
   - `noo-trim-cot-leakage/references/recall-batteries.md`（扫描电池）——中文主电池（变更叙述/死引用/评审编舞/对冲/半翻译工作语）+ 英文副电池；排除面按本仓裁定体裁（journal / postmortem / archived 冻结 / 技能自身校准引文）；误报族按本仓改写（有主 § 引用合法、体裁槽位、状态行元数据等）。
   - `noo-prose-standard/references/examples.md`（三分对照）——十四组砍过头/均衡/写过头，表面全部换为本仓实例（SKILL.md 范围行、cookbook 条目形状、ADR Testing 节、适配层载荷投影、gates DAG 与退出码、包面不变量、触点提醒语义）。
2. **SKILL.md 只加指针不改判据**：两件 SKILL.md 各增一行 references 链接（trim 的工作流第 2 步改指电池），正文判据不动。
3. **门禁零新增**：`verify-skill-format` 的 references/ 规则（B0 已立）直接生效——目录非空 + SKILL.md 相对链接在位；`verify-md-links` 把新文件纳入链接校验。

## Alternatives considered

- **不补，判据自足**：落败——判定测试与「先只读审计」步骤实际执行依赖例句校准与扫描模式，缺了这两份材料技能退化为纯口号；上游实践（2026-08 全仓清理）证明这两份是工作件而非装饰。
- **逐字搬运上游三份**：落败——`.agents/AGENTS.md`「引入即适配」纪律（frecency 11 技能全死链的教训）；上游示例绑定 DSH 表面（dsh-* 技能名、Agent Notes 双语机制、英文主语料），直接搬即死引用。
- **五件全补齐对称性**：落败——无携带需求的预铺就是空目录预铺（B0 拍板过的反面）。
- **示例进 SKILL.md 正文**：落败——懒加载机制下正文即加载面预算，示例库的量级（150–100 行级）会稀释操作流；references/ 形态正是为「按需注入」设计的。

## Consequences

- **采用面**：三份新 references 文件（各带 Provenance 行）；两个 SKILL.md 各一行指针；capsule 问题池 §2.1/§2.2-4/§3.5 合并落账（暂不新增技能拍板 + 实拆触发兑现）。
- **分发面**：references/ 随技能目录进胶囊分发（genes-cache 为整仓克隆，无需改发布面）。
- **验收**：`verify-skill-format` 绿（references 非空 + 链接在位）；`verify-md-links` 绿（新增内链全解析）；两技能正文判据零改动。
- **定档**：LIGHT（文档-only、零行为契约变更；`verify-review-tier` FULL 触发集未命中——skills/research 路径不在触发集）；评审 = 范围化语义评审（泄漏自染 / 事实可解析性 / ADR 质量 / 防过度）。
- **触发契约保持**：noo-doc-standards 正文纪律行不动——后续任何技能携带模板/清单时仍按 B0 判据走 references/ 形态。
