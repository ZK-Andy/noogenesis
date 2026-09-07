# adapters/ — 宿主适配层

> 全局纪律见根 [AGENTS.md](../AGENTS.md)。拍板与防火墙单源：[adapters/dsh/README.md](dsh/README.md) + ADR 2026-09-06-m2-adapter-wiring / adapter-deploy-hardening（README 头部链接）。本件只写动本目录会踩的具体失败。

- **依赖方向单向，只过合同面**：只能 spawn `node <包根>/engine/bin.js <命令>`，**禁止 import 引擎模块**；引擎不 import 本层。引入 `@deepseek-ai/*` 之外任何宿主依赖 = 违防火墙。
- **宿主依赖收敛在 `index.mjs`**：`@deepseek-ai/dsh-tools` 只许在 `index.mjs` import；其余模块必须零宿主依赖、可脱离 DSH 自测。
- **每宿主一个薄目录** `adapters/<host>/`，互不渗透（P4 多 harness 留位）；DSH 特有面不得越出 `adapters/dsh/`。
- **改接线必跑防火墙自测**：`node adapters/dsh/selftest.mjs`（含 import 面机器检查）；漏跑 = 耦合回归直接进 main。
- **userQuestions 不进 `inject` 声明**（cordis 缺席注入服务会推迟整个插件装载，降级不可达）——disposal 时懒取用；新增注入面前先核此教训。
- `repoRoot` 四级回退链、工具退出码映射（exit 1 + 空 stdout = 引擎故障须抛错）是已拍板语义，改动先立 ADR。
