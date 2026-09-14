# Agent Note: verify-md-links 跳过 .review-briefs/ 本地评审工件

Status: implemented
Review: FULL/2026-09-15/R1=ok R2=ok R3=ok

> Related：出处 = [演化轮池](../../../../HANDOFF-evolution-pool.md) 候选「评审简报工件被 verify-md-links 扫描，仓库根相对链接形态随所在目录深度变」（n=2）；同批裁决件 = [评审闸作用域与证据面](../process/2026-09-15-review-gate-scope-and-evidence.md)；落地件 = [verify-md-links](../../../../scripts/verify-md-links.mts)。

## Problem

`.review-briefs/` 是 gitignored 的本地评审工件目录（在飞的简报在目录根，收口后进 `archive/`），`verify-md-links` 按仓库文档扫描它：简报里的相对链接以工件所在目录为解析基准，而「在飞用 `../.agents/...`、归档后须改 `../../.agents/...`」——归档步即实测漏点（【探索性 · n=2】；批次 8 序 40/序 41 各一次实测：归档后即报 missing target，而同简报自证行写 `md-links:0`）。工件不进 diff、不是仓库文档，校验它们只产生假红；自证读数与实跑 exit 脱节又把红读成绿。

## Decision

`verify-md-links` 的 `skipSegments` 含 `.review-briefs`——该目录整体不扫（在飞与 `archive/` 一并）。工件内链接不受仓库链接纪律约束，简报自证行的 `md-links` 读数即平跑真实读数。

## Alternatives considered

- **把简报链接按所在目录取相对形并写成纪律**：落败——在飞/归档两态所需形态不同，「归档时改写链接」正是必漏点；纪律面消除不了它的漏点属性。
- **只跳过 `archive/`、在飞态照扫**：落败——在飞简报同样按所在目录解析，且同样在 `gates --run` 里报红；漏点只是往后挪。
- **把 `.review-briefs/` 移出仓库根**（如 `$TMPDIR`）：落败——工件需与检出的 HEAD 同仓推演，且 `verify-review-brief` 的目录契约单源在此路径；为回避链接扫描而迁目录是重排。
- **不修**：落败——gitignored 工件让仓库级门禁长红，且自证行与实际 exit 脱节会把红读成绿。

## Consequences

- **采用面**：[scripts/verify-md-links.mts](../../../../scripts/verify-md-links.mts)（头注 + `skipSegments` + 夹具）。
- **行为变化面**：`.review-briefs/` 下任意链接不再被校验（该目录无仓库文档）。
- **未覆盖**：工件自身的结构、自证耦合判据仍在 [verify-review-brief](../../../../scripts/verify-review-brief.mts)；本件不动其判据。
- **评审收口（2026-09-15，FULL 三审）**：R3（ADR 路）1B/1S——Problem 的 n=2 实测补【探索性 · n=2】、Related 补 owning note 交叉链接。修复 = `bf4e30f` + 本收口笔。
