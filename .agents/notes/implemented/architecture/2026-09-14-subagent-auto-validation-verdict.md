# Agent Note: 批次 9 序 43 裁决——候选入闸真执行与执行者/评审者分离已交付，子代理自动 spawn 验证判不立

Status: implemented

Review: LIGHT/2026-09-14/pending（语义评审进行中，收口时回填真实结论）

Related: 批次表 [行 43](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · 主设计 [§7.1 / §7.2 / §7.3](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 候选比较判据 [序 5 裁决](2026-09-13-candidate-comparison-blindness.md) · 验证报告字段触发 [Event 扩字段 E4](2026-09-13-event-field-extension.md) · Detect 站立规则 [序 11 裁决](2026-09-13-detect-source-verdict-session-event.md) · 评审契约 [review.md §4/§6](../../../../docs/method/review.md) · 评审闸 [verify-review-brief](../../../../scripts/verify-review-brief.mts) / [verify-review-tier](../../../../scripts/verify-review-tier.mts) · 开发主链路 [feature-flow §4/§4.5](../../../workflows/feature-flow.md) · 验证执行面 [evaluate.ts](../../../../engine/evaluate.ts) / [solidify.ts](../../../../engine/solidify.ts) · 门禁发射器 [gates.mts](../../../../scripts/gates.mts) · 跨机复验 [validate.yml](../../../../.github/workflows/validate.yml) · 子代理跳过口径 [mount-policies.mts](../../../../adapters/dsh/mount-policies.mts)

## Problem

批次表行 43（批次 9 开门件）要求「子代理自动执行验证（候选入闸真跑；执行者 / 评审者分离）」，出处主设计 §7.2「用户启动子代理自动跑」行：演化候选进入验证闸时，由宿主**子代理在新鲜沙箱自动执行**验证命令集（`subagent/*`），真执行非自报；执行者与评审者分离（防自产自审）；行备注 = 现为人工跑门禁。开工前取证（2026-09-14，本仓实读）：

- **「候选入闸真跑」有确定性执行面**：[`evaluate`](../../../../engine/evaluate.ts) 对候选跑 [`gates.json`](../../../../engine/gates.json) 全集——`run(inst.cmd, inst.args, repoRoot)` 真 spawn 子进程，读数 = 退出码（不是调用方填的文本）；[`solidify`](../../../../engine/solidify.ts) 只在 evaluate 全绿时落 `genes/`，事件与文件同 commit；[`gates.mts`](../../../../scripts/gates.mts) `--run` 是同一清单的发射器（DAG runner，退出码三档 0/1/2），pre-commit / pre-push 消费同一白名单。
- **跨机复验已交付**：[validate.yml](../../../../.github/workflows/validate.yml) 在 CI 重跑同一套第一梯队门禁与逐件 self-test——「真执行非自报」在另一台机器、另一进程树上同样可复算。
- **执行者 / 评审者分离有流程面**：语义评审由**独立子代理**跑泳道（[review.md](../../../../docs/method/review.md) §4 三路 / §6 并行与裁决；[feature-flow](../../../workflows/feature-flow.md) §4.5 后台评审子代理 + 等待纪律）；发射前 [`verify-review-brief --enforce`](../../../../scripts/verify-review-brief.mts) 拦简报缺项与自证脱节，push 前 [`verify-review-tier --enforce`](../../../../scripts/verify-review-tier.mts) 拒推缺证据的 FULL 变更，收尾由 session-close ③ 对账机器面闭集标记。执行者 = 主会话、评审者 = 另起子代理，是本仓各批三审与单路 R2 的长期形态（journal 在案）。
- **宿主确有子代理 seam，本包未消费**：宿主服务 `subagents`（`@deepseek-ai/dsh-subagent`）+ 委派工具 + 多后端（in-process / ACP / SDK / Codex / Claude Code）——设计 §7.3「`subagent/*` 原生提供子代理执行/委托 seam」成立。本仓 `adapters/**` 对 `subagents` 零消费（实读无命中），引擎侧也不经宿主。
- **「新鲜沙箱」在本仓无门禁落点**：门禁对象 = 当前工作树与其 diff 面（[`change-scope`](../../../../scripts/change-scope.mts) 的 fork-point 推导、`evaluate` 的 blast-radius 都读工作树 / git 状态）；把执行搬进隔离环境会与被验对象分离。宿主未向插件暴露 per-subagent 沙箱面，[`mount-policies.mts`](../../../../adapters/dsh/mount-policies.mts) 里 subagent 只作为「跳过子树地图」的 origin 标记出现。
- **相邻触发面**：[Event 扩字段 E4](2026-09-13-event-field-extension.md) 把 `validation_report_id` 的解锁挂在「序 43 或序 45 落地『验证报告』对象」；[序 5 C2](2026-09-13-candidate-comparison-blindness.md) 的 `independent_execution` 通道读的是候选各自真跑确定性验证的读数——执行者身份不进入读数。

## Decision

### 1. 「候选入闸真跑」（真执行非自报）已交付 = `evaluate` + `gates.json` + CI 复跑（指针，不重建）

验证据 [`evaluate.ts`](../../../../engine/evaluate.ts) / [`solidify.ts`](../../../../engine/solidify.ts) / [`gates.mts`](../../../../scripts/gates.mts) / [`validate.yml`](../../../../.github/workflows/validate.yml) 四件既有家，本件不复述其清单与格式。

### 2. 「执行者 / 评审者分离」已交付 = 评审子代理泳道 + 两道机械闸 + 收尾对账（指针，不重建）

判据单源 = [review.md](../../../../docs/method/review.md) §4/§6，操作入口 = [feature-flow](../../../workflows/feature-flow.md) §4。

### 3. 「由宿主子代理自动 spawn 验证命令集」判不立

三条理由：① **增量判定为零**——确定性命令的退出码与 spawn 者身份无关，同一 `gates.mts --run` 在主会话、子代理、CI runner 上逐值相同；换执行者不换读数，建了没有「它才拦得住的失败」。② **无具名失败类**——本仓要防的是自报假绿，而现闸读数是子进程退出码 + [`verify-gene-format`](../../../../scripts/verify-gene-format.mts) 的字节复算，自报无入口；跨机 CI 已是对该风险的更强对价。③ **成本进合同面**——消费 `subagents` 服务 + 新增委派工具 = 适配层新宿主依赖 + 工具合同 + selftest + 契约断言四份维护面，换一个读数不变的动作。

### 4. 「新鲜沙箱执行」判不立

门禁对象是当前工作树 / diff 面（同 Problem 第 5 条），隔离执行切断被验对象；宿主也不向插件暴露 per-subagent 沙箱面。跨机隔离的真需求已由 CI 复跑承接。

### 5. `validation_report_id` 未解锁，触发面收窄到序 45

序 43 不产「验证报告」对象（Decision 3 / 4 判不立），[E4](2026-09-13-event-field-extension.md) 的两条触发只剩序 45（合并携带自校验证据）；该键维持不进 schema。

### 6. 重议触发

- **T1**：出现「验证读数被自报污染」的具名实例（某闸或验证面存在可被生产者伪造 / 绕过的读数），且 CI 复跑未能对价 → 重估独立执行面。
- **T2**：宿主给出插件侧可订阅的 per-subagent 沙箱 / 隔离执行契约，且「自动 Detect 默认关」站立规则被独立重拍（[序 11 裁决](2026-09-13-detect-source-verdict-session-event.md)）→ 重估自动 spawn 形态。
- **T3**：设计稿把「子代理自动执行验证」改为硬性验收条，或本地执行无法复现 CI 读数 → 重开本件（须先解增量判定与合同成本两条）。

## Alternatives considered

- **新增适配层工具 `noo_validate`（`ctx.get("subagents")` spawn 子代理跑 `gates.mts`）**：落败——Decision 3 三条；工具产出与既跑读数同值，只增合同面。
- **订阅 `subagent/*` 事件 + 引擎内记录验证报告**：落败——D2 站立规则（自动 Detect 默认关）+ A8 撤除（不写会话事件）+ 无消费者；报告对象随序 45。
- **把 `evaluate` 的门禁执行搬进子进程池 / 沙箱**：落败——Decision 4；`evaluate` 已真 spawn，隔离只增环境差异与失败面。
- **判「已交付、零动作」不写件**：落败——「自动跑」与「分离」两半各自的归属、`validation_report_id` 的剩余触发、四项候选的落败理由会再次无家（批次表立项动因）。

## Consequences

- **批次表单源更新**：行 43 备注改 `done（指针 = 本件）`；「未交付」计数 7 → 6；游标 = 序 44。
- **档位**：纯文档收口（`.agents/notes/**` + HANDOFF 家庭 + journal），路径触发集未命中 → LIGHT 单路语义评审（R2）。
- **机制零变化**：`engine/**`、`adapters/**`、`scripts/**`、`.github/workflows/**`、`genes/`、`events/`、`manifest.json` 均不动。
- **单源**：验证执行面 = [`evaluate.ts`](../../../../engine/evaluate.ts) + `engine/gates.json`（[`gates.mts`](../../../../scripts/gates.mts) 发射）+ [`validate.yml`](../../../../.github/workflows/validate.yml)；执行者 / 评审者分离 = [review.md](../../../../docs/method/review.md) §4/§6 + 两道评审闸 + session-close ③ 对账；「子代理自动跑 / 新鲜沙箱」的判不立与触发条以本件为家。
- **相邻归口**：`validation_report_id` 触发收窄到序 45；[序 5 C2](2026-09-13-candidate-comparison-blindness.md) 的 `independent_execution` 通道口径不变。
- **评审结论**：待回填。
