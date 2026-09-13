# Agent Note: 设计稿功能补全批次表——欠账排序与开工顺序

Status: proposed

Related: 设计基准 [主设计](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · [共享层设计稿](../../../../docs/research/dsh-collective-evolution-shared-layer.md) · [框架重建蓝图](../../../../docs/research/framework-rebuild-blueprint.md)；前序批次表 [2026-09-06-collab-rebuild-impl](../../implemented/architecture/2026-09-06-collab-rebuild-impl.md)（B0–B5，已闭环）；行动区 [HANDOFF-todos](../../../../HANDOFF-todos.md)

## Problem

设计稿（主设计 / 共享层稿 / 蓝图）与本仓实现面之间的**差集没有单一事实源**：每件欠账以「后置 M2」「随贡献开放轮」「判不立（附触发）」的形态散落在十余条 ADR 与两份设计稿里。2026-09-13 会话实证该代价：选中「共享层收口轮」后对账，才发现其前提（真实使用面与可贡献内容）为零。

用户指令（2026-09-13）：按流程走、不越权；除完全不可实现者外**一律排序并记入行动区**，逐批一点点做。

现状事实（2026-09-13 实读，只列差集判定相关者）：

- **已交付**：Gene 协议 + 引擎八命令（select/propose/evaluate/solidify/pull/observe/capsule/mutation）+ `gates.json` 白名单 + Capsule / Mutation 两原语与事件 kind 五件 + Event 扩字段（跨链 `mutation_id`/`capsule_id` + 环境指纹 `env_fingerprint`）+ Evaluate 的 blast-radius 改动面度量（文件 / 行 / 范围）+ 候选比较 / 答案盲选择判据（通道封闭集 + 不排序；机器面判不立）；适配层 A1–A7 接线（A5 会话开始位与 A6 停止前续跑能力位均零策略；prompt 提交 / 工具前后折进 A2/A3/A4）；M1 技能守卫 + M2 规范面接入；token 基线两轨（预算判据 + 宿主读数）；技能随库分发；P2 只读消费（pull + manifest + 缓存合并）；记忆线第一期观测面与 `advice:` 建议档；胶囊 01 内容主体（7 技能 + method/cookbook/流程卡/门禁）。
- **未交付**：下方批次表余 13 项（序 1–20、23–25、27–36 已落终态，游标 = 批次 7 序 37；序 21/22/26 为前提/策展保留位）。
- **受宿主约束未交付**：A8 会话事件轨 / 状态投影——撤除理由 = 宿主读路径对未标 `ignorable` 的下游插件事件 fail-closed，且 `Session.append` 无 `ignorable` 写入口。连带 M3 原形态记录件（同节重议触发；同一失败面已由 session-close 对账步承接，[序 8 重拍 ADR](../../implemented/architecture/2026-09-13-m3-review-record-verdict.md)）。

## Proposal

### 排序原则

1. **协议/原语先行**：后续批次的量测面与数据面都建立在原语上（Capsule / Mutation / Event 扩字段 / blast-radius）。
2. **不触决策封条者先开工**：落在既判不立（记忆线第二期）或既有禁区之上的功能，排序保留其位置，但**必须先有独立的重拍 ADR 才开工**（见「需显式重拍的决策面」）；Detect 面按站立规则办理——自动 Detect 默认关 + 逐源过 HERO 两问，重拍件 = [裁决 ADR](../../implemented/architecture/2026-09-13-detect-source-verdict-session-event.md)。
3. **一件一交**：每项独立可验（ADR + 实现 + 门禁 + FULL 三审），不合并成大批；序号即开工建议顺序，允许按依赖跳批。

每批纪律：按 [feature-flow](../../../workflows/feature-flow.md) 走（立项拍板 → ADR → 实现 → 门禁 → FULL 三审 → 本地提交）；未经用户明示不推送。

**进度游标（跨会话恢复契约）**：新会话按 [session-open](../../../workflows/session-open.md) 读 [HANDOFF.md](../../../../HANDOFF.md) ⏭ = 当前批次 + [HANDOFF-todos](../../../../HANDOFF-todos.md) 当批条 = 本批可办项；每批收口时改本表对应行的备注为 `done（<批 ADR 指针>）`，并把行动区当批条换成下一批。46 项不逐条进行动区——行动区 `[ ]` 开条目 ≤16 为机器强制（`verify-handoff-structure`）。

### 批次表（有序）

**批次 1 — 演化原语与协议（无封条依赖）**

| 序 | 功能 | 设计出处 | 备注 |
|---|---|---|---|
| 1 | Capsule 原语：`capsules/<domain>/<id>.json` 落盘 + 写读命令 + 校验闸 + 复算规则 | 主设计 §5.1/§6；共享层稿 §6.2 | done（[Capsule ADR](../../implemented/architecture/2026-09-13-capsule-primitive.md)）；Event/S2 的 kind 面同批定 |
| 2 | Mutation 原语：`category`/`target`/`expected_effect`/`risk_level` | 主设计 §5.1 | done（[Mutation ADR](../../implemented/architecture/2026-09-13-mutation-primitive.md)）；P1 D3 被否备选 C 的合理内核已兑现 |
| 3 | Event 扩字段：`mutation_id`/`capsule_id`/`env_fingerprint`/`validation_report_id` | 主设计 §5.1 | done（[Event 扩字段 ADR](../../implemented/architecture/2026-09-13-event-field-extension.md)）；三件落地，`validation_report_id` 按该 ADR E4 具名延期（触发 = 序 43/45 的报告对象） |
| 4 | Evaluate 的 blast-radius：改动面度量（文件 / 行 / 范围） | 主设计 §6 Evaluate | done（[blast-radius ADR](../../implemented/architecture/2026-09-13-evaluate-blast-radius.md)）；`max_files` 改由同一度量的文件数供给，Capsule `blast_radius` 字段判不立（触发见该 ADR B3） |
| 5 | 候选比较 / 答案盲选择机制（无金标代理信号） | 主设计 §7.1-5/§7.2 | done（[判据 ADR](../../implemented/architecture/2026-09-13-candidate-comparison-blindness.md)）；判据已立（通道封闭集 = 独立执行 ∪ 观测），机器面判不立（两处具名触发见该 ADR C3） |

**批次 2 — 挂载与接线面收口**

| 序 | 功能 | 设计出处 | 备注 |
|---|---|---|---|
| 6 | A5 其余三时刻（prompt 提交 / 工具前后 / 停止前） | 主设计 §11.1；蓝图 §7 A5 | done（判已交付、无新增面：会话开始位自接，prompt 提交折进 A2、工具前后折进 A3/A4，停止前 = 序 7 的 A6——四时刻映射实证见 [B4 ADR](../../implemented/architecture/2026-09-08-b4-mount-wiring.md) Decision 1「A5 归口」） |
| 7 | A6 停止前守卫（`agent/turn-stopping`） | 蓝图 §7 A6 | done（[A6 能力位 ADR](../../implemented/architecture/2026-09-13-a6-turn-stopping-mount.md)）：交付 = 能力位接线（零策略）+ 档位结论 = 本点只有续跑档（`steer`），停止前无 advice 面；记录投影 / 评审触点 / 停止前扫描三条策略候选的裁决与触发条见该 ADR Decision 2 |
| 8 | M3 评审实质执行记录件 | 蓝图 §7 M3 | done（[重拍 ADR](../../implemented/architecture/2026-09-13-m3-review-record-verdict.md)）：原形态「记录落事件轨」立宿主约束面判不可实现；同一失败面已由 session-close ③ 对账承接（零代码，2026-09-10 落卡）；② 与阻断候选维持既有触发，不新立机器件 |
| 9 | M1 升格档（重复违约 → 阻断）评估 | 蓝图 §7 M1 | done（[评估 ADR](../../implemented/architecture/2026-09-13-m1-escalation-verdict.md)）：服从面实测 47/51（92%）照办、未照办 4 例零代价归因（带代价两例在 advice 发行面之前）→ 维持单次 advice 档，判不立升格；升格触发 T1–T3 具名 |
| 10 | `dsh-invariants` 接入（机械不变量） | 主设计 §7.3/§11.2 | done（[裁决 ADR](../../implemented/architecture/2026-09-13-invariants-integration-verdict.md)）：本包零自有运行时不变量（A8 后不写会话事件，会话级态全在进程内存）、两条设计意图已由字面预算 + 契约闸兑现 → 判不接；落蓝图 §9「invariant 伴生件族」不做清单（要做须重拍），重议触发 T1–T3 具名 |

**批次 3 — 生命周期自动面**

| 序 | 功能 | 设计出处 | 备注 |
|---|---|---|---|
| 11 | Detect 逐源裁决：`session/event` | 主设计 §6；P1 D2 禁区 | done（[裁决 ADR](../../implemented/architecture/2026-09-13-detect-source-verdict-session-event.md)）：D2 禁区重拍为「默认关 + 逐源门槛」，本源 HERO 两问判不立 |
| 12 | Detect 逐源裁决：`agent/error` | 同上 | done（[裁决 ADR](../../implemented/architecture/2026-09-13-detect-source-verdict-agent-error.md)）：实例面全为 provider/API 失败、动作面缺席，判不立 |
| 13 | Detect 逐源裁决：`agent/turn-stopping` | 同上 | done（[裁决 ADR](../../implemented/architecture/2026-09-13-detect-source-verdict-turn-stopping.md)）：事件 = 93.4% 正常回合的关闭边界、载荷无失败位（唯二非 completed 可达子面 `max-tokens` 实测 n=0），判不立 |
| 14 | Detect 逐源裁决：`tool/result` | 同上 | done（[裁决 ADR](../../implemented/architecture/2026-09-13-detect-source-verdict-tool-result.md)）：结果对象已由 A4 在 `tools/post-execute` 消费（实测失败面 A4 判据 41.8% + 宿主 fs 面 38.6% = 80.5%），判不立；四源裁决组收口 |
| 15 | 情境按需注入（命中节动态信号，替代静态 `injectSignals`） | 主设计 §8.3 | done（[裁决 ADR](../../implemented/architecture/2026-09-13-situational-injection-verdict.md)）：四派生面全落已裁面或不可判面、现网 `injectSignals` 零声明无消费面，判不立 |
| 16 | Hypothesize 阶段（记录「信号 + gene + mutation → 预期结果」） | 主设计 §6 | done（[重拍 ADR](../../implemented/architecture/2026-09-14-memory-line-phase2-reshoot.md)）：判不立——自动写已被 D4「运行不记」封，人工写的消费者（预期-实际对账）属序 19 面；预期声明的既有家 = Mutation `expected_effect`；触发条与序 19 同面 |
| 17 | 观测面自动接线（写者集合扩至挂载面） | 记忆线 D7-3 | done（[重拍 ADR](../../implemented/architecture/2026-09-14-memory-line-phase2-reshoot.md)）：确认维持「挂载面暂不立」，重议触发 = 出现需无人写入的真实场景 |

**批次 4 — Select 消费面（须先重议判不立）**

| 序 | 功能 | 设计出处 | 备注 |
|---|---|---|---|
| 18 | memory-graph 因果边现算（(signal, gene) → outcome） | 主设计 §5.1 | done（[重拍 ADR](../../implemented/architecture/2026-09-14-memory-line-phase2-reshoot.md)）：判已交付——现算面 = 第一期实现 ADR Decision 3 的读路径派生边 `(signal::gene)→{ok,fail,last_ts}`（advice 建议档、零观测零行），形态单源 = 融合立宪 D7-1/D8；设计「驱动选择」列 = 序 19 消费面 |
| 19 | 排序 / 禁用 / 阈值 / 半衰期 | 主设计 §5.1 | done（[重拍 ADR](../../implemented/architecture/2026-09-14-memory-line-phase2-reshoot.md)）：开工前重议 2026-09-14 维持判不立——触发条实测与判裁时逐值相同（genes 6/12、观测零记录）；触发条单源不变 = 第一期实现 ADR Decision 4 |
| 20 | 观测透镜（采用 / 被拒 / 传播 / 分歧；只观测无积分） | 主设计 §9.4 | done（[重拍 ADR](../../implemented/architecture/2026-09-14-memory-line-phase2-reshoot.md)）：维持 P2 D3 后置——门 = 共享层 P3 口径（[P2 ADR](../../implemented/architecture/2026-09-06-p2-shared-consumer.md) D3；前提面 = 序 21 贡献开放轮），非记忆线判裁 |

**批次 5 — 共享层后半**

| 序 | 功能 | 设计出处 | 备注 |
|---|---|---|---|
| 21 | 贡献闸（staging + PR + CI 跨机器复验 + 维护者合入） | 主设计 §9.3 | 前提 = 真实使用面与可贡献内容 |
| 22 | 独立基因库仓 + 命名 | 主设计 §9.1 | P2 D1「随贡献开放再立」 |
| 23 | taxonomy 细分拍板 | 主设计 §13-1 | done（[开题轮 ADR](../../implemented/architecture/2026-09-14-batch5-opening-round.md)）：维持后置——触发 = 贡献开放轮开轮第一批拍（三处既有口径不变）；Mutation `category` 维持无值域 |
| 24 | schema 扩字段（`provenance`/`evidence_ref`/`version`）+ YAML 决策 | 共享层稿 §6.2；P1 遗留 | done（[开题轮 ADR](../../implemented/architecture/2026-09-14-batch5-opening-round.md)）：维持后置（P2 D3 口径不变）——三字段单机各有本地替身（`gene_sha`/`actor`/`evidence`），字段先于消费者即死字段；JSON 八字段 + `js-yaml` 例外权不动 |
| 25 | gene→skill 渲染语义 | M2 M4 | done（[开题轮 ADR](../../implemented/architecture/2026-09-14-batch5-opening-round.md)）：确认落账——维持 P2 D3 后置口径（随贡献开放轮拍渲染语义；技能分发半边已提前收口为「技能随库分发」） |
| 26 | Genesis 世界观基因入档 | P2 D3 | 内容策展（保留位置；触发 = P2 D3 首批外部基因轮，或用户给出世界观内容） |
| 27 | `capsules/` 三义术语拍板 | 主设计 §8.2/§9.1；共享层稿 §6.2 | done（[Capsule ADR](../../implemented/architecture/2026-09-13-capsule-primitive.md) C1；[开题轮 ADR](../../implemented/architecture/2026-09-14-batch5-opening-round.md) 确认落账）：`capsules/` 只指 Capsule 原语，§8.2 知识原子归序 42 |
| 28 | `validate.yml` 覆盖范围（最小集 vs 全覆盖） | 主设计 §13-2；共享层稿 §11-2 | done（[开题轮 ADR](../../implemented/architecture/2026-09-14-batch5-opening-round.md)）：确认全覆盖为终局——现状已是穷尽矩阵（第一梯队全量 + 独立件 + tier + self-test 抽查 + 双 selftest）；两稿未决条同批回写 |
| 29 | 与 `dsh-continual-evolve` 融合边界 | 主设计 §13-5 | done（[开题轮 ADR](../../implemented/architecture/2026-09-14-batch5-opening-round.md)）：协议层归属本仓插件包为终局（旧引擎冻结 D6；触发 = 出现第二真实消费者时重议拆分）；两稿未决条同批回写 |

**批次 6 — P3 元演化**

| 序 | 功能 | 设计出处 | 备注 |
|---|---|---|---|
| 30 | 蒸馏（失败 → 基因候选，人工在环） | 主设计 §12-P3 | done（[distill 命令 ADR](../../implemented/architecture/2026-09-14-distill-command.md)；边界单源 = [P1 D3 重拍 ADR](../../implemented/architecture/2026-09-14-p1-d3-distillation-reshoot.md)） |
| 31 | 组合（Capsule → 预设 / 流程） | 主设计 §12-P3 | done（[批次 6 裁决 ADR](../../implemented/architecture/2026-09-14-batch6-composition-meta-verdict.md)）：判不立——能力面归口行 36 + 序 25 渲染语义门（触发 T1–T3 具名）；补取证 = `capsules/` 零实例、宿主组合面 = CLI + `$DSH_HOME/profiles/` |
| 32 | 策略自身可搜索（元演化） | 主设计 §12-P3 | done（[批次 6 裁决 ADR](../../implemented/architecture/2026-09-14-batch6-composition-meta-verdict.md)）：判不立——与序 5 C3-1 同面，触发条不新立 |
| 33 | 长程递归演化 | 主设计 §12-P3 | done（[批次 6 裁决 ADR](../../implemented/architecture/2026-09-14-batch6-composition-meta-verdict.md)）：顺延（判不立）——依赖行 32 判立 + 某 Detect 源过 HERO 两问（T1–T3 单条到达不等于过门） |

**批次 7 — P4 分发**

| 序 | 功能 | 设计出处 | 备注 |
|---|---|---|---|
| 34 | 一行安装收口（npm 已具备，补 profile 一键） | 主设计 §12-P4 | done（[一行安装 ADR](../../implemented/architecture/2026-09-14-one-line-install.md)）：宿主 `dsh plugin` 首用初始化 + 包自带 `dsh.bundle.patch` 自动入层 → 一行装 / 一行起；交付 = 根 README 双语安装节四条路径，零机器面 |
| 35 | 多 harness 适配 | 主设计 §12-P4 | done（[Hermes hook 桥 ADR](../../implemented/architecture/2026-09-14-hermes-hook-bridge.md)）：第二宿主 = Hermes——原生读 `AGENTS.md` 链 + `.agents/skills` 项目技能路径（零适配）；第一刀 = `adapters/hermes/` 写码在环拦回（`pre_tool_call` + `write_file`，判据 = 仓根 oxlint 半） |
| 36 | 胶囊组合成 preset / profile | 主设计 §2.3/§11.2 | done（[裁决 ADR](../../implemented/architecture/2026-09-14-capsule-composition-verdict.md)）：判不立——组合面由宿主 profile bundle + agent preset 两层原生承载、本包已是可组合单元；缺席的是输入侧（Capsule 实例零 / 内容单元单件）与产出渲染判据（序 25 后置）；触发条沿用行 31 T1–T3 单源 |
| 37 | 插件市场 / capability manifest 适配 | 主设计 §11.2/§12-P4 | — |

**批次 8 — 内容域（主设计 §10）**

| 序 | 功能 | 设计出处 | 备注 |
|---|---|---|---|
| 38 | 项目初始化域（模板 / CI 骨架 / 一键安装） | 主设计 §10 | 现仅 `templates/` 三件 |
| 39 | 优雅极致实现域（性能 / 复杂度 / benchmark 门禁） | 主设计 §10 | 未覆盖 |
| 40 | 踩坑原子化（cookbook 条 → 基因 / 原子胶囊） | 主设计 §10/§8.2 | 内容策展 |
| 41 | 开发流程选择域补全 | 主设计 §10 | 流程卡已在，域内余项 |
| 42 | 知识原子 content-addressable（一条知识 = 一个原子胶囊） | 主设计 §8.2 | 现仅 `gene_sha` |

**批次 9 — 验证与命令面**

| 序 | 功能 | 设计出处 | 备注 |
|---|---|---|---|
| 43 | 子代理自动执行验证（候选入闸真跑；执行者 / 评审者分离） | 主设计 §7.2 | 现为人工跑门禁 |
| 44 | `/evolve` 命令面（list / consolidate / wrapup / verify / benchmark） | 主设计 §11.2 | 现六命令 CLI |
| 45 | 合并携带自校验证据 | 主设计 §7.2 | 依赖序 21 |
| 46 | manifest 检索增强（向量） | 共享层稿 §10-P3（可选） | 可选 |

### 需显式重拍的决策面

- **P1 骨架 D2 禁区 + M2「Detect 显式不做」**：站立规则已重拍为「自动 Detect 默认关 + 逐源过 HERO 两问」——重拍件 = [Detect 逐源裁决 ADR](../../implemented/architecture/2026-09-13-detect-source-verdict-session-event.md)（行 11 `session/event` 判不立；行 12 `agent/error` 判不立，[裁决 ADR](../../implemented/architecture/2026-09-13-detect-source-verdict-agent-error.md)；行 13 `agent/turn-stopping` 判不立，[裁决 ADR](../../implemented/architecture/2026-09-13-detect-source-verdict-turn-stopping.md)；行 14 `tool/result` 判不立，[裁决 ADR](../../implemented/architecture/2026-09-13-detect-source-verdict-tool-result.md)）——四源（行 11–14）裁决组收口；行 15 情境按需注入在同一规则下判不立（[裁决 ADR](../../implemented/architecture/2026-09-13-situational-injection-verdict.md)）。
- **记忆线第二期判裁**（排序 / 禁用 / 阈值 / 半衰期判不立；行为评估自建判不立）：已重议（2026-09-14，[重拍 ADR](../../implemented/architecture/2026-09-14-memory-line-phase2-reshoot.md)）——维持判不立，触发条单源不变（[第一期实现 ADR](../../implemented/architecture/2026-09-11-memory-line-phase1-observation-face.md) Decision 4）；行为评估自建不属该重拍面（判据 = 评分对象缺席）。
- **P1 骨架 D3（propose 不产新基因）**：已重拍（2026-09-14，[重拍 ADR](../../implemented/architecture/2026-09-14-p1-d3-distillation-reshoot.md)）——D3 实质维持，序 30 蒸馏以「显式触发 + 压缩在宿主侧 + 产物是候选」形态放行，序 30 开工资格过门；批次 1 序 1 曾就产出面重拍一次（[Capsule ADR](../../implemented/architecture/2026-09-13-capsule-primitive.md) C5）。**schema ADR S2（事件 kind 集与键集）**：批次 1 的序 1–3 已三轮重拍收敛（五 kind、必需键 + 按 kind 允许可选键），序 30 若再触该面须重拍。
- **「已判不做」清单**内任何一项被选中，逐条重拍（见下节）。

### 受宿主约束不可实现（不排序，记重议触发）

- **A8 会话事件轨 / 状态投影**：重议触发 = 宿主提供 `ignorable` 写入口，或读路径容忍下游插件事件。

### 已判不做（显式排除，不在排序内；要做须重拍）

蓝图 §9 不做清单：双语 i18n 配对、type-equiv / 生成目录生成器族、VitePress 文档站点、16 workflow CI 矩阵、vendoring / rescope、invariant 伴生件族、栈式 PR / base retargeting、用户全局 AGENTS.md 副本、plan/todo/goal 包层、defensive-patterns 第三家、repeat-tool-reminder 首批挂载、timeout-policy、两方言 hooks 桥（claude-code / codex）。

## Alternatives considered

- **只做主线、不落批次表**：落败——2026-09-13 已实证代价（凭印象选轮，选中前提不成立的一轮，整轮作废）。
- **按设计稿章节顺序做（§5 → §13）**：落败——章节顺序不是依赖顺序（§8 注入场景依赖 §5 原语与 §6 的 Detect 裁决）。
- **全部并行开工**：落败——单人单仓 + 每批 FULL 三审，并行会把评审面与 diff 面搅在一起。
- **把批次表落 `docs/research/` 而非 ADR**：落败——它是带拍板关口与开工顺序的决策件，rationale 与备选须可追溯；research 层是调研稿的家。

## Consequences

- **单源与指针**：本表是设计稿差集的唯一单源；[HANDOFF-todos](../../../../HANDOFF-todos.md) 承载当批可办项，[HANDOFF.md](../../../../HANDOFF.md) ⏭ 指向本表。
- **状态推进**：每批收口时更新本表对应行（pending → done）；全部完成或用户改向时，本笔记转 implemented 或由新笔记取代。
- **封条纪律**：批次 3 的 D2 重拍件已立（[裁决 ADR](../../implemented/architecture/2026-09-13-detect-source-verdict-session-event.md)：默认关 + 逐源门槛），行 11–15 已全部裁决（全判不立）；批次 4 的记忆线重拍件已立（[重拍 ADR](../../implemented/architecture/2026-09-14-memory-line-phase2-reshoot.md)），行 16–20 落终态；批次 5 的开题轮拍板件已落（[开题轮 ADR](../../implemented/architecture/2026-09-14-batch5-opening-round.md)），行 23–29 落终态（21/22/26 保留位）；批次 6 收口件已落（[裁决 ADR](../../implemented/architecture/2026-09-14-batch6-composition-meta-verdict.md)）——行 30 已交付、行 31–33 判不立 / 顺延；批次 7 序 34–36 已落（[一行安装](../../implemented/architecture/2026-09-14-one-line-install.md)、[Hermes hook 桥](../../implemented/architecture/2026-09-14-hermes-hook-bridge.md)、[序 36 裁决](../../implemented/architecture/2026-09-14-capsule-composition-verdict.md)），游标 = 批次 7（序 37）。
- **不承诺工期**：本表承诺的是「差集不再重新对账」，不是排期。
