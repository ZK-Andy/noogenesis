# HANDOFF — Noogenesis（心源）

> 项目交接主文档（**唯一入口**）：背景 / 位置 / 当前状态 / 待办 / 开始步骤 / 记录索引。
> 文件架构（ADR [2026-09-05-journal-in-git](.agents/notes/implemented/process/2026-09-05-journal-in-git.md)）：**稳定区 + 更新摘要**在本文件；**行动区（待办）**在 [HANDOFF-todos.md](HANDOFF-todos.md)；**叙事全文**在 `journal/`（**入 git**——过程即资产）。

## 交接更新记录（摘要滚动窗）

> 滚动窗有界（≤24 条、每条 ≤260 字，机器强制）：只保近期会话批次的**摘要**（日期｜类型｜ADR 指针｜一句话结论），全文下沉 journal；durable 结论在 ADR/cookbook/README/AGENTS，此处不复述。

- 2026-09-05｜**胶囊 01 搬迁收口（S7 dogfood FULL 三审全过；ADR `capsule-01-migration` + 三拍板 ADR；commits `dd32053`→`1b7346f`）**：R1/R2/R3 Blocker 0+0+4，30 条建议 21 修 3 落简化候选待办；R3 Blocker（虚引用/决策无家/证据强度升级）全修，结论见 journal 2026-09 卷。README 核对无变更。

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

- **胶囊 01 搬迁按计划实施中**（S1 骨架 ✅、S2 常驻基座 ✅、S3 门禁第一梯队 ✅、S4 流程卡 6 张 ✅、S5 知识层 ✅；S6 交接、S7 CI+dogfood 进行中）。
- 门禁第一梯队 7 件全绿（含 self-test）：adr-format / doc-budgets / md-links（含 skills/）/ cookbook / skill-format / handoff-structure（修复版）/ change-scope。
- 技能 noo-* 7 个已被 DSH 自动发现；评审机械闸延后 v0.2（ADR [review-mechanical-gate-deferred](.agents/notes/implemented/process/2026-09-05-review-mechanical-gate-deferred.md)）。
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
