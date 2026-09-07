# scripts/ — 门禁与工具

> 全局纪律见根 [AGENTS.md](../AGENTS.md)。门禁清单单源：[engine/gates.json](../engine/gates.json)（`scripts/gates.py --list` 发射）。本件只写动本目录会踩的具体失败。

- **--self-test 夹具纪律**：每个 verify-* 门禁自带 `--self-test`（违约夹具必须 FAIL、合规夹具必须 PASS）；改判据不同步改夹具 = 判据漂移无人知。hooks/CI 消费同一夹具。
- **新门禁必须登记 `gates.json`**：未登记 = 孤儿门禁，`gates.py --run` 与 CI 都不执行它；登记条目名即基因 evaluate 的闸名，改名会破白名单消费方。
- **新门禁直接 TS**（B0 拍板 2026-09-08）：新增校验件写 `scripts/*.ts`（node ≥22.18 原生 type stripping 直跑，**零 devDependency**，样板 = verify-archived-agent-notes.ts / verify-postmortem-naming.ts）；存量 Python 件只在被触碰时随族迁（B1）。
- **范围收窄走 `scripts/change-scope.sh`**：push 前按 diff 面选最窄检查；禁止默认全量、禁止为掩盖未覆盖文件收窄范围。
- `mdref.py` 是 verify-md-links / verify-skill-format 的共享链接原语库（import 消费，非独立工具）；正则语义改动先看 B1 迁移面（mdref.ts 对账）。
- 生成物（`gen-manifest.py`）与校验件（`verify-manifest.py`）成对：改 manifest 格式两件同变更。
