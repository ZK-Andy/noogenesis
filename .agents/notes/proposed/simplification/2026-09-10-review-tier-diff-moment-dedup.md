# Agent Note: review-tier 三态 diff 参数映射单源 + untracked 集传递去重

Status: proposed

> Provenance：本仓原创简化（2026-09-10，C 类随手批）。候选出处：R1 评审 2026-09-10（mdref-fold + review-tier 证据批）S1/S2「untracked 集传递去重 + 共享 git diff 参数助手」，挂 [HANDOFF-todos](../../../../HANDOFF-todos.md)（C）条；用户 2026-09-10 拍板触发条件由「下批门禁判据改动搭车」改判为独立随手批立做。
> Related：去重对象（`fileDiff`/`evidenceInChange`/`repoChangedPaths` 的三态分支与 untracked 面）为 [2026-09-10-review-tier-evidence-ride-along](../../implemented/bug-fix/2026-09-10-review-tier-evidence-ride-along.md) 批交付面——本件不取代其证据判据决定，只折叠其实现形态。

## Problem

`scripts/verify-review-tier.mts` 两处实现形态重复：

1. **三态参数三元同构**：`repoChangedPaths`（路径收集）与 `fileDiff`（逐文件 diff）各自持一份「`--staged` / `--since` / 默认」到 git 参数的映射。改模式语义（如给某个时刻换 diff 基准）须双点同步，漏点即判据漂移。
2. **untracked 集二次收集**：默认模式下 `ls-files --others --exclude-standard` 跑两遍——`repoChangedPaths` 收集进路径集后丢弃 untracked 身份，`evidenceInChange` 再跑一遍重建该集（判断候选 ADR 是否整文件新增）。且第二遍失败被静默容忍（`if (r.ok)` 后照常继续），与第一遍同命令失败即 fail-closed 的处置相悖（本件头注契约：git 时刻不可解析即违约，绝不静默放行）。

## Proposal

1. **新增私有 `diffMoment(stagedOnly, since)` 单源三态映射**：一次给出该时刻的路径收集命令组（`pathsCmds`）、逐文件 diff 参数（`fileDiffArgs(rel)`）、untracked 收集命令（`untrackedCmd`，staged/since 模式为 null）。`repoChangedPaths` 与 `fileDiff` 改为消费该映射，三态分支词面只剩一处。
2. **untracked 集单次收集传递**：`repoChangedPaths` 返回 `{ paths, untracked }`（默认模式把 untracked 面并入路径集的现有语义原样保留）；`scan` 把 `untracked` 传给 `evidenceInChange`，后者删除二次 `ls-files`。
3. **失败面统一 fail-closed**：第二遍 `ls-files` 不复存在，其失败面并入首收集（git 时刻失败 → `git moment failed` 违约行）。唯一可观察差异 = 瞬时故障角（首跑成功、原第二跑失败）：违约文案由 "lacks review evidence" 变为 "git moment failed"——两版都不产生放行，门禁判定零变化；新处置与头注 fail-closed 契约对齐。
4. **零行为证据**：17 夹具 self-test 原样不动（判据漂移护栏）+ tsc 闸 + 同夹具仓改造前后判定输出逐字节对照。

## Alternatives considered

- **维持双份三态三元 + 二次 `ls-files`**：落败——三态映射是判据面，双点同步是漂移雷；每次默认模式评审多付一个子进程；失败处置不对称（同命令一处 fail-closed 一处静默）。
- **只折叠 untracked 二次收集、不动参数映射（或反之）**：落败——两处同根（三态时刻映射），半折叠留一半漂移面；R1 原建议 S1/S2 即两件一起。
- **提升为 mdref 式跨件共享原语**：落败——三态映射仅 review-tier 一件消费（`verify-review-brief` 经同族 import 只取 `classify`，不触 diff 面），无第二消费者；本地私有助手即达单源目标，跨件共享徒增耦合面。

## Consequences

- **采用面**：`scripts/verify-review-tier.mts`（`diffMoment` 新增 + `repoChangedPaths`/`fileDiff`/`evidenceInChange`/`scan` 改造）；17 夹具零改动。
- **行为面**：默认模式子进程 −1（去重即是目的）；门禁判定输出逐字节不变；瞬时故障角文案变化见 Proposal 3；`classify` 导出面、`--staged`/`--since`/`--enforce`/`--self-test` 消费契约全不动（`verify-review-brief` 同族 import 面不受影响）。
- **后续判据改动路径**：三态模式语义今后只改 `diffMoment` 一处；夹具仍按「判据改动同变更改夹具」纪律随批。
