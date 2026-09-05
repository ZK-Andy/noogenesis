---
name: noo-find-simplifications
description: Use when working in this repo to find non-obvious simplification candidates, write proposed Agent Notes or inline TODO/FIXME notes, audit or coalesce superseded Agent Notes — especially dead, duplicated, speculative, over-built, added-then-removed, or hand-rolled-where-a-dependency-exists surfaces.
---

# 在本仓寻找简化候选

> Provenance：蒸馏自 dotnet-deepseek-harness-desktop `dsh-find-simplifications`（MIT，2026-09-05）；.NET 专属判据泛化，语言替换为本仓语境。
>
> 宿主口径：`noo-*` 技能随胶囊分发——引用的心源仓路径在 self-hosting 仓（Noogenesis）为活路径，在其他宿主为缓存参照实现（`<repoRoot>/.noogenesis/genes-cache/`），照读恒可，照跑先确认路径归谁。
>
> **本技能是引导，不是脚本（guidance, not a script）。** 把"找简化的地方"变成**有证据的 ADR**，删除或折叠真实存在的表面积。跟着代码走、保持判断活跃；几条论证充分的候选胜过一 pile 薄猜。

## Sources of truth（只读，不重述）

- [根 AGENTS.md](../../../AGENTS.md) — 编码约定与「评审检查项」。
- [docs/method/standard-authoring.md](../../../docs/method/standard-authoring.md) — 健康闸与"先拆再上"模式；简化不得越过它。
- [docs/method/doc-standards.md](../../../docs/method/doc-standards.md) — 单源原则：简化常常就是把重复事实并回一个家。
- [.agents/notes/README.md](../../notes/README.md) — ADR 规则（何时写、删除规则、Alternatives 强制）。

## 什么算强候选

强简化 = 删除/折叠/降级**真实存在**的东西，且有明确证据表明当前设计的成本高于收益：

- 公共方法/事件/配置项/助手/测试产物**没有生产消费者**。
- 只有测试或文档在消费，且它们钉住的行为不是承重的。
- **两个表示镜像同一事实**（尤其跨 durable 事件与临时事件）。
- 接缝上每个实现都必须支持、但没有任何消费者使用的方法。
- **手工重造**了成熟外部依赖已提供的能力，替换后能连实现带专属测试一起删。
- 同层重复逻辑可折叠为一个家且行为不变。
- 违反尺寸健康闸的神对象/超尺寸文件，可无行为变化地拆分。

薄候选不算：删一个 typo、纯改名、或"这看起来复杂"却没有调用点证据。

## 工作流（Workflow）——证明或否决每个候选

1. **先分类消费者再动笔**：生产语料（src/、门禁脚本）vs 非生产语料（tests/docs/ADR）。有生产调用者的候选是功能决策，不是清理。
2. **读调用点，不止 grep**：`rg` 符号/事件/配置键/方法名，然后追消费者；确认简化后行为确实等价且更好解释。
3. **否决/降级**当：有生产调用者（那是功能决策）；API 被某条 implemented ADR 或来之不易的防御模式显式辩护，且证据压不过那个理由；删除会带来无关 churn；想法正确但太小——降级为定向 `TODO(...)`/`FIXME`。
4. **保住边界/不变量**：不折叠有 ADR 记录的适配层、共享持久化边界、保护重入的所有权/取消路径。
5. **审计信任与生命周期边界**：每个防御拷贝/冻结/校验器/回调捕获，指名值从哪来、下一手归谁所有。

## 写 ADR

按 [.agents/notes/README.md](../../notes/README.md) 在 `.agents/notes/` 落一条 proposed：Problem（现 API + 文件 + 消费者证据，区分生产/非生产）→ Proposal（删/折/降级/搬家，含测试/文档清理）→ 落败理由的最强反驳 → 可观察终态与门禁 → 风险。与既有笔记重叠时并入既有条目，不重复创建。

## 并收被取代的 ADR

用户要求收敛笔记库时：按 [noo-archive-agent-notes](../noo-archive-agent-notes/SKILL.md) 的保留判断与归档机械；删除被取代笔记前，把每条独有 rationale/alternative/consequence 并入幸存所有者。

## 内联 TODO

`TODO(...)` 只用于小的、明确有用的清理（不是持久设计决策）：命名气味 + 稳定标签（`TODO(double-default)`）+ 为何现在安全 + 什么动作能简化。不为投机抱怨或需要决策的行为加 TODO。

## 验证

文档面 ADR 工作跑 `python3 scripts/verify-adr-format.py` + `git diff --check`；代码变更跑受影响面的门禁与测试；PR 正文总结新增/并收/删除与有意排除的范围。
