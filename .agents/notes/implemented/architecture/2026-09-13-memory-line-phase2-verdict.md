# Agent Note: 记忆库线第二期判裁——行为评估自建判不立 + 痕迹提炼面并入既有面

Status: implemented

Related: 承接件 [2026-09-10-memory-line-fusion-charter](2026-09-10-memory-line-fusion-charter.md)（其 D7-2 与两项待拍板由本件裁定）；第一期实现面 [2026-09-11-memory-line-phase1-observation-face](2026-09-11-memory-line-phase1-observation-face.md)（观测消费面的触发条单源）；行为面既有家 [review.md](../../../../docs/method/review.md)（三路评审契约）与 [护栏建设轮 ADR](2026-09-13-guardrail-construction-round.md)（Decision 2：不立数值评分）；线状态唯一家 [memory-system-dossier](../../../../docs/state/memory-system-dossier.md)。

## Problem

融合立宪 ADR 悬着两项未裁（2026-09-13 讨论轮开轮）：D7-2 直接后果的**行为评估自建形态与第二期范围**，与**痕迹提炼面归属**（2026-09-10 用户拍「本轮定不了」）。两问同型——都问「本仓还缺哪个面」。裁决前先取证：这些机制在本仓有没有对象。

## Decision

**1. 行为评估自建 = 判不立（本仓无该对象）。行为评估的家 = 既有四面。** 立宪 ADR D7-2 与 D3 表列的两段式评估协议逐件对照本仓已落地现实，无新增件可建：

| 立宪 ADR 写的机制 | 本仓的家 |
|---|---|
| 可复算部分物化为白名单验证命令 | gene `validation` 字段（仅白名单内命令，[schema ADR S3](2026-09-05-gene-event-schema.md)）+ `evaluate` 执行 |
| LLM 判断只作 evidence 指针、引擎不消费不判定 | `events/` 的 `evidence` 一行摘要 + solidify 原子提交；引擎恒只认 exit code |
| 执行者不见 rubric | [review.md](../../../../docs/method/review.md) §3：简报给「材料 + 检查项」，不给结论倾向 |
| 独立评分者 | 三路评审子代理独立于实现者（R1/R2/R3） |
| 冻结基线 | 简报 `base..head` + push 前 `verify-review-tier --since <远端 sha> --enforce` |
| 失败格不计零分 | 本仓无评分表，无此对象 |
| 数值评分 / rubric 排序 | [护栏建设轮 ADR](2026-09-13-guardrail-construction-round.md) Decision 2 判不立（改进度量 = 两本账） |

**2. 观测 → 行动（排序 / 阈值 / 禁用 / 退役建议）不重开。** 触发条单源维持 [第一期实现 ADR](2026-09-11-memory-line-phase1-observation-face.md) Decision 4（命中数逼近常驻注入上限，或观测样本量足以支撑排序）。取证（本机工作树实读，2026-09-13）【探索性】：`genes/` 6 条对 `maxIndexGenes` 12，`.noogenesis/observations/` 零条记录——两条触发都远未到。

**3. 痕迹提炼面归属 = 判不立，并入既有面。** 摩擦点落点表（五类家的单源）见 [doc-standards §1 主题状态页](../../../../docs/method/doc-standards.md)；[session-close](../../../workflows/session-close.md) §2–§4 已是这些家的对账步。旧引擎 `OBSERVATION.md` 的形态（状态标签 + 归档规则）正身 = 档案页制度（[制度 ADR](../process/2026-09-13-dossier-institution.md)），不另立落点面。

**4. 立宪 ADR 的终局 = implemented。** 三项待拍板全部落定，骨架按 implemented 形态（`## Decision` + 现在时），路径 = `implemented/architecture/2026-09-10-memory-line-fusion-charter.md`，日期不改。治理批「内容不是提案的 proposed」清单随之归零。

**5. 文档漂移修正**：立宪 ADR 与其承接方曾引「设计稿 §13.5」，主设计 §13 无子节——该内容 = §13 未决问题 5，指针同批修正。

**超车检查**：不取代任何活跃笔记——融合立宪 ADR 拥有边界 / 清单 / D1–D10（本件只裁其 D7-2 与两项待拍板，不改其边界与清单）；第一期实现 ADR 拥有观测面的设计与触发条（本件只引用不重述）；护栏建设轮 ADR 拥有改进度量口径（本件不改）。

## Alternatives considered

- **建两段式评估装置（rubric + 独立评分机器面）**：落败——与 [review.md](../../../../docs/method/review.md) §6「三路实质属语义面，不设机器防」及护栏 Decision 2「不立数值评分」直接冲突；且本仓无被评分对象（失败格不计零分、rubric 排序均无从落地）。
- **收窄为「观测 → 退役建议」一条并实现**：落败——触发未到（观测面零记录）；为不会发生的情况加脚手架违 [anti-overdesign](../../../../docs/method/anti-overdesign.md)。
- **另立痕迹提炼落点面**：落败——答不出「哪个摩擦点现在无家」；五类摩擦点各有其家，新增面只复制既有家。
- **立宪 ADR 保持 proposed**：落败——三项待拍全已落定，留在 `proposed/` 会让「第二期未开轮」被持续读成待办，与治理批口径（活提案应清）矛盾。
- **立宪 ADR 拆件（已定部分转 implemented、余项另立）**：落败——余项由本件承接后立宪件无余项，拆件徒增双源。

## Consequences

- 记忆库线在「观测面落地 + 第二期判不立」后进入稳态：零新增机制，唯一跨会话遗留 = 观测消费面的触发条（单源在第一期实现 ADR Decision 4）。
- 「行为评估的家 = 入档闸 / 三路评审 / 两本账 / 观测面」成为口径单源；后续任何「给行为打分」的提议须先推翻 review.md §6 与护栏 Decision 2，而非重新立项。
- 档案页制度批的验收面增加「摩擦点落点是否可寻址」一项（由本件 Decision 3 归入）。
- 记忆库线不再出现在待选轮清单；其状态家仍是 [memory-system-dossier](../../../../docs/state/memory-system-dossier.md)。
- 证据强度：本件数据（genes 6 / 上限 12 / 观测 0 条）为本机单次实读【探索性】，不作评分依据。
