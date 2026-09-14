# Agent Note: 批次 8 序 40 裁决——踩坑原子化：每坑一原子已交付（cookbook），「→ 基因」批量转化判不立

Status: implemented

Review: LIGHT/2026-09-14/语义评审（范围化子代理单路 R2：2 Blocker + 3 Suggestion 全采纳——cookbook「四元素机器强制」为假陈述 → 收窄为「外形机器强制 + 四段头注约定」（Problem 与 Decision 1 同改）；「三条理由」实为四条 → 并入 signal 消费者；三条同面基因早于 `distill add` → 样例措辞收窄到「策展 → evaluate → solidify」段；gene 八字段可选面补全；简报两处根相对链接改 `../` 形）

Related: 批次表 [行 40](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · 主设计 [§10 / §8.2 / §7.2](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 踩坑原子家 [cookbook](../../../../docs/cookbook.md) + [verify-cookbook](../../../../scripts/verify-cookbook.mts) · 踩坑形态档位 [doc-standards tier 表](../../../../docs/method/doc-standards.md) · 迁移先例 [capsule-01-migration-plan](../../../../journal/capsule-01-migration-plan.md) · 入档权 [D3 重拍 ADR](2026-09-14-p1-d3-distillation-reshoot.md) · 转化通道 [distill ADR](2026-09-14-distill-command.md) · 策展纪律 [new-gene-curation](../../../../genes/gates/new-gene-curation.json) · gene schema [gene.ts](../../../../engine/gene.ts) · 选择注入面 [select.ts](../../../../engine/select.ts) · 地址面归属 [行 42](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · 前序裁决 [序 39](2026-09-14-elegant-implementation-verdict.md) / [序 38](2026-09-14-project-init-domain-verdict.md) · 档位判据 [review.md](../../../../docs/method/review.md)

## Problem

批次表行 40（批次 8 内容域第三件）要求「踩坑原子化（cookbook 条 → 基因 / 原子胶囊）」，出处主设计 §10 表行「踩坑记录 | 每坑一原子胶囊（症状/根因/规避/来源）| 检索注入、AVOID 警告、回归用例」与 §8.2「一条知识 = 一个原子胶囊」。开工前取证（2026-09-14，本仓实读）：

- **每坑一原子已在场**：`docs/cookbook.md` 49 条，域标签封闭集（演化 7 / 门禁 19 / 文档 4 / 协作 7 / 环境 11 / 上游 1）；条目外形（标题域标签 + 真实日期 + 非空正文）由 `scripts/verify-cookbook.mts` 机器强制，正文的症状 / 根因 / 规避 / 来源四段是 cookbook 头注的作者约定（非机器强制，另有条目只落其中数段）；[doc-standards](../../../../docs/method/doc-standards.md) tier 表已定「cookbook = 带域标签的踩坑原子（procedure）」；迁移计划在案「每条 = 症状/根因/规避/来源四段（对齐 §8.2 原子胶囊）」。
- **基因面 = 控制信号投影，不是第二份踩坑档**：6 基因（doc 2 / gates 2 / process 2），八字段封闭 schema（`id`/`domain`/`summary`/`signals`/`strategy` 必选 + `constraints`/`validation`/`avoid` 可选；单源 `engine/gene.ts`）；其中三条与既有踩坑同面——`doc-budget-overflow` ↔ [文档] 预算管字数不管段落密度、`doc-single-home` ↔ [文档] 交接双源漂移、`git-reconcile-extra-commits` ↔ [协作] 未记录的提交导致决策误读。schema 无 `source`/`version` 字段（[distill ADR](2026-09-14-distill-command.md) Alternatives 已拒 `source`；版本与地址面现仅 `gene_sha`，归批次表行 42）。
- **转化通道已交付、零新增**：任意 gene 形候选经 `distill add` 落 `candidates/<domain>/<id>.json` → `evaluate`（`gates.json` 白名单全绿）→ `solidify`（`gene.added` 事件 + `genes/` 原子入档）；纪律单源 = [new-gene-curation](../../../../genes/gates/new-gene-curation.json)。
- **入档权钉死**：[D3 重拍 ADR](2026-09-14-p1-d3-distillation-reshoot.md) Decision 1/2——新基因只经人工策展、引擎零 LLM、`propose` 不产新基因、候选不落 `genes/` 不参与 `select`。
- **采集源不含 cookbook**：`distill collect` 汇编三类持久失败面（events fail 行 / capsules fail / genes `avoid`），范围单源 = [D3 重拍 ADR](2026-09-14-p1-d3-distillation-reshoot.md) Decision 2 点名集。
- **自动沉淀已被负结果封**：[cookbook](../../../../docs/cookbook.md) [演化] 首条（#18 用户判定）——自动蒸馏零可追溯收益、token 成本倒挂；策展制即其正面结论。
- **检索注入面**：`select` 按 `signals` 字面短语归一化精确匹配（`engine/select.ts`），命中才进建议档；cookbook 不参与 `select`。

## Decision

### 1. 「每坑一原子」的内容半边已交付 = cookbook（指针，不重建）

每坑一条目；域标签、日期与条目外形齐备（机器面 = `scripts/verify-cookbook.mts`），症状 / 根因 / 规避 / 来源四段为 cookbook 头注的作者约定（非机器强制，个别条目只落其中数段）。本件不复述、不搬迁、不新立第二份踩坑档。

### 2. 「cookbook 条 → 基因」的批量 / 自动转化判不立

四条理由：① 入档权——新基因只经人工策展（D3）；② #18 负结果——批量 / 常开沉淀零可追溯收益、token 成本倒挂；③ 双源——同一踩坑在 cookbook 与 gene 两处即为漂移面，而 gene schema 又不承载症状 / 根因 / 来源三类叙事；④ 无信号消费者——49 条 × 逐条字面 `signal` 在无真实会话命中需求时只增命中噪声。触发见 T1。

### 3. 转化通道 = 人工策展，已交付零新增

单条踩坑在有真实消费者时由人译为基因形候选 → `distill add` → `evaluate` → `solidify`；纪律单源 = [new-gene-curation](../../../../genes/gates/new-gene-curation.json)。既有三条踩坑同面基因（2026-09-05 入档）即「人工策展 → evaluate → solidify」段的现成样例；`distill add` 候选落盘步为其后（序 30）新增，尚无同面样例。

### 4. 把 cookbook 纳入 `distill collect` 采集源判不立

无具名消费者（策展人直读 cookbook 即得原料）；且采集范围是 [D3 重拍 ADR](2026-09-14-p1-d3-distillation-reshoot.md) Decision 2 的点名集，改集合须先重拍该决定，本件不越权。

### 5. 「→ 原子胶囊 content-addressable」不属本件

§8.2 的地址 / 版本面归批次表行 42（现仅 `gene_sha`）；本件不重复其判据。

### 6. 重议触发

- **T1**：出现「某条 cookbook 踩坑在真实会话被反复撞到、需要 `select` 命中注入」的具名需求 → 由人经既有通道策展为基因（不新造机器）。
- **T2**：批次表行 42（知识原子 content-addressable）落地 → 随其重估 cookbook 条目地址面与基因投影的关系。
- **T3**：设计稿改口径为「每坑必落一基因」→ 重开本件（届时须先解 D3 入档权与双源）。

## Alternatives considered

- **全量 / 批量把 49 条 cookbook 转为基因（脚本或一次性策展）**：落败——D3 入档权 + #18 负结果 + 双源 + 无 signal 消费者。
- **引擎从 cookbook 自动提取 gene（规则或 LLM）**：落败——引擎零 LLM，归纳步在宿主侧（[D3 重拍 ADR](2026-09-14-p1-d3-distillation-reshoot.md) Decision 2）。
- **把 cookbook 纳入 `distill collect`**：落败——无具名消费者；改范围须重拍 Decision 2。
- **新造「cookbook→gene 渲染器 / 生成物」**：落败——双源（症状 / 根因叙事无 gene 字段承载）+ 无候选消费者。
- **判「已交付、零动作」不写件**：落败——「可转 / 不可自动转 / 通道在哪 / 与行 42 的界」四处无家，49 条与 6 基因的关系会再次凭印象（同为批次表立项动因）。

## Consequences

- **批次表单源更新**：行 40 备注改 `done（指针 = 本件）`；「未交付」计数 10 → 9；游标 = 序 41（开发流程选择域补全）。
- **档位**：纯文档收口（`.agents/notes/**` + HANDOFF 家庭 + journal），路径触发集未命中 → LIGHT 单路语义评审（R2）。
- **机制零变化**：`engine/**`、`adapters/**`、`scripts/**`、`genes/`、`events/`、`docs/cookbook.md` 均不动。
- **单源**：踩坑原子形态单源 = cookbook 头注 + `verify-cookbook.mts`；转化通道单源 = `genes/gates/new-gene-curation.json` + [distill ADR](2026-09-14-distill-command.md)；入档权单源 = [D3 重拍 ADR](2026-09-14-p1-d3-distillation-reshoot.md)；§8.2 地址面单源 = 批次表行 42。
- **评审结论**：LIGHT 单路 R2——2 Blocker + 3 Suggestion 全采纳、拒 0（findings 处置见 journal 本批节）。
