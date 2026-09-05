---
name: noo-code-review
description: Use when reviewing a change or batch of changes in this repo — orients the reviewer to this project's standards (root AGENTS.md「评审检查项」AI-兜底清单, docs/method/review.md 契约, docs/method/doc-standards.md 语义面) and the semantic checks machine gates cannot cover. Run before closing a FULL-tier review (the 三重审核 path).
---

# 评审本仓的一次变更

> Provenance：蒸馏自 dotnet-deepseek-harness-desktop `dsh-code-review`（MIT，2026-09-05）；.NET/C# 判据（D001–D003/R1/R3/IPC）按元规则替换为本仓"AI 兜底清单"机制。
>
> 宿主口径：`noo-*` 技能随胶囊分发——引用的心源仓路径在 self-hosting 仓（Noogenesis）为活路径，在其他宿主为缓存参照实现（`<repoRoot>/.noogenesis/genes-cache/`），照读恒可，照跑先确认路径归谁。
>
> **本技能是引导，不是脚本（guidance, not a script）。** 它补的是机器门禁盖不住的语义评审：指名缺陷、位置、影响、证据。正确性、生命周期、安全、被破坏的必需行为优先于风格；一条有实证的 blocker 胜过一串 nit。

## Sources of truth（只读，不重述）

- [根 AGENTS.md](../../../AGENTS.md) — 常驻规则与「评审检查项（AI 兜底）」清单。
- [docs/method/review.md](../../../docs/method/review.md) — 定档判据/范围收窄/简报模板/报告契约（评审执行契约的单一事实源）。
- [docs/method/doc-standards.md](../../../docs/method/doc-standards.md) — 文档纪律语义面（单源/写当前状态/slop 清单）。
- [.agents/workflows/feature-flow.md](../../workflows/feature-flow.md) — 评审在主链路的位置与等待纪律。
- [.agents/notes/README.md](../../notes/README.md) — ADR 规则（决策之家；Alternatives 强制与证据严肃性）。

## 先定精确范围

1. 从 remote/stack 状态确认分支与 base，**不猜测**；用 `scripts/change-scope.sh <base> <head>` 算出范围，retarget/base 合并后重跑。报告给出触碰路径，它不替代语义评审。
2. 不开局读全仓规则面——标准面按 diff 面按需引用（见 review.md §2 面收窄）。

## 工作流（Workflow）——审 diff

1. 确认范围与 base 后读 diff，对照本仓自己的分层（docs/ 方法论层 / .agents/ 协作层 / scripts/ 门禁层 / engine/ 演化机 + adapters/ 适配层）。
2. 按语义检查逐项过；上游/来源项目的私有概念**不适用**——按本仓等价物核对，无等价物的直接忽略（不硬映射）。
3. 语义检查清单（通用形态）：
   - **意图与接口契约**：追每个被改接口的双侧（调用方+实现方）；实现与 PR/ADR 陈述一致，含错误、取消、所有权、处置。
   - **生命周期与并发**：异步建立/回调/子进程/拆除——查发布前竞态、await 中的取消、错误独立上报、重入前所有权、拆净。
   - **能力与消费者匹配**：追每个现有消费者；泛型服务上只服务单一内部消费者的新公共方法要亮牌。
   - **范围/所有权/必要性**：每个抽象、状态机、选项、防御拷贝、兼容路径都映射到当前契约与真实消费者；挑战投机泛化。
   - **边界完整**：跨边界交互（进程/文件/网络/存储）经接口/约定，不直漏进业务层。
   - **真实入口路径**：测试走真实装配入口；手工挂载/mock-only 的测试不得声称覆盖它没进过的路径。
4. 按「AI 兜底」清单显式核对（机器门禁盖不住的项，见根 AGENTS.md；评审漏项即漏网）。

## 报告

说清缺陷、位置、影响、证据；局部缺陷给最紧的 diff 范围，跨切面综合给评审级结论。Blocker 与 Suggestion 分列；已被绿灯门禁覆盖的问题不重复报。收到评审意见时逐条核实，按技术依据修复或反驳，不做表演性同意。

## 验证

文档面跑 `python3 scripts/verify-md-links.py` + `verify-adr-format.py`；按 diff 面跑对应门禁；报告实际跑过的核对清单。
