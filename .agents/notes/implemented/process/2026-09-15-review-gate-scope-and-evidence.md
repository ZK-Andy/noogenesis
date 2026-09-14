# Agent Note: 评审闸作用域与证据面——brief lane 收窄 + tier 迁移提交裁决

Status: implemented
Review: FULL/2026-09-15/pending（三重审核进行中，收口时回填真实结论）

> Related：出处 = [演化轮池](../../../../HANDOFF-evolution-pool.md) 候选「已收口泳道的简报会挡住下一路的发射闸」（n=3）与「`verify-review-tier` 在 proposed → implemented 迁移提交上把本批证据判为缺」（n=1）；落地件 = [verify-review-brief](../../../../scripts/verify-review-brief.mts)；契约单源 = [review.md §3](../../../../docs/method/review.md)；销账口径 = [销账 ADR](2026-09-12-evolution-pool-candidate-disposal.md)。

## Problem

- **brief 闸的 `--lanes` 只选「要哪些泳道」，不收窄「判哪些简报」。** 目录级判据（重复泳道、base 可解析、head 须钉本仓 HEAD）遍历 `.review-briefs/` 下全部 `R[123]-*.md`，与 `--lanes` 无关。R1/R2 收口提交后 HEAD 前移，留在目录里的已收口简报随即违反 head 钉 HEAD 判据——即使本次只发 `--lanes R3` 也照样报红；唯一出路是先归档已收口简报再显式 `--lanes`（池件序 3/序 4/序 5 各一次实测）。
- **`verify-review-tier` 对未提交的迁移/改名判缺证据**（【探索性 · n=1】）。证据判据读 `<since>..HEAD` 的逐路径 diff；ADR 由 proposed 迁 implemented 只做改名 + 新增 Review 行时，未提交的改名不在该 diff 面内 → 判「缺证据」，提交后即刻转绿。

## Decision

**1. `verify-review-brief` 的 `--lanes` 收窄到判据面。** 显式给出 `--lanes` 时只判这些泳道：重复泳道、base 可解析、head 钉本仓 HEAD、结构合规都只作用于所需泳道，目录里他泳道的残留简报（已收口未归档、head 已滞后、同泳道重复）不参与；缺简报消息给出 `--lanes` 指引。缺省推导（无 `--lanes`）仍按目录全量判——不知哪些泳道在飞时保守从严，防一份陈旧简报把泳道集静默降级。

**2. `verify-review-tier` 不改闸。** 该闸按设计读已提交区间；「先提交再核」的批次序单源在 [feature-flow §5](../../../../.agents/workflows/feature-flow.md)（评审对象提交在评审之前）。未提交改名期间的判负是操作时序，不是判据缺口。

**3. 夹具。** `verify-review-brief` self-test 15 → 16 组：显式 `--lanes R3` 下残留 R1 简报（head 滞后、同泳道重复两形态）不拦、显式点名 R1 时该简报照判。

## Alternatives considered

- **缺省推导也收窄到他泳道**：落败——推导本身要读一份简报的 base..head 定 tier，残留旧简报可能被读成当前范围；收窄会把「防降级」判据一起收掉。
- **缺省时按 mtime 或「head 已钉 HEAD」筛在飞简报**：落败——mtime 非语义信号；head 钉 HEAD 正是要判的结论，用结论筛输入即空转。
- **`verify-review-tier` 把工作树 rename + 新增行计入证据**：落败——闸的证据面是提交区间，纳入未提交态会让「已提交的评审证据」这条契约与工作树脏读耦合；顺序纪律已单源在 feature-flow §5。
- **要求每次发射恒带 `--lanes`（三条全要也带）**：落败——徒增纪律面；缺省全量判成立，缺口只在显式覆盖没有作用到判据面。
- **不修、继续「归档已收口简报 + 显式 --lanes」**：落败——该处置两条路都要先清目录，而清目录本身是必漏点（池件序 5 实测第二形态）；判据稳定、真树零噪声，修复面小。

## Consequences

- **采用面**：[scripts/verify-review-brief.mts](../../../../scripts/verify-review-brief.mts)（`checkRepo` 收窄 + 缺简报消息 + 夹具 16 组）、[docs/method/review.md](../../../../docs/method/review.md) §3（`--lanes` 作用域）。
- **行为变化面**：显式 `--lanes` 下他泳道残留简报不再报红；缺省推导与 [engine/gates.json](../../../../engine/gates.json) 的 `--lanes R1,R2,R3` 入口行为不变。
- **未覆盖**：无 `--lanes` 时「已归档收口泳道 + 新发余下泳道」仍须显式 `--lanes` 才过——闸无从知道已归档泳道已完成，缺简报消息给出指引。
- **评审收口**：（待回填）
