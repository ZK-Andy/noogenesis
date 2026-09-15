# Agent Note: 批次 8 序 42 裁决——知识原子内容已交付（三既有家），机器地址面单源 = Event SHA，新增地址字段判不立

Status: implemented

Review: LIGHT/2026-09-14/语义评审（范围化子代理单路 R2：0 Blocker + 0 Suggestion——五条定向检查逐条独立复跑成立，无发现）

Related: 批次表 [行 42](2026-09-13-feature-completion-backlog.md) · 主设计 [§8.2 / §8.1 / §5.1](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 共享层稿 [§6.2 schema](../../../../docs/research/dsh-collective-evolution-shared-layer.md) · 协议单源 [schema ADR S1/S2](2026-09-05-gene-event-schema.md) · 复算闸 [verify-gene-format](../../../../scripts/verify-gene-format.mts) · 地址写入面 [solidify.ts](../../../../engine/solidify.ts) · 术语与粒面 [Capsule ADR C1](2026-09-13-capsule-primitive.md) / [序 27](2026-09-13-feature-completion-backlog.md) · 踩坑原子 [序 40 裁决](2026-09-14-pitfall-atomization-verdict.md) · 版本后置 [开题轮 ADR](2026-09-14-batch5-opening-round.md) · 前序裁决 [序 41](2026-09-14-dev-process-selection-verdict.md) · 档位判据 [review.md](../../../../docs/method/review.md)

## Problem

批次表行 42（批次 8 内容域末件）要求「知识原子 content-addressable（一条知识 = 一个原子胶囊）」，出处主设计 §8.2「每条（决策/踩坑/规则/流程）是一个 content-addressable capsule，带（领域标签、症状、根因、规避法/AVOID、来源、版本）」与 §5.1 设计原则「content-addressable（SHA-256 防篡改）」；行备注 = 现仅 `gene_sha`。开工前取证（2026-09-14，本仓实读）：

- **「一条知识 = 一个原子」的内容半边三家有家**：踩坑原子 = [cookbook](../../../../docs/cookbook.md)（49 条，域标签封闭集 + 真实日期 + 症状 / 根因 / 规避 / 来源四段头注约定；条目外形机器强制 = [verify-cookbook](../../../../scripts/verify-cookbook.mts)；单源 = [序 40 裁决](2026-09-14-pitfall-atomization-verdict.md)）；决策原子 = `.agents/notes/**`（路径即元数据，格式机器强制 = `verify-adr-format`）；规则 / 流程 / 规范原子 = 根 / 子树 AGENTS + `docs/method/` + `.agents/workflows/`（字数预算 + 链接 + tier 单源）。三家的「单源 / 懒加载 / 可进化」由既有闸与 git 历史承担，无需第二份表示。
- **content-addressable 的机器半边已交付**：SHA-256 内容地址 = Event 的 `gene_sha` / `capsule_sha` / `mutation_sha`（[solidify.ts](../../../../engine/solidify.ts) 写、`events/` 月卷 append-only、与 `genes/` / `capsules/` / `mutations/` 变更同 commit）；[verify-gene-format](../../../../scripts/verify-gene-format.mts) 复算段把工作树文件字节 ↔ 最新 added/updated 事件 sha 对账（协议面单源 = [schema ADR S2](2026-09-05-gene-event-schema.md)）。文件名内嵌哈希已判弃（同 ADR S1 + Alternatives：不可读、不可 grep、git diff 噪音化）。
- **无第二个地址消费者**：跨机交换（[行 21/22](2026-09-13-feature-completion-backlog.md)）为零；[manifest.json](../../../../.noogenesis/manifest.json) 是基因检索索引（`{ref,path,summary,signals}`），由 `verify-manifest` 与 `genes/` 对账——无地址需求；cookbook → 基因的批量 / 自动转化判不立（[序 40 裁决](2026-09-14-pitfall-atomization-verdict.md)）；引擎零 LLM。
- **版本面 = 后置口径不变**：§8.2 的「版本」与共享层 `version` / `schema_rev` 字段维持后置（[开题轮 ADR](2026-09-14-batch5-opening-round.md) 行 24），单机替身 = 内容地址（身份随内容变）。
- **术语与粒面已定**：`capsules/` 只指 Capsule 原语；§8.2 的「胶囊」= 内容包层知识原子，不落 `capsules/`（[Capsule ADR C1](2026-09-13-capsule-primitive.md) + 行 27 确认）。

## Decision

### 1. 「一条知识 = 一个原子」的内容半边 = 三既有家（指针，不重建）

踩坑 → [cookbook](../../../../docs/cookbook.md)；决策 → `.agents/notes/**`；规则 / 流程 / 规范 → AGENTS + `docs/method/` + `.agents/workflows/`。本件不复述其内容、不抽第二份机器档。

### 2. content-addressable 的机器半边 = Event `*_sha` + 复算闸（单源）

内容地址落在**有机器消费者的面**：`gene_sha` / `capsule_sha` / `mutation_sha` 写进 `events/`，由 [verify-gene-format](../../../../scripts/verify-gene-format.mts) 复算。这是 §5.1「content-addressable」在本仓的落法，不新增地址载体。

### 3. 「每条知识原子加盖内容地址 / 抽成 content-addressable 机器文件」判不立

三条理由：① **无消费者**——跨机贡献轮（行 21/22）为零，单机 git 已给身份 / diff / 回滚；地址变化不改变下一步动作（HERO 第二问无答案）。② **churn**——markdown 原子高频编辑，逐次编辑改地址只增 diff 噪音；同型「文件名内嵌哈希」已按此落败（[schema ADR](2026-09-05-gene-event-schema.md) S1 + Alternatives）。③ **双源**——把知识原子再抽成机器文件 = 第二份表示，与「每个事实只有一个家」相抵。

### 4. 不新增 per-atom `version` 字段

版本面维持后置（[开题轮 ADR](2026-09-14-batch5-opening-round.md) 行 24）；机器原语的身份 = 内容地址，不另立单调计数器。

### 5. 行 40 T2 在本件关闭

[序 40 裁决](2026-09-14-pitfall-atomization-verdict.md) T2「行 42 落地 → 重估 cookbook 条目地址面与基因投影」的重估即本件：结论 = cookbook 条目自身不加地址；某条踩坑经人工策展成基因后，其地址由 Event `gene_sha` 承担。

### 6. 重议触发

- **T1**：贡献开放轮（行 21/22）落地，或出现按内容地址跨机去重 / 回滚的具名消费者 → 重估知识原子的地址面（先答 HERO 两问）。
- **T2**：cookbook → 基因通道判立（[序 40](2026-09-14-pitfall-atomization-verdict.md) T1）且需要按内容地址追踪投影关系 → 随该通道重估。
- **T3**：设计稿改口径为「知识原子必落 content-addressable 机器文件」→ 重开本件（须先解双源与 churn 两条）。

## Alternatives considered

- **为 cookbook / ADR / 流程卡逐条加盖 SHA 索引（如 `atoms.json`）**：落败——无消费者 + 编辑 churn + 第二份表示（Decision 3 三条）。
- **文件名 / 目录内嵌内容哈希**：落败——[schema ADR](2026-09-05-gene-event-schema.md) 已判（不可读、不可 grep、diff 噪音）。
- **逐原子 `version` / `schema_rev` 字段**：落败——行 24 已判后置；内容地址即身份，单调计数器在单机无消费者。
- **把知识原子也落 `capsules/`**：落败——[Capsule ADR C1](2026-09-13-capsule-primitive.md) + 行 27 已判（执行审计与内容原子不同粒面，同目录即两失单源）。
- **判「已交付、零动作」不写件**：落败——地址面归属、行 40 T2 关闭、版本口径三处会再次无家，凭印象（批次表立项动因）。

## Consequences

- **批次表单源更新**：行 42 备注改 `done（指针 = 本件）`；「未交付」计数 8 → 7；游标 = 序 43。
- **档位**：纯文档收口（`.agents/notes/**` + HANDOFF 家庭 + journal），路径触发集未命中 → LIGHT 单路语义评审（R2）。
- **机制零变化**：`engine/**`、`adapters/**`、`scripts/**`、`genes/`、`events/`、`manifest.json`、`docs/cookbook.md` 均不动。
- **单源**：知识原子内容单源 = 三既有家（cookbook / notes / AGENTS+method+workflows）；机器地址面单源 = [schema ADR S1/S2](2026-09-05-gene-event-schema.md) + [verify-gene-format](../../../../scripts/verify-gene-format.mts) 复算段；版本后置口径单源 = [开题轮 ADR](2026-09-14-batch5-opening-round.md) 行 24；域内判据（候选余项与触发条）以本件为家。
- **评审结论**：LIGHT 单路 R2——0 Blocker + 0 Suggestion（无发现）；五条定向检查逐条独立复跑成立。
