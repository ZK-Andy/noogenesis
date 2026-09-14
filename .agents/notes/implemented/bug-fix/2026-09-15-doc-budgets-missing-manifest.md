# Agent Note: doc-budgets 缺 manifest 由静默 SKIP 改 fail-closed

Status: implemented
Review: FULL/2026-09-15/pending

> Related：出处 = [演化轮池](../../../../HANDOFF-evolution-pool.md) 候选「`verify-doc-budgets` 不带 `--manifest` 时静默 SKIP 且 exit 0」，同批上闸件 = [覆盖面静默绿治理批](../process/2026-09-15-surface-coverage-gates.md)；落地件 = [verify-doc-budgets](../../../../scripts/verify-doc-budgets.mts)。

## Problem

`node scripts/verify-doc-budgets.mts`（不带 `--manifest`）在仓库根跑时默认路径 `./doc-budgets.manifest.json` 不存在——仓内 manifest 在 `scripts/doc-budgets.manifest.json`，由 gates.json 条目与 lefthook 钩子显式传入——旧行为输出 `SKIP: manifest … not found` 且 exit 0。本地复跑或评审简报的自证行只记 `doc-budgets:0`，绿色被读成「已跑且通过」，实为零覆盖（批次 8 序 38 三审 R1 附注记录的形态）。

现象确认：`gates.json` 条目与 `lefthook.yml` 钩子均带 `--manifest scripts/doc-budgets.manifest.json`（已核），故该缺口只在手工或错误调用面可达；但「零覆盖报绿」正是本批治理对象——缺件不得被读作通过。

## Decision

`budgetsCheck` 缺 manifest 时输出 `FAIL: manifest <p> not found`、exit 1（原 SKIP / exit 0）；头注退出码语义与自检夹具同批改写（夹具「manifest 缺失样例」由期望 SKIP/0 改期望 FAIL/1）。

退出码面：0 = PASS，1 = FAIL（违约，含缺 manifest），2 = 参数面错误（同 py argparse 语义）。缺件 = 判不了 = 拒跑，不静默放行。

## Alternatives considered

- **保留 SKIP、把简报自证行的命令形态钉到 gates.json 条目**：落败——那是纪律面（人遵守），机器面仍可被误读；且自证行形态不受任何闸约束，改不掉「零覆盖 = 绿」的读法。
- **默认 manifest 路径改 `scripts/doc-budgets.manifest.json`**：落败——闸件是 manifest 驱动的通用件（外部宿主自建同款清单即用），默认值硬化成心源仓布局；且对「显式传入但不存在」的路径仍会静默。
- **缺 manifest 判 exit 2**：落败——这是数据/环境缺件（与「条目指向缺失文件」的 FAIL 同类），不是参数面错误；exit 2 语义留给 argparse 面（未知参数 / 缺值）。
- **不修**：落败——「绿色可能是零覆盖」违背本仓最小可信护栏对 fail-closed 的要求，且修复面极小（一处返回 + 夹具同批改）。

## Consequences

- **采用面**：[scripts/verify-doc-budgets.mts](../../../../scripts/verify-doc-budgets.mts)（缺件返回 + 头注 + 自检夹具）。调用面无改——gates.json 与 hooks 均显式传 `--manifest`，真跑行为不变。
- **行为变化面**：手工裸跑（不带 `--manifest`）由「SKIP 且绿」变「FAIL 且红」。仓内无消费方依赖旧的 SKIP/0（已核：gates.json / lefthook / CI 全带显式路径）。
- **判据外**：不修默认路径布局、不给 `--manifest` 补前缀推导——触发 = 出现「裸跑应成功」的真实场景。
- **评审收口（2026-09-15，FULL 三审）**：待收口。
