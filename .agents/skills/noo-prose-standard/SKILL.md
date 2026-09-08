---
name: noo-prose-standard
description: Use when writing, reviewing, restoring, trimming, or auditing prose in this repo — deciding where documentation or comments are required across Markdown, public-API contract comments, code and test comments, prompts, descriptions, diagnostics, and UI strings.
---

# 本仓的散文标准

> Provenance：蒸馏自 dotnet-deepseek-harness-desktop `dsh-prose-standard`（MIT，2026-09-05）；.NET XML doc 专属面泛化为"公共 API 契约注释"；双语纪律按本仓单语决策删除。
>
> 宿主口径：`noo-*` 技能随胶囊分发——引用的心源仓路径在 self-hosting 仓（Noogenesis）为活路径，在其他宿主为缓存参照实现（`<repoRoot>/.noogenesis/genes-cache/`），照读恒可，照跑先确认路径归谁。
>
> **本技能是引导，不是脚本（guidance, not a script）。** 写到足以保住契约，然后删除推理转写、重复与装饰。**契约** = 调用方/被调方/实现者/生产者/消费者所依赖的义务、不变量、前置/后置条件或兼容承诺。文档放置与预算用 [noo-doc-standards](../noo-doc-standards/SKILL.md)；猎杀推理泄漏用 [noo-trim-cot-leakage](../noo-trim-cot-leakage/SKILL.md)。

## Sources of truth（只读，不重述）

- [根 AGENTS.md](../../../AGENTS.md)「文档纪律」— 每事实一个家；写当前状态；相对链接可机器校验；禁裸文件名。
- [docs/method/doc-standards.md](../../../docs/method/doc-standards.md) — tier 表、写作铁律、slop 清单。
- [docs/method/standard-authoring.md](../../../docs/method/standard-authoring.md) — 强制力度分档（注释类规则落在哪档）。

## 保住完整命题

编辑前先识别段落里的**每个命题**：参与者/动作、条件/时序/顺序、模态（必须/可以/禁止）、否定保证与例外、所有权/副作用/失败模式/后果。只在每个事实子句都存活且结果更清晰时才删形容词、重复与叙述——**词数变小本身不是改进**。

使用点保留完整局部契约；架构/理由/算法/历史/长示例激进链接到所有者文档。一个解释一个家；必要的契约事实允许局部重复。

## 按位置定必需覆盖（不是单向缩短）

代码、类型与结构本身说不出的契约，要补回散文；已局部显然的不加注释。

- **代码注释**（公共 API 契约注释 / 内部注释）：判据与写法家 = 本仓 [code-standards](../../../docs/method/code-standards.md) §2——何时必须注释、判别式、不写什么。
- **测试**：只解释非显然的测试设计——为什么需要这个夹具/断言/平台适配/真实入口路径/间接观测；删 walkthrough 与清单。
- **Cookbook**：每条含前置条件、必需动作、真实入口路径、可观察验证、简短警告、域标签。
- **README**：消费者契约——配置、语义、失败、限制、扩展点。
- **ADR**：保留独有 rationale、机制、备选、后果、已落地验证证据、已命名的覆盖缺口；implemented 用现在时写已落地现实，删计划清单。
- **Prompt 与可见字符串**：措辞即行为；产出要实测或说明为何无快照适用。
- **诊断信息**：指名失败主体/路径、违反的规则、非显然时的修正；删内部执行叙述。

## 工作流（Workflow）

1. 要求显式 `scope`；缺失则报告所需输入并停止——不推断全仓范围。确认模式（automatic | interactive，默认 automatic；模式控制提问，不控制写权限——评审/审计任务只报告不修改）。
2. 判断前先读所有者文档与代码。
3. 每个候选拍类：keep / add / trim / restore / restructure / defer；只在任务授权时应用明确修改。
4. 先更新所有者再更新派生产物；学到新规则后回查同类段落。
5. 跑最窄相关门禁（`verify-md-links`、`verify-doc-budgets`、`git diff --check`）。
6. 报告：检视范围、明确修改、有意保留、推迟项、实际跑过的核对。

## 边界情形

只有当至少两个版本都满足完整命题规则但各牺牲一条已接受原则、且本技能未裁决该取舍时才算边界情形。automatic 模式：授权范围内应用明确修改，报告真实边界情形，不为推进而弱化命题。interactive 模式：同类段落归到管辖原则下，给两三个可行版本、推荐一个、说清事实/结构差异；不给劣质陪衬选项。
