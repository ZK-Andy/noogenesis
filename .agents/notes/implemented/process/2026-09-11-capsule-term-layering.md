# Agent Note: 「胶囊」术语分层——内容包词与 Capsule 原语分开

Status: implemented
Review: FULL/2026-09-11/R1=ok R2=ok R3=ok

Related: 原语清单的家 [主设计 §5.1](../../../../docs/research/dsh-swarm-evolution-framework-design.md)；原语后置判定 [2026-09-05-gene-event-schema](../architecture/2026-09-05-gene-event-schema.md)；规则落点 [根 AGENTS.md](../../../../AGENTS.md)「文档纪律」；词面闸判不立先例 [2026-09-11-review-finding-mechanization](2026-09-11-review-finding-mechanization.md)。

## Problem

「胶囊」在本仓同时指两层东西，词形上分辨不出：

- **内容包层**：进化胶囊 01「AI 协作编码方法论」（根 [AGENTS.md](../../../../AGENTS.md) 定位句、[README.zh.md](../../../../README.zh.md)），以及包内的知识原子（[主设计 §8.2](../../../../docs/research/dsh-swarm-evolution-framework-design.md)「一条知识 = 一个原子胶囊」）。
- **原语层**：[主设计 §5.1](../../../../docs/research/dsh-swarm-evolution-framework-design.md) 核心原语表的 `Capsule`——一次真实执行的审计记录，与 `Gene` / `Event` / `Mutation` / `memory-graph` 并列。该原语名承自对标框架的原语族（主设计 §3.1 记 EvoMap 的 `Gene/Capsule/Event` + memory-graph）。

中英同形（Capsule ↔ 胶囊）叠加层级差，读起来就成「胶囊 01 里有哪些基因」。活体文档里已有实际违例：[共享层设计稿](../../../../docs/research/dsh-collective-evolution-shared-layer.md) 三处写「基因/胶囊 Schema」，把两个原语译成中文，与同段的 `gene` / `capsule` / `event` 并列，正落在这条碰撞面上。用户在会话内也问过该问题（n=1，【探索性】）。

各原语的中文通名现状不同：`Gene` 的「基因」已是本仓稳定通名（基因库、基因注入、基因入档），`Event` 写「事件轨」，都不冲突；只有 `Capsule` 与内容包层的「胶囊」同形。

## Decision

**「胶囊」只留给内容包层；`Capsule` 原语写英文原名，不出中文名。**

1. 「胶囊」用于内容包层：整个内容包（进化胶囊 01）与其内部知识原子（原子胶囊）同词，靠限定词分辨；不加限定词时默认指内容包。
2. `Capsule` 原语写 `Capsule`（必要时括注语义，如「`Capsule`（一次真实执行的审计记录）」）；禁写「胶囊原语」，禁把该原语称作「胶囊」。与同族原语并列时写 `gene` / `capsule` / `event`（或 `Gene` / `Capsule` / `Event`）。
3. 其余原语的中文通名不动——本次只解 `Capsule` ↔ 胶囊 一处碰撞，`Gene` / `Event` 的既有写法照旧。
4. 规则单源 = 根 AGENTS.md「文档纪律」一条；主设计 §5.1 正文不改（它已写英文原名，与本口径一致）。
5. 同变更对齐现存违例面：[共享层设计稿](../../../../docs/research/dsh-collective-evolution-shared-layer.md) 三处「基因/胶囊」改为 `gene/capsule`。
6. 不立词面门禁：违规只发生在「用胶囊指 Capsule 原语」这一语义条件下，中文「胶囊」的合法用法占绝对多数，机器判不稳；词面闸先例亦已判不立（[机械化 ADR](2026-09-11-review-finding-mechanization.md) 的变更史词面闸：19 命中 / 18 自指）。

## Alternatives considered

- **乙 Capsule 原语改名**（如 `ExecutionRecord`）：落败。该名承自对标框架的原语族（§3.1），改名断血统与外部对照，而 `capsule_id`、`capsules/` 等约定已散在 schema 与多份 ADR 里——改名面比碰撞面大。碰撞的实因是层级混用，不是词形。
- **丙 全仓术语表 + 词面闸**：落败。规则只有一条（`Capsule` 不译），AGENTS 一行即为其家；再立术语表就是同一事实的第二家，且没有并列两义的读者面。
- **丁 沿用现况（判不立）**：落败。违例面已在活体文档里存在（共享层设计稿三处），用户在会话内也真实提出疑问；修法成本 = 一条规则行 + 三处替换，且用户已点名处理。

## Consequences

- 新增内容包或原语命名按此口径；根 AGENTS「评审检查项」第 1 条（文档纪律语义面）覆盖本面。
- `Capsule` 原语将来落地（引擎/适配层实现）时命名口径已定，不重议。
