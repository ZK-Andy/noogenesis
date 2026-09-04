# Agent Note: 评审机械闸落地（verify-review-tier + verify-review-brief）

Status: implemented

> Provenance：本仓原创（按 [2026-09-05-review-mechanical-gate-deferred](../../../../.agents/notes/archived/process/2026-09-05-review-mechanical-gate-deferred.md) 预约的 v0.2 交付，desktop 源版为设计参照不照搬）。

## Problem

v0 评审定档纯人工：review.md §1 判据虽封闭，"命中 FULL 却判 LIGHT"的逃逸无人拦截，"漏跑门禁却声明已盖"的成本转嫁只有简报模板无机器校验（deferral ADR 预言的两处裁量缝隙）。前置已满足：真实 FULL 档案例 ≥1（S7 dogfood 三审 + 简化候选收口批，判据命中记录在 journal 2026-09 卷，简报三份在 `.review-briefs/`）。desktop 源版（verify-review-tier 391 行 + verify-review-brief 422 行）判据面全对着其组合根/.NET 评审对象写就，照搬即假绿灯（deferral ADR 拒绝项）。

## Decision

1. **tier 闸（`scripts/verify-review-tier.py`）——分类零裁量**：FULL 路径触发集单一事实源在脚本内 `FULL_TRIGGERS`：`scripts/**`（门禁及其共享件 mdref/change-scope）、`.githooks/**`、`.github/workflows/**`、`templates/**`、`docs/method/**`、任意层 `AGENTS.md`、`.agents/workflows/**`（流程卡=协作契约，较 review.md §1 v0 清单的扩展项）；外加"proposed ADR 正文承诺三重审核"强制 FULL。**证据随变更**：同变更集内 implemented ADR 头部 `Review: FULL/<日期>/R1=ok R2=ok R3=ok` 行（日期须真实日历日；R 值严格 =ok；proposed ADR 不得自证）。三态模式：默认工作树报告；`--staged`（pre-commit 报告态）；`--since <base>`（pre-push `--enforce` 批次边界强制）。语义面判据（async/并发、跨边界契约、用户显式批量审核）不可路径机械化，仍归人工——review.md §1 保持其家。
2. **brief 闸（`scripts/verify-review-brief.py`）——简报先行的机器校验**：按 review.md §3 结构校验：标题锁定唯一 lane、Scope 含 base/head（捕获收窄为裸 ref——模板尾注不污染 lane 推导）、需深审面 ≥1（"无"拒收）、陪跑文件行、门禁自证耦合（声明已盖必须携带全 0 exit 项，任意非 0 数字拒收；「陪跑文件：无」免自证）、定向检查 1–5 条、明确不做 ≥1 条、Report contract 固定句；**全部在飞简报须声明同一 base..head 区间**（分歧即违规——防一份窄区间简报把 FULL 静默降档）。lane 推导复用 tier 分类（FULL→R1/R2/R3，LIGHT→R2）：默认从简报自身 Scope 的 base..head 界定 diff（适配本仓"实现→提交→评审"批次序），`--lanes` 可显式覆盖；导入依赖 tier 模块无顶层副作用（`__main__` 守卫保持）。`.review-briefs/` 为本地预发射检查面（gitignored，非 CI 面；无简报在飞 = 空通过）。
3. **挂接（fail-closed）**：pre-commit 追加 tier `--staged` 报告态（不阻断批内中间提交——评审在批次边界收口）；pre-push 逐 ref 强制：base = merge-base(远端, 本地) 后 `tier --since <base> --enforce`，**新分支首推无法定 base 即显式报错拒推**（不静默豁免）、分支删除行跳过、非 push 调用（stdin 为终端）跳过；tier 的 git moment 失败（坏 ref/git 报错）= 违规，绝不静默通过。CI 加 tier 真强制步（push 事件 `--since github.event.before --enforce`）与两闸 self-test；brief 闸不入 CI/hooks——发射前由主会话手动 `--enforce`（review.md §3 记载命令）。
4. **契约面同步**：review.md §1 加"路径触发集单一事实源 = verify-review-tier.py"指针与 Review 证据行契约，§3 加发射前命令，§6 机械闸表述转现在时；feature-flow §4.1 同步；根 AGENTS 质量门 + session-open + release-flow 计数 7→9；两 hooks 与 validate.yml 落线。
5. **deferral ADR 归档**：其预约使命完成，移 `archived/process/`（插 Archived 行冻结）；"照搬即假绿灯"教训由本 ADR Alternatives 承载。

## Alternatives considered

- **照搬 desktop 两脚本**：落败（deferral ADR 已证）——路径模式全错，机械闸制造假绿灯。
- **证据面用 journal/HANDOFF 条目**：落败——非结构化叙述机器不可稳定解析；ADR 头 `Review:` 行有严格格式可正则校验，且天然随变更集移动。
- **pre-commit 即 `--enforce`**：落败——本仓评审在批次边界收口，批内中间提交时尚无证据是常态；强制点错位会逼出事后补签的假证据。
- **简报入库（去 gitignore）**：落败——简报是一次性任务界定文档，入库徒增评审噪声；`.review-briefs/` 本地件 + self-test 离线夹具已覆盖回归。

## Consequences

- 门禁 7→9；AGENTS/流程卡计数同步（"九门禁"）；CI 的 brief 闸仅 self-test（简报不入库，主跑是本地预发射检查）。
- FULL 批次的证据载体：批次自然产出/触碰的 implemented ADR 加 `Review:` 行即可；无 ADR 可承载的 FULL 批次加一枚最小 process 笔记。
- 本仓无 remote：pre-push 强制点暂不触发，闸活性由 self-test + CI 强制步维持；远端建立即生效。新分支首推被拒是设计行为（fail-closed）——首次建仓全史推送需显式 `--no-verify` 或先补证据。
- 两闸互锁：改 verify-review-brief.py 自身命中 `scripts/**` → FULL（设计使然，desktop 同构）；改本 ADR 所在判据面同理由 tier 闸盯防。
- self-test 出生即适用 consolidate-r1 ADR 第 2 条约定（argparse 分派 / fixture 触碰主逻辑 / assert 带消息 / OK 行格式）。
