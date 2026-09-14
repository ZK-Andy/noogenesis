# Agent Note: 批次 9 序 46 裁决——manifest 向量检索增强判不立，批次表 46 行全部落终态

Status: implemented

Review: LIGHT/2026-09-14/语义评审（范围化子代理单路 R2：待审）

Related: 批次表 [行 46](2026-09-13-feature-completion-backlog.md) · 共享层稿 [§10-P3](../../../../docs/research/dsh-collective-evolution-shared-layer.md) · 情境注入裁决 [序 15](2026-09-13-situational-injection-verdict.md) · 候选比较判据 [序 5](2026-09-13-candidate-comparison-blindness.md) · P2 消费面 [P2 ADR](2026-09-06-p2-shared-consumer.md) · [序 45 裁决](2026-09-14-merge-self-validation-evidence-verdict.md)

## Problem

批次表行 46「manifest 检索增强（向量）」（共享层稿 §10-P3，标注**可选**）：基因库规模大后把 `manifest.json` 的 domain / 关键词检索升级为向量语义匹配，注入时选 top-N 相关基因。用户拍板（2026-09-14）：判不立、留重议触发、批次表就此终局。开工前取证（2026-09-14，本仓实读）：

- **零具名失败**：现基因库规模 ~10 条（本仓 8 条 + 缓存），`select` 的字面短语精确匹配未产生过「该命中未命中」的实例；同面裁决序 15 已判「现网 `injectSignals` 零声明、无消费面」，[P2 ADR](2026-09-06-p2-shared-consumer.md) 的 `manifest.json` 是检索索引而非排序器。
- **违约发动机合同**：[`engine/`](../../../../engine/AGENTS.md) 零第三方依赖、零网络、零 LLM（D1 骨架拍板）——向量检索须引入 embedding 模型或向量库，直接破坏合同；基因 `signals` 全为自然语言短语，消费方式 = 主会话显式喂信号（[序 11 裁决](2026-09-13-detect-source-verdict-session-event.md) 站立规则），不是语义排序。
- **撞已封判据**：[序 5](2026-09-13-candidate-comparison-blindness.md) 判据「引擎不排序、不择优（择优归人）」——向量 top-N 是排序面。

## Decision

**判不立。** 三条理由即上列三条：无具名失败（当前规模字面匹配无失败实例）+ 落法必违零依赖铁律 + top-N 撞「不排序」判据；且「可选」是设计稿自标的加购项，非验收条。重启时按批次表序 46 行备注的触发重议，不独立挂账。

### 重议触发

- **T1**：基因库规模真实增长（本仓或缓存并集）且出现 select / 注入面「该命中未命中」的真实失败实例 → 重估检索面（届时先答 D1 零依赖铁律是否同批重拍——向量落引擎必破合同）。
- **T2**：出现要求语义检索的具名第二消费者（宿主或外部集成）→ 重估。
- **T3**：设计稿把该行改为硬性验收条 → 重开本件。

## Alternatives considered

- **先落向量面等消费者**：落败——必破零依赖合同，且 E1「字段先于消费者即死字段」同一逻辑的死件。
- **退而落本地余弦+手搓 embedding**：落败——零依赖面内无 embedding 模型，任何「本地向量」都需先有语料与模型，合同成本同上。
- **判已交付零动作不写件**：落败——「可选」不等于「已裁决」；批次表立项动因 = 差集不再重新对账，本行落终态才能合表。

## Consequences

- **批次表终局**：行 46 备注 `done（判不立，触发 T1–T3 具名 = 本件）`；46 行全部终态 → [批次表 ADR](../../implemented/architecture/2026-09-13-feature-completion-backlog.md) 按 Consequences 拍转 implemented（本批同变更）。游标不再指向批次表行——续命通道 = 序 21/22/26 三个前提保留位与各判不立行的 T1–T3。
- **档位**：纯文档收口，机制零变化；LIGHT 单路 R2。
- **单源**：本行判不立与触发以本件为家；批次表 status 变更见其自身 Consequences。
