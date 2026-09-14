# Agent Note: add 命令参数面收紧——恰一位置参数 + 旗标至多一次

Status: implemented
Review: FULL/2026-09-15/pending（三重审核进行中，收口时回填真实结论）

> Related：出处 = [演化轮池](../../../../HANDOFF-evolution-pool.md) 候选「`capsule add` / `mutation add` 静默吞多余位置参数与重复 `--actor`」；契约单源 = [engine/README.md](../../../../engine/README.md)；落地件 = [engine/bin.ts](../../../../engine/bin.ts)；踩坑单源 = [docs/cookbook.md](../../../../docs/cookbook.md)「flag 值解析用单下标排除法」（本件是其在 add 命令面的兑现）。

## Problem

两条 add 命令的位置参数筛选式用 `rest.find(...)` 取首个候选、用 `indexOf('--actor')` 取首次出现：`mutation add m.json --actor t extra.json` 吞掉 `extra.json` 仍 exit 0；`--actor a --actor b` 取 a、把 b 静默丢弃（`capsule add` 同款）。两命令都是写路径，调用方拿不到「参数被吞」的失败信号。

## Decision

**1. 逐 token 扫描分出旗标与位置参数。** 位置参数恰一个（0 → 缺候选；>1 → 多余）、每个旗标至多一次（重复即拒）、旗标其后须跟非旗标真值（值本身是 `--` 旗标即拒——否则 `--actor --typo` 会把旗标当 actor 静默落档）、未知 `--` 旗标即拒——四种都走 exit 2 用法错，不再静默取首个。两分支共用一个 `scanFlagArgs` 助手（各 18 行的同构扫描折叠为一处）。

**2. 契约面同步。** [engine/README.md](../../../../engine/README.md) 两条命令的「两者用法错与 fail-closed 都走 exit 2」补「多余位置参数与重复旗标即用法错（不静默取首个）」。

**3. 夹具。** `engine/selftest.ts` 两条命令各加五断言：多余位置参数 → exit 2、重复 `--actor` → exit 2、旗标当值 → exit 2、未知旗标 → exit 2 且 stderr 含 unknown flag、拒写后目标文件不存在。

**4. 变异证据。** 逐分支只删后实跑 `node dist/engine/bin.js self-test`：删重复旗标 / 删位置参数数量 / 删「旗标值不得是旗标」/ 删未知旗标，四者各致 exit 1（夹具捕获），恢复后 exit 0——本批实跑。

## Alternatives considered

- **只在既有 `find` 式后补重复旗标计数**：落败——重复旗标的第二个值会先以「多余位置参数」被同一收窄拦下，该判据删掉后夹具仍全绿，不可证伪。
- **同批收紧 `solidify` / `propose` 的同款筛选式**：落败——池件只具名两条命令；其余命令的同形谓词未观察到真实误用（触发 = 出现实例）。
- **容忍未知旗标**：落败——`--acotr` 拼错会被当位置参数吞掉，静默取错 actor 比报错更坏。
- **用法错走 exit 1**：落败——退出码三档语义（0 成功 / 1 门禁红 / 2 用法错与 fail-closed）单源在 [engine/AGENTS.md](../../AGENTS.md)。

## Consequences

- **采用面**：[engine/bin.ts](../../../../engine/bin.ts)、[engine/README.md](../../../../engine/README.md)、[engine/selftest.ts](../../../../engine/selftest.ts)。
- **行为变化面**：`add <cand> extra --actor t` 与重复 `--actor` 由 exit 0 变 exit 2；合法调用（恰一位置参数 + 每旗标一次）零变化。
- **未覆盖**：`solidify` / `propose` 的同款 `find` 筛选式不在本件（触发 = 出现真实误用实例）。
- **评审收口**：（待回填）
