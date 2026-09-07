---
name: noo-doc-standards
description: Use when writing, moving, reviewing, or auditing documentation in this repo — choosing placement/tier, separating tutorial from reference, trimming doc slop, responding to a verify-doc-budgets/verify-md-links failure, or "improve/audit the docs".
---

# 应用本仓文档标准

> Provenance：蒸馏自 dotnet-deepseek-harness-desktop `dsh-doc-standards`（MIT，2026-09-05）；tier 按本仓精简版重定向。
>
> 宿主口径：`noo-*` 技能随胶囊分发——引用的心源仓路径在 self-hosting 仓（Noogenesis）为活路径，在其他宿主为缓存参照实现（`<repoRoot>/.noogenesis/genes-cache/`），照读恒可，照跑先确认路径归谁。
>
> **本技能是引导，不是脚本（guidance, not a script）。** 文档规则的单一事实源在 [docs/method/doc-standards.md](../../../docs/method/doc-standards.md)（tier 表/写作铁律/slop 清单/证据严肃性）与根 [AGENTS.md](../../../AGENTS.md)「文档纪律」「字数预算」；本技能只提供操作工作流。散文判断与必需覆盖用 [noo-prose-standard](../noo-prose-standard/SKILL.md)；从不把长度本身当缺陷。

## Sources of truth（只读，不重述）

- [docs/method/doc-standards.md](../../../docs/method/doc-standards.md) — tier 表与口诀（bugs → cookbook；rationale → ADR；procedures → cookbook/method；contracts → README；standing orders → AGENTS.md）。
- [.agents/notes/README.md](../../notes/README.md) — 什么决定配一条 ADR 及其内部结构。
- [scripts/verify-doc-budgets.mts](../../../scripts/verify-doc-budgets.mts) / [verify-md-links.mts](../../../scripts/verify-md-links.mts) / [verify-cookbook.mts](../../../scripts/verify-cookbook.mts) — 机器门禁。

## 先审结构再审散文

对范围内每份人读文档做 tier 纪律检查（ADR 除外）：

1. 定位文档在导航中的位置；说出主题并识别直接子节点。
2. 设定允许的详细度：主题保留全细节；直接子节点按职责概括；更深解释移到所属下层并链接。
3. 按用途分类，不按路径/标题：tutorial 按序走到可观察产出；reference 在明确范围内支持查阅、无需顺序阅读。
4. 拆分实质性混合形态；小的次要形态放进清晰标注的小节。

放置成本检查：

- 移动是原子的：同变更内从老家删、往新家加、修**每个入站链接**。
- 生成物永不手改；改生成器源头。
- 改名/移动前 grep 入站引用（`verify-md-links` 抓链接目标 + `#fragment` 锚点）。

## 工作流（Workflow）——审计语料

结构检查后，用最便宜探针先跑 slop 清单。先用 `scripts/change-scope.mts <base> <head>` 定范围再做语义判断。

1. 度量：`node scripts/verify-doc-budgets.mts --manifest scripts/doc-budgets.manifest.json`（manifest 是心源仓实例——外部宿主自建同款清单后同法跑），再 `git ls-files '*.md' | xargs wc -w | sort -rn | head -30` 找未入预算的超重文件。
2. 猎杀推理转写泄漏（叙述史/死设计引用/评审编舞/控制流叙述/walkthrough）——用 [noo-trim-cot-leakage](../noo-trim-cot-leakage/SKILL.md)。
3. grep 标志性短语猎重复；留一个家，其余改链接。
4. 手抄目录/状态清单换成权威源头（真实树/脚本/生成参考）。
5. `implemented/` ADR 内删迁移计划/验收清单/未来时 spec 语言；留简短验证契约。

审计与编辑一律排除 `.agents/notes/archived/`（冻结）。承重规则保持 1-3 行 + 指向理由的链接；删故事、重复与推导路径。

## verify-doc-budgets 变红时

按根 AGENTS「字数预算」的**有序策略**：迁移到其他层（留一行链接）→ 精简 → 才提额度（manifest `_justify_bump` 留理由）——不许静默超限。预算过低本身是 bug，提额必须说清净增量。

## 技能附属资源形态（references/）

技能正文超预算或需携带模板/清单时，拆 `references/` 子目录（SKILL.md 只留操作流 + 相对链接；`verify-skill-format` 强制：拆了必须非空且被链接）。无需求不预铺空目录（用不上不写）。

## 验证与 PR 卫生

跑 `verify-doc-budgets` / `verify-md-links` / `verify-cookbook` + `git diff --check`。PR 正文给词数增减、解释任何有意的长文例外、列出跑过的核对。
