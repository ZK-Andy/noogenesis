# HANDOFF — Noogenesis（心源）

> 项目交接主文档（**唯一入口**）：背景 / 位置 / 当前状态 / 待办 / 开始步骤 / 记录索引。
> 文件架构（ADR [2026-09-05-journal-in-git](.agents/notes/implemented/process/2026-09-05-journal-in-git.md)）：**稳定区 + 更新摘要**在本文件；**行动区（待办）**在 [HANDOFF-todos.md](HANDOFF-todos.md)；**叙事全文**在 `journal/`（**入 git**——过程即资产）。

> **⚡ 最高优先级（框架重建）：charter ADR + 七层蓝图 → [.agents/notes/implemented/architecture/2026-09-06-framework-rebuild-charter.md](.agents/notes/implemented/architecture/2026-09-06-framework-rebuild-charter.md) · [docs/research/framework-rebuild-blueprint.md](docs/research/framework-rebuild-blueprint.md)**——用户拍板推倒重建（先框架后协作层、本仓原地重建），蓝图定稿（七层三段式 + A1–A8 挂载面 + M1–M3 + C1–C15）；**B0–B5 全批闭环（协作层重建收官，C1–C15 全绿）**——B5 切换批（gates.json cmd 全量重指 TS + 旧机器件零残留 + CI/钩子单轨 + 发版 0.2.0；实现 ADR [.agents/notes/implemented/architecture/2026-09-08-b5-switch.md](.agents/notes/implemented/architecture/2026-09-08-b5-switch.md)，批次表 [.agents/notes/proposed/architecture/2026-09-06-collab-rebuild-impl.md](.agents/notes/proposed/architecture/2026-09-06-collab-rebuild-impl.md)）；优化轮问题池余项（技能清单补全/记忆库）随重建后进行（规范展开 c1/c2 已交付；行动区仍在 [docs/research/capsule-01-optimization-round.md](docs/research/capsule-01-optimization-round.md)）。

> **⏭ 下一步：批 1 真机复验（需发版 + 用户重装）→ 优化轮问题池余项（技能清单补全 + 记忆库开题）**——编码强制两轨已闭环（两 ADR implemented + `Review` 行；批 3 测量延后）。行动区 [HANDOFF-todos.md](HANDOFF-todos.md)；优化轮 [capsule-01-optimization-round.md](docs/research/capsule-01-optimization-round.md)。

## 交接更新记录（摘要滚动窗）

> 滚动窗有界（≤24 条、每条 ≤260 字，机器强制）：只保近期会话批次的**摘要**（日期｜类型｜ADR 指针｜一句话结论），全文下沉 journal；durable 结论在 ADR/cookbook/README/AGENTS，此处不复述。

- 2026-09-08｜**编码强制两轨收口（批 1 轨道 A / 批 2 轨道 B / 批 3 测量延后；FULL 三审全采纳；ADR `2026-09-08-coding-enforcement-track-b`）**：A4 在环 lint 反馈；宿主 API 键存在+形状相容断言 + 发布面不变量闸；type-aware 零 async 缺陷 → 延后。`5a1822e`→`49687f6`。**节点：两轨闭环，真机复验待装机。** README 无漂移。

- 2026-09-08｜**编码强制两轨实施计划落盘（讨论轮；无 ADR，行动区指针）**：`docs/research/coding-enforcement-impl-plan.md`——轨道 A（A4 写码在环反馈 + 指针）+ 轨道 B（宿主 API 签名核对[类型级] + 发布面不变量[AST/JSON]；镜像比对判死；type-aware lint 评估后定）。**节点：下一会话执行批 1。** README 无漂移。
- 2026-09-08｜**编码规范 c2 机器强制收口（FULL 三审 R1 1B/6S、R2 1B/5S、R3 1B/5S 全采纳；ADR `2026-09-08-c2-lint-enforcement` implemented；`8a3898f`→`9844023`）**：oxlint 白名单 + 导出面契约注释闸入 gates.json（13→15，三面同判据）；清 19 处真实缺陷 + 4 处注释缺口。**节点：c1/c2 闭环。** README 有变更已同步。
- 2026-09-08｜**编码规范 c1 评审恢复收口（FULL 三审 R1 1B/4S、R2 1B/4S、R3 2B/3S 全采纳；ADR `2026-09-08-coding-standards` implemented；`155e1af`→收口）**：修复 = §2.4 改 [R] + 停档理由、判据收编落家、实例去虚构、兜底归属单源根 AGENTS、五命令对齐、ADR 出处归口问题池。**节点：c1 收口，下一批 = c2。** README 无漂移。
- 2026-09-08｜**问题池状态同步批（`c53882f` push）**：capsule-01-optimization-round.md 对齐 09-08 现实——TS 统一/推倒重建转已落地；M1/M3 标 A8 撤除随投影面退役、证据回 tool/result 事件文本；上帝类闸 C15 判不立；§3.5 逐项落地。**README 无漂移。**
- 2026-09-08｜**编码规范 c1 立项 + 部分实现（proposed ADR `2026-09-08-coding-standards`；`155e1af` 未 push）**：拍板 = 注释为主体成文（基准蒸馏社区 TS 规范）+ 命名/结构 + 工程纪律留链接；零工具批，oxlint 排 c2。FULL 三审在 R1/R2 并行后被取消——**批未过 FULL、ADR 未翻转**，评审恢复待办见 todos（C）。**README 无漂移。**
- 2026-09-08｜**0.2.2 重验 + 宿主 0.1.3-alpha.2 对齐核验（todo B 勾账 + issue 外报条删除；维持 A8 撤除）**：0.2.2 重验绿（日志零 noogenesis/* 事件）；上游 alpha 恢复 ignorable 读侧容忍（ADR 2026-08-30-retain-ignorable-external-session-events）但 append 写入口仍无——撤除结构性成立，复投影不开案。`e717b2d`。**README 无漂移。**
- 2026-09-08｜**A8 会话记录投影撤除批（FULL 三审全采纳收口；ADR `2026-09-08-a8-session-record-projection-removal` implemented；0.2.2 发版）**：读路径对未标 ignorable 插件事件 fail-closed → 投影面退役，A2 地图与能力层保留。`1eb742e→bee3a35`。**节点：0.2.1 重验判据作废改写（todos → 0.2.2）。** README 核对有变更已同步。
- 2026-09-08｜**B4 实机重验 + M1/M2 修复收口（FULL 三审全采纳；ADR `2026-09-08-mount-exec-arguments-field` implemented；0.2.1 发版）**：根因 = exec 字段 `arguments` 被误读 `exec.args`（夹具复刻假设 = 冒烟假绿教训）；B4 ADR 同步/勘误。（勘误随 A8 撤除批：「持久化容忍度 ✅」撤回，投影面退役。）README 无变更。
- 2026-09-08｜**B5 切换批收口（FULL 三审全采纳；ADR `2026-09-08-b5-switch` implemented；`00b84ff`→`93de846` 含 0.2.0 发版）**：gates.json cmd 全量重指 TS + 旧机器件零残留 + CI/钩子单轨 + 例外机制单家迁 gates.mts 头注；基因指针经 solidify updated 刷新。**节点：B0–B5 收官，C1–C15 全绿。** README 核对已同步。
- 2026-09-08｜**B4 挂载面接线批收口（FULL 三审全采纳；ADR `2026-09-08-b4-mount-wiring` implemented；`610fe7e`→`13440a0`）**：六点接线合并语义单源 + M1/M2/M3 记录/建议件零阻断 + peer dep dsh-llm；R2 两 Blocker（A8 drain 死接线/M2 游标错位）全修；C15 双候选均不立。**节点：C7/C8/C15 落账，下一批 = B5。** README 核对已同步。
- 2026-09-08｜**B3 钩子面批收口（FULL 三审全采纳；ADR `2026-09-08-b3-hooks-install` implemented；`61d074b`→`d2527a6`）**：pre-commit lefthook 分域 + pre-push 单编排器 TS（tier 循环同构 + 并行组 + dist 自测）+ e2e 四态 TS 重建；bash 三件退役；tier 触发集改指 `lefthook.yml`；C6 实测 3.83s vs 6.3s。**节点：下一批 = B4。**

- 2026-09-08｜**B2 引擎+适配层 TS 化批收口（FULL 三审 0B 全采纳；ADR `2026-09-08-b2-engine-adapter-ts` implemented；`f0bddfa`→`181b752`）**：engine 10 件 .ts + adapters 9 件 .mts 双跑对账零 diff；npm 发布面切 dist；js/mjs 权威并存至 B5。**节点：C3/C10 转绿 + C9 过，下一批 = B3。** README 核对有变更已同步（结构树）。

- 2026-09-08｜**B1 门禁族 TS 化批收口（FULL 三审全采纳；ADR `2026-09-08-collab-rebuild-b1-gates-ts` implemented）**：13 件 .mts（verify-*×10 + DAG runner + gen-manifest + mdref）+ 对账 12 件零 diff + tsc 工具链 + ts-typecheck 入白名单；py 权威并存、B5 切换。**节点：C5 转绿 + C6 基线回填，下一批 = B2。**

- 2026-09-08｜**B0 框架结构面批收口（FULL 三审全采纳；ADR `2026-09-08-b0-framework-structure` implemented）**：五件子树 AGENTS.md + archived/postmortem 两件 TS 门禁（node 原生 stripping 零依赖）+ references/ 形态规则。**节点：C11/C12 转绿，下一批 = B1 TS 化。** README 有变更已同步（AGENTS 分层/scripts 语言栈表述）。

- 2026-09-06｜**框架重建立项收口（FULL 三审 R1 0B/5S、R2 2B/6S、R3 1B/3S 全采纳；ADR `2026-09-06-framework-rebuild-charter` implemented；commits `025b822`→`94d0259`）**：拍板推倒重建 + 先框架后协作层 + 本仓原地重建；蓝图定稿（A1–A8 + M1–M3 + C1–C15）。**节点：设计轮闭环，下一轮 = 协作层实现轮。** README 无漂移。

- 2026-09-06｜**优化轮启动：问题池落账 + 上游 DSH 调研 + 语言统一定调（调研轮，无 ADR；行动区 = `docs/research/capsule-01-optimization-round.md`，头部门针）**：清账批三审收口（ADR `2026-09-06-doc-single-sourcing`）；上游克隆+索引缓存（SOP 全图/作用域规则/零损失实验/HERO 实证）；定调全栈 TS 统一；收尾信号：框架可能参考 DSH 推倒重建。README 核对无变更。

- 2026-09-06｜**优化轮清账批（FULL 三审 R1 0B/1S、R2 0B/4S、R3 1B/3S 全采纳；ADR `2026-09-06-doc-single-sourcing`；`376e868`→`133d2d2`）**：问题池十条落账；门禁清单/计数单源化 gates.json、评审检查项补位根 AGENTS、开始步骤并入 session-open、搬迁计划下沉 journal、gates.mts `--list` 占位两态。**节点：清账批闭环；下批 = 问题池逐项。**

- 2026-09-06｜**pre-push tag 缺口修复 + 根 README 双语化（FULL 三审 0B 全采纳；ADR `2026-09-06-pre-push-tag-outgoing` + `2026-09-06-bilingual-root-readme`；commits `fb155c0`→`fea1714`）**：可达 tag 跳过档位强制，发版豁免前提消失；README 转英文主文件 + 中文镜像（对齐上游 harness）。README 核对无漂移。

- 2026-09-06｜**桌面部署缺陷修复 + 0.1.3 发版（FULL 三审全采纳；ADR `2026-09-06-bank-pull-session-trigger` implemented；commits `ec360ab`→`528f2e8`）**：0.1.2 重验暴露装载期 pull 错位 → 触发点随会话工作区 + `geneBankUrl` 缺省官方库/`false` 禁用；npm latest + tag `v0.1.3`。**节点：重装重验通过；下一轮 = 胶囊 01 优化轮。**

- 2026-09-06｜**git 前置条件写明 + 引擎诊断分流（LIGHT 档 R2 单路；ADR `2026-09-06-git-prerequisite-and-diagnosis` implemented；commits `b5fcb2e`→`10745e2`）**：前置条件入两 README；gitRoot ENOENT 分流；R2 抓出夹具误伤 + selftest 直跑 no-op 假绿（入 cookbook）。落 main 未发包。

- 2026-09-06｜**技能随库分发收口（skills-ride-bank；FULL 三审全采纳；ADR `2026-09-06-skills-ride-bank`；commits `8c99f4c`→`2a05764`）**：技能经 genes-cache 进 DSH 技能面（rank 600 + invalidate）；7 技能蒸馏通用层+参照层；`noogenesis-dsh@0.1.2` + tag 发布（hook tag 缺口入待办）；desktop 重验待用户。README 有变更已同步。

- 2026-09-06｜**护栏延后拍板 + P1 遗留对账（ADR `2026-09-06-guardrail-defer-trigger` proposed）**：护栏三件需要但延后，触发 = 首个胶囊优化完成后；session-open 喂信号条落地；token-meter API 实测漂移在案。README 核对见 P2 条。

- 2026-09-06｜**P2 只读共享消费落地（FULL 三审 R1 1B/5S、R2 1B/8S、R3 0B/6S 全采纳；ADR `2026-09-06-p2-shared-consumer` implemented）**：本仓即库 + `engine pull` + 缓存合并扫描（本仓优先）+ manifest 索引/门禁（11 件）+ adapter `geneBankUrl` 惰性 pull；设计稿未决 1/3/4 回写。**节点：P2 闭环。** README 核对无漂移。

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
- **M2 适配层已落地**（ADR [2026-09-06-m2-adapter-wiring](.agents/notes/implemented/architecture/2026-09-06-m2-adapter-wiring.md)；部署收口 ADR [2026-09-06-adapter-deploy-hardening](.agents/notes/implemented/architecture/2026-09-06-adapter-deploy-hardening.md)）：本仓 = npm 插件包形态（[`noogenesis-dsh@0.2.2`](https://www.npmjs.com/package/noogenesis-dsh) = latest，tag `v0.2.2`；0.2.2 = A8 会话记录投影撤除，ADR [2026-09-08-a8-session-record-projection-removal](.agents/notes/implemented/architecture/2026-09-08-a8-session-record-projection-removal.md)；0.2.1 = M1/M2 exec 载荷字段修复，ADR [2026-09-08-mount-exec-arguments-field](.agents/notes/implemented/bug-fix/2026-09-08-mount-exec-arguments-field.md)；宿主件包名规则 = 裸名 + 宿主后缀）；`adapters/dsh/` spawn 单合同接线（system-prompt 节 + noo_* 三工具 + solidify 人工确认触发；repoRoot 四级回退链零配置生效）；hooks/CI 门禁清单单源 `engine/gates.json`（`scripts/gates.mts` 发射）。**技能随库分发已落地**（ADR [2026-09-06-skills-ride-bank](.agents/notes/implemented/architecture/2026-09-06-skills-ride-bank.md)）：`noo_*` 7 技能经 genes-cache 进 DSH 技能面（`noogenesis-bank` provider，rank 600，pull 落地即 invalidate 刷新；蒸馏 = 通用方法论层 + 参照实现层）。0.1.2 重验暴露的装载期 pull 错位缺陷已修（ADR [2026-09-06-bank-pull-session-trigger](.agents/notes/implemented/bug-fix/2026-09-06-bank-pull-session-trigger.md)）——desktop 已装 0.1.3 并重验通过（2026-09-06：genes-cache 落会话仓、remote=官方库、缓存基因并入扫描；技能面遮蔽关系符合验收口径）。
- **P2 只读共享消费已落地**（ADR [2026-09-06-p2-shared-consumer](.agents/notes/implemented/architecture/2026-09-06-p2-shared-consumer.md)，FULL 三审全采纳）：本仓即基因库（`dsh-gene-bank` 占位名弃用）；`engine pull`（五命令）+ `manifest.json` 检索索引（gen-manifest 生成 + verify-manifest 门禁）+ 缓存合并扫描（本仓基因优先遮蔽、evaluate/solidify 恒本仓面）；adapter `geneBankUrl` 缺省官方库（`false` 显式禁用）、pull 触发点随会话工作区（[bug-fix ADR](.agents/notes/implemented/bug-fix/2026-09-06-bank-pull-session-trigger.md)；失败 warn 降级离线）。贡献 PR / 观测透镜 / gene→skill / Genesis 基因随贡献开放轮。
- **框架重建已立项**（ADR [2026-09-06-framework-rebuild-charter](.agents/notes/implemented/architecture/2026-09-06-framework-rebuild-charter.md) implemented，FULL 三审全采纳）：拍板推倒重建（先框架后协作层、本仓原地重建——机器层分批重建、资产壳零搬迁、单批切换）；蓝图 [framework-rebuild-blueprint](docs/research/framework-rebuild-blueprint.md) 定稿（七层三段式 + A1–A8 挂载面全清单 + M1–M3 首批挂载物 + C1–C15 协作层验收需求）；**B0 框架结构面批已闭环**（C11/C12 转绿）；**B1 门禁族 TS 化已闭环**（ADR [2026-09-08-collab-rebuild-b1-gates-ts](.agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md) implemented：13 件 .mts + DAG runner + 双跑对账 12 件零 diff + tsc 工具链，py 权威并存至 B5 切换，C5 转绿 + C6 基线回填）；**B2 引擎+适配层 TS 化已闭环**（ADR [2026-09-08-b2-engine-adapter-ts](.agents/notes/implemented/architecture/2026-09-08-b2-engine-adapter-ts.md) implemented：engine 10 件 .ts + adapters 9 件 .mts 双跑对账零 diff、npm 发布面切 dist、js/mjs 权威并存至 B5，C3/C10 转绿 + C9 逐批核过）；**B3 钩子与安装面批已闭环**（ADR [2026-09-08-b3-hooks-install](.agents/notes/implemented/architecture/2026-09-08-b3-hooks-install.md) implemented：pre-commit lefthook 分域（py 命令零变化）+ pre-push 单编排器 TS（tier 循环同构端口 + 并行门禁组 + dist 自测）+ e2e 四态 TS 重建 + bash 三件退役 + tier 触发集 `.githooks`→`lefthook.yml` 对账，C2 部分/C4/C6 部分/C13 部分）；**B4 挂载面接线已闭环**（ADR [2026-09-08-b4-mount-wiring](.agents/notes/implemented/architecture/2026-09-08-b4-mount-wiring.md) implemented：六点接线 mount.mts 合并语义单源 + M1/M2/M3 建议/记录件零阻断 + peer dep dsh-llm 允许集封底两件 + C15 双候选评估均不立（数据在 ADR Decision 6），C7/C8/C15 落账 + C9 逐批核过；实机重验 2026-09-08（勘误随 A8 撤除批：「持久化容忍度 ✅」撤回——写路径落盘✅/读路径 fail-closed，A6/A8 记录投影面整体退役，ADR `2026-09-08-a8-session-record-projection-removal`；M1/M2 `exec.args`→`exec.arguments` 缺陷已修 0.2.1，ADR `2026-09-08-mount-exec-arguments-field`））；**B5 切换批已闭环**（ADR [2026-09-08-b5-switch](.agents/notes/implemented/architecture/2026-09-08-b5-switch.md) implemented：gates.json cmd 全量重指 TS（条目集与门禁名不变）+ 旧机器件全量退役（py 13/sh 1/js 10/mjs 9/reconcile 2）+ change-scope.mts 行为恒等端口 + 例外机制单家迁 gates.mts 头注 + CI/钩子单轨 + 基因指针经 solidify updated 刷新，C1/C10/C13/C14 转绿——**B0–B5 收官**）；下一步 = 胶囊 01 优化轮问题池（[capsule-01-optimization-round](docs/research/capsule-01-optimization-round.md)）。
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
