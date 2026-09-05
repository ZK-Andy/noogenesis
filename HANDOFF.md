# HANDOFF — Noogenesis（心源）

> 项目交接主文档（**唯一入口**）：背景 / 位置 / 当前状态 / 待办 / 开始步骤 / 记录索引。
> 文件架构（ADR [2026-09-05-journal-in-git](.agents/notes/implemented/process/2026-09-05-journal-in-git.md)）：**稳定区 + 更新摘要**在本文件；**行动区（待办）**在 [HANDOFF-todos.md](HANDOFF-todos.md)；**叙事全文**在 `journal/`（**入 git**——过程即资产）。

## 交接更新记录（摘要滚动窗）

> 滚动窗有界（≤24 条、每条 ≤260 字，机器强制）：只保近期会话批次的**摘要**（日期｜类型｜ADR 指针｜一句话结论），全文下沉 journal；durable 结论在 ADR/cookbook/README/AGENTS，此处不复述。

- 2026-09-06｜**M2 部署收口（FULL 三审 R1 0B/4S、R2 1B/2S、R3 3B/5S 全采纳；ADR `2026-09-06-adapter-deploy-hardening`；commits `ebb60d5`→`dd7ad6d`）**：0.1.0 实机三缺口全修 → 包改名 `noogenesis-dsh`@0.1.1（裸名 deprecate）、工具单参注册、repoRoot 四级链零配置生效。**节点：待新会话重验三件事（todos B 条）。**

- 2026-09-06｜**npm 真包首发（release-flow；repository 修正 `cecc815`；tag `v0.1.0`）**：`noogenesis@0.1.0` = latest；desktop 实装（bundles 层栈 + plugin row 合成 + 引擎空仓退化/真仓命中）；minimumReleaseAge 拦新包 → 单命令豁免（cookbook [环境]）；M2 ADR 发布 gate 清账；会话级装载新会话确认。**节点：M2 全链路收口。**

- 2026-09-06｜**M2 适配层实现轮（FULL 三审 R1 0B/4S、R2 1B/8S、R3 3B/4S 全采纳；ADR `2026-09-06-m2-adapter-wiring`；commits `78eb26f`→`65ca063`）**：adapters/dsh 八件 + npm 插件包形态 + gates.json 单源发射器；R2-B1（命中节 {{ 未转义）零宽中性化；真安装验证随 npm 首发收口；README 核对已同步（三处）。

- 2026-09-05｜**胶囊 01 搬迁收口（S7 dogfood FULL 三审全过；ADR `capsule-01-migration` + 三拍板 ADR；commits `dd32053`→`1b7346f`）**：R1/R2/R3 Blocker 0+0+4，30 条建议 21 修 3 落简化候选待办；R3 Blocker（虚引用/决策无家/证据强度升级）全修，结论见 journal 2026-09 卷。README 核对无变更。
- 2026-09-05｜**简化候选收口（FULL 三审全过；ADR `consolidate-r1-simplification-candidates`；commits `cf45f32`→收口）**：R1/R2/R3 = 0/3、0/3、1/4，Blocker（ADR 措辞失实）+8 建议全修；`scripts/mdref.py` 单一来源化 −84 行、行为恒等实测；py 头注 ADR 引用立日期+主题口径。
- 2026-09-05｜**评审机械闸落地（胶囊 v0.2 收口件；ADR `2026-09-05-review-mechanical-gate`；commits `0b3a501`→收口）**：R1/R2/R3 = 1/7、2/6、2/2 全采纳（fail-closed 双修、lane 推导修复、CI 真强制）；门禁 7→9；Review 证据行首签、tier 全链路转绿。**节点：体系 v0.2 收口，下一步（D）立项讨论轮。**
- 2026-09-05｜**P1 立项讨论轮·参考引擎考古（ADR `evomap-evox-engine-anatomy` proposed + 演化史解剖；commits `725b272`/`0f3b7b4`）**：官方清痕后 fork 考古得 MIT 时代全源码；四接口实战印证、记忆图 ~200 行、Genesis 记 P2；发动机骨架（独立 CLI 零 DSH + 四命令 + Gene/Event 最小闭环）待拍板。README 核对：修正门禁 7→9 与 research 目录表述。
- 2026-09-05｜**许可切换 AGPL-3.0 + npm 双名注册 + 建仓首推（ADR `2026-09-05-license-agpl-3`；commits `f53d4c6`→`45f736c`）**：FULL 三审（0B/2S、1B/2S、0B/4S）全采纳；THIRD-PARTY-NOTICES 承接上游 MIT 义务；npm 裸名+org 占位；公开仓 ZK-Andy/noogenesis（首推豁免记 journal）。README 核对无漂移。
- 2026-09-05｜**P1 立项拍板收口（骨架 D1–D4 + schema S1–S3 两 ADR implemented；FULL 三审 R1 0B/7S、R2 3B/10S、R3 6B/4S 全采纳；commits `3c74240`→`55afa92`）**：零依赖 Node CLI + 显式信号 + 确定性 propose + 保守入档；genes/ 八字段 + Event 月卷 + gates.json。CI 首跑复验含内。README 核对补 P1 拍板一行。**节点：下一轮 = 实现轮。**
- 2026-09-05｜**P1 引擎实现轮落地（FULL 三审全采纳 R1 0B/5S、R2 2B/6S、R3 1B/4S；ADR `p1-engine-implementation`；commits `9265308`→`3fe09d5`）**：四命令 + gates.json + 第十门禁 + 首批 6 基因入档；CI 33976291727 绿。README 核对同步。**节点：P1 闭环转真；下一轮 = 基因使用反馈轮或 M2 立项。**
- 2026-09-05｜**C 类候选批收口（FULL 三审全采纳 R1 1B/5S、R2 0B/5S、R3 2B/5S；ADR `change-scope-quotepath`；commits `3769ed7`→`1365f70`）**：change-scope 三命令 quotePath=off（非 ASCII 原样）+ selftest 49 夹具（propose happy/红档 exit 1/fail-closed 根因钉死）；CI 33977855483 绿。README 核对无变更。

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

- **胶囊 01 搬迁已收口**（S1–S7 全过：骨架/基座/门禁/流程卡/知识层/交接/CI+dogfood，FULL 三审全过）；**胶囊 v0.2 评审机械闸已落地**（tier + brief 两闸；ADR `2026-09-05-review-mechanical-gate`）。
- **P1 演化发动机已落地**（骨架/schema/实现三 ADR implemented，FULL 三审全采纳）：`engine/` 四命令 + `gates.json` 白名单 + `verify-gene-format.py` 第十门禁 + 首批 6 基因（process/doc/gates）经 solidify 原子入档（ADR [p1-engine-implementation](.agents/notes/implemented/architecture/2026-09-05-p1-engine-implementation.md)）。
- **M2 适配层已落地**（ADR [2026-09-06-m2-adapter-wiring](.agents/notes/implemented/architecture/2026-09-06-m2-adapter-wiring.md)；部署收口 ADR [2026-09-06-adapter-deploy-hardening](.agents/notes/implemented/architecture/2026-09-06-adapter-deploy-hardening.md)）：本仓 = npm 插件包形态（[`noogenesis-dsh@0.1.1`](https://www.npmjs.com/package/noogenesis-dsh) = latest，裸名 `noogenesis`@0.1.0 已 deprecate；宿主件包名规则 = 裸名 + 宿主后缀）；`adapters/dsh/` spawn 单合同接线（system-prompt 节 + noo_* 三工具 + solidify 人工确认触发；repoRoot 四级回退链零配置生效）；hooks/CI 门禁清单单源 `scripts/gates.py`。desktop 已装 0.1.1，**新会话重验三件事待做（todos B 条）**。
- 门禁第一梯队 10 件全绿（含 self-test）：adr-format / doc-budgets / md-links / cookbook / skill-format / handoff-structure / gene-format / review-tier / review-brief / change-scope；engine self-test 与 CI 同跑（run 33976291727 绿）。
- 技能 noo-* 7 个已被 DSH 自动发现；评审机械闸已落地（verify-review-tier + verify-review-brief，ADR [2026-09-05-review-mechanical-gate](.agents/notes/implemented/process/2026-09-05-review-mechanical-gate.md)），门禁 9→10。
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
