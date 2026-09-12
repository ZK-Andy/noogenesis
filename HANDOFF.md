# HANDOFF — Noogenesis（心源）

> 项目交接主文档（**唯一入口**）：背景 / 位置 / 当前状态 / 待办 / 开始步骤 / 记录索引。
> 文件架构（ADR [2026-09-05-journal-in-git](.agents/notes/implemented/process/2026-09-05-journal-in-git.md)）：**稳定区 + 更新摘要**在本文件；**行动区（跨会话待办）**在 [HANDOFF-todos.md](HANDOFF-todos.md)、**演化轮候选池**在 [HANDOFF-evolution-pool.md](HANDOFF-evolution-pool.md)；**叙事全文**在 `journal/`（**入 git**——过程即资产）。

> **⚡ 最高优先级（框架重建）：charter ADR + 七层蓝图 → [.agents/notes/implemented/architecture/2026-09-06-framework-rebuild-charter.md](.agents/notes/implemented/architecture/2026-09-06-framework-rebuild-charter.md) · [docs/research/framework-rebuild-blueprint.md](docs/research/framework-rebuild-blueprint.md)**——用户拍板推倒重建（先框架后协作层、本仓原地重建），蓝图定稿（七层三段式 + A1–A8 挂载面 + M1–M3 + C1–C15）；**B0–B5 全批闭环（协作层重建收官，C1–C15 全绿）**——B5 切换批（gates.json cmd 全量重指 TS + 旧机器件零残留 + CI/钩子单轨 + 发版 0.2.0；实现 ADR [.agents/notes/implemented/architecture/2026-09-08-b5-switch.md](.agents/notes/implemented/architecture/2026-09-08-b5-switch.md)，批次表 [.agents/notes/proposed/architecture/2026-09-06-collab-rebuild-impl.md](.agents/notes/proposed/architecture/2026-09-06-collab-rebuild-impl.md)）；**优化轮已收口（2026-09-10）**：问题池条目全部判终态、池文档冻结为调研档案（技能清单补全拍板暂不新增技能 + 既有技能 references 实拆补全；记忆库线另立档案页 [memory-system-dossier.md](docs/research/memory-system-dossier.md)；规范展开 c1/c2 已交付；[收口 ADR](.agents/notes/implemented/process/2026-09-10-optimization-round-closure.md) + [池文档 §2.3 收口账](docs/research/capsule-01-optimization-round.md)）。

> **⏭ 下一步：护栏建设轮待排期（触发已满足）；池件余项候选 = [HANDOFF-evolution-pool](HANDOFF-evolution-pool.md)，用户点名即开轮**——最新批 = 2026-09-12 **release-note 聚合档批（FULL 三审 R1 0B/3S、R2 1B/2S、R3 2B/4S；采纳 8 拒绝 3）**：Release 正文末节按提交日归并（0.2.4 区间 42 条 → 3 条；条目零丢弃）；[聚合档 ADR](.agents/notes/implemented/process/2026-09-12-release-note-daily-aggregation.md)；`d04257c`→`f8093a0`→`ad64e32`。前序 2026-09-12 **0.2.5 真机复验轮**（三形态 push 提醒 + 重定向通道 + 抑制面全过；零仓变更）。前序 **0.2.5 发版**（npm latest 0.2.5，tag `dsh-v0.2.5`；[发版 ADR](.agents/notes/implemented/process/2026-09-09-release-shape-alignment.md) 第二次实发节）。前序 2026-09-12 演化轮首次落账批（演化轮候选处理完即销账 + 技能触点提醒 push 面正则容忍 `git` 全局选项前缀；[修复件](.agents/notes/implemented/bug-fix/2026-09-12-skill-guard-push-pattern-reachability.md) + [销账 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-candidate-disposal.md)）。前序 2026-09-12 吸收撤除批（演化动作面异步归集：吸收撤出变更主链路、findings 去向归 `feature-flow` §4.6 + 池件攒账、准则落主设计 §6；[ADR](.agents/notes/implemented/process/2026-09-12-absorption-async-round.md) + [池件 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-file.md)）。前序 2026-09-11 六批：**档位触发面精度**（产品源码 `engine/**`+`adapters/**`+`cordis.patch.yml` 入 FULL 触发面；自诺与证据判定共用 `adrHeadStatus`，[ADR](.agents/notes/implemented/process/2026-09-11-review-tier-classification-precision.md)）、**技能触点提醒触发面扩面**（三类匹配 + bash 重定向通道；真机复验待装机 = todos（B）条，[ADR](.agents/notes/implemented/architecture/2026-09-11-skill-guard-trigger-faces.md)）、**吸收阶段重建**（吸收升为与评审同级 + 四出口 + 吸收账，[ADR](.agents/notes/archived/process/2026-09-11-absorption-stage.md)）、**术语口径**（「胶囊」= 内容包层、`Capsule` 原语不译，[ADR](.agents/notes/implemented/process/2026-09-11-capsule-term-layering.md)）、记忆库线第一期（[实现 ADR](.agents/notes/implemented/architecture/2026-09-11-memory-line-phase1-observation-face.md)；线状态唯一家 = [档案页](docs/research/memory-system-dossier.md)）、**评审发现机械化**（命令面/版本行/模式覆盖三类判据，[机械化 ADR](.agents/notes/implemented/process/2026-09-11-review-finding-mechanization.md)）。余项候选：护栏建设轮（触发已满足 = 待排期）/ `capsules/` 路径指代两义（触发 = 共享库或目录立项）/ 记忆库线第二期（行为评估自建形态待裁）/ 档案页制度批（触发 = 试点评估）/ 技能清单「等等」候选收集（触发 = 用户再给候选）。

## 交接更新记录（摘要滚动窗）

> 滚动窗有界（≤24 条、每条 ≤260 字，机器强制）：只保近期会话批次的**摘要**（日期｜类型｜ADR 指针｜一句话结论），全文下沉 journal；durable 结论在 ADR/cookbook/README/AGENTS，此处不复述。

- 2026-09-13｜**bank provider 注册时序修复批（FULL 三审全采纳）**：注册改 `ctx.inject(["skills"], …)` 可重试路径 + 提醒面按可达集点名；[修复件 ADR](.agents/notes/implemented/bug-fix/2026-09-12-bank-skill-provider-registration.md)；`5dcca48`→`aa9be0f`。README 有变更；真机复验 = todos (B) 条。
- 2026-09-12｜**release-note 聚合档批（FULL 三审 R1 0B/3S、R2 1B/2S、R3 2B/4S；采纳 8 拒绝 3）**：Release 正文末节按提交日归并成每日一条（0.2.4 区间 42 条 → 3 条；条目零丢弃、按 `%cs` 日期串建 Map）；[聚合档 ADR](.agents/notes/implemented/process/2026-09-12-release-note-daily-aggregation.md)。README 无漂移。

- 2026-09-12｜**0.2.5 真机复验轮（零仓变更）**：装机件矩阵三形态 push 全中／五负例全不中；实机新实例 `git -c … push` 命中一行 advice、重复不重提、bash 重定向写 `.md` 走后缀面命中、跨通道抑制成立；重启后守卫状态复位（新实例）。异仓腿随 bank 批。

- 2026-09-12｜**0.2.5 发版（release-flow 第二次实走）**：npm latest 0.2.5（tag `dsh-v0.2.5`）+ 双语 Release Latest；bump `7cdb625` → 版本面 `66b40d1`；[发版 ADR](.agents/notes/implemented/process/2026-09-09-release-shape-alignment.md) 第二次实发节。README 已同步（版本面三处）。

- 2026-09-12｜**演化轮首次落账批（FULL 三审 R1 1B/5S、R2 2B/5S〔B2 误报驳回〕、R3 2B/2S；采纳 11 拒绝 1）**：push 面正则前缀容错 + 池件销账口径（[修复件](.agents/notes/implemented/bug-fix/2026-09-12-skill-guard-push-pattern-reachability.md) + 销账 ADR）；`cf26475`→`bb0d3a0`。README 无漂移。

- 2026-09-12｜**演化轮池独立成件批（FULL 三审全 ok；采纳 8 拒绝 1）**：新增池件 [HANDOFF-evolution-pool.md](HANDOFF-evolution-pool.md)（吸收后处置规则已落地）+ [池件 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-file.md)；归集面指针全域改指；`6b95e36`→`6376d92`。README 已同步（结构表加池件）。

- 2026-09-12｜**技能 provider 失效取证轮（零代码变更）**：普查 desktop 199/199 + dsh-frecency 11/11 会话 `noo-*`=0（自举仓由文件系统面掩盖）；修复立项后次会话落地（[ADR](.agents/notes/implemented/bug-fix/2026-09-12-bank-skill-provider-registration.md)：注册走可重试注入）。

- 2026-09-12｜**吸收撤除批（FULL 三审 R1 1B/5S、R2 1B/1S、R3 0B/2S；采纳 9 拒绝 1）**：吸收撤出主链路（演化动作面异步归集）——准则落主设计 §6 第 5 条、findings 去向归 `feature-flow` §4.6 + 待办区、被撤件归档冻结；[ADR](.agents/notes/implemented/process/2026-09-12-absorption-async-round.md)。README 无漂移。

- 2026-09-12｜**凭据夹具误报治理批（FULL 三审 R1 0B/0S、R2 1B/3S、R3 0B/3S；采纳 6 + 候选 1 拒绝 1）**：夹具分片编码 + 元断言 4 源码自洁 + 自测 fail-closed 补档；GitHub 告警按 `used_in_tests` 处置；[ADR](.agents/notes/implemented/process/2026-09-12-secret-fixture-fragment-encoding.md)。README 无漂移。

- 2026-09-11｜**阶段卡结构批（FULL 三审 R1 1B/4S、R2 2B/4S、R3 3B/5S；采纳 15）**：铁律 7（步序/角色位/关口）+ AGENTS 检查项 6 + §5 四步序（整账确认关口）+ §8 前置门按回执；同批执行上批遗留出口（简报闸 head 判据）；[ADR](.agents/notes/implemented/process/2026-09-11-stage-card-structure.md)。README 无漂移。

- 2026-09-11｜**档位触发面精度批（FULL 三审 R1 1B/5S、R2 0B/3S、R3 4B/7S；采纳 14）**：`engine/**`+`adapters/**`+`cordis.patch.yml` 入 FULL 触发面，自诺与证据判定共用 `adrHeadStatus`；[ADR](.agents/notes/implemented/process/2026-09-11-review-tier-classification-precision.md)。README 无漂移。

- 2026-09-11｜**技能触点提醒触发面扩面批（FULL 三审 R1 0B/2S、R2 0B/4S、R3 2B/4S；采纳 11+拒绝 1）**：三类匹配 + bash 重定向通道；缺省表补 `.md`→prose-standard、`git push`→pre-push-checks；[ADR](.agents/notes/implemented/architecture/2026-09-11-skill-guard-trigger-faces.md)。README 无漂移。

- 2026-09-11｜**吸收阶段重建批（FULL 三审 R1 2B/6S、R2 1B/3S、R3 1B/3S；全采纳 15）**：吸收升为与 §4 评审同级（`feature-flow` §5）+ 四出口 + 吸收账；门槛改「判据稳定即立、须先实测噪声」；[ADR](.agents/notes/archived/process/2026-09-11-absorption-stage.md)（已归档）。提交 `656b4b9`→`7a29466`。README 无漂移。

- 2026-09-11｜**术语口径批（FULL 三审 R1 1B/3S、R2 3B/4S、R3 0B/4S；全采纳 11 + 部分采纳 1）**：「胶囊」= 内容包层、`Capsule` 原语写英文原名不译，规则落根 AGENTS「文档纪律」+ 四处违例面对齐；[ADR](.agents/notes/implemented/process/2026-09-11-capsule-term-layering.md)。提交 `07de5b4`→`e1d4e9b`。README 无漂移。

- 2026-09-11｜**评审发现机械化批（FULL 三审 R1 0B/2S、R2 1B/6S、R3 4B/9S；采纳 12 拒绝 1）**：新增 `verify-command-surface`（命令面事实源 ↔ 声明区/计数面）+ 版本锚判据 6（三面）+ 模式双向覆盖元断言；[ADR](.agents/notes/implemented/process/2026-09-11-review-finding-mechanization.md)。

- 2026-09-11｜**记忆库线第一期实现批（FULL 三审逐条裁决）**：`observe` 观测输入面（gitignored；写 fail-closed／读 warn-skip）+ `select` 建议档 `advice:` 行（不进常驻节）+ 凭据绊线 `verify-secrets`（三面）；ADR [实现件](.agents/notes/implemented/architecture/2026-09-11-memory-line-phase1-observation-face.md)。

- 2026-09-10｜**记忆库线融合轮开题讨论轮（立宪 + 接口契约 + 第一期范围；零代码变更）**：ADR [融合立宪](.agents/notes/proposed/architecture/2026-09-10-memory-line-fusion-charter.md)（proposed，D1–D10）+ [档案页](docs/research/memory-system-dossier.md) 对账；`5d0a0da`→`a16fedf`。README 无漂移。

- 2026-09-10｜**优化轮收口批（FULL 三审 R1/R2/R3 全采纳）**：ADR [收口+验收口径](.agents/notes/implemented/process/2026-09-10-optimization-round-closure.md)、[brief 明细兜底](.agents/notes/implemented/bug-fix/2026-09-10-review-brief-detail-fallback.md)；`d1a014a`→`e11dd0e`。README 无漂移。

- 2026-09-10｜**0.2.4 真机复验第二轮（新会话独立复现，零仓变更）**：A2 路标行在场；A3 首写一行 advice／重复不重提／载技能后消失；A4 lint 与注释面均 block×3 → 第 4 次 context → 合规写零反馈并复位 → 再违规回 block；域外 `.ts` 只判 lint、注释面静默（判据链在场反证）；非 `.ts` 零反馈。探针件全清。

- 2026-09-10｜**0.2.4 真机复验收口（三条 (B) 全清）**：A2 技能路标行在场；A3 对 `docs/` 写码投递一行 advice（非阻断、重复不重提、载对口技能后消失）；注释面在环判据全命中（域内缺 JSDoc → block、连续 3 次后降级 context、合规写复位、域外/非 `.ts` 零反馈）；release 工具族实发已验。**节点：发版轮闭环。** README 无漂移。

- 2026-09-10｜**0.2.4 发版（release-flow 首走新工具族；ADR `release-shape-alignment` 落地验证在案）**：bump 产 `chore(release)`+lock 同提交（`6fe74ea`）→ tag `dsh-v0.2.4` 过 pre-push → npm latest 0.2.4 → 双语 Release Latest；CI 34480922485 绿。**节点：三条 (B) 真机复验待重装。** README 同步 0.2.4。

- 2026-09-10｜**注释面在环扩面批收口（FULL 三审 R1 0B/3S、R2 1B/5S、R3 2B/5S 全采纳；ADR [export-docs-inloop](.agents/notes/implemented/architecture/2026-09-10-export-docs-inloop.md) implemented；`633b017`→`308561c`）**：A4 在环面扩到注释规范（判据件文件目标模式）。**节点：真机复验已过（见上）。** README 无漂移。

- 2026-09-10｜**评审实质执行拍板批收口（FULL 三审全采纳；ADR [review-execution-reconciliation](.agents/notes/implemented/architecture/2026-09-10-review-execution-reconciliation.md) implemented；`d79a0b5`）**：session-close 步骤 2 扩评审机器面对账；②缓议观察触发；阻断判不立；B4「另案」补指针。README 无漂移。

- 2026-09-10｜**技能 references 实拆补全（暂不新增技能；LIGHT 评审 4B+5S 全采纳；ADR [skill-references-fill](.agents/notes/implemented/process/2026-09-10-skill-references-fill.md)）**：trim + prose 补 `references/`（B0 件 4 触发兑现）；优化轮合并账（`1deb6be`）。**节点：技能清单补全收口。** README 无漂移。







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
- **M2 适配层已落地**（ADR [2026-09-06-m2-adapter-wiring](.agents/notes/implemented/architecture/2026-09-06-m2-adapter-wiring.md)；部署收口 ADR [2026-09-06-adapter-deploy-hardening](.agents/notes/implemented/architecture/2026-09-06-adapter-deploy-hardening.md)）：本仓 = npm 插件包形态（[`noogenesis-dsh@0.2.6`](https://www.npmjs.com/package/noogenesis-dsh) = latest，tag `dsh-v0.2.6`；0.2.6 = bank 技能 provider 注册时序修复（可重试注入）+ 提醒面可达性门（[修复件](.agents/notes/implemented/bug-fix/2026-09-12-bank-skill-provider-registration.md)）；0.2.4 = M1 技能守卫三件套 + 防过度设计契约 + A4 注释面在环拦回，ADR [m1-guard-anti-overdesign](.agents/notes/implemented/architecture/2026-09-10-m1-guard-anti-overdesign.md) + [export-docs-inloop](.agents/notes/implemented/architecture/2026-09-10-export-docs-inloop.md)；0.2.3 = A4 在环 lint 拦回升格 + pre-commit `--staged` 收窄，ADR [2026-09-09-lint-block-and-staged-hook](.agents/notes/implemented/architecture/2026-09-09-lint-block-and-staged-hook.md)；0.2.2 = A8 会话记录投影撤除，ADR [2026-09-08-a8-session-record-projection-removal](.agents/notes/implemented/architecture/2026-09-08-a8-session-record-projection-removal.md)；0.2.1 = M1/M2 exec 载荷字段修复，ADR [2026-09-08-mount-exec-arguments-field](.agents/notes/implemented/bug-fix/2026-09-08-mount-exec-arguments-field.md)；宿主件包名规则 = 裸名 + 宿主后缀）；`adapters/dsh/` spawn 单合同接线（system-prompt 节 + noo_* 三工具 + solidify 人工确认触发；repoRoot 四级回退链零配置生效）；hooks/CI 门禁清单单源 `engine/gates.json`（`scripts/gates.mts` 发射）。**技能随库分发的注册时序已修**（[修复件 ADR](.agents/notes/implemented/bug-fix/2026-09-12-bank-skill-provider-registration.md)；`skills-ride-bank` 决定不变）：provider 注册走 `ctx.inject(["skills"], …)` 可重试路径——skills 服务装载前在场即注册、晚到补注册（全局 `inject` 声明会让整插件等服务到场，探针实测反证）；提醒面（A2 路标行 + A3 触点提醒）只点名本会话目录里实际可载的技能（活副本通道恒计、随库缓存通道只在注册成功后计），缓存有技能而未注册留诊断 warn。`noo_*` 7 技能随 genes-cache 在位（`noogenesis-bank` provider，rank 600，pull 落地即 invalidate 刷新；蒸馏 = 通用方法论层 + 参照实现层）；真机复验 = todos (B) 条（外仓目录须出现 `noo-*`）。0.1.2 装载期 pull 错位缺陷已修（ADR [2026-09-06-bank-pull-session-trigger](.agents/notes/implemented/bug-fix/2026-09-06-bank-pull-session-trigger.md)）：genes-cache 落会话仓、remote=官方库、缓存基因并入扫描。
- **P2 只读共享消费已落地**（ADR [2026-09-06-p2-shared-consumer](.agents/notes/implemented/architecture/2026-09-06-p2-shared-consumer.md)，FULL 三审全采纳）：本仓即基因库（`dsh-gene-bank` 占位名弃用）；`engine pull`（CLI 命令族之一）+ `manifest.json` 检索索引（gen-manifest 生成 + verify-manifest 门禁）+ 缓存合并扫描（本仓基因优先遮蔽、evaluate/solidify 恒本仓面）；adapter `geneBankUrl` 缺省官方库（`false` 显式禁用）、pull 触发点随会话工作区（[bug-fix ADR](.agents/notes/implemented/bug-fix/2026-09-06-bank-pull-session-trigger.md)；失败 warn 降级离线）。贡献 PR / 观测透镜 / gene→skill / Genesis 基因随贡献开放轮。
- **框架重建已立项**（ADR [2026-09-06-framework-rebuild-charter](.agents/notes/implemented/architecture/2026-09-06-framework-rebuild-charter.md) implemented，FULL 三审全采纳）：拍板推倒重建（先框架后协作层、本仓原地重建——机器层分批重建、资产壳零搬迁、单批切换）；蓝图 [framework-rebuild-blueprint](docs/research/framework-rebuild-blueprint.md) 定稿（七层三段式 + A1–A8 挂载面全清单 + M1–M3 首批挂载物 + C1–C15 协作层验收需求）；**B0 框架结构面批已闭环**（C11/C12 转绿）；**B1 门禁族 TS 化已闭环**（ADR [2026-09-08-collab-rebuild-b1-gates-ts](.agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md) implemented：13 件 .mts + DAG runner + 双跑对账 12 件零 diff + tsc 工具链，py 权威并存至 B5 切换，C5 转绿 + C6 基线回填）；**B2 引擎+适配层 TS 化已闭环**（ADR [2026-09-08-b2-engine-adapter-ts](.agents/notes/implemented/architecture/2026-09-08-b2-engine-adapter-ts.md) implemented：engine 10 件 .ts + adapters 9 件 .mts 双跑对账零 diff、npm 发布面切 dist、js/mjs 权威并存至 B5，C3/C10 转绿 + C9 逐批核过）；**B3 钩子与安装面批已闭环**（ADR [2026-09-08-b3-hooks-install](.agents/notes/implemented/architecture/2026-09-08-b3-hooks-install.md) implemented：pre-commit lefthook 分域（py 命令零变化）+ pre-push 单编排器 TS（tier 循环同构端口 + 并行门禁组 + dist 自测）+ e2e 四态 TS 重建 + bash 三件退役 + tier 触发集 `.githooks`→`lefthook.yml` 对账，C2 部分/C4/C6 部分/C13 部分）；**B4 挂载面接线已闭环**（ADR [2026-09-08-b4-mount-wiring](.agents/notes/implemented/architecture/2026-09-08-b4-mount-wiring.md) implemented：六点接线 mount.mts 合并语义单源 + M1/M2/M3 建议/记录件零阻断 + peer dep dsh-llm 允许集封底两件 + C15 双候选评估均不立（数据在 ADR Decision 6），C7/C8/C15 落账 + C9 逐批核过；实机重验 2026-09-08（勘误随 A8 撤除批：「持久化容忍度 ✅」撤回——写路径落盘✅/读路径 fail-closed，A6/A8 记录投影面整体退役，ADR `2026-09-08-a8-session-record-projection-removal`；M1/M2 `exec.args`→`exec.arguments` 缺陷已修 0.2.1，ADR `2026-09-08-mount-exec-arguments-field`））；**B5 切换批已闭环**（ADR [2026-09-08-b5-switch](.agents/notes/implemented/architecture/2026-09-08-b5-switch.md) implemented：gates.json cmd 全量重指 TS（条目集与门禁名不变）+ 旧机器件全量退役（py 13/sh 1/js 10/mjs 9/reconcile 2）+ change-scope.mts 行为恒等端口 + 例外机制单家迁 gates.mts 头注 + CI/钩子单轨 + 基因指针经 solidify updated 刷新，C1/C10/C13/C14 转绿——**B0–B5 收官**）；下一步 = 胶囊 01 优化轮问题池（[capsule-01-optimization-round](docs/research/capsule-01-optimization-round.md)）。
- **M1 两批已全收口**（ADR [2026-09-10-m1-guard-anti-overdesign](.agents/notes/implemented/architecture/2026-09-10-m1-guard-anti-overdesign.md) implemented，两行 Review 在案，FULL 三审全采纳）：批 A = A2 技能路标行 + A3 触点提醒 advice 档（skill-guard + `config.skillGuards`）+ session-close 技能对账步；批 B = [anti-overdesign](docs/method/anti-overdesign.md) 完整蒸馏篇 + 根 AGENTS 契约块 9 条（547/800）+ [cases 质询索引](docs/research/anti-overdefense-cases-index.md)（不进加载面）+ 评审检查项第 5 条。真机复验已过（0.2.4 装机，2026-09-10）。
- **胶囊 01 优化轮已收口**（ADR [2026-09-10-optimization-round-closure](.agents/notes/implemented/process/2026-09-10-optimization-round-closure.md) implemented）：验收口径 = 池零未判定 + 终态单源 + 成果实机生效，三条件均兑现（2026-09-10）；问题池与方案工作面全部判终态（[池文档 §2.3 收口账](docs/research/capsule-01-optimization-round.md)）；跨会话遗留转行动区（todos D 条三件）；护栏 D 条触发随之满足。
- **注释面在环扩面已落地**（ADR [2026-09-10-export-docs-inloop](.agents/notes/implemented/architecture/2026-09-10-export-docs-inloop.md) implemented，FULL 三审全采纳）：A4 在环面 = lint + 注释面两判据（`export-docs-feedback.mts` 跑仓内判据件 `scripts/verify-export-docs.mts <file>` 文件目标模式，域归属单源；死锁门 `createBlockGate` 折叠单源）；模型面违约行英文（口径单源 = `adapters/dsh/README.md`）。真机复验已过（0.2.4 装机，2026-09-10）。
- **评审实质执行已拍板落账**（ADR [2026-09-10-review-execution-reconciliation](.agents/notes/implemented/architecture/2026-09-10-review-execution-reconciliation.md) implemented，FULL 三审全采纳）：session-close 步骤 2 扩评审机器面闭集标记对账（假完成收尾必暴露 + 跨会话证据出口）；②收口触点提醒缓议（触发 = ③对账暴露真实漏网；接线候选 engine 代理 / 钩子桥停止前在案，advice 预拍板、阻断判不立）；F3 三路实质维持语义面不设防。
- **护栏延后拍板**（ADR [2026-09-06-guardrail-defer-trigger](.agents/notes/proposed/architecture/2026-09-06-guardrail-defer-trigger.md) proposed）：护栏三件（token-meter 真测量 / 严格改进度量 / canary）需要但延后；**触发「首个胶囊优化完成」已满足（2026-09-10 收口 ADR 定义三条件并兑现）→ 待排期**，立项时逐件拍板接入形态与验收口径（见该 ADR Alternatives）。
- **编码规范机器强制已落地**（ADR [2026-09-08-c2-lint-enforcement](.agents/notes/implemented/architecture/2026-09-08-c2-lint-enforcement.md) implemented，FULL 三审全采纳）：oxlint 1.82.0 显式白名单（根 `.oxlintrc.json`，逐条理由）+ 导出面契约注释闸（`verify-export-docs.mts`，`adapters/dsh` + `scripts`）入 `engine/gates.json`（pre-commit/pre-push/CI 同判据）；首轮清 19 处真实缺陷 + 4 处注释缺口 + 1 死导出；[code-standards](docs/method/code-standards.md) 档位同步（2.1 存在性 / 2.3 词面 / §3 机械子集升 `[M]`，2.4 留 `[R]`）。
- **档位触发面已扩精度**（ADR [2026-09-11-review-tier-classification-precision](.agents/notes/implemented/process/2026-09-11-review-tier-classification-precision.md) implemented，FULL 三审 14 项全采纳）：`FULL_TRIGGERS` 增三条 —— 产品源码 `engine/**`、`adapters/**`（顶层目录）与装载补丁面 `cordis.patch.yml`（文件名判据）；「proposed ADR 自诺」判定与证据判定共用 `adrHeadStatus`（头部 15 行窗口、围栏内不算）；`review.md` §1 行为契约面口径按本仓改写（源仓遗留的 `src/**`/`tests/**` 措辞删除）；2026-09-05 闸件 ADR 的手抄副本改指针 + 三处 `.py` 死指针同步。噪声实测 n=296：仅产品源码提交 26（8.8%），过度触发面 6 笔（纯文档/夹具）。
- **技能触点提醒触发面已扩面**（ADR [2026-09-11-skill-guard-trigger-faces](.agents/notes/implemented/architecture/2026-09-11-skill-guard-trigger-faces.md) implemented，FULL 三审全裁决）：`config.skillGuards` 条目 = `{kind, pattern, skill}`（`path`|`suffix`|`command`，旧形态拒收）；缺省 4 条（`docs`→doc-standards、`.md`→prose-standard、`.agents/notes`→archive-agent-notes、`git`〔可带全局选项前缀〕`push`→pre-push-checks，匹配面按 [修复件](.agents/notes/implemented/bug-fix/2026-09-12-skill-guard-push-pattern-reachability.md)）；写码目标两条通道（write/edit `file_path` + bash `>`/`>>`/`tee` 目标）；一次 advice 列全命中项、每会话每技能至多一条、非阻断档不变。真机复验 2026-09-12 已过（0.2.5 装机：三形态 push 命中 + 重复不重提 + 重定向写后缀面命中，journal 在案）。
- **release 正文末节归并档已落地**（ADR [聚合档](.agents/notes/implemented/process/2026-09-12-release-note-daily-aggregation.md) implemented，FULL 三审全采纳）：`scripts/release/release-note.mts` 的末节（其他变更 / Chores）按提交日归并成每日一条（`- **<日期>（N 笔）**：… @作者`，条目零丢弃；键 = `%cs` 日期串建 Map，每个 login 各带 `@`）；其余三节逐条不变，形态与取舍单源在该 ADR。
- 门禁第一梯队全绿（含 self-test；清单单源 `engine/gates.json`，入口见根 AGENTS「质量门」）；engine self-test 与 CI 同跑（run 33976291727 绿）。
- **演化动作面为异步归集**（ADR [2026-09-12-absorption-async-round](.agents/notes/implemented/process/2026-09-12-absorption-async-round.md) implemented）：吸收不在变更主链路内——findings 去向 = `feature-flow` §4.6（逐条裁决 + 框架级候选写一行进 [HANDOFF-evolution-pool](HANDOFF-evolution-pool.md) + 落账后销账），演化轮成批落闸 / 落卡 / 转变更批（被撤件归档在 `.agents/notes/archived/process/`）；准则 = [主设计 §6](docs/research/dsh-swarm-evolution-framework-design.md)「关键纪律」第 5 条；立闸门槛单源仍在 [机械化 ADR](.agents/notes/implemented/process/2026-09-11-review-finding-mechanization.md) Decision 1；归集面决策 = [池件 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-file.md)；销账口径 = [销账 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-candidate-disposal.md)；`session-close` §3 按 §4.6 对 findings 去向。
- **阶段卡结构规范**（ADR [2026-09-11-stage-card-structure](.agents/notes/implemented/process/2026-09-11-stage-card-structure.md) implemented）：`doc-standards` §2 铁律 7（流程卡/阶段卡写成步序 + 角色位 + 关口；义务面 = 新增与改写的卡）+ 根 AGENTS 评审检查项第 6 条（流程与机制结构面）+ `feature-flow` §4.6 三步序（关口只在演化轮拍板处）+ `session-close` §3 按 findings 去向核。
- **评审发现机械化已落地**（ADR [2026-09-11-review-finding-mechanization](.agents/notes/implemented/process/2026-09-11-review-finding-mechanization.md) implemented，FULL 三审全裁决）：三类复发缺陷机械化——`verify-command-surface`（新，白名单条目 `command-surface`；`engine/bin.ts` 命令分支为事实源，校核 `usage()` 区间与 README 首个含调用的代码块，以及计数面里点名 CLI/engine 的「N 命令」）、`verify-package-invariants` 判据 6（三面版本锚：两 README 各自必须声明、HANDOFF 声明了就必须对）、`verify-secrets` 模式双向覆盖元断言；判据与门槛单源 = [机械化 ADR](.agents/notes/implemented/process/2026-09-11-review-finding-mechanization.md)（判据稳定即立、先实测噪声），「变更史词面闸」经实测（19 命中/18 规则自指）判不立；`gates.json` 17→18 条。
- **记忆库线第一期已落地**（ADR [实现件](.agents/notes/implemented/architecture/2026-09-11-memory-line-phase1-observation-face.md) implemented，FULL 三审全裁决）：`engine observe` 观测输入面（`.noogenesis/observations/`，gitignored/可丢弃；写路径 fail-closed、读路径 warn-skip）+ `select` 追加式建议档（`advice: <signal> :: <ref> ok/fail/last`，零观测零行、不进常驻命中节）+ 独立门禁件 `scripts/verify-secrets.mts`（凭据绊线扫 genes/ + events/ + 观测面，best-effort 非安全属性）；CLI 合同面 5→6 命令，`gates.json` 白名单 16→17 条。
- **编码强制两轨已闭环**（批 1 ADR [2026-09-08-lint-in-loop-feedback](.agents/notes/implemented/architecture/2026-09-08-lint-in-loop-feedback.md) + 批 2 ADR [2026-09-08-coding-enforcement-track-b](.agents/notes/implemented/architecture/2026-09-08-coding-enforcement-track-b.md)，均 implemented + `Review: FULL/2026-09-08`）：A4 写码在环 lint 反馈（建议档 `context`，8 条合同 + A2 指针行）；宿主 API 类型契约（键存在 + 形状相容两组断言）；发布面不变量闸（gates.json 15→16，15 夹具）；`arguments` 不实收窄修正；type-aware lint 以证据延后（触发 = 真实 async 失守）。**真机复验待装机**（todos B 条）。
- 技能 noo-* 7 个已被 DSH 自动发现；trim-cot-leakage / prose-standard 两件已补 `references/`（示例库 + 扫描电池/三分对照，B0 件 4 实拆触发兑现，ADR [2026-09-10-skill-references-fill](.agents/notes/implemented/process/2026-09-10-skill-references-fill.md)）；评审机械闸已落地（verify-review-tier + verify-review-brief，ADR [2026-09-05-review-mechanical-gate](.agents/notes/implemented/process/2026-09-05-review-mechanical-gate.md)）。
- 四项拍板：评审闸延后 v0.2 ✅ / journal 入 git ✅ / 技能前缀 noo-* ✅ / cookbook 首批 15 条 ✅。

## 待办

> 行动区（全部待办明细、状态与预算）在 **[HANDOFF-todos.md](HANDOFF-todos.md)**——`[ ]` 条 ≤16、`[x]` 条压缩为一行指针，由 `scripts/verify-handoff-structure.mts` 机器强制。
>
> 演化轮候选的归集池在 **[HANDOFF-evolution-pool.md](HANDOFF-evolution-pool.md)**——攒账步序 = `feature-flow` §4.6。

## 会话叙事档案（archive 指针）

> 会话**过程轨迹**按月卷记 `journal/<YYYY-MM>.md`（入 git）。丢失只丢叙事，**不丢决策**——durable 结论在 ADR/cookbook/README/AGENTS。当月卷允许暂不存在（首条叙事归档时创建）。

- **2026-09 卷**：`journal/2026-09.md`（胶囊 01 搬迁全程叙事）。

## 开始步骤（新会话恢复）

新会话恢复按流程卡 [session-open](.agents/workflows/session-open.md) 顺序执行（模式声明契约见 [session-modes](.agents/workflows/session-modes.md)）。
