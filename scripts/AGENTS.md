# scripts/ — 门禁与工具

> 全局纪律见根 [AGENTS.md](../AGENTS.md)。门禁清单单源：[engine/gates.json](../engine/gates.json)（`scripts/gates.mts --list` 发射）。本件只写动本目录会踩的具体失败。

- **--self-test 夹具纪律**：每个 verify-* 门禁自带 `--self-test`（违约夹具必须 FAIL、合规夹具必须 PASS）；改判据不同步改夹具 = 判据漂移无人知。hooks/CI 消费同一夹具。
- **新门禁必须登记 `gates.json`**：未登记 = 孤儿门禁，`gates.mts --run` 与 CI 都不执行它；登记条目名即基因 evaluate 的闸名，改名会破白名单消费方。
- **门禁族单轨 TS（B5 起，2026-09-08）**：门禁族全件 = `scripts/*.mts`（node ≥22.18 原生直跑，零运行时依赖；两闸例外见下；`gates.mts` 为含 needs/after DAG 的 TS runner，gates.json cmd 已单源重指）。TS 间跨件消费走同族 import（如 brief → tier 的 `classify`），被 import 件的入口分发必须带守卫。
- **tsc 类型闸**：改任何 .mts 必跑 `node node_modules/typescript/bin/tsc --noEmit`（白名单 `ts-typecheck` 闸，strict + noUncheckedIndexedAccess；单文件自测不带后者，全仓跑为准）。
- **钩子面 lefthook 单源（B3）**：钩子 = `lefthook.yml`（postinstall 自动装钩子，bash 件已退役）。pre-push 编排器 `scripts/pre-push.mts`（tier 循环 TS 端口 + 并行门禁组；dist 自测需先 `npm run build`）；改循环语义必过 `pre-push-selftest.mts` 四态 e2e。v2 pre-push job 按推送文件集门控（tag/新分支全 skip），编排器 job 的 `files: echo lefthook.yml` 恒跑逃生口是 fail-closed 依赖勿删（[B3 ADR](../.agents/notes/implemented/architecture/2026-09-08-b3-hooks-install.md)）。
- **TS 两族 import 形态分野（B2）**：scripts 族 .mts = type stripping **源跑**，相对导入带 `.mts` 扩展；engine/adapters 族 .ts/.mts = tsc 构建 **dist 跑**（`npm run build`），相对导入带发射名 `.js`/`.mjs` 扩展。新件先归族再选形态，混用即两头跑不起来（[B2 ADR](../.agents/notes/implemented/architecture/2026-09-08-b2-engine-adapter-ts.md) §Decision 点 2）。
- **lint / export-docs / package-invariants（C2/B2）**：判据单源 = 根 `.oxlintrc.json` + `verify-export-docs.mts`（导出函数/类须紧邻 JSDoc）+ `verify-package-invariants.mts`（发布面不变量；缺 dist → fail-closed）；改判据即改夹具与 [code-standards](../docs/method/code-standards.md) 档位。
- 范围收窄判据与纪律单源：根 [AGENTS.md](../AGENTS.md)「Git 纪律」（工具 = `scripts/change-scope.mts`）。
- **共享件单源**：`mdref.mts`（链接/锚点）、`pypara.mts`（py 兼容原语，新件不再手搓副本）——消费规则见各件头注；语义改动即改判据、夹具同批核。
- 生成物与校验件成对：`gen-manifest` 产出、`verify-manifest` 校验；改 manifest 格式四件同变更。
