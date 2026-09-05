# HANDOFF — Noogenesis（心源）

> 项目交接主文档（**唯一入口**）：背景 / 位置 / 当前状态 / 待办 / 开始步骤 / 记录索引。
> 文件架构（ADR [2026-09-05-journal-in-git](.agents/notes/implemented/process/2026-09-05-journal-in-git.md)）：**稳定区 + 更新摘要**在本文件；**行动区（待办）**在 [HANDOFF-todos.md](HANDOFF-todos.md)；**叙事全文**在 `journal/`（**入 git**——过程即资产）。

## 交接更新记录（摘要滚动窗）

> 滚动窗有界（≤24 条、每条 ≤260 字，机器强制）：只保近期会话批次的**摘要**（日期｜类型｜ADR 指针｜一句话结论），全文下沉 journal；durable 结论在 ADR/cookbook/README/AGENTS，此处不复述。

- 2026-09-05｜**胶囊 01 搬迁收口（S7 dogfood FULL 三审全过；ADR `capsule-01-migration` + 三拍板 ADR；commits `dd32053`→`1b7346f`）**：R1/R2/R3 Blocker 0+0+4，30 条建议 21 修 3 落简化候选待办；R3 Blocker（虚引用/决策无家/证据强度升级）全修，结论见 journal 2026-09 卷。README 核对无变更。
- 2026-09-05｜**简化候选收口（FULL 三审全过；ADR `consolidate-r1-simplification-candidates`；commits `cf45f32`→收口）**：R1/R2/R3 = 0/3、0/3、1/4，Blocker（ADR 措辞失实）+8 建议全修；`scripts/mdref.py` 单一来源化 −84 行、行为恒等实测；py 头注 ADR 引用立日期+主题口径。
- 2026-09-05｜**评审机械闸落地（胶囊 v0.2 收口件；ADR `2026-09-05-review-mechanical-gate`；commits `0b3a501`→收口）**：R1/R2/R3 = 1/7、2/6、2/2 全采纳（fail-closed 双修、lane 推导修复、CI 真强制）；门禁 7→9；Review 证据行首签、tier 全链路转绿。**节点：体系 v0.2 收口，下一步（D）立项讨论轮。**
- 2026-09-05｜**P1 立项讨论轮·参考引擎考古（ADR `evomap-evox-engine-anatomy` proposed + 演化史解剖；commits `725b272`/`0f3b7b4`）**：官方清痕后 fork 考古得 MIT 时代全源码；四接口实战印证、记忆图 ~200 行、Genesis 记 P2；发动机骨架（独立 CLI 零 DSH + 四命令 + Gene/Event 最小闭环）待拍板。README 核对：修正门禁 7→9 与 research 目录表述。
- 2026-09-05｜**许可切换 AGPL-3.0 + npm 双名注册 + 建仓首推（ADR `2026-09-05-license-agpl-3`；commits `f53d4c6`→`45f736c`）**：FULL 三审（0B/2S、1B/2S、0B/4S）全采纳；THIRD-PARTY-NOTICES 承接上游 MIT 义务；npm 裸名+org 占位；公开仓 ZK-Andy/noogenesis（首推豁免记 journal）。README 核对无漂移。

## 背景

Noogenesis（心源）：DeepSeek Harness 之上的"蜂群进化框架"；终极北极星 AGI（只定方向）；当前落地 = 第一个进化胶囊「AI 协作编码方法论」——四源（devops-template / dotnet-deepseek-harness-desktop / dsh-frecency / work 区）提炼搬迁，self-hosting：用心源体系开发心源。设计基准 `docs/research/dsh-swarm-evolution-framework-design.md`；搬迁计划 [capsule-01-migration-plan.md](capsule-01-migration-plan.md)（评审定稿 2026-09-05）。

## 位置

| 项 | 路径 |
|---|---|
| 项目根（= 工作区根 = git 仓库根） | `/mnt/work/Noogenesis/` |
| 设计文档（3 份） | `docs/research/` |
| 方法论（被演化内容） | `docs/method/` + `docs/cookbook.md` |
| 来源仓（只读参照，不修改） | `/mnt/work/devops-template`、`/mnt/work/dotnet-deepseek-harness-desktop`、`/mnt/work/dsh-frecency`、`/mnt/work/work` |
| 冻结的演化引擎（融合对象，不纳入决策） | `/mnt/work/work/dsh-continual-evolve`（v0.6.0） |

## 当前状态

- **胶囊 01 搬迁已收口**（S1–S7 全过：骨架/基座/门禁/流程卡/知识层/交接/CI+dogfood，FULL 三审全过）；**胶囊 v0.2 评审机械闸已落地**（tier + brief 两闸，门禁 7→9；ADR `2026-09-05-review-mechanical-gate`）。
- 门禁第一梯队 7 件全绿（含 self-test）：adr-format / doc-budgets / md-links（含 skills/）/ cookbook / skill-format / handoff-structure（修复版）/ change-scope。
- 技能 noo-* 7 个已被 DSH 自动发现；评审机械闸已落地（verify-review-tier + verify-review-brief，ADR [2026-09-05-review-mechanical-gate](.agents/notes/implemented/process/2026-09-05-review-mechanical-gate.md)），门禁 7→9。
- 四项拍板：评审闸延后 v0.2 ✅ / journal 入 git ✅ / 技能前缀 noo-* ✅ / cookbook 首批 15 条 ✅。

## 待办

> 行动区（全部待办明细、状态与预算）在 **[HANDOFF-todos.md](HANDOFF-todos.md)**——`[ ]` 条 ≤16、`[x]` 条压缩为一行指针，由 `scripts/verify-handoff-structure.py` 机器强制。

## 会话叙事档案（archive 指针）

> 会话**过程轨迹**按月卷记 `journal/<YYYY-MM>.md`（入 git）。丢失只丢叙事，**不丢决策**——durable 结论在 ADR/cookbook/README/AGENTS。当月卷允许暂不存在（首条叙事归档时创建）。

- **2026-09 卷**：`journal/2026-09.md`（胶囊 01 搬迁全程叙事）。

## 开始步骤（新会话恢复）

1. 读本文件状态区 + 滚动窗 + `HANDOFF-todos.md` 待办区；过程细节按需读 `journal/2026-09.md`。
2. `git log --oneline -8 && git status` 对账（HEAD 多出提交先查明）。
3. 门禁基线：质量门七件全绿（六个 `verify-*.py` + `change-scope.sh`，清单见根 AGENTS「质量门」）。
4. 读根 `AGENTS.md` 与 `.agents/workflows/session-modes.md`，声明会话模式。
5. 向用户复述关键状态与待办，等待命令。
