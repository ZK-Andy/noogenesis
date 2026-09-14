# Agent Note: 批次 4 重拍——记忆线第二期判裁重议维持判不立；序 18 判已交付（行 16–20 落终态）

Status: implemented
Review: LIGHT/2026-09-14/语义评审（范围化子代理 R2：0 Blocker + 1 Suggestion 全采纳——P1 骨架「收窄归口」段 memory-graph 半边状态句失准，补现状指针；五项定向检查 4 真 1 partial，partial 即该条）

Related: 重议对象 [第二期判裁 ADR](2026-09-13-memory-line-phase2-verdict.md)（其 Decision 2 的触发条单源指向第一期实现件）· 触发条家 [第一期实现 ADR](2026-09-11-memory-line-phase1-observation-face.md) Decision 4 · 形态单源 [融合立宪 ADR](2026-09-10-memory-line-fusion-charter.md) D7-1/D8 · 批次表 [行 16–20 与「需显式重拍的决策面」节](2026-09-13-feature-completion-backlog.md) · 线状态家 [memory-system-dossier](../../../../docs/state/memory-system-dossier.md) · 主设计 [§5.1 原语表 / §6 生命周期 / §9.4 蜂群观测](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 预期声明的既有家 [Mutation 原语 ADR](2026-09-13-mutation-primitive.md) · 观测透镜后置 [P2 ADR](2026-09-06-p2-shared-consumer.md) D3

## Problem

批次表把「记忆线第二期判裁」列为批次 4 开工前的显式重拍面，行 18–20（连带行 16/17）的开工资格都挂在这道门上。本件过门：对触发条做开工前实测，并给行 16–20 各自的终态判定。重议的性质是批次表的**过程门复测**（开工资格），不是新事实触发的重开——复测可以诚实地维持原判。

开工前实测（2026-09-14，本机实读）【探索性：单机单仓】：

- 基因命中数对常驻注入上限：`genes/` 6 条（doc 2 / gates 2 / process 2）对 `DEFAULT_MAX_INDEX_GENES = 12`（`adapters/dsh/section.mts:41`）——与 2026-09-13 判裁取证（6 对 12）逐值相同。
- 观测输入面：`.noogenesis/observations/` 不存在（零文件）——每边样本 O(0)，比率无对象。
- 消费面自判裁以来无新增：`advice:` 行的消费面仍是 `noo_select` 工具输出（按需读）；无任何新面把边读去驱动选择。

## Decision

1. **序 19（排序 / 禁用 / 阈值 / 半衰期）重议维持判不立。** 触发条两条（[第一期实现 ADR](2026-09-11-memory-line-phase1-observation-face.md) Decision 4：命中数逼近常驻上限 / 观测样本量足以支撑排序）实测均未到，且与判裁时逐值相同——无新事实即无重开依据。HERO 两问照旧无答案：命中 6/12 时排序无可观察效果；零观测时阈值 / 衰减 / 禁用没有对象。主设计 §5.1 memory-graph 的第五个消费动作「路径抑制」在批次表无独立行，属同一消费面，随本判定同触发条。「行为评估自建判不立」不属本重拍面——其判据 = 评分对象缺席（[判裁 ADR](2026-09-13-memory-line-phase2-verdict.md) Decision 1 对照表），与行 18–20 的开工资格无涉。
2. **序 18（memory-graph 因果边现算）判已交付。** 本行所裁的「因果链 (signal,gene)→outcome」在本仓的实现形态 = 第一期落地的读路径现算边 `(signal::gene)→{ok,fail,last_ts}`（`engine/observe.ts` 派生 + `engine/select.ts` 的 advice 建议档；零观测零行不变量由 self-test 钉死），形态单源 = [融合立宪](2026-09-10-memory-line-fusion-charter.md) D7-1（边 = 派生数据，Select 现算、不进 git）+ D8（观测输入面喂养）。批次表备注「现仅 `advice:` 计数」所指的差集 = 设计「驱动选择」列（优选 / 禁用 / 阈值 / 衰减）——那是序 19 的消费面，不属本行。观测 `outcome` 值域维持 ok|fail 封闭（第一期 Decision 1），扩值域随序 19 触发条同面重估。
3. **序 16（Hypothesize）判不立，触发条与序 19 同面。** 其依赖（序 18）已判已交付；剩余差集 = 「预期结果」的写面与对账面——自动写已被 D4「运行不记」封（触发权归人，[第一期 ADR](2026-09-11-memory-line-phase1-observation-face.md) Decision 2），人工写的消费者 = 预期-实际对账，而对账的动作面（据偏差调整选择）属序 19。执行前预期声明的既有家 = Mutation `expected_effect`（[Mutation ADR](2026-09-13-mutation-primitive.md)），本行不新增该面。
4. **序 20（观测透镜）与行 17（观测面自动接线）不属本重拍面。** 序 20 的门 = P2 D3 后置（随共享层设计稿 P3 口径，[P2 ADR](2026-09-06-p2-shared-consumer.md) D3），前提 = 多消费方 / 贡献面（贡献开放轮，批次表同批序 21 的前提面），与记忆线判裁无涉——维持后置。行 17 维持「挂载面暂不立 + 具名触发（出现需无人写入的真实场景）」既有终态，不随本件改判。
5. **批次 4 收口，游标推进批次 5。** 行 16–20 全落终态（16/19 = 判不立带触发条；18 = 判已交付；20 = 维持后置；17 = 确认维持）；机制零变化。批次 5 的开工面：序 21/22 前提 = 真实使用面与可贡献内容（2026-09-13 已实证为零），保留位置；可办面 = 拍板件序 23 / 24 / 28 / 29 与口径确认件序 27（[Capsule ADR](2026-09-13-capsule-primitive.md) C1 已裁定）。

## Alternatives considered

- **借重议翻案（实现排序 / 阈值 / 衰减面）**：落败——触发条逐值未到，为 O(0) 样本建排序依据正是第一期判落的「比率被噪声支配」；无具名失败实例，超出 [anti-overdesign](../../../../docs/method/anti-overdesign.md) 范围契约。
- **把序 18 判未交付并实现持久 memory-graph**：落败——持久化已被 D7-1 判死（边 = 派生数据，不进 git，避免与事件轨双记账）；补持久层 = 为已裁形态造第二事实源。
- **给序 16 立独立「预期结果」记录面（observe 之前的 declare 命令）**：落败——消费者（预期-实际对账的动作面）属序 19 且触发未到；Mutation `expected_effect` 已承载执行前声明，新命令 = 同面双家。
- **拆成三份 ADR（18/19/20 各一件）**：落败——三行的判定同挂一个触发条面、同一次实测取证；批次表的门本身是「一次重议」（「需显式重拍的决策面」节单条），拆件只复制证据面。

## Consequences

- 批次表行 16–20 标 done（指针 = 本件）、「需显式重拍的决策面」节记重议已过；「未交付」计数 31 → 26（序 21–46）。
- 机制零变化：`engine/**`、`adapters/**`、`cordis.patch.yml`、`package.json` 均不动；本件 LIGHT 档（纯文档收口，路径触发集未命中）。
- 触发条单源不变：观测消费面的重开判据仍在 [第一期实现 ADR](2026-09-11-memory-line-phase1-observation-face.md) Decision 4，本件不另立触发条；[memory-system-dossier](../../../../docs/state/memory-system-dossier.md) 状态日志与本件互指。
- 复算口径 = `ls genes/*/`（6 条）+ `adapters/dsh/section.mts` 的 `DEFAULT_MAX_INDEX_GENES` + `.noogenesis/observations/` 缺席 + `engine/observe.ts` 派生面与 self-test 的零观测不变量断言。
