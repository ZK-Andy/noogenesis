# Agent Note: 设计稿功能补全批次表——欠账排序与开工顺序

Status: proposed

Related: 设计基准 [主设计](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · [共享层设计稿](../../../../docs/research/dsh-collective-evolution-shared-layer.md) · [框架重建蓝图](../../../../docs/research/framework-rebuild-blueprint.md)；前序批次表 [2026-09-06-collab-rebuild-impl](../../implemented/architecture/2026-09-06-collab-rebuild-impl.md)（B0–B5，已闭环）；行动区 [HANDOFF-todos](../../../../HANDOFF-todos.md)

## Problem

设计稿（主设计 / 共享层稿 / 蓝图）与本仓实现面之间的**差集没有单一事实源**：每件欠账以「后置 M2」「随贡献开放轮」「判不立（附触发）」的形态散落在十余条 ADR 与两份设计稿里。2026-09-13 会话实证该代价：选中「共享层收口轮」后对账，才发现其前提（真实使用面与可贡献内容）为零。

用户指令（2026-09-13）：按流程走、不越权；除完全不可实现者外**一律排序并记入行动区**，逐批一点点做。

现状事实（2026-09-13 实读，只列差集判定相关者）：

- **已交付**：Gene 协议 + 引擎七命令（select/propose/evaluate/solidify/pull/observe/capsule）+ `gates.json` 白名单 + Capsule 原语与事件 kind 四件；适配层 A1–A4 / A5（仅会话开始位）/ A7 接线；M1 技能守卫 + M2 规范面接入；token 基线两轨（预算判据 + 宿主读数）；技能随库分发；P2 只读消费（pull + manifest + 缓存合并）；记忆线第一期观测面与 `advice:` 建议档；胶囊 01 内容主体（7 技能 + method/cookbook/流程卡/门禁）。
- **未交付**：下方批次表余 45 项（序 1 已 done）。
- **受宿主约束未交付**：A8 会话事件轨 / 状态投影——撤除理由 = 宿主读路径对未标 `ignorable` 的下游插件事件 fail-closed，且 `Session.append` 无 `ignorable` 写入口。

## Proposal

### 排序原则

1. **协议/原语先行**：后续批次的量测面与数据面都建立在原语上（Capsule / Mutation / Event 扩字段 / blast-radius）。
2. **不触决策封条者先开工**：落在既有禁区（P1 骨架 D2；M2「Detect 显式不做」）或既判不立（记忆线第二期）之上的功能，排序保留其位置，但**必须先有独立的重拍 ADR 才开工**（见「需显式重拍的决策面」）。
3. **一件一交**：每项独立可验（ADR + 实现 + 门禁 + FULL 三审），不合并成大批；序号即开工建议顺序，允许按依赖跳批。

每批纪律：按 [feature-flow](../../../workflows/feature-flow.md) 走（立项拍板 → ADR → 实现 → 门禁 → FULL 三审 → 本地提交）；未经用户明示不推送。

**进度游标（跨会话恢复契约）**：新会话按 [session-open](../../../workflows/session-open.md) 读 [HANDOFF.md](../../../../HANDOFF.md) ⏭ = 当前批次 + [HANDOFF-todos](../../../../HANDOFF-todos.md) 当批条 = 本批可办项；每批收口时改本表对应行的备注为 `done（<批 ADR 指针>）`，并把行动区当批条换成下一批。46 项不逐条进行动区——行动区 `[ ]` 开条目 ≤16 为机器强制（`verify-handoff-structure`）。

### 批次表（有序）

**批次 1 — 演化原语与协议（无封条依赖）**

| 序 | 功能 | 设计出处 | 备注 |
|---|---|---|---|
| 1 | Capsule 原语：`capsules/<domain>/<id>.json` 落盘 + 写读命令 + 校验闸 + 复算规则 | 主设计 §5.1/§6；共享层稿 §6.2 | done（[Capsule ADR](../../implemented/architecture/2026-09-13-capsule-primitive.md)）；Event/S2 的 kind 面同批定 |
| 2 | Mutation 原语：`category`/`target`/`expected_effect`/`risk_level` | 主设计 §5.1 | P1 D3 被否备选 C 的合理内核，原定「留待 M2/P3 蒸馏轮」 |
| 3 | Event 扩字段：`mutation_id`/`capsule_id`/`env_fingerprint`/`validation_report_id` | 主设计 §5.1 | S2 现口径「字段先于原语 = 死字段」，原语到位后解锁 |
| 4 | Evaluate 的 blast-radius：改动面度量（文件 / 行 / 范围） | 主设计 §6 Evaluate | 与 `constraints.max_files` 判据对接 |
| 5 | 候选比较 / 答案盲选择机制（无金标代理信号） | 主设计 §7.1-5/§7.2 | 完全未建；先定判据再动手（防造不可判定信号） |

**批次 2 — 挂载与接线面收口**

| 序 | 功能 | 设计出处 | 备注 |
|---|---|---|---|
| 6 | A5 其余三时刻（prompt 提交 / 工具前后 / 停止前） | 主设计 §11.1；蓝图 §7 A5 | 现仅会话开始位已接 |
| 7 | A6 停止前守卫（`agent/turn-stopping`） | 蓝图 §7 A6 | 未接；档位（记录 / 建议 / 阻断）逐件过 HERO |
| 8 | M3 评审实质执行记录件 | 蓝图 §7 M3 | 现「语义面不设防 + 缓议」，须重拍 |
| 9 | M1 升格档（重复违约 → 阻断）评估 | 蓝图 §7 M1 | 现 advice 档 |
| 10 | `dsh-invariants` 接入（机械不变量） | 主设计 §7.3/§11.2 | 未接 |

**批次 3 — 生命周期自动面（须先重拍禁区）**

| 序 | 功能 | 设计出处 | 备注 |
|---|---|---|---|
| 11 | Detect 逐源裁决：`session/event` | 主设计 §6；P1 D2 禁区 | 逐源答 HERO 两问 |
| 12 | Detect 逐源裁决：`agent/error` | 同上 | 同上 |
| 13 | Detect 逐源裁决：`agent/turn-stopping` | 同上 | 同上 |
| 14 | Detect 逐源裁决：`tool/result` | 同上 | 同上 |
| 15 | 情境按需注入（命中节动态信号，替代静态 `injectSignals`） | 主设计 §8.3 | 受 D2 禁区约束 |
| 16 | Hypothesize 阶段（记录「信号 + gene + mutation → 预期结果」） | 主设计 §6 | 落 memory-graph，依赖序 18 |
| 17 | 观测面自动接线（写者集合扩至挂载面） | 记忆线 D7-3 | 现判「挂载面暂不立」，重议触发 = 出现需无人写入的真实场景 |

**批次 4 — Select 消费面（须先重议判不立）**

| 序 | 功能 | 设计出处 | 备注 |
|---|---|---|---|
| 18 | memory-graph 因果边现算（(signal, gene) → outcome） | 主设计 §5.1 | 现仅 `advice:` 计数 |
| 19 | 排序 / 禁用 / 阈值 / 半衰期 | 主设计 §5.1 | 记忆线 phase1 判不立（无对象），开工前重议 |
| 20 | 观测透镜（采用 / 被拒 / 传播 / 分歧；只观测无积分） | 主设计 §9.4 | P2 D3 后置 |

**批次 5 — 共享层后半**

| 序 | 功能 | 设计出处 | 备注 |
|---|---|---|---|
| 21 | 贡献闸（staging + PR + CI 跨机器复验 + 维护者合入） | 主设计 §9.3 | 前提 = 真实使用面与可贡献内容 |
| 22 | 独立基因库仓 + 命名 | 主设计 §9.1 | P2 D1「随贡献开放再立」 |
| 23 | taxonomy 细分拍板 | 主设计 §13-1 | 未决 |
| 24 | schema 扩字段（`provenance`/`evidence_ref`/`version`）+ YAML 决策 | 共享层稿 §6.2；P1 遗留 | `js-yaml` 例外权保留至今未动用 |
| 25 | gene→skill 渲染语义 | M2 M4 | 现口径「维持后置不取代」 |
| 26 | Genesis 世界观基因入档 | P2 D3 | 内容策展 |
| 27 | `capsules/` 三义术语拍板 | 主设计 §8.2/§9.1；共享层稿 §6.2 | [HANDOFF-todos](../../../../HANDOFF-todos.md)（D）条 |
| 28 | `validate.yml` 覆盖范围（最小集 vs 全覆盖） | 主设计 §13-2；共享层稿 §11-2 | 未决 |
| 29 | 与 `dsh-continual-evolve` 融合边界 | 主设计 §13-5 | 未决；记忆线融合已收口，协议层归属仍 open |

**批次 6 — P3 元演化**

| 序 | 功能 | 设计出处 | 备注 |
|---|---|---|---|
| 30 | 蒸馏（失败 → 基因候选，人工在环） | 主设计 §12-P3 | 须重拍 P1 D3 |
| 31 | 组合（Capsule → 预设 / 流程） | 主设计 §12-P3 | 依赖序 1 |
| 32 | 策略自身可搜索（元演化） | 主设计 §12-P3 | — |
| 33 | 长程递归演化 | 主设计 §12-P3 | 依赖序 30–32 |

**批次 7 — P4 分发**

| 序 | 功能 | 设计出处 | 备注 |
|---|---|---|---|
| 34 | 一行安装收口（npm 已具备，补 profile 一键） | 主设计 §12-P4 | — |
| 35 | 多 harness 适配 | 主设计 §12-P4 | 现单宿主（DSH） |
| 36 | 胶囊组合成 preset / profile | 主设计 §2.3/§11.2 | 依赖序 1/25 |
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

- **P1 骨架 D2 禁区 + M2「Detect 显式不做」**：批次 3 的四源逐条裁决，逐条答 HERO 两问后成文。
- **记忆线第二期判裁**（排序 / 禁用 / 阈值 / 半衰期判不立；行为评估自建判不立）：批次 4 开工前重议。
- **P1 骨架 D3（propose 不产新基因）+ schema ADR S2（event kind 封闭集三件）**：批次 1 的序 1/3 与批次 6 的序 30 需相应重拍。
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
- **封条纪律**：批次 3/4 开工前必须先有独立的重拍 ADR；未重拍不得动代码。
- **不承诺工期**：本表承诺的是「差集不再重新对账」，不是排期。
