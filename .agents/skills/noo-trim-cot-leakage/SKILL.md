---
name: noo-trim-cot-leakage
description: Use when auditing or fixing prose in this repo that reads like a leaked reasoning transcript — dead design-session citations such as (decision N), audit item codes, or §N of uncommitted drafts; change narration such as "used to", "no longer"; stack or review vantage; reviewer-addressed justifications; control-flow narration; or hedged planning residue in comments, docs, or Agent Notes.
---

# 清理思维链泄漏（CoT Leakage）

> Provenance：蒸馏自 dotnet-deepseek-harness-desktop `dsh-trim-cot-leakage`（MIT，2026-09-05）；双语镜像类按单语决策删除。
>
> 宿主口径：`noo-*` 技能随胶囊分发——引用的心源仓路径在 self-hosting 仓（Noogenesis）为活路径，在其他宿主为缓存参照实现（`<repoRoot>/.noogenesis/genes-cache/`），照读恒可，照跑先确认路径归谁。
>
> **本技能是引导，不是脚本（guidance, not a script）。** 思维链泄漏 = 视角是**写作会话**而非**仓库**的散文：引用只有那个会话能看到的产物、叙述变更而非状态、与已离场的评审者争论。修复从不是一删了之——先从仓库视角重述每个存活的事实子句，再删掉它周围的转写；一个事实子句都没有的段落（审计编号、控制流叙述）直接删。[noo-prose-standard](../noo-prose-standard/SKILL.md) 拥有完整命题规则，本技能应用它。

## 唯一判定测试

对每个可疑段落问：**一个在 HEAD 的读者，拿不到任何会话记录、PR 线程、未提交草稿，能否解析每个引用、验证每个断言？** 不能 → 重述存活事实、删除其余。能 → 不是泄漏——但在 current-state 表面（README/docs）上，可解析的变更故事仍是变更叙述，路由到它的合法之家（commit/PR/ADR）。

## 八类泄漏

1. **死亡的设计会话引用** — `(decision 7)`、`(audit C2)`、`design §4.7`、阶段标签（`T4`、`P-I`）。决定有已提交的所有者（真实 ADR 路径）就按名引用；否则删引用、把事实子句重述到自立。
2. **Stack/PR 视角** — "a later PR in this stack"、"this PR adds"、"the previous commit"。陈述已落地机制或扩展点；推迟的工作进 `TODO`/issue。
3. **变更叙述与版本戳** — "used to"、"no longer"、"the old X"、"v1"、"today"。陈述当前行为；修好的回归写成现在时反事实（"without X, Y happens"），绝不写仓库史。
4. **评审编舞** — "Rejected in review:"、"the reviewer confirmed"、草稿序号、轮次归属。决策/理由作为平实事实保留；谁在何时说的删掉。
5. **面向评审者的自我辩护** — "the cast is safe — it simply…"。陈述让代码安全的不变量；代码已自明的删注释。
6. **复述与推导转写** — 控制流叙述（"first we X, then we Y"）、测试 walkthrough、明显分支的证明。删；只留非显然契约/不变量。
7. **对冲与计划残留** — "probably fine for now"、"should be enough"、无标记的推迟。升为 `TODO`/`FIXME` 或陈述真实边界；删对冲。
8. **写作语言混杂** — 中文正文里夹未翻译的工作语残留（或反之）。翻译或删除。

## 什么不是泄漏（keep 规则）

- **Issue 引用** — `#1470`、`TODO(name):` 在 HEAD 可解析；任何表面都保留。
- **ADR 内的合并 PR/issue 引用** — 合法证据（根「文档纪律」）。
- **抑制理由注释** — lint-disable 原因、豁免说明是必需散文；修假的理由，从不删真的。
- **现在时反事实回归钉** — "without X, Y happens"。
- **实测边界** — "（实测：512 层 ≈ 0.15s）"；"实测"这个词是承重的。
- **运行时新旧状态** — "旧连接先排空、新连接才接收"是运行时生命周期，不是变更史。
- **项目口吻与体裁形式** — 项目口吻的"我们"；ADR 的 Alternatives-considered 节。

## 工作流（Workflow）

1. 按 [noo-prose-standard](../noo-prose-standard/SKILL.md) 定 scope + 排除项：要求显式 scope；**永不触碰 `.agents/notes/archived/`（冻结）**与录制夹具。
2. **先只读审计**：grep 可疑模式（死 §/阶段标签、"used to"/"no longer"、评审编舞短语、对冲），对每个命中做语义判断；再无模式在手读范围内最密的散文（README、docs/method、ADR）。
3. 按表面修所有者优先：生成物 → 修源头；prompt/可见字符串 → 措辞即行为，标记需行为验证。
4. 删任何东西之前，先枚举该段落的命题（prose-standard），并核对过度纠偏陷阱：把义务剪成背书、把假设升成已落地、删掉真事实、丢掉出处。
5. 验证：重跑扫描期望只剩合法 keep；确认每个残留引用在 HEAD 可解析；跑触碰表面的门禁（`verify-md-links`、`verify-doc-budgets`、`git diff --check`）。
