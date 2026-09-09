# Agent Note: verify-review-tier 证据继承弱点——Review 行须由本变更引入

Status: implemented
Review: FULL/2026-09-10/R1=ok R2=ok R3=ok

> Provenance：本仓原创修复（2026-09-10，C 类随手候选批）。候选出处：HANDOFF-todos（C）「verify-review-tier 证据继承弱点」（C2 批发现，2026-09-08）。
> Related：收紧 [2026-09-05-review-mechanical-gate](../process/2026-09-05-review-mechanical-gate.md) Decision 1 + [review.md](../../../../docs/method/review.md) §1 的 evidenceInChange 判定（相关非取代）。

## Problem

`verify-review-tier.mts` 的 `evidenceInChange` 只检查变更集内**任一** implemented ADR 头部带合法 `Review:` 行即放行，不要求该行由本变更引入。`--since` 范围 = base..HEAD 全部提交——若本批同时触碰了**上一批已评审的 ADR**（如追加一行 Consequence），其历史 `Review:` 行会给本批全新的 FULL 变更搭车。

实证（C2 批 2026-09-08）：批内 c2 ADR 未加证据行时 `verify-review-tier --since --enforce` 已过——同批触碰了已评审的 c1 ADR，其证据行被误认作本批证据。**漏洞面**：门禁判据本身可被「顺手改旧 ADR」静默弱化，逃逸防护失去意义。

## Decision

1. **证据须由本变更引入**：合法 Review 行必须出现在本变更集 diff 的**新增行**中（`+Review: …`），或证据 ADR 为**整文件新增**（未跟踪 / 新增文件）。旧 ADR 自带的历史 Review 行不在本变更集 diff 内 → 不得给本批 FULL 变更作证据。
2. **实现**：`evidenceInChange` 增加模式感知（stagedOnly/since/默认三态），对候选 ADR 走 `git diff`（`--cached` / `<since>..HEAD` / `HEAD`）取 diff 文本，扫 `+` 行命中合法 Review 行；未跟踪 ADR（默认模式 `ls-files --others`）整文件视为本变更引入。diff 不可解析（git 失败）→ fail-closed，证据不成立。
3. **范围 = 累积 diff，非单 commit**：`--since` 用 `<base>..HEAD` 累积 diff——本仓真实批次序里证据行常由**收口 commit** 补加（先例 `d4b8aa2` 翻转 ADR 无证据 → `1b6c25b` 补 Review 行），单 commit 粒度会误伤真实批次序。范围内任一 commit 补加即算（fixture 13 钉死此形态）。
4. **夹具**：新增五夹具覆盖三模式——默认/`--since`：(12) 范围含历史已评审 ADR + 本批新 FULL 变更（仅触碰旧 ADR 不加 Review 行）→ 必须拦；(13) 范围内跨两 commit（先翻转 ADR 后补 Review 行）→ 放行；`--staged`（pre-commit 消费面，R2 收口补）：(14) staged 集触碰旧已评审 ADR 不引入 Review 行 → 拦；(15) staged 新增带 Review 行的 implemented ADR → 放行；(16) staged 排除 untracked ADR 证据。fixtures 12→17。

## Alternatives considered

- **证据行必须与 FULL 变更同 commit**：落败——与本仓「一批一提交」「评审在批次边界收口后补证据行」真实批次序冲突（`d4b8aa2`→`1b6c25b` 实证），会把合法批次打成违约。
- **证据 ADR 必须在本批新增（非仅触碰）**：落败——过度收紧：批次**翻转自己的 proposed ADR → implemented 并补 Review 行**（ADR 是本批产物）是最常见证据形态，该形态下 ADR 不是「新增」而是「从 proposed 目录翻转到 implemented」。
- **保持现状（集合级任一 ADR 带行即可）**：落败——正是本批要堵的搭车漏洞；门禁判据改动是 FULL 最高风险面，不能留「改旧 ADR 静默豁免」后门。

## Consequences

- **采用面**：`scripts/verify-review-tier.mts`（`evidenceInChange` 重写 + `fileDiff`/`diffIntroducesReview` 新增 + 头注证据语义同步 + 5 夹具 + 计数 17）。
- **行为面**：证据成立的条件从「范围内存在带 Review 行的 implemented ADR」收紧为「范围内存在由本变更引入 Review 行的 implemented ADR」。本仓全部既有批次（证据行均随各自批次收口补加）不受影响。
- **判定语义**：触及旧 ADR 的新 FULL 批必须为自己的变更引入证据——与该批实际执行的评审一致（新 FULL 变更需要新评审，不能靠旧批评审顶账）。
- **review.md §1**：证据契约句「同变更集内 implemented ADR 头部 Review 行」语义未变（该 ADR 本来就要随本批新增/翻转），不另行改文——机械闸收紧到「新增行」粒度是本句在实现面的精确化。
