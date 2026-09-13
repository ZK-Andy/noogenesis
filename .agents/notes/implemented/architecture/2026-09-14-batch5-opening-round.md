# Agent Note: 批次 5 开题讨论轮——四题拍板（taxonomy / schema 扩字段 / CI 覆盖 / 协议层归属）+ 两件确认落账

Status: implemented
Review: LIGHT/2026-09-14/语义评审（范围化子代理 R2：2 Blocker + 2 Suggestion 全采纳——批次表封条行旧游标残留 + ADR self-test 计数与 validate.yml 实跑不符改删计数；序 26 触发措辞统一对齐 P2 D3 + gene_sha 的 S1/S2 面级分表述）

Related: 批次表 [行 21–29 与「需显式重拍的决策面」节](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · 主设计 [§13 未决 1/2/5](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 共享层稿 [§6.2 / §11](../../../../docs/research/dsh-collective-evolution-shared-layer.md) · [P1 骨架 ADR](2026-09-05-p1-engine-skeleton.md) D1/D3 · [schema ADR](2026-09-05-gene-event-schema.md) S1 · [P2 ADR](2026-09-06-p2-shared-consumer.md) D3 · [Mutation ADR](2026-09-13-mutation-primitive.md) · [Capsule ADR](2026-09-13-capsule-primitive.md) C1 · [Event 扩字段 ADR](2026-09-13-event-field-extension.md) E4 · [validate.yml](../../../../.github/workflows/validate.yml)

## Problem

批次 5（序 21–29）的可办拍板件此前无终态：序 23/24/28/29 各挂一处设计稿未决条（taxonomy 细分、schema 扩字段与 YAML、validate.yml 覆盖范围、与旧引擎的协议层归属），序 25/27 已有 ADR 裁定但批次表行未落账。2026-09-14 讨论轮逐题取证后用户四题拍板（全部按推荐项）。序 21/22（前提 = 真实使用面与可贡献内容，2026-09-13 实证为零）与序 26（内容策展）不属本轮。

## Decision

1. **序 23 taxonomy 细分 = 维持后置。** 触发 = 贡献开放轮开轮时随第一批拍——主设计 §13-1（P2 回写）、共享层稿 §11-1、P2 ADR 三处既有口径不变；Mutation `category` 维持无值域。依据 = taxonomy 的消费面（跨仓贡献分类 / 按域检索 / 域名划分）全以第二基因源为前提，现网单机单库零贡献面（`genes/` 6 条三域、`select` 全库扫不按域过滤、manifest 全量检索），现在拍 = 为不存在的对象造分类法，与 Mutation ADR「不预设分类法」同向。
2. **序 24 schema 扩字段 + YAML 决策 = 维持后置（P2 D3 口径不变）。** `version` / `provenance` / `evidence_ref` 三字段与 YAML 迁移随贡献开放轮进；基因文件 JSON 八字段封闭（[schema ADR S1](2026-09-05-gene-event-schema.md)）、事件轨 `gene_sha` 锚点不动（schema ADR S2），`js-yaml` 例外权不动用（P1 骨架 D1）。依据 = 三字段语义全是跨机贡献面，单机阶段各有本地替身——防篡改锚点 = 事件轨 `gene_sha`（S2）、出处审计 = `events/` 的 `actor`、验证证据 = `events/` 的 `evidence`——字段先于消费者即死字段（Event 扩字段 ADR E4 对 `validation_report_id` 同判据）；YAML 的收益 = 策展书写舒适性，痛点未实测出现（首批基因机器生成 + 人工过目）。
3. **序 28 `validate.yml` 覆盖范围 = 确认全覆盖为终局。** 实读现状已是穷尽矩阵：gates.json 第一梯队全量 + `verify-gene-format` 白名单外独立件 + `change-scope` + `review-tier --enforce` + self-test 抽查 + engine/adapter 双 self-test——与根 AGENTS「CI 拥有穷尽矩阵」纪律同向；主设计 §13-2 与共享层稿 §11-2 同批回写为已拍板。零机制变化。
4. **序 29 协议层归属 = 本仓插件包为终局。** 引擎 + 协议留在 `noogenesis-dsh`（现状已然）；旧引擎维持冻结参照（融合立宪 D6，不并代码不并 store）；触发 = 出现第二个真实消费者（多宿主实装 / 外部工具接协议）时重议拆分。依据 = 拆分动机逐条落零对象——多宿主适配是批次 7 序 35 的事且现单宿主、外部消费者零实例；主设计 §13-5 与共享层稿 §11-5 同批回写为已拍板（融合顺序半边已由记忆线融合立宪按机制收口）。
5. **序 25 / 序 27 = 确认落账（既有裁定，无新裁决）。** 序 25 gene→skill 渲染语义维持 P2 D3 后置口径（仍随贡献开放轮；技能分发半边已提前收口为「技能随库分发」）；序 27 「`capsules/` 只指 Capsule 原语、§8.2 知识原子归序 42」为 [Capsule ADR](2026-09-13-capsule-primitive.md) C1 既有裁定。两行批次表标 done，指针各回其裁定家。
6. **批次 5 游标状态。** 可办拍板面（23/24/25/27/28/29）全落终态；余三行保留位置——21/22 前提 = 真实使用面与可贡献内容（零）、26 内容策展（触发 = P2 D3 的首批外部基因轮，或用户给出世界观内容时——后者为本轮具名的追加触发）；游标进批次 6（P3 元演化），其首件序 30 蒸馏须先重拍 P1 骨架 D3（重拍件 = [P1 D3 重拍 ADR](2026-09-14-p1-d3-distillation-reshoot.md)，已过、序 30 可开工）。

## Alternatives considered

- **序 23 现在拍 taxonomy**：落败——零消费面下纯纸面设计，无真实使用压力校正；须同批重拍 Mutation ADR「不预设分类法」约束，全部动机只有「将来可能有贡献」。
- **序 24 现在扩三字段 / 现在迁 YAML**：落败——三字段各有本地替身，字段先于消费者 = 死字段风险；YAML 化要动引擎写读两侧 + 校验器 + 夹具 + manifest 生成器 + 重拍 P1 D1 零依赖姿态，收益只是未实测的书写舒适性。
- **序 28 收窄到最小集**：落败——与「CI 拥有穷尽矩阵」纪律冲突；贡献 CI（序 21）本身未开工、无耗时证据，提前优化无对象。
- **序 29 现在拆独立协议包**：落败——发布面 1 → 2 包（版本联动 / peer 依赖面 / package-invariants 闸扩面），接口固化的依据只有对第二消费者的猜测。

## Consequences

- 批次表行 23/24/25/27/28/29 标 done（指针 = 本件），「未交付」计数 26 → 20（序 21/22/26 保留 + 批次 6–9 的 17 项）；序 21/22 的触发 = 贡献开放轮或用户改向，序 26 的触发 = P2 D3 的首批外部基因轮或用户给出世界观内容时。
- 主设计 §13-2/§13-5 与共享层稿 §11-2/§11-5 同批回写为已拍板态；§13-1/§11-1 的「随贡献开放拍板」现值经本轮确认不变，不回写。
- 机制零变化：`engine/**`、`adapters/**`、`scripts/**`、`cordis.patch.yml`、`package.json` 均不动；本件 LIGHT 档（纯文档收口，路径触发集未命中）。
- 复算口径 = `validate.yml` 步骤清单（全覆盖证据）+ schema ADR S1 字段表（八字段）+ `genes/` 三域 6 条 + P1 骨架 D1 例外权原文 + 主设计 §13 / 共享层稿 §11 的回写标记。
