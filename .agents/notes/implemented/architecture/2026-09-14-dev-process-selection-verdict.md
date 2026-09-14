# Agent Note: 批次 8 序 41 裁决——开发流程选择域：四模式契约与执行流卡已交付，候选余项判不立

Status: implemented

Review: LIGHT/2026-09-14/pending（语义评审进行中，收口时回填真实结论）

Related: 批次表 [行 41](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · 主设计 [§10 / §4.1](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 模式契约 [session-modes](../../../workflows/session-modes.md) · 执行流卡 [feature-flow](../../../workflows/feature-flow.md) / [release-flow](../../../workflows/release-flow.md) / [github-research](../../../workflows/github-research.md) · 生命周期卡 [session-open](../../../workflows/session-open.md) / [session-close](../../../workflows/session-close.md) · 档位判据 [review.md](../../../../docs/method/review.md) · 档位机械面 [verify-review-tier](../../../../scripts/verify-review-tier.mts) · 检查范围 [change-scope](../../../../scripts/change-scope.mts) + [noo-pre-push-checks](../../../skills/noo-pre-push-checks/SKILL.md) · 搬迁处置 [migration-plan §6](../../../../journal/capsule-01-migration-plan.md) · 前序裁决 [序 40](2026-09-14-pitfall-atomization-verdict.md) / [序 39](2026-09-14-elegant-implementation-verdict.md) / [序 38](2026-09-14-project-init-domain-verdict.md)

## Problem

批次表行 41（批次 8 内容域第四件）要求「开发流程选择域补全」，出处主设计 §10 表行「开发流程选择 | 讨论/调研/实现/发布模式契约 | session-modes 卡、feature-flow 卡」与 §4.1「项目开始后如何选择开发流程」；行备注 = 仅「流程卡已在，域内余项」。开工前取证（2026-09-14，本仓实读）：

- **模式契约已在场**：`.agents/workflows/session-modes.md` 给四模式（讨论 / 调研 / 实现 / 发布）× 三列（许可范围 / 禁区 / 典型产出）；选择入口 = 根 [AGENTS](../../../../AGENTS.md)「协作模式」+ [session-open](../../../workflows/session-open.md) 步骤 4「声明会话模式……与用户确认本轮类型与边界」。
- **执行流卡三件已在场**：[feature-flow](../../../workflows/feature-flow.md)（非平凡变更主链路 ADR→实现→门禁→评审→收尾；琐碎修改走简化路径）、[release-flow](../../../workflows/release-flow.md)（发版）、[github-research](../../../workflows/github-research.md)（GitHub 调研六步配方，根 AGENTS 标「强制：gh CLI，禁 web 检索开局」）。
- **生命周期卡两件已在场**：[session-open](../../../workflows/session-open.md) / [session-close](../../../workflows/session-close.md)。
- **选择机制面已交付**：评审档位 = [review.md](../../../../docs/method/review.md) §1 定档判据（语义面）+ [verify-review-tier](../../../../scripts/verify-review-tier.mts)（路径触发的机械单源）；检查范围 = [change-scope](../../../../scripts/change-scope.mts) + [noo-pre-push-checks](../../../skills/noo-pre-push-checks/SKILL.md)。
- **索引单源可达**：根 AGENTS「流程卡（索引）」列六卡，逐条链接有效（`verify-md-links` 实跑 2964 目标 OK、exit 0）；六卡自迁移后无死链、无悬空指针。
- **源仓差集已在案**：来源仓七卡多出 `search-routing.md`，[迁移计划 §6](../../../../journal/capsule-01-migration-plan.md) 已判弃（工具面绑定 AnySearch 纵向 + 单语起步）；本仓无该卡的消费者。
- **模式边界的唯一记录实例**：会话日志记一次「讨论模式下擅自写文件（两流程卡 + 错版 ADR）」，该次写入未入 git、已清理，零 durable 残留（[journal](../../../../journal/2026-09.md) 2026-09-11 节）。

## Decision

### 1. 本域内容半边 = 四模式契约 + 三执行流卡 + 两生命周期卡（指针，不重建）

模式契约单源 = [session-modes](../../../workflows/session-modes.md)；执行流单源 = 各卡自身；开场 / 收尾检查单单源 = 两张生命周期卡。本件不复述其内容、不新立第二份流程档。

### 2. 流程「选择」本身已分面单源，不新立路由表

- **模式选择** = 四模式契约表 + [session-open](../../../workflows/session-open.md) 步骤 4（人 / agent 显式声明；边界有争议时停下询问，不默认扩权）。
- **流程路由** = 根 AGENTS 流程卡索引 + [feature-flow](../../../workflows/feature-flow.md) 的适用范围（非平凡走主链路，琐碎走简化路径）。
- **评审档位** = [review.md](../../../../docs/method/review.md) §1（语义判据）+ [verify-review-tier](../../../../scripts/verify-review-tier.mts)（机械单源）。
- **检查范围** = [change-scope](../../../../scripts/change-scope.mts) + [noo-pre-push-checks](../../../skills/noo-pre-push-checks/SKILL.md)。

四者各自有家；把它们合并成一张「任务 → 模式 / 流程 / 档位」路由表会造第二源。

### 3. 候选余项逐条判不立

- **a. 单一路由表（任务 → 模式 / 流程 / 档位）**：判不立。现状分面单源，合并即双源。HERO 两问：检测的具体失败 = 未命名（无「选错流程 / 档位」的实例）；真出现后下一步不同的事 = 无。
- **b. 讨论 / 调研模式独立卡**：判不立。讨论面内容由 [session-modes](../../../workflows/session-modes.md) 表行 + [notes/README](../../README.md) ADR 规则 + [session-close](../../../workflows/session-close.md) 步骤 3 决策落档承载；调研面已由 [github-research](../../../workflows/github-research.md) 承载 gh 通道。新卡即复述既有家（双源），四骨之「有禁止力」已由模式表禁区承担。
- **c. 模式边界的机器面（写入禁区拦回 / 建议档）**：判不立。模式是会话内声明态、无结构化载体，机器无法判「当前是哪个模式」；自动判定还需过 [D2 站立规则](2026-09-13-detect-source-verdict-session-event.md)（自动 Detect 默认关 + 逐源过 HERO 两问），且与观测面「运行不记」口径相抵。唯一记录实例已由 [session-modes](../../../workflows/session-modes.md)「『讨论中顺手改了』不算授权」纪律承接，零 durable 残留。
- **d. 模式切换的记录面**：判不立。载体缺席同 c；「模式切换必须显式声明」已是卡面契约。

### 4. 重议触发

- **T1**：出现「选错模式 / 流程 / 档位」并造成返工的真实实例（带代价，非假设）→ 立路由判据（先答 HERO 两问）。
- **T2**：调研模式出现 gh 通道之外的具名配方需求 → 立对应卡（现行卡只覆盖 GitHub 通道）。
- **T3**：宿主提供会话模式的结构化声明面 → 接模式边界建议档 / 拦回（须过 D2 站立规则）。

## Alternatives considered

- **写《开发流程选择手册》/ 单一路由表**：落败——模式契约、执行流卡、档位判据、检查范围分面单源已成，合并即双源（同一事实两个家）。
- **补讨论 / 调研模式独立卡**：落败——复述既有家（模式表 + notes/README + github-research），且无具名缺口。
- **恢复 `search-routing` 卡**：落败——[迁移计划 §6](../../../../journal/capsule-01-migration-plan.md) 已判弃（工具面绑定 AnySearch 纵向 + 单语起步）；本仓无该卡的具名消费者。
- **造模式边界机器面（写入拦回 / 建议档）**：落败——模式无机器可见载体；自动判定落 D2 禁区，与「运行不记」口径相抵；唯一实例零 durable 残留。
- **判「已交付、零动作」不写件**：落败——「域内余项有哪些、为何不立、触发在哪」会再次无家，凭印象（批次表立项动因）。

## Consequences

- **批次表单源更新**：行 41 备注改 `done（指针 = 本件）`；「未交付」计数 9 → 8；游标 = 序 42。
- **档位**：纯文档收口（`.agents/notes/**` + HANDOFF 家庭 + journal），路径触发集未命中 → LIGHT 单路语义评审（R2）。
- **机制零变化**：`.agents/workflows/**`、`docs/method/**`、`engine/**`、`adapters/**`、`scripts/**`、`genes/` 均不动。
- **单源**：模式契约单源 = [session-modes](../../../workflows/session-modes.md)；执行流单源 = 各卡；档位单源 = [review.md](../../../../docs/method/review.md) §1 + [verify-review-tier](../../../../scripts/verify-review-tier.mts)；检查范围单源 = [change-scope](../../../../scripts/change-scope.mts) + [noo-pre-push-checks](../../../skills/noo-pre-push-checks/SKILL.md)；域内判据（候选余项与触发条）以本件为家。
- **评审结论**：待回填。
