# Agent Note: 规范连接收紧与反向审计批（G1–G6）

Status: proposed

> Provenance：本仓原创（2026-09-10，用户定向「审计完给出的方案，完成后两篇规范连接完全完善、不得有任何遗漏」）。出处：架构规范实现批收口后的连接完备性追问；前批 ADR [2026-09-10-architecture-standards-charter](../../implemented/architecture/2026-09-10-architecture-standards-charter.md)。
> Related：[code-standards](../../../../docs/method/code-standards.md)、[review.md](../../../../docs/method/review.md) §1、[feature-flow](../../../../.agents/workflows/feature-flow.md) 步骤 2、[capsule-01-optimization-round](../../../../docs/research/capsule-01-optimization-round.md) §2.1/§2.2-4。

## Problem

两篇规范（code-standards / architecture-standards）收口后连接面审计发现 6 处缺口：①review.md §1 不回指影响面识别通则（charter「互链」只兑现单向）；②code-standards §4 两族分野行指 B2 ADR（拍板档案非规则正文家）；③architecture §2.4 散文面「预算超限处理序 / README 收尾核对」无指针；④A2 开场规则地图只注入写码规范指针行、无架构规范行（mount-policies.mts 实锤）——每会话规范指针不对称；⑤问题池 §2.1「规范事前接入」状态行缺「架构规范已成文」；⑥feature-flow 步骤 2 实现时刻不指规范面。

## Proposal

**六缺口一次批收口；反向审计 12 面零缺口结论同批落档：**

1. **G1**：review.md §1 末补一行回指 architecture-standards §2.4（识别通则彼处，判据单源留本节）。
2. **G2**：code-standards §4 两族分野行并入 architecture 行，改指 R6（B2 ADR 降为括注档案指针）。
3. **G3**：§2.4 散文面行补两链（doc-standards §5 处理序 + session-close 步骤 4 程序家）。
4. **G4**：mount-policies.mts A2 地图增架构规范指针行（与写码规范行同款存在性过滤）；selftest.mts 夹具同步（期望行 + nopointer 断言扩 architecture）。
5. **G5**：问题池 §2.1 补「2026-09-10 续：架构规范已成文单源」；§2.2-4 补「三规范均已按规范篇落地（非技能）」状态。
6. **G6**：feature-flow 步骤 2 补规范面指针行（code + architecture 两篇）。

**反向审计 12 面零缺口（判定依据在案）**：根 AGENTS 检查项 3/4（常驻路由）／两篇互链主干（除 G1–G3）／档位与评审单源／子树分工指针／templates（结构骨架层零规范指针义务）／基因库（零命中）／7 个 noo-* 技能（经根 AGENTS 兜底清单路由；noo-prose→code §2、noo-find→standard-authoring 已直链）／README+README.zh 文档节（选摘节范式一致）／engine+adapters README（合同家，反向指针非单源义务）／cookbook+ai-collaboration-method+doc-standards+standard-authoring（无规范指针义务面）／session-open 卡与门禁清单（规范面经常驻可达）／HANDOFF 家庭与 journal（前批已同步）。

**完备性论证（收口后成立）**：每个义务时刻均有可达路径——常驻层（根 AGENTS，全时刻）→ A2 开场地图（每会话，写码+架构对称）→ feature-flow 步骤 2（实现时刻）→ 评审时刻（review §1 回指 + 兜底清单）→ 文档操作时刻（§2.4 表全链）→ 状态叙事（问题池）。指针对称闭环：R5↔§4 表、§2.4↔review §1、散文面↔doc-standards §5、两族分野单一指针链。

## Alternatives considered

- **A2 地图不加架构规范行**：落败——每会话注入指针写码/架构不对称，用户明确定调「规范事前接入」含架构；存在性过滤已保证零布点仓零噪音。
- **feature-flow 不加规范指针（靠常驻层）**：落败——流程卡是实现时刻的显式契约，规范入口缺位使「先读规范」依赖自觉；一行指针成本最低。
- **问题池状态行不更新（结论已在 ADR）**：落败——问题池是优化轮唯一行动区，状态漂移会让下会话误判「架构规范未成文」。
- **README 文档节补列两篇规范**：不采纳——该节是选摘非全清单（code-standards/review 亦未列），单补两篇反破坏范式；选摘一致性优先。

## Consequences

- **验收**：G4 需 `npm run build` + `node dist/adapters/dsh/selftest.mjs`（夹具期望行同步）+ tsc 全绿；文档面 md-links/doc-budgets/adr-format 全绿；review-tier `--enforce` 证据随本 ADR Review 行。
- **行为面**：A2 注入消息在含 architecture-standards.md 的仓每会话多一行 ≤1 行 advice（零布点件仓零注入）；selftest 夹具为回归判据。
- **连接面**：本批后两篇规范的互链与入站指针全部闭合；后续新增规范篇按同款审计清单（12 面）接入。
