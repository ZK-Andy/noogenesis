# HANDOFF — Noogenesis（心源）

> 项目交接主文档（**唯一入口**）：背景 / 位置 / 当前状态 / 待办 / 开始步骤 / 记录索引。
> 文件架构（ADR [2026-09-05-journal-in-git](.agents/notes/implemented/process/2026-09-05-journal-in-git.md)）：**稳定区 + 更新摘要**在本文件；**行动区（待办）**在 [HANDOFF-todos.md](HANDOFF-todos.md)；**叙事全文**在 `journal/`（**入 git**——过程即资产）。

> **⚡ 最高优先级（框架重建）：charter ADR + 七层蓝图 → [.agents/notes/implemented/architecture/2026-09-06-framework-rebuild-charter.md](.agents/notes/implemented/architecture/2026-09-06-framework-rebuild-charter.md) · [docs/research/framework-rebuild-blueprint.md](docs/research/framework-rebuild-blueprint.md)**——用户拍板推倒重建（先框架后协作层、本仓原地重建），蓝图定稿（七层三段式 + A1–A8 挂载面 + M1–M3 + C1–C15）；**B0–B5 全批闭环（协作层重建收官，C1–C15 全绿）**——B5 切换批（gates.json cmd 全量重指 TS + 旧机器件零残留 + CI/钩子单轨 + 发版 0.2.0；实现 ADR [.agents/notes/implemented/architecture/2026-09-08-b5-switch.md](.agents/notes/implemented/architecture/2026-09-08-b5-switch.md)，批次表 [.agents/notes/proposed/architecture/2026-09-06-collab-rebuild-impl.md](.agents/notes/proposed/architecture/2026-09-06-collab-rebuild-impl.md)）；优化轮问题池余项（技能清单补全）随重建后进行（记忆库线已另立档案页 [memory-system-dossier.md](docs/research/memory-system-dossier.md)；规范展开 c1/c2 已交付；行动区仍在 [docs/research/capsule-01-optimization-round.md](docs/research/capsule-01-optimization-round.md)）。

> **⏭ 下一步：M1 两批全收口（守卫三件套 + 防过度混合 D，FULL 三审全采纳，ADR 两行 Review 在案）**。其余候选：优化轮问题池余项（技能清单补全 / 守卫三件套真机复验随下一发版）[capsule-01-optimization-round.md](docs/research/capsule-01-optimization-round.md) / 记忆库线（方向已拍板 = 融合轮，待排期；唯一状态家）[memory-system-dossier.md](docs/research/memory-system-dossier.md) / release 工具族首验（B 条，随下一发版）/ 护栏延后收口（D 条）；随手待办 [HANDOFF-todos.md](HANDOFF-todos.md)。

## 交接更新记录（摘要滚动窗）

> 滚动窗有界（≤24 条、每条 ≤260 字，机器强制）：只保近期会话批次的**摘要**（日期｜类型｜ADR 指针｜一句话结论），全文下沉 journal；durable 结论在 ADR/cookbook/README/AGENTS，此处不复述。

- 2026-09-10｜**M1 批 B 防过度混合 D 收口（FULL 三审 R1 1B/3S、R2 3B/6S、R3 5B/4S 全采纳；ADR 第二条 Review 行随批落；`5b0ad9b`→`d277c47`）**：anti-overdesign 完整蒸馏篇 + 根 AGENTS 契约块 9 条（547/800）+ cases 质询索引 18 例（不进加载面）+ 检查项第 5 条 + NOTICES 补 HERO 行。**节点：M1 两批闭环。** README 无漂移。

- 2026-09-10｜**M1 批 A 守卫三件套收口（FULL 三审全采纳；ADR [2026-09-10-m1-guard-anti-overdesign](.agents/notes/implemented/architecture/2026-09-10-m1-guard-anti-overdesign.md) 随批 A 翻转；`206ad18`→`51234bc`）**：①路标行 ②触点提醒 ③对账步全落地。**节点：批 B 防过度待开。** README 无漂移。

- 2026-09-10｜**M1 双方案设计轮拍板（讨论轮；实现批待开）**：守卫 = 三件套 v0（阻断档判不立）+ 防过度 = 混合 D（cases 留辩论）；立项 ADR [2026-09-10-m1-guard-anti-overdesign](.agents/notes/implemented/architecture/2026-09-10-m1-guard-anti-overdesign.md)（`b16097e`→收尾批）；要点在优化轮 §2.2-1/2。README 无漂移。

- 2026-09-10｜**记忆库线开题讨论轮 + 档案页制度试点（讨论+实现批；无 ADR，制度批待评估）**：线 = memory-graph 原语 + 痕迹提炼面，不立项知识库；方向已拍板 = 融合轮。试点档案页 = 唯一状态家 [memory-system-dossier.md](docs/research/memory-system-dossier.md)（`ec4e7dc`→`7297d51`），todos/优化轮条目迁出留指针。README 无漂移。

- 2026-09-10｜**宿主 OpenCode Go 会话头诊断（无仓变更；cookbook [环境] 入档）**：本机静态 `x-opencode-session` 实证为反模式（亲和桶塌缩）；社区插件 `dsh-opencode-session` 兜底（自定义 provider 名须补路由键坑在案）；用户切内置 opencode-go 路由实证通。**节点：官方 sessionHeader 落地后退役插件（todos C）。** README 无漂移。

- 2026-09-10｜**D 批简化候选 5 项收口（FULL 三审 R1 0B、R2 1B/1S、R3 1B/1S 全采纳；ADR `standards-audit-simplification-candidates` implemented；`3da3257`→`c5f7c46`）**：class 集单源 import、自测临时目录 17/17 异常安全、模型面英文拍板落地、splitLines 归口、maxGenes 必传。**节点：下一步 = 优化轮问题池。** README 无漂移。

- 2026-09-10｜**规范语义面审计修复批 + pypara 归口批（FULL 三审全采纳；ADR `standards-audit-fix-batch` + `pypara-fold-responsibility-split`；`086a1ce`/`fd0e4b9`+`a8d43e0`/`e32143f`）**：三族 `[R]` 审计行为 7 处 + 注释批全修；pypara 立原语七族单源、夹具同件拍板、职责判别式入文档。**节点：D 批剩 5 项。** README 无漂移。

- 2026-09-10｜**规范连接收紧批收口（FULL 三审三轮全采纳；ADR `2026-09-10-standards-crosslink-closure` implemented；`72e2e12`）**：G1–G6——A2 地图架构指针行 + review §1 回指 + §4 改指 R6 + §2.4 两链 + 问题池/feature-flow 指针；反向审计 12 面零缺口落档。**节点：两篇规范连接闭合。** README 无漂移。

- 2026-09-10｜**架构规范实现批收口（FULL 三审三轮全采纳；charter ADR implemented；`33ee07e`）**：新建 [architecture-standards.md](docs/method/architecture-standards.md)——判别式 R1a–R9 + blast-radius 四类表 + 失败传导两态 + §4 触发条件集五候选全不立；import 环实测 n=46/81 零环。**节点：规范四篇齐。** README 无漂移。

- 2026-09-10｜**架构规范立项收口（讨论轮，无实现；charter ADR 2026-09-10-architecture-standards-charter proposed；`1f8a483`）**：基准蒸馏四源 + 本仓专属例外；四题拍板（TS 实写+通则 / blast-radius 判据互链 review.md / content-only+触发条件 / §4 互链）；现状地图不另立。**节点：实现批待开。** README 无漂移。

- 2026-09-10｜**review-tier 去重随手批收口（FULL 三审 R1 0B/1S、R2 0B/2S、R3 1B/2S 全采纳；ADR 2026-09-10-review-tier-diff-moment-dedup implemented；`479edf2`→收口批）**：diffMoment 三态映射单源 + untracked 单收集传递（子进程 −1）；R3 实证瞬时角 tracked 子角判定翻转、更 fail-closed。**节点：C 类随手全清。** README 无漂移。

- 2026-09-10｜**C 类随手候选批收口（FULL 三审 0B、8S 采纳 2 转办；ADR `2026-09-10-mdref-py-primitives-fold` + `2026-09-10-review-tier-evidence-ride-along`；`907d1a8`→`93483f5`）**：mdref 增补 pyStrip 导出 + 四件删副本；review-tier 证据收紧「Review 行须本变更引入」（12→17）。**节点：C 类随手全清。** README 无漂移。

- 2026-09-09｜**发布形态对齐上游批（FULL 三审全采纳收口；ADR `2026-09-09-release-shape-alignment` implemented；`71601e7`→`1b6c25b`）**：README 引用统一 DSH + License 修辞正面化（免责句 DeepSeek→DSH 维护方）；release 工具族（bump/release-note 双语 body+@作者）+ tag 切 `dsh-v` + lock 漂移修复。**节点：下一发版用新工具族。**

- 2026-09-09｜**批 1 真机复验（todo B 勾账；0.2.3 实机判据全命中，journal 在案）**：var 写码同轮 block 拦回 / 修正重写零反馈 / 连续 ×3 后第 4 次降级 context 不死锁 / 干净写码复位 / edit 同拦 / 非 .ts 零反馈 / staged 红。**节点：0.2.3 实机生效；宿主基线已升 0.1.5-alpha.1（用户确认主动升级）。** README 无漂移。

- 2026-09-09｜**noogenesis-dsh 0.2.3 发版（release-flow；tag `v0.2.3`，npm latest）**：A4 在环 lint block 拦回 + pre-commit `--staged` 收窄（09-09 升格批）；GitHub Release 建（Latest 非 draft）。**节点：真机复验待用户重装。** README 无漂移。

- 2026-09-09｜**编码规范机器拦升格批（FULL 三审 0B 全采纳；ADR `2026-09-09-lint-block-and-staged-hook` implemented；`c880a00`→`c7b62e8` 绿）**：A4 在环 `context`→`block` 拦回（连续拦回降级 context 防死锁）+ pre-commit lint 收窄暂存面（含 rename 档）；pre-push/CI 仍全仓穷尽。**节点：机器可判违规写码当轮拦回。** README 无漂移。

- 2026-09-09｜**宿主升级踩坑入 cookbook（npm ≥12 依赖安装脚本默认阻断；讨论轮，无 ADR）**：升级 `@deepseek-ai/dsh` 装完起不来；OpenCode 修复 = 回钉 0.1.3-alpha.2 + `--allow-scripts` 放行六原生包 + user 级持久化。**拍板：宿主基线维持 0.1.3-alpha.2，复验不碰 alpha 升级。** README 无漂移。

- 2026-09-08｜**编码强制两轨收口（批 1 轨道 A / 批 2 轨道 B / 批 3 测量延后；FULL 三审全采纳；ADR `2026-09-08-coding-enforcement-track-b`）**：A4 在环 lint 反馈；宿主 API 键存在+形状相容断言 + 发布面不变量闸；type-aware 零 async 缺陷 → 延后。`5a1822e`→`49687f6`。**节点：两轨闭环，真机复验待装机。** README 无漂移。

- 2026-09-08｜**编码强制两轨实施计划落盘（讨论轮；无 ADR，行动区指针）**：`docs/research/coding-enforcement-impl-plan.md`——轨道 A（A4 写码在环反馈 + 指针）+ 轨道 B（宿主 API 签名核对[类型级] + 发布面不变量[AST/JSON]；镜像比对判死；type-aware lint 评估后定）。**节点：下一会话执行批 1。** README 无漂移。
- 2026-09-08｜**编码规范 c2 机器强制收口（FULL 三审 R1 1B/6S、R2 1B/5S、R3 1B/5S 全采纳；ADR `2026-09-08-c2-lint-enforcement` implemented；`8a3898f`→`9844023`）**：oxlint 白名单 + 导出面契约注释闸入 gates.json（13→15，三面同判据）；清 19 处真实缺陷 + 4 处注释缺口。**节点：c1/c2 闭环。** README 有变更已同步。
- 2026-09-08｜**编码规范 c1 评审恢复收口（FULL 三审 R1 1B/4S、R2 1B/4S、R3 2B/3S 全采纳；ADR `2026-09-08-coding-standards` implemented；`155e1af`→收口）**：修复 = §2.4 改 [R] + 停档理由、判据收编落家、实例去虚构、兜底归属单源根 AGENTS、五命令对齐、ADR 出处归口问题池。**节点：c1 收口，下一批 = c2。** README 无漂移。
- 2026-09-08｜**编码规范 c1 立项 + 部分实现（proposed ADR `2026-09-08-coding-standards`；`155e1af` 未 push）**：拍板 = 注释为主体成文（基准蒸馏社区 TS 规范）+ 命名/结构 + 工程纪律留链接；零工具批，oxlint 排 c2。FULL 三审在 R1/R2 并行后被取消——**批未过 FULL、ADR 未翻转**，评审恢复待办见 todos（C）。**README 无漂移。**
- 2026-09-08｜**0.2.2 重验 + 宿主 0.1.3-alpha.2 对齐核验（todo B 勾账 + issue 外报条删除；维持 A8 撤除）**：0.2.2 重验绿（日志零 noogenesis/* 事件）；上游 alpha 恢复 ignorable 读侧容忍（ADR 2026-08-30-retain-ignorable-external-session-events）但 append 写入口仍无——撤除结构性成立，复投影不开案。`e717b2d`。**README 无漂移。**
- 2026-09-08｜**A8 会话记录投影撤除批（FULL 三审全采纳收口；ADR `2026-09-08-a8-session-record-projection-removal` implemented；0.2.2 发版）**：读路径对未标 ignorable 插件事件 fail-closed → 投影面退役，A2 地图与能力层保留。`1eb742e→bee3a35`。**节点：0.2.1 重验判据作废改写（todos → 0.2.2）。** README 核对有变更已同步。
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
- **P1 演化发动机已落地**（骨架/schema/实现三 ADR implemented，FULL 三审全采纳）：`engine/` 四命令 + `gates.json` 白名单 + `verify-gene-format.mts`（白名单外独立件）+ 首批 6 基因（process/doc/gates）经 solidify 原子入档（ADR [p1-engine-implementation](.agents/notes/implemented/architecture/2026-09-05-p1-engine-implementation.md)）。
- **M2 适配层已落地**（ADR [2026-09-06-m2-adapter-wiring](.agents/notes/implemented/architecture/2026-09-06-m2-adapter-wiring.md)；部署收口 ADR [2026-09-06-adapter-deploy-hardening](.agents/notes/implemented/architecture/2026-09-06-adapter-deploy-hardening.md)）：本仓 = npm 插件包形态（[`noogenesis-dsh@0.2.3`](https://www.npmjs.com/package/noogenesis-dsh) = latest，tag `v0.2.3`；0.2.3 = A4 在环 lint 拦回升格 + pre-commit `--staged` 收窄，ADR [2026-09-09-lint-block-and-staged-hook](.agents/notes/implemented/architecture/2026-09-09-lint-block-and-staged-hook.md)；0.2.2 = A8 会话记录投影撤除，ADR [2026-09-08-a8-session-record-projection-removal](.agents/notes/implemented/architecture/2026-09-08-a8-session-record-projection-removal.md)；0.2.1 = M1/M2 exec 载荷字段修复，ADR [2026-09-08-mount-exec-arguments-field](.agents/notes/implemented/bug-fix/2026-09-08-mount-exec-arguments-field.md)；宿主件包名规则 = 裸名 + 宿主后缀）；`adapters/dsh/` spawn 单合同接线（system-prompt 节 + noo_* 三工具 + solidify 人工确认触发；repoRoot 四级回退链零配置生效）；hooks/CI 门禁清单单源 `engine/gates.json`（`scripts/gates.mts` 发射）。**技能随库分发已落地**（ADR [2026-09-06-skills-ride-bank](.agents/notes/implemented/architecture/2026-09-06-skills-ride-bank.md)）：`noo_*` 7 技能经 genes-cache 进 DSH 技能面（`noogenesis-bank` provider，rank 600，pull 落地即 invalidate 刷新；蒸馏 = 通用方法论层 + 参照实现层）。0.1.2 重验暴露的装载期 pull 错位缺陷已修（ADR [2026-09-06-bank-pull-session-trigger](.agents/notes/implemented/bug-fix/2026-09-06-bank-pull-session-trigger.md)）——desktop 已装 0.1.3 并重验通过（2026-09-06：genes-cache 落会话仓、remote=官方库、缓存基因并入扫描；技能面遮蔽关系符合验收口径）。
- **P2 只读共享消费已落地**（ADR [2026-09-06-p2-shared-consumer](.agents/notes/implemented/architecture/2026-09-06-p2-shared-consumer.md)，FULL 三审全采纳）：本仓即基因库（`dsh-gene-bank` 占位名弃用）；`engine pull`（五命令）+ `manifest.json` 检索索引（gen-manifest 生成 + verify-manifest 门禁）+ 缓存合并扫描（本仓基因优先遮蔽、evaluate/solidify 恒本仓面）；adapter `geneBankUrl` 缺省官方库（`false` 显式禁用）、pull 触发点随会话工作区（[bug-fix ADR](.agents/notes/implemented/bug-fix/2026-09-06-bank-pull-session-trigger.md)；失败 warn 降级离线）。贡献 PR / 观测透镜 / gene→skill / Genesis 基因随贡献开放轮。
- **框架重建已立项**（ADR [2026-09-06-framework-rebuild-charter](.agents/notes/implemented/architecture/2026-09-06-framework-rebuild-charter.md) implemented，FULL 三审全采纳）：拍板推倒重建（先框架后协作层、本仓原地重建——机器层分批重建、资产壳零搬迁、单批切换）；蓝图 [framework-rebuild-blueprint](docs/research/framework-rebuild-blueprint.md) 定稿（七层三段式 + A1–A8 挂载面全清单 + M1–M3 首批挂载物 + C1–C15 协作层验收需求）；**B0 框架结构面批已闭环**（C11/C12 转绿）；**B1 门禁族 TS 化已闭环**（ADR [2026-09-08-collab-rebuild-b1-gates-ts](.agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md) implemented：13 件 .mts + DAG runner + 双跑对账 12 件零 diff + tsc 工具链，py 权威并存至 B5 切换，C5 转绿 + C6 基线回填）；**B2 引擎+适配层 TS 化已闭环**（ADR [2026-09-08-b2-engine-adapter-ts](.agents/notes/implemented/architecture/2026-09-08-b2-engine-adapter-ts.md) implemented：engine 10 件 .ts + adapters 9 件 .mts 双跑对账零 diff、npm 发布面切 dist、js/mjs 权威并存至 B5，C3/C10 转绿 + C9 逐批核过）；**B3 钩子与安装面批已闭环**（ADR [2026-09-08-b3-hooks-install](.agents/notes/implemented/architecture/2026-09-08-b3-hooks-install.md) implemented：pre-commit lefthook 分域（py 命令零变化）+ pre-push 单编排器 TS（tier 循环同构端口 + 并行门禁组 + dist 自测）+ e2e 四态 TS 重建 + bash 三件退役 + tier 触发集 `.githooks`→`lefthook.yml` 对账，C2 部分/C4/C6 部分/C13 部分）；**B4 挂载面接线已闭环**（ADR [2026-09-08-b4-mount-wiring](.agents/notes/implemented/architecture/2026-09-08-b4-mount-wiring.md) implemented：六点接线 mount.mts 合并语义单源 + M1/M2/M3 建议/记录件零阻断 + peer dep dsh-llm 允许集封底两件 + C15 双候选评估均不立（数据在 ADR Decision 6），C7/C8/C15 落账 + C9 逐批核过；实机重验 2026-09-08（勘误随 A8 撤除批：「持久化容忍度 ✅」撤回——写路径落盘✅/读路径 fail-closed，A6/A8 记录投影面整体退役，ADR `2026-09-08-a8-session-record-projection-removal`；M1/M2 `exec.args`→`exec.arguments` 缺陷已修 0.2.1，ADR `2026-09-08-mount-exec-arguments-field`））；**B5 切换批已闭环**（ADR [2026-09-08-b5-switch](.agents/notes/implemented/architecture/2026-09-08-b5-switch.md) implemented：gates.json cmd 全量重指 TS（条目集与门禁名不变）+ 旧机器件全量退役（py 13/sh 1/js 10/mjs 9/reconcile 2）+ change-scope.mts 行为恒等端口 + 例外机制单家迁 gates.mts 头注 + CI/钩子单轨 + 基因指针经 solidify updated 刷新，C1/C10/C13/C14 转绿——**B0–B5 收官**）；下一步 = 胶囊 01 优化轮问题池（[capsule-01-optimization-round](docs/research/capsule-01-optimization-round.md)）。
- **M1 两批已全收口**（ADR [2026-09-10-m1-guard-anti-overdesign](.agents/notes/implemented/architecture/2026-09-10-m1-guard-anti-overdesign.md) implemented，两行 Review 在案，FULL 三审全采纳）：批 A = A2 技能路标行 + A3 触点提醒 advice 档（skill-guard + `config.skillGuards`）+ session-close 技能对账步；批 B = [anti-overdesign](docs/method/anti-overdesign.md) 完整蒸馏篇 + 根 AGENTS 契约块 9 条（547/800）+ [cases 质询索引](docs/research/anti-overdefense-cases-index.md)（不进加载面）+ 评审检查项第 5 条。真机复验随下一发版。
- **护栏延后拍板**（ADR [2026-09-06-guardrail-defer-trigger](.agents/notes/proposed/architecture/2026-09-06-guardrail-defer-trigger.md) proposed）：护栏三件（token-meter 真测量 / 严格改进度量 / canary）需要但延后，触发 = 首个胶囊优化完成后（触发参照随重建时序对齐，见 ADR 交叉链接）。
- **编码规范机器强制已落地**（ADR [2026-09-08-c2-lint-enforcement](.agents/notes/implemented/architecture/2026-09-08-c2-lint-enforcement.md) implemented，FULL 三审全采纳）：oxlint 1.82.0 显式白名单（根 `.oxlintrc.json`，逐条理由）+ 导出面契约注释闸（`verify-export-docs.mts`，`adapters/dsh` + `scripts`）入 `engine/gates.json`（15 条，pre-commit/pre-push/CI 同判据）；首轮清 19 处真实缺陷 + 4 处注释缺口 + 1 死导出；[code-standards](docs/method/code-standards.md) 档位同步（2.1 存在性 / 2.3 词面 / §3 机械子集升 `[M]`，2.4 留 `[R]`）。
- 门禁第一梯队全绿（含 self-test；清单单源 `engine/gates.json`，入口见根 AGENTS「质量门」）；engine self-test 与 CI 同跑（run 33976291727 绿）。
- **编码强制两轨已闭环**（批 1 ADR [2026-09-08-lint-in-loop-feedback](.agents/notes/implemented/architecture/2026-09-08-lint-in-loop-feedback.md) + 批 2 ADR [2026-09-08-coding-enforcement-track-b](.agents/notes/implemented/architecture/2026-09-08-coding-enforcement-track-b.md)，均 implemented + `Review: FULL/2026-09-08`）：A4 写码在环 lint 反馈（建议档 `context`，8 条合同 + A2 指针行）；宿主 API 类型契约（键存在 + 形状相容两组断言）；发布面不变量闸（gates.json 15→16，15 夹具）；`arguments` 不实收窄修正；type-aware lint 以证据延后（触发 = 真实 async 失守）。**真机复验待装机**（todos B 条）。
- 技能 noo-* 7 个已被 DSH 自动发现；评审机械闸已落地（verify-review-tier + verify-review-brief，ADR [2026-09-05-review-mechanical-gate](.agents/notes/implemented/process/2026-09-05-review-mechanical-gate.md)）。
- 四项拍板：评审闸延后 v0.2 ✅ / journal 入 git ✅ / 技能前缀 noo-* ✅ / cookbook 首批 15 条 ✅。

## 待办

> 行动区（全部待办明细、状态与预算）在 **[HANDOFF-todos.md](HANDOFF-todos.md)**——`[ ]` 条 ≤16、`[x]` 条压缩为一行指针，由 `scripts/verify-handoff-structure.mts` 机器强制。

## 会话叙事档案（archive 指针）

> 会话**过程轨迹**按月卷记 `journal/<YYYY-MM>.md`（入 git）。丢失只丢叙事，**不丢决策**——durable 结论在 ADR/cookbook/README/AGENTS。当月卷允许暂不存在（首条叙事归档时创建）。

- **2026-09 卷**：`journal/2026-09.md`（胶囊 01 搬迁全程叙事）。

## 开始步骤（新会话恢复）

新会话恢复按流程卡 [session-open](.agents/workflows/session-open.md) 顺序执行（模式声明契约见 [session-modes](.agents/workflows/session-modes.md)）。
