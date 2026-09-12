# Agent Note: 档案页制度——`docs/state/` tier + 骨架四段机器闸

Status: implemented
Review: FULL/2026-09-13/pending（三重审核进行中，收口时回填真实结论）

Related: 试点立项与痛点画像 = [journal 2026-09 卷](../../../../journal/2026-09.md)（2026-09-10 会话：状态投影无家 + 记录无 schema）；痕迹提炼面归属 = [2026-09-13-memory-line-phase2-verdict](../architecture/2026-09-13-memory-line-phase2-verdict.md) Decision 3；tier 表家 = [doc-standards](../../../../docs/method/doc-standards.md)；笔记规则 = [notes/README](../../README.md)；新目录准入四问 = [architecture-standards](../../../../docs/method/architecture-standards.md) §2.4。

## Problem

试点件 `memory-system-dossier.md` 在 `docs/research/` 落了三天，暴露三个悬空：

- **tier 归口错位**：`docs/research/` 在 tier 表里的禁止项就是「当前状态快照」，而档案页的定义恰是活的状态快照；它现在住在一个禁止它住的层里。
- **无机器面**：试点件自述「结构漂移待制度化批加机器闸」——骨架四段（决策指针 / 行动区 / 触发条件 / 状态日志）与条目形态全靠自觉，无闸。
- **痕迹形态无归属**：旧引擎 `OBSERVATION` 的观察生命周期协议（状态标签 + 压缩/归档规则）判不立后的落点未定（[判裁 ADR](../architecture/2026-09-13-memory-line-phase2-verdict.md) Decision 3 判「并入既有面」，形态本批结）。

## Decision

**1. 新 tier `docs/state/` = 主题状态页（档案页）的家。** 一个主题一个状态家；活页住此层，收口冻结后迁 `docs/research/`（先例 = [优化轮文档](../../../../docs/research/capsule-01-optimization-round.md)：先当活档案页、2026-09-10 收口冻结为调研档案）。规则落 [doc-standards](../../../../docs/method/doc-standards.md) §1（tier 表一行 + 主题状态页一节），本件不复述。

**2. 骨架 = 封闭集。** 四段的名称、顺序与封闭性（第五个 `##` 节违规）作为规则落 [doc-standards](../../../../docs/method/doc-standards.md) §1「主题状态页」；本件只定「封闭、不往状态页塞新素材」这一决定。

**3. 条目形态进机器面。** 三段各自的条目形态由本闸判据把关；形态文本归 [doc-standards](../../../../docs/method/doc-standards.md) §1。

**4. 有界 + 压缩通道。** 两处条目设上限、超限即把最旧条目压缩为一行（压缩的语义面归评审，闸只判越界与否）；上限数值与压缩规则归 [doc-standards](../../../../docs/method/doc-standards.md) §1。

**5. 痕迹提炼形态 = 映射到既有四段，不引入第二套状态标签。** 映射内容（待观察面 / 已确认面 / 压缩规则）与摩擦点落点表归 [doc-standards](../../../../docs/method/doc-standards.md) §1，本件不复述（同 Decision 1 口径）；「可寻址」验收由该表承担。

**6. 立页判据立、新页不立。** 判据文本归 [doc-standards](../../../../docs/method/doc-standards.md) §1；本批推广评估结论 = **不立新页**——现无第二个满足判据的主题（演化/发布/宿主适配三条线的状态各已有单一家），只立制度与闸。

**7. 机器面 = 新闸 `scripts/verify-dossier-format.mts`**：判据 2–4 + 落点命名（`docs/state/<kebab-topic>-dossier.md`）+ 头部说明块（H1 + 首个 `##` 前至少一行 `> `）；目录缺席或空 = 零约束 PASS（同 `verify-postmortem-naming` 姿态）。登记 `engine/gates.json`（pre-push/CI 消费同一清单）+ pre-commit job + CI self-test 清单。

**8. 新目录准入四问**（[architecture-standards](../../../../docs/method/architecture-standards.md) §2.4）：①归属 = docs 状态面（过程资产属人读文档层，非代码/门禁/数据面）；②合同面 = 无代码消费者，消费者 = 人与 agent 阅读 + 本闸；③依赖方向 = 单向——档案页只引用 ADR/cookbook/method/journal/池，不反向被引用，不为它开新合同；④机器面 = `verify-dossier-format`。

**9. 试点件迁层**：`memory-system-dossier.md` 由 `docs/research/` 迁 `docs/state/`，入站链接同批重定向。

**超车检查**：不取代活跃笔记——tier 表由 doc-standards 拥有（本件只加一行与一节，规则正身在该处）；痕迹归属由 [判裁 ADR](../architecture/2026-09-13-memory-line-phase2-verdict.md) Decision 3 拥有决策（本件落其形态）；门禁判据形态借 `verify-handoff-structure` / `verify-postmortem-naming`（不取代，只同族）。

## Alternatives considered

- **留 `docs/research/` 给例外档**：落败——research 层会同时收「设计意图」与「活状态」，该行规则失去单一含义，且例外一旦开口会扩散。
- **归入 HANDOFF 家庭**（repo 根 `HANDOFF-<topic>.md`）：落败——根目录第三种文件类；`verify-handoff-structure` 的覆盖范围要靠文件名猜测扩展；档案页内容（决策指针 + 状态日志）不属「交接」语义。
- **弱档闸（只查四段标题在场）**：落败——挡得住标题漂移，挡不住条目形态与无界增长；台账型文档的失效形态正是条目腐化。
- **强档闸（再加条数/字数预算）**：落败——档案页条目量级远小于 todos，预算会常年空转（预算过低本身是 bug）；有界判据用条数即够。
- **引入显式状态标签 `[待观察]`/`[已确认]`**：落败——与四段的职责重叠，同义两套标签；映射到既有段即可。
- **现在就为其它线立页**：落败——三条线都答不出「未决项 ≥3 且状态散落」，属为不会发生的情况铺页（[anti-overdesign](../../../../docs/method/anti-overdesign.md)）。

## Consequences

- tier 表新增一行；`doc-standards` §1 增「主题状态页」节（立页判据 / 骨架 / 条目形态 / 有界 / 摩擦点落点表）。
- 新闸进 gates.json + pre-commit + CI self-test 清单；闸为封闭集判据，将来要加第五段或改条目形态即改判据（`scripts/**` 触 FULL 三审）。
- 冻结通道在案：档案页收口后迁 `docs/research/`，其机器面随之退出（research 层无骨架约束）。
- 推广面：判据在案、页不立；第二个主题满足判据时按本件立页。
- 「摩擦点落点可寻址」验收由 [doc-standards](../../../../docs/method/doc-standards.md) §1 的落点表承担（[判裁 ADR](../architecture/2026-09-13-memory-line-phase2-verdict.md) Consequences 的验收项在案）。
- 零约束姿态的代价：`docs/state/` 被删除或清空时闸不报错——制度依赖 tier 表与评审兜底，不靠闸的存在性自证。
