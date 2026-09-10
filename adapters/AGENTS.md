# adapters/ — 宿主适配层

> 全局纪律见根 [AGENTS.md](../AGENTS.md)。拍板与防火墙单源：[adapters/dsh/README.md](dsh/README.md) + ADR 2026-09-06-m2-adapter-wiring / adapter-deploy-hardening / 2026-09-08-b4-mount-wiring（挂载面与允许集扩集拍板；README 头部链接）。本件只写动本目录会踩的具体失败。

- **依赖方向单向，只过合同面**：只能 spawn `node <包根>/dist/engine/bin.js <命令>`，**禁止 import 引擎模块**；引擎不 import 本层。引入 `@deepseek-ai/*` 之外的任何宿主依赖 = 违防火墙；`@deepseek-ai/*` 的**值**允许集封底 = dsh-tools + dsh-llm 两件（selftest 机器断言 `index.*` 值面，扩集须同变更拍板）；type-only 闭集见下行。
- **宿主依赖收敛在 `index.mts`（值/类型分野）**：**值 import** 仅 `index.mts`（`@deepseek-ai/dsh-tools` + `dsh-llm`）；**type-only import** 闭集 = `host-api-contract.mts`（宿主合同断言件，含 cordis 的 `Events`）+ `selftest.mts` + `tools.mts`——三者发射期零宿主依赖；其余模块必须零宿主依赖、可脱离 DSH 自测。selftest 机器断言该闭集（源码面静态/动态/require 三形态同扫；dist 面只盖值耦合，type-only 发射期不可见）。
- **每宿主一个薄目录** `adapters/<host>/`，互不渗透（P4 多 harness 留位）；DSH 特有面不得越出 `adapters/dsh/`。
- **改接线必跑防火墙自测**：`node dist/adapters/dsh/selftest.mjs`（`npm run build` 后；含 import 面机器检查）；漏跑 = 耦合回归直接进 main。
- **userQuestions 不进 `inject` 声明**（cordis 缺席注入服务会推迟整个插件装载，降级不可达）——disposal 时懒取用；新增注入面前先核此教训。
- **A4 在环拦回（轨道 A + 升格 + 注释面扩面）**：两判据件在 write/edit 成功后同步跑——`lint-feedback.mts` 跑仓根 oxlint、`export-docs-feedback.mts` 跑仓内判据件 `scripts/verify-export-docs.mts <file>`（仓内脚本面纪律：固定名 + 数组直传 + 超时 + 只读）——机器可判违规 `block` 拦回（工具结果被替换为纠正消息，须修正才能继续）；同文件连续拦回达上限降级 `context` 防死锁、干净写码复位；一切不适用/失败面静默降级（每会话至多一条 warn），**降级面绝不变成写码阻断**——超时、条数上限与降级清单单源 = [ADR 2026-09-08-lint-in-loop-feedback](../.agents/notes/implemented/architecture/2026-09-08-lint-in-loop-feedback.md) + [升格批 2026-09-09-lint-block-and-staged-hook](../.agents/notes/implemented/architecture/2026-09-09-lint-block-and-staged-hook.md) + [扩面批 2026-09-10-export-docs-inloop](../.agents/notes/implemented/architecture/2026-09-10-export-docs-inloop.md) + 各件常量。
- `repoRoot` 四级回退链、工具退出码映射（exit 1 + 空 stdout = 引擎故障须抛错）是已拍板语义，改动先立 ADR。
