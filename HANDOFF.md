# HANDOFF — Noogenesis（心源）

> 项目交接主文档（**唯一入口**）：背景 / 位置 / 当前状态 / 待办 / 开始步骤 / 记录索引。
> 文件架构（ADR [2026-09-05-journal-in-git](.agents/notes/implemented/process/2026-09-05-journal-in-git.md)）：**稳定区 + 更新摘要**在本文件；**行动区（待办）**在 [HANDOFF-todos.md](HANDOFF-todos.md)；**叙事全文**在 `journal/`（**入 git**——过程即资产）。

> **⚡ 最高优先级（框架重建）：charter ADR + 七层蓝图 → [.agents/notes/implemented/architecture/2026-09-06-framework-rebuild-charter.md](.agents/notes/implemented/architecture/2026-09-06-framework-rebuild-charter.md) · [docs/research/framework-rebuild-blueprint.md](docs/research/framework-rebuild-blueprint.md)**——用户拍板推倒重建（先框架后协作层、本仓原地重建），蓝图定稿（七层三段式 + A1–A8 挂载面 + M1–M3 + C1–C15）；B0/B1/B2 已闭环，下一批 = B3 钩子与安装面（立项表 [.agents/notes/proposed/architecture/2026-09-06-collab-rebuild-impl.md](.agents/notes/proposed/architecture/2026-09-06-collab-rebuild-impl.md)）；优化轮问题池余项（技能清单补全/记忆库/规范展开）随重建后进行（行动区仍在 [docs/research/capsule-01-optimization-round.md](docs/research/capsule-01-optimization-round.md)）。

## 交接更新记录（摘要滚动窗）

> 滚动窗有界（≤24 条、每条 ≤260 字，机器强制）：只保近期会话批次的**摘要**（日期｜类型｜ADR 指针｜一句话结论），全文下沉 journal；durable 结论在 ADR/cookbook/README/AGENTS，此处不复述。

- 2026-09-08｜**B2 引擎+适配层 TS 化批收口（FULL 三审 0B 全采纳；ADR `2026-09-08-b2-engine-adapter-ts` implemented）**：engine 10 件 .ts + adapters 9 件 .mts 双跑对账零 diff；npm 发布面切 dist（build 含 gates.json 资产拷贝）；js/mjs 权威并存至 B5。**节点：C3/C10 转绿 + C9 逐批核过，下一批 = B3。**

- 2026-09-08｜**B1 门禁族 TS 化批收口（FULL 三审全采纳；ADR `2026-09-08-collab-rebuild-b1-gates-ts` implemented）**：13 件 .mts（verify-*×10 + DAG runner + gen-manifest + mdref）+ 对账 12 件零 diff + tsc 工具链 + ts-typecheck 入白名单；py 权威并存、B5 切换。**节点：C5 转绿 + C6 基线回填，下一批 = B2。**

- 2026-09-08｜**B0 框架结构面批收口（FULL 三审全采纳；ADR `2026-09-08-b0-framework-structure` implemented）**：五件子树 AGENTS.md + archived/postmortem 两件 TS 门禁（node 原生 stripping 零依赖）+ references/ 形态规则。**节点：C11/C12 转绿，下一批 = B1 TS 化。** README 有变更已同步（AGENTS 分层/scripts 语言栈表述）。

- 2026-09-06｜**协作层实现轮立项落档（无实现；ADR `2026-09-06-collab-rebuild-impl` proposed）**：用户三拍板（B1→B5 按序/lefthook/0.2.0 断点）；mdref 归宿实证迁 TS；排序自查推荐插入 B0 框架结构面批（**待拍板 = 下会话首题**）。README 无变更。

- 2026-09-06｜**框架重建立项收口（FULL 三审 R1 0B/5S、R2 2B/6S、R3 1B/3S 全采纳；ADR `2026-09-06-framework-rebuild-charter` implemented；commits `025b822`→`94d0259`）**：拍板推倒重建 + 先框架后协作层 + 本仓原地重建；蓝图定稿（A1–A8 + M1–M3 + C1–C15）。**节点：设计轮闭环，下一轮 = 协作层实现轮。** README 无漂移。

- 2026-09-06｜**优化轮启动：问题池落账 + 上游 DSH 调研 + 语言统一定调（调研轮，无 ADR；行动区 = `docs/research/capsule-01-optimization-round.md`，头部门针）**：清账批三审收口（ADR `2026-09-06-doc-single-sourcing`）；上游克隆+索引缓存（SOP 全图/作用域规则/零损失实验/HERO 实证）；定调全栈 TS 统一；收尾信号：框架可能参考 DSH 推倒重建。README 核对无变更。

- 2026-09-06｜**优化轮清账批（FULL 三审 R1 0B/1S、R2 0B/4S、R3 1B/3S 全采纳；ADR `2026-09-06-doc-single-sourcing`；`376e868`→`133d2d2`）**：问题池十条落账；门禁清单/计数单源化 gates.json、评审检查项补位根 AGENTS、开始步骤并入 session-open、搬迁计划下沉 journal、gates.py `--list` 占位两态。**节点：清账批闭环；下批 = 问题池逐项。**

- 2026-09-06｜**pre-push tag 缺口修复 + 根 README 双语化（FULL 三审 0B 全采纳；ADR `2026-09-06-pre-push-tag-outgoing` + `2026-09-06-bilingual-root-readme`；commits `fb155c0`→`fea1714`）**：可达 tag 跳过档位强制，发版豁免前提消失；README 转英文主文件 + 中文镜像（对齐上游 harness）。README 核对无漂移。

- 2026-09-06｜**桌面部署缺陷修复 + 0.1.3 发版（FULL 三审全采纳；ADR `2026-09-06-bank-pull-session-trigger` implemented；commits `ec360ab`→`528f2e8`）**：0.1.2 重验暴露装载期 pull 错位 → 触发点随会话工作区 + `geneBankUrl` 缺省官方库/`false` 禁用；npm latest + tag `v0.1.3`。**节点：重装重验通过；下一轮 = 胶囊 01 优化轮。**

- 2026-09-06｜**git 前置条件写明 + 引擎诊断分流（LIGHT 档 R2 单路；ADR `2026-09-06-git-prerequisite-and-diagnosis` implemented；commits `b5fcb2e`→`10745e2`）**：前置条件入两 README；gitRoot ENOENT 分流；R2 抓出夹具误伤 + selftest 直跑 no-op 假绿（入 cookbook）。落 main 未发包。

- 2026-09-06｜**技能随库分发收口（skills-ride-bank；FULL 三审全采纳；ADR `2026-09-06-skills-ride-bank`；commits `8c99f4c`→`2a05764`）**：技能经 genes-cache 进 DSH 技能面（rank 600 + invalidate）；7 技能蒸馏通用层+参照层；`noogenesis-dsh@0.1.2` + tag 发布（hook tag 缺口入待办）；desktop 重验待用户。README 有变更已同步。

- 2026-09-06｜**护栏延后拍板 + P1 遗留对账（ADR `2026-09-06-guardrail-defer-trigger` proposed）**：护栏三件需要但延后，触发 = 首个胶囊优化完成后；session-open 喂信号条落地；token-meter API 实测漂移在案。README 核对见 P2 条。

- 2026-09-06｜**P2 只读共享消费落地（FULL 三审 R1 1B/5S、R2 1B/8S、R3 0B/6S 全采纳；ADR `2026-09-06-p2-shared-consumer` implemented）**：本仓即库 + `engine pull` + 缓存合并扫描（本仓优先）+ manifest 索引/门禁（11 件）+ adapter `geneBankUrl` 惰性 pull；设计稿未决 1/3/4 回写。**节点：P2 闭环。** README 核对无漂移。

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

Noogenesis（心源）：DeepSeek Harness 之上的"蜂群进化框架"；终极北极星 AGI（只定方向）；当前落地 = 第一个进化胶囊「AI 协作编码方法论」——四源（devops-template / dotnet-deepseek-harness-desktop / dsh-frecency / work 区）提炼搬迁，self-hosting：用心源体系开发心源。设计基准 `docs/research/dsh-swarm-evolution-framework-design.md`；搬迁计划（已实施冻结）[journal/capsule-01-migration-plan.md](journal/capsule-01-migration-plan.md)（评审定稿 2026-09-05）。

## 位置

| 项 | 路径 |
|---|---|
| 项目根（= 工作区根 = git 仓库根） | `/mnt/work/Noogenesis/` |
| 设计文档 | `docs/research/` |
| 方法论（被演化内容） | `docs/method/` + `docs/cookbook.md` |
| 来源仓（只读参照，不修改） | `/mnt/work/devops-template`、`/mnt/work/dotnet-deepseek-harness-desktop`、`/mnt/work/dsh-frecency`、`/mnt/work/work` |
| 冻结的演化引擎（融合对象，不纳入决策） | `/mnt/work/work/dsh-continual-evolve`（v0.6.0） |

## 当前状态

- **胶囊 01 搬迁已收口**（S1–S7 全过：骨架/基座/门禁/流程卡/知识层/交接/CI+dogfood，FULL 三审全过）；**胶囊 v0.2 评审机械闸已落地**（tier + brief 两闸；ADR `2026-09-05-review-mechanical-gate`）。
- **P1 演化发动机已落地**（骨架/schema/实现三 ADR implemented，FULL 三审全采纳）：`engine/` 四命令 + `gates.json` 白名单 + `verify-gene-format.py`（白名单外独立件）+ 首批 6 基因（process/doc/gates）经 solidify 原子入档（ADR [p1-engine-implementation](.agents/notes/implemented/architecture/2026-09-05-p1-engine-implementation.md)）。
- **M2 适配层已落地**（ADR [2026-09-06-m2-adapter-wiring](.agents/notes/implemented/architecture/2026-09-06-m2-adapter-wiring.md)；部署收口 ADR [2026-09-06-adapter-deploy-hardening](.agents/notes/implemented/architecture/2026-09-06-adapter-deploy-hardening.md)）：本仓 = npm 插件包形态（[`noogenesis-dsh@0.1.3`](https://www.npmjs.com/package/noogenesis-dsh) = latest，tag `v0.1.3`；宿主件包名规则 = 裸名 + 宿主后缀）；`adapters/dsh/` spawn 单合同接线（system-prompt 节 + noo_* 三工具 + solidify 人工确认触发；repoRoot 四级回退链零配置生效）；hooks/CI 门禁清单单源 `engine/gates.json`（`scripts/gates.py` 发射）。**技能随库分发已落地**（ADR [2026-09-06-skills-ride-bank](.agents/notes/implemented/architecture/2026-09-06-skills-ride-bank.md)）：`noo_*` 7 技能经 genes-cache 进 DSH 技能面（`noogenesis-bank` provider，rank 600，pull 落地即 invalidate 刷新；蒸馏 = 通用方法论层 + 参照实现层）。0.1.2 重验暴露的装载期 pull 错位缺陷已修（ADR [2026-09-06-bank-pull-session-trigger](.agents/notes/implemented/bug-fix/2026-09-06-bank-pull-session-trigger.md)）——desktop 已装 0.1.3 并重验通过（2026-09-06：genes-cache 落会话仓、remote=官方库、缓存基因并入扫描；技能面遮蔽关系符合验收口径）。
- **P2 只读共享消费已落地**（ADR [2026-09-06-p2-shared-consumer](.agents/notes/implemented/architecture/2026-09-06-p2-shared-consumer.md)，FULL 三审全采纳）：本仓即基因库（`dsh-gene-bank` 占位名弃用）；`engine pull`（五命令）+ `manifest.json` 检索索引（gen-manifest 生成 + verify-manifest 门禁）+ 缓存合并扫描（本仓基因优先遮蔽、evaluate/solidify 恒本仓面）；adapter `geneBankUrl` 缺省官方库（`false` 显式禁用）、pull 触发点随会话工作区（[bug-fix ADR](.agents/notes/implemented/bug-fix/2026-09-06-bank-pull-session-trigger.md)；失败 warn 降级离线）。贡献 PR / 观测透镜 / gene→skill / Genesis 基因随贡献开放轮。
- **框架重建已立项**（ADR [2026-09-06-framework-rebuild-charter](.agents/notes/implemented/architecture/2026-09-06-framework-rebuild-charter.md) implemented，FULL 三审全采纳）：拍板推倒重建（先框架后协作层、本仓原地重建——机器层分批重建、资产壳零搬迁、单批切换）；蓝图 [framework-rebuild-blueprint](docs/research/framework-rebuild-blueprint.md) 定稿（七层三段式 + A1–A8 挂载面全清单 + M1–M3 首批挂载物 + C1–C15 协作层验收需求）；**B0 框架结构面批已闭环**（C11/C12 转绿）；**B1 门禁族 TS 化已闭环**（ADR [2026-09-08-collab-rebuild-b1-gates-ts](.agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md) implemented：13 件 .mts + DAG runner + 双跑对账 12 件零 diff + tsc 工具链，py 权威并存至 B5 切换，C5 转绿 + C6 基线回填）；**B2 引擎+适配层 TS 化已闭环**（ADR [2026-09-08-b2-engine-adapter-ts](.agents/notes/implemented/architecture/2026-09-08-b2-engine-adapter-ts.md) implemented：engine 10 件 .ts + adapters 9 件 .mts 双跑对账零 diff、npm 发布面切 dist、js/mjs 权威并存至 B5，C3/C10 转绿 + C9 逐批核过）；下一步 = B3 钩子与安装面。
- **护栏延后拍板**（ADR [2026-09-06-guardrail-defer-trigger](.agents/notes/proposed/architecture/2026-09-06-guardrail-defer-trigger.md) proposed）：护栏三件（token-meter 真测量 / 严格改进度量 / canary）需要但延后，触发 = 首个胶囊优化完成后（触发参照随重建时序对齐，见 ADR 交叉链接）。
- 门禁第一梯队全绿（含 self-test；清单单源 `engine/gates.json`，入口见根 AGENTS「质量门」）；engine self-test 与 CI 同跑（run 33976291727 绿）。
- 技能 noo-* 7 个已被 DSH 自动发现；评审机械闸已落地（verify-review-tier + verify-review-brief，ADR [2026-09-05-review-mechanical-gate](.agents/notes/implemented/process/2026-09-05-review-mechanical-gate.md)）。
- 四项拍板：评审闸延后 v0.2 ✅ / journal 入 git ✅ / 技能前缀 noo-* ✅ / cookbook 首批 15 条 ✅。

## 待办

> 行动区（全部待办明细、状态与预算）在 **[HANDOFF-todos.md](HANDOFF-todos.md)**——`[ ]` 条 ≤16、`[x]` 条压缩为一行指针，由 `scripts/verify-handoff-structure.py` 机器强制。

## 会话叙事档案（archive 指针）

> 会话**过程轨迹**按月卷记 `journal/<YYYY-MM>.md`（入 git）。丢失只丢叙事，**不丢决策**——durable 结论在 ADR/cookbook/README/AGENTS。当月卷允许暂不存在（首条叙事归档时创建）。

- **2026-09 卷**：`journal/2026-09.md`（胶囊 01 搬迁全程叙事）。

## 开始步骤（新会话恢复）

新会话恢复按流程卡 [session-open](.agents/workflows/session-open.md) 顺序执行（模式声明契约见 [session-modes](.agents/workflows/session-modes.md)）。
