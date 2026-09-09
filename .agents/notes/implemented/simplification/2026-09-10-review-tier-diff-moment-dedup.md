# Agent Note: review-tier 三态 diff 参数映射单源 + untracked 集传递去重

Status: implemented
Review: FULL/2026-09-10/R1=ok R2=ok R3=ok

> Provenance：本仓原创简化（2026-09-10，C 类随手批）。候选出处：R1 评审 2026-09-10（mdref-fold + review-tier 证据批）S1/S2「untracked 集传递去重 + 共享 git diff 参数助手」，原挂 [HANDOFF-todos](../../../../HANDOFF-todos.md)（C）条（触发=下批门禁判据改动搭车）；用户 2026-09-10 拍板改判为独立随手批立做。
> Related：去重对象（`fileDiff`/`evidenceInChange`/`repoChangedPaths` 的三态分支与 untracked 面）为 [2026-09-10-review-tier-evidence-ride-along](../bug-fix/2026-09-10-review-tier-evidence-ride-along.md) 批交付面——本件不取代其证据判据决定，只折叠其实现形态。

## Problem

`scripts/verify-review-tier.mts` 两处实现形态重复：

1. **三态参数三元同构**：`repoChangedPaths`（路径收集）与 `fileDiff`（逐文件 diff）各自持一份「`--staged` / `--since` / 默认」到 git 参数的映射。改模式语义（如给某个时刻换 diff 基准）须双点同步，漏点即判据漂移。
2. **untracked 集二次收集**：默认模式下 `ls-files --others --exclude-standard` 跑两遍——`repoChangedPaths` 收集进路径集后丢弃 untracked 身份，`evidenceInChange` 再跑一遍重建该集（判断候选 ADR 是否整文件新增）。且第二遍失败被静默容忍（`if (r.ok)` 后照常继续），与第一遍同命令失败即 fail-closed 的处置相悖（本件头注契约：git 时刻不可解析即违约，绝不静默放行）。

## Decision

1. **新增私有 `diffMoment(stagedOnly, since)` 单源三态映射**：一次给出该时刻的路径收集命令组（`pathsCmds`）、逐文件 diff 参数（`fileDiffArgs(rel)`）、untracked 收集命令（`untrackedCmd`，staged/since 模式为 null）。`repoChangedPaths` 与 `fileDiff` 改为消费该映射，三态分支词面只剩一处。
2. **untracked 集单次收集传递**：`repoChangedPaths` 返回 `{ paths, untracked }`（默认模式把 untracked 面并入路径集的既有语义原样保留）；`scan` 把 `untracked` 传给 `evidenceInChange`，后者删除二次 `ls-files`；`diffIntroducesReview` 签名随之放宽为 `ReadonlySet<string>`（私有面）。
3. **失败面统一 fail-closed**：第二遍 `ls-files` 不复存在，其失败面并入首收集（git 时刻失败 → `git moment failed` 违约行）。瞬时故障角（首跑成功、原第二跑失败）按证据 ADR 形态拆两子角（R3 评审注入仿真实证）：
   - 证据 ADR 为 **untracked**：两版均拦，仅违约文案变化（lacks review evidence → git moment failed）。
   - 证据 ADR 为 **tracked** 且 Review 行随批 diff 引入：旧版可能放行（untracked 集静默空集后走 tracked diff 判定，证据本就成立）；新版必拦（git 时刻失败）——判定翻转，方向严格更 fail-closed（新永不比旧更放行），与头注「git 时刻不可解析即违约」契约对齐；push 重试即恢复。
   - 「门禁判定零变化 / 判定输出逐字节对照」限定为 **git 全部成功的路径**。
4. **零行为证据**：17 夹具 self-test 原样不动（判据漂移护栏）+ tsc 闸 + 同夹具仓改造前后判定输出逐字节对照（夹具均为 git 全成功路径，受 Decision 3 限定约束）。

## Alternatives considered

- **维持双份三态三元 + 二次 `ls-files`**：落败——三态映射是判据面，双点同步是漂移雷；每次默认模式评审多付一个子进程；失败处置不对称（同命令一处 fail-closed 一处静默）。
- **只折叠 untracked 二次收集、不动参数映射（或反之）**：落败——两处同根（三态时刻映射），半折叠留一半漂移面；R1 原建议 S1/S2 即两件一起。
- **提升为 mdref 式跨件共享原语**：落败——三态映射仅 review-tier 一件消费（`verify-review-brief` 经同族 import 只取 `classify`，不触 diff 面），无第二消费者；本地私有助手即达单源目标，跨件共享徒增耦合面。
- **保持旧版第二跑静默容忍形态**（只传集、不统一失败面）：落败——旧形态在 tracked 证据子角靠「untracked 集对该子角本无用」拿到正确判定，但 untracked 子角把「git 不可解析」静默读成「证据不成立」违约，违反头注 fail-closed 契约且文案误导排查方向。

## Consequences

- **采用面**：`scripts/verify-review-tier.mts`（`diffMoment` 新增 + `repoChangedPaths`/`fileDiff`/`evidenceInChange`/`scan` 改造 + `diffIntroducesReview` 签名 `Set<string>`→`ReadonlySet<string>` 放宽）；17 夹具零改动。
- **行为面**：默认模式子进程 −1（去重即是目的）；git 全成功路径上门禁判定输出逐字节不变；瞬时故障角见 Decision 3（untracked 子角仅文案变化，tracked 子角判定翻转、方向更 fail-closed）；`classify` 导出面、`--staged`/`--since`/`--enforce`/`--self-test` 消费契约全不动（`verify-review-brief` 同族 import 面不受影响）。
- **后续判据改动路径**：三态模式语义今后只改 `diffMoment` 一处；夹具仍按「判据改动同变更改夹具」纪律随批。
