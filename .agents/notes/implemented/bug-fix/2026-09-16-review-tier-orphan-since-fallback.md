# Agent Note: review-tier 的孤儿 `--since` 回退 fork-point

Status: implemented

Review: FULL/2026-09-16/R1=ok R2=ok R3=ok

> Provenance：本仓原创（2026-09-16 发版轮 CI 回归实锤：force-with-lease 推送后 `validate.yml` 的「评审档位」步必红）。相关 = [评审机械闸](../process/2026-09-05-review-mechanical-gate.md)、[release-shape-alignment](../process/2026-09-09-release-shape-alignment.md)。

## Problem

CI 的评审档位步以 `--since ${{ github.event.before }}` 跑 `verify-review-tier --enforce`。`event.before` = **推送前远端 tip**；一次 `--force-with-lease` 改写提交后，该 tip 在远端不复存在，CI 的 checkout（`fetch-depth: 0`）里也没有它。

`repoChangedPaths` 对不可解析的 diff 面一律 fail-closed（`git moment failed`）——这条纪律本身正确（不可解析的 diff 绝不读成「无 FULL 变更」），但它把**变更本身合法、只是 git 源换了祖先**的情形也钉红：改写后的提交无论内容多正确，CI 永久红，只能再改写一次历史去躲（越躲越红）。

实锤：run `35020206650`（head `73946cd`，`event.before=5e07336` —— 已被 force-with-lease 丢弃）评审档位步 exit 1。

## Decision

`--since` 的取值分两档，只有**非提交名**才 fail-closed：

1. `--since <rev>` 可解析为提交（`rev-parse --verify <rev>^{commit}` 成功）且与 HEAD 有 merge-base → 用原值（正常路径，行为不变）。
2. 否则回退 `<默认分支>` 的 fork-point（`merge-base origin/main HEAD`，本地仓回退 `main`）——把范围重新锚到「本分支相对默认分支的全部未合并提交」。
3. 回退也不可得（仓里既无 `origin/main` 也无 `main`）→ 仍 fail-closed 返回 null。**边界如实记**：坏 ref（Typo）在**有默认分支的仓里会静默落入回退**，范围变宽为 fork-point 全集、无诊断——这是「能判就不拒」的代价，不是缺陷（逃逸方向仍收窄：改写后每个未合并提交都要自带 Review 证据）。

判定依据：**fail-closed 的对象是「不可解析的 diff 面」，不是「换了祖先的提交」**——后者有确定语义（fork-point 起算的未合并集），能判就不该拒。

## Alternatives considered

- **CI 侧改 `event.before` 为空时跳过（`if` 条件加 `git cat-file -e`）**：落败——把纪律挪进 workflow 表达式，本地与 CI 两套判据；且 push 事件里 `event.before` 非空且是合法 sha 形态，workflow 判不出「这 sha 已被丢弃」。
- **改成 `--since event.before --fallback event.before~`**：落败——退到父提交在 force-push + amend 场景仍不可达；fork-point 是唯一有确定语义的锚。
- **force-push 后手工 `--no-verify` 推**：落败——`--no-verify` 是豁免档，本仓只允「已绿前提」下按先例一次性使用；用它掩盖判据缺陷等于把缺陷制度化。

## Consequences

- **采用面**：`scripts/verify-review-tier.mts` 新增 `effectiveBase`（回退 fork-point）+ `repoChangedPaths` 以其为基；self-test 23 组加「孤儿 `--since` 回退 fork-point」与「非提交名仍 fail-closed」两例。
- **行为变化面**：force-push 后的 CI 评审档位步从「必红」变为「按 fork-point 范围照常判定」——改写后的提交仍须自身带 Review 证据，纪律不放松。
- **证据**：`verify-review-tier --self-test` 全绿（23 组）；本仓 `--since a3b0dfa --enforce` OK。

## Related

- 评审档位判据与三层合同：docs/method/review.md。
- tag/推送形态（`--force-with-lease` 纪律）：[release-shape-alignment](../process/2026-09-09-release-shape-alignment.md)。