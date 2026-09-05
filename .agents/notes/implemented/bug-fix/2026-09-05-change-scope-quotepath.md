# Agent Note: change-scope.sh 非 ASCII 文件名 quotePath 修复

Status: implemented

> Provenance：本仓原创修复（2026-09-05，C 类随手候选批）。候选出处：[2026-09-05-p1-engine-implementation](../architecture/2026-09-05-p1-engine-implementation.md) Consequences ①（R1 评审发现，归口 HANDOFF-todos（C 类））。

## Problem

`scripts/change-scope.sh` 的三条 path 输出命令未关 `core.quotePath`，非 ASCII 文件名以八进制转义形态进入人读输出（该输出供人核读，无机器消费者——消费者全图核实见评审记录）；与 `engine/util.js` changedPaths（`-c core.quotePath=off`）形成口径差。上游 provenance 约束"逐字节搬运、零修改"与此修复冲突，需正式解除。

## Decision

- 三条 path 输出命令（committed diff / unstaged diff / untracked ls-files）统一加 `git -c core.quotePath=off`；commits 列表与 base/head 行不动（不受 quotePath 影响）。
- provenance 行从"逐字节搬运、零修改"改为"蒸馏自 + 2026-09-05 修复（本 ADR）"——对齐 `.agents/AGENTS.md` 出处声明中其他 verify 脚本"按本仓修复后使用"的先例。
- 验证：建含非 ASCII 文件名的临时仓实跑，输出为原名（本批随附）；`bash -n` + 全门禁绿。

## Alternatives considered

- **全局设 `git config core.quotePath off`**：落败——改用户全局态是隐形副作用；`-c` 逐命令显式、零残留。
- **engine 侧迁就八进制转义**：落败——把可读性问题转移给基因作者（forbidden_paths 得写转义形态）而非修根因。
- **不修（保持零修改血统）**：落败——"零修改"是血统标注手段不是目的；修复 + provenance 行如实改写比保留缺陷更忠于出处纪律。

## Consequences

- **采用面**：`scripts/change-scope.sh` 三条命令 + 头注释；[实现轮 ADR](../architecture/2026-09-05-p1-engine-implementation.md) Consequences ① 为"同口径"结论的单一事实源（本 ADR 不复述）。
- **同批收口**：engine self-test 补 e2e CLI 装配夹具共 6 条（select happy / propose happy / solidify 全链×2 / evaluate 红档 exit 1 / evaluate fail-closed exit 2，fail-closed 根因以 engineCopy stub 钉死、不耦合真实 gates.json）；修掉实现轮实跑发现的 `solidify` 候选解析 bug 同类盲区——直调函数盖不到 CLI 分派面。
- **行为面**：ASCII 文件名输出零变化；非 ASCII 原样输出。change-scope 输出无机器消费者（人读面），无连带破坏。
