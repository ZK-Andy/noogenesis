---
name: noo-archive-agent-notes
description: Use when adding, auditing, pruning, archiving, or reviewing Agent Notes (ADR) in this repo — checks every new note for superseded active records, classifies implemented notes by future decision value, deletes rejected notes that no longer prevent a tempting fallacy, and applies the frozen archived rules.
---

# ADR 归档与治理

> Provenance：蒸馏自 dotnet-deepseek-harness-desktop `dsh-archive-agent-notes`（MIT，2026-09-05）；单语决策已内置（无双语三件套）。
>
> 宿主口径：`noo-*` 技能随胶囊分发——引用的心源仓路径在 self-hosting 仓（Noogenesis）为活路径，在其他宿主为缓存参照实现（`<repoRoot>/.noogenesis/genes-cache/`），照读恒可，照跑先确认路径归谁。
>
> **本技能是引导，不是脚本（guidance, not a script）。** 在不抹掉仍能指导未来的历史的前提下收缩活跃决策库。逐条语义判断；词数与年龄只是发现辅助，**永远不是归档标准**。

## Sources of truth（只读，不重述）

- [.agents/notes/README.md](../../notes/README.md) — 笔记规则：生命周期/class/命名、implemented 现在时、Alternatives 强制、证据严肃性三件套。
- [根 AGENTS.md](../../../AGENTS.md)「文档纪律」— rationale → ADR；durable 文档写当前状态。
- [scripts/verify-adr-format.py](../../../scripts/verify-adr-format.py) — 机器门禁（头/骨架/状态-目录一致性/命名日期规则）。

## 归档判断（按未来决策价值分类）

- **implemented — 保持活跃**：rationale、备选、否定保证、durable/wire 语义、所有权边界、安全规则、或"何时重新引入"的条件可能指导未来变更 → 留。长度无关。
- **implemented — 归档**：已落地的决定完成且正文不太可能指导未来工作——一次性 UI 细节、窄适配器、已闭合的小 bug、被取代的实现细节、当前行为在别处已显然的流程史 → 移 `archived/<class>/`（插 `Archived:` 行）。
- **proposed — 永不归档**：活提案保持活跃；不再值得 pursue 就 reject 并写诚实理由（走 rejected 生命周期）。
- **rejected — 仅当护栏才保留**：落败提案仍是诱人的、有意义的错误，且笔记解释了它为何输 → 留。
- **rejected — 删除**：想法已过时/被取代/不再可能/不太可能防止重新辩论 → 删。修复或删除入站链接。

不向配额归档。逐条检视；同类按同一原则归类；真实边界决定记入交接。

## 新增笔记时查取代关系

每条新 ADR 触发对活跃笔记中**同一决定/机制/被拒备选**的定向审计：写新笔记时逐条归类完全/部分取代——同变更归档够格的 implemented、保留并交叉链接部分取代或独立有用的 rationale、reject 过时提案、删除不再能防止可能错误的 rejected。

## 工作流（Workflow）——归档一条 implemented

1. 把 `yyyy-mm-dd-<topic>.md` 从 `implemented/<class>/` 移到 `archived/<class>/`（`implemented` 刻意不出现在归档路径中）。
2. **正文零编辑**；仅在 `Status: implemented` 正下方插入 `Archived: YYYY-MM-DD`（归档日）。
3. 搜活跃散文中的入站链接：重定向到当前权威；只有有意引用历史快照才指向归档路径；或删除。**永不校验/修复从归档笔记发出的链接**。
4. 跑 `python3 scripts/verify-adr-format.py`（校验状态-目录一致与命名/日期；`archived/` 由笔记规则永久冻结，脚本不强制——之后不得再编辑）。

## 验证

`python3 scripts/verify-adr-format.py` + `git diff --check`；补充证据按 [noo-pre-push-checks](../noo-pre-push-checks/SKILL.md) 选。报告：保留/归档的 implemented 数、保留/删除的 rejected 数、如有 reject 的 proposed、每个边界情形及其词数与处置。
