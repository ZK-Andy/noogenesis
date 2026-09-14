# Agent Note: 批次 9 序 45 裁决——合并边界自校验证据已交付，PR/贡献闸与「验证报告」对象判不立

Status: implemented

Review: LIGHT/2026-09-14/语义评审（范围化子代理单路 R2：待审）

Related: 批次表 [行 45](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · 主设计 [§7.2](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · [序 43 裁决](2026-09-14-subagent-auto-validation-verdict.md) · Event 扩字段 [E4](2026-09-13-event-field-extension.md) · [序 44 命令面](2026-09-14-evolve-command-surface.md) · 贡献闸前提 [P2 D3](2026-09-06-p2-shared-consumer.md) · 跨机复验 [validate.yml](../../../../.github/workflows/validate.yml) · 入档闸 [solidify.ts](../../../../engine/solidify.ts)

## Problem

批次表行 45「合并携带自校验证据」，出处主设计 §7.2「发起合并时带自校验结果」行：合并（PR / consolidate）时必须携带机器已验证的证据（验证命令结果、测试通过数、token 基线 diff、benchmark 结果），合并闸由 CI 复跑同一验证（跨机器可复现），绿了才合入。行备注 = 依赖序 21（贡献闸）。开工前取证（2026-09-14，本仓实读）：

- **本仓唯一演化内容合并边界 = solidify 入档闸**：`evaluate` 对候选真 spawn `gates.json` 全集，全绿才落 `genes/`；绿与红都落事件——`evidence` = `evaluate ok: all N gates green`（红 = 违约理由），`gene_sha`（内容寻址锚点）+ `env_fingerprint` 同行在案，`genes/` 变更与事件行同 commit（原子证据，写入失败回滚）。
- **跨机合并闸已交付**：[validate.yml](../../../../.github/workflows/validate.yml) 在 CI 复跑同一套门禁与 self-test，绿了才允许合入——「CI 复跑同一验证、绿了才合入」半边已是现网事实（序 43 裁决 Decision 1 同面指针）。
- **consolidate 半边已判不立**（序 44 裁决：T1 = 多来源同 id 候选冲突）；**PR / 贡献闸半边的前提未达**：序 21（staging + PR + CI 跨机器复验 + 维护者合入）的前提 = 真实使用面与可贡献内容，实测为零（P2 D3 口径不变）。
- **「验证报告」对象不存在**：`evaluate` 的报告渲染到 stdout 即散；[E4](2026-09-13-event-field-extension.md) 已裁 `evidence` 是它当下的唯一落点，无 id、无落盘、无检索面。`validation_report_id` 的最后一条触发（序 45）由此件裁决。

## Decision

### 1. 合并边界携带自校验证据已交付（指针，不重建）

验证据 [solidify.ts](../../../../engine/solidify.ts) 入档闸 + Event `evidence`/`gene_sha`/`env_fingerprint` 三键 + 原子 commit 四件既有家。设计该行的两个要件——「携带机器已验证的证据」与「合并闸由 CI 复跑同一验证、绿了才合入」——在本仓合并边界（solidify → genes/）与代码合并边界（pre-push + CI）均已成立；本件不复述其清单与格式。

### 2. PR / 贡献闸半边判不立

唯一缺席的合并形态是外部贡献 PR 闸，其前提 = 序 21 的前提（真实使用面与可贡献内容 = 0）。触发沿用序 21 保留位，不新立触发条；序 21 开轮时 PR 闸与「合并携带证据」的 PR 半边同批拍。

### 3. 「验证报告」对象判不立，E4 触发全关（终局）

序 45 不产「验证报告」对象：把它落出来只有三条路——假内容（指向不存在的报告）、自造报告仓（`evaluate` 报告落盘 + id，无消费者）、死键（`validation_report_id` 调用方自由填）——同 [E4](2026-09-13-event-field-extension.md) 已列的 E1 违约；且合并边界已携带可复算证据（`evidence` 行 + `gene_sha` 复算 + CI 跨机重跑），报告对象没有「它才拦得住的失败」。`validation_report_id` 终局不进 schema，E4 ADR 的触发条在此关闭——该键在设计稿八字段中最后一个未决位的裁决落定。

### 4. 重议触发

- **T1**：序 21 开轮（真实使用面与可贡献内容出现）→ PR 闸与报告对象随贡献闸同批拍，本件 Decision 2/3 由新件取代。
- **T2**：出现需跨会话检索某次评估报告的具名消费者（人或机器）→ 重估报告对象与 `validation_report_id`。
- **T3**：设计稿把「合并携带自校验证据」改为超出 CI 复跑形态的硬性验收条（如要求 token 基线 diff / benchmark 结果入合并闸）→ 重开本件。

## Alternatives considered

- **引擎把 evaluate 报告落盘（`.noogenesis/reports/`）并发 id 进事件**：落败——Decision 3 三条路全违约；报告 stdout 即散是现状合同（适配层按退出码消费，不读正文）。
- **本件顺手扩 `validation_report_id` 进 schema**：落败——死键；E1「对象已到位 + 有真实生产者」两条件均不成立。
- **判「已交付、零动作」不写件**：落败——合并边界的证据归属、PR 半边的前提依赖、E4 触发的终局裁决会再次无家（批次表立项动因）。

## Consequences

- **批次表单源更新**：行 45 备注 `done（指针 = 本件）`；「未交付」计数 2 → 1（序 46，可选）；游标 = 序 46。
- **档位**：纯文档收口（`.agents/notes/**` + HANDOFF 家庭 + journal），路径触发集未命中 → LIGHT 单路语义评审（R2）。
- **机制零变化**：`engine/**`、`adapters/**`、`scripts/**`、`.github/workflows/**`、`genes/`、`events/`、`manifest.json` 均不动。
- **相邻归口**：HANDOFF-todos D 条「Capsule `blast_radius` 复议」的触发面两半之一（合并自校验证据消费者）在此关闭，序 21 半边维持；[序 43 ADR](2026-09-14-subagent-auto-validation-verdict.md) Decision 5 的触发收窄句由本件落定。
- **单源**：合并边界证据面 = [solidify.ts](../../../../engine/solidify.ts) + Event 键集（[E4/E5](2026-09-13-event-field-extension.md)）；跨机合并闸 = [validate.yml](../../../../.github/workflows/validate.yml)；「PR / 贡献闸 / 报告对象」的判不立与触发条以本件为家。
