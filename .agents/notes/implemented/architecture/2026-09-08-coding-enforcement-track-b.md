# Agent Note: 轨道 B——宿主 API 类型契约 + 发布面不变量门禁（B-3 判死 / B-4 测量延后）

Status: implemented

Related: 实施计划 [coding-enforcement-impl-plan](../../../../docs/research/coding-enforcement-impl-plan.md)（批 2 = B-1/B-2 + B-3/B-4 定夺）；批 1 [2026-09-08-lint-in-loop-feedback](2026-09-08-lint-in-loop-feedback.md)；防火墙与允许集单源 [adapters/AGENTS.md](../../../../adapters/AGENTS.md) + [2026-09-06-m2-adapter-wiring](2026-09-06-m2-adapter-wiring.md) / [2026-09-08-b4-mount-wiring](2026-09-08-b4-mount-wiring.md)；门禁清单单源 [engine/gates.json](../../../../engine/gates.json)；判据面 [2026-09-08-c2-lint-enforcement](2026-09-08-c2-lint-enforcement.md)

## Problem

- 轨道 B 的两笔账（实施计划 §0）：**宿主 API 签名无类型级核对**——适配层对 `@deepseek-ai/*` 的依赖只靠运行期冒烟与人工读源，上游漂移（事件键改名、决策字段搬家、工厂入参变形）在本地不红；**发布面不变量无门禁**——`main`/`exports`/`files` 与 dist 实存件的一致性靠发版前人工核对（0.1.0→0.2.2 每次发布各查一遍）。
- 类型探针实测（2026-09-08，`tsc` 单文件，n=1【探索性】）：计划断言面除一处外全部成立——`Events` 六键、`ToolExecution.arguments` 键、`PostToolDecision.additionalContexts`、`PreToolDecision` 三判别式、`defineTool` 返回 `ToolDefinition`、`createUserMessage` 入参形状；**唯一不成立** = `ToolExecution extends ToolExecLike`：宿主把 `arguments` 定为 `unknown`，本层窄类型声称 `Record<string, unknown>`（不实收窄）。
- B-3 镜像比对前提已消失：B5 切换批删 py 权威件 13 件与旧 js 源 19 件，无第二实现可镜像。
- B-4 type-aware lint 为条件批，需实测决定纳入或延后。

## Decision

### D1 宿主 API 类型契约（B-1）：新件 `adapters/dsh/host-api-contract.mts`

- **纯类型件、零运行时代码**：`import type` 全部在发射期擦除，dist 产物为空模块；判据 = `tsc --noEmit`（既有 `ts-typecheck` 闸），不新增门禁脚本、不设 `--self-test`（判据是编译器，同 `ts-typecheck` 先例）。
- 断言面与消费点一一对应，**两组互补、缺一有盲区**：
  - **键存在性**（宿主改名/删键即红）：`Events` 六键；`ToolExecution` 的 `name`/`arguments`/`agent`/`signal`；`ToolExecutionResult` 的 `isError`/`content`；`PostToolDecision.additionalContexts`。
  - **形状相容**（本层窄类型不得窄于宿主形状，宿主放宽/换型即红）：`ToolExecution extends ToolExecLike`、`ToolExecutionResult extends ToolResultLike`。
  - **决策判别式**：`PreToolDecision` 三态、`PostToolDecision` 的 accept/block（`index.mts` 消费面）。
- `defineTool` / `createUserMessage` 不入断言面：真实调用点（`tools.mts` / `index.mts`）由编译器按同一参数类型检查，再断一遍零证伪力（R1 评审 2026-09-08 采纳）。
- 手法 = `type Assert<T extends true> = T` + 具名 `type _X = Assert<…>`；上游漂移即 `tsc` 红。
- **盲区在案**：键存在 + 形状相容两组合起来才覆盖「改名/删键」与「本层过窄」；单靠 assignability 时 `arguments` 改名仍绿（R1/R2 评审实证，本批修复）。

### D2 窄类型收窄修正（D1 抓出的唯一不成立项）

- `mount.mts` 的 `ToolExecLike.arguments` 由 `Record<string, unknown>` 改为 `unknown`——宿主合同即 `unknown`，本层声称对象是不实收窄；读取面（`lint-feedback.mts`）改为先判 `typeof === "object" && !== null` 再取键。行为不变（原 `?.` 对非对象同样得 `undefined`），非对象/缺席 `arguments` 两例已入夹具。

### D3 防火墙：type-only 宿主 import 的显式闭集

- [adapters/AGENTS.md](../../../../adapters/AGENTS.md)「宿主依赖收敛在 index.mts」按**值/类型分野**精确化：**值 import 仅 `index.mts`**；**type-only import** 闭集 = `host-api-contract.mts`（契约断言件）+ `selftest.mts` + `tools.mts`（后两件既有）——三者发射期零宿主依赖。
- adapter selftest 增加**源码面**断言：`adapters/dsh/*.mts` 的 `@deepseek-ai/*` import 必须是 `import type` 且文件在闭集内；**静态 import/export-from、动态 `import()`、`require()` 三形态同扫**（动态与 require 是运行时值耦合，不能靠发射期擦除掩盖）——补上「dist 扫描看不见源码 import」的盲区；dist 面扫描同步扩到三形态（只盖值耦合，type-only 不可见）。
- `@deepseek-ai/cordis`（`Events` 接口的家，上游 `@deepseek-ai/*` 家族内）加入 devDependencies（type-only；显式钉版，不吃传递依赖的 hoisting 结果）；`peerDependencies` 不变（dsh-tools + dsh-llm）。

### D4 发布面不变量门禁（B-2）：新件 `scripts/verify-package-invariants.mts`

- 判据五组（实施计划 §B-2）：① `main`/`exports` 指针实存（**递归收集 exports 树的全部字符串目标**——裸字符串 / 条件对象 / 嵌套条件都受检）；② `files` 覆盖 `main`/`exports` 全部路径（`package.json` 由 npm 恒附带，豁免）且显式收录契约件（`engine/gates.json`、两 README、`cordis.patch.yml`、`README.md`、`LICENSE`、`THIRD-PARTY-NOTICES.md`）；③ dist 关键件实存（适配层入口 / 引擎 CLI / 门禁清单）；④ `engines.node` 在场、`dsh.bundle.patch` 指向实存件、`peerDependencies` 的 dsh-tools + dsh-llm 在场；⑤ `files` 不收录 `src/` / `tests/` / `.cache/`。
- `--self-test` **15 夹具**：合规基线（真实 `package.json` + 全实存件）与 exports 条件对象形态必 PASS；缺 dist 件 / `files` 漏契约件 / `files` 未覆盖 main / `exports` 悬空（字符串与裸字符串两形态）/ `src` 入白名单（带斜杠与裸目录名两形态）/ `engines` 缺失 / `bundle.patch` 悬空 / peer 缺失各必 FAIL；另三例钉 fail-closed 三档（缺 package.json / 缺 dist / package.json 坏 JSON 各 exit 2）。
- 接线：`engine/gates.json`（15→16 条）+ `lefthook.yml` pre-commit（`glob: package.json`）+ CI self-test 行。缺 `dist/` → fail-closed exit 2。
- **权威面 = CI**（先 `npm run build` 再跑）；pre-push 只检查 dist 存在、不重建——实施计划 §B-2 的「pre-push 已建 dist」与实况不符，本地可能校验陈旧 dist（勘误在案）。

### D5 B-3 镜像比对：判死

- 前提消失（无第二实现可镜像），关闭；理由即本节。

### D6 B-4 type-aware lint：测量后延后

- 测量（2026-09-08，`oxlint-tsgolint@7.0.2001` + oxlint 1.82.0，本机）：**规则命中 = n=1 单跑**（【探索性】）——目标四规则命中 = `no-floating-promises` 0 / `no-misused-promises` 0 / `await-thenable` 0 / `no-unnecessary-condition` 1（`scripts/verify-archived-agent-notes.mts:150` 的形状校验冗余分支，非 async 缺陷）。
- 副作用：`--type-aware` 把既有 `typescript/no-unnecessary-type-assertion` 升级为语义版，多报 11 条；其中 `engine/bin.ts:122`、`adapters/dsh/selftest.mts:865` 的断言在 `noUncheckedIndexedAccess` 下必要（【推断 · 未证】：tsgolint 未应用该编译选项）。
- 墙钟（n=5，【探索性】）：全仓 baseline 93–116ms vs type-aware 358–420ms（~3.7×）——低于计划成本闸（>1s 降级），但按计划判据「零真实 async 缺陷 → 证据延后（HERO）」**不纳入**；触发 = 出现真实 async 失守。

### D7 文档与接线同步

- [code-standards](../../../../docs/method/code-standards.md) §6（B-1/B-2 机器面与 type-aware 延后证据）；`adapters/AGENTS.md`（type-only 闭集）；`scripts/AGENTS.md`（package-invariants 登记纪律）；根 [AGENTS.md](../../../../AGENTS.md) 评审兜底第 4 条；README 结构面核对（无漂移则明记）。

## Alternatives considered

- **只断键存在、不做形状相容断言**：落败——键存在盖不住「本层窄类型与宿主形状不符」的漂移（D2 抓出的正是这类缺陷）；**反过来单做形状相容也盖不住改名/删键**（R1/R2 评审实证：四字段全可选时任何含同名字段的类型都满足 assignability）。两组互补，两者都要。
- **保留 `Record<string, unknown>`、把不实收窄记为待办**：落败——读取面本就要窄化，修正 5 行即可闭合；留待办等于留一个已知的类型谎言。
- **`@deepseek-ai/cordis` 吃传递依赖、不显式声明**：落败——类型解析依赖 hoisting 结果，脆弱；devDependency 显式钉版。
- **package-invariants 用 `npm pack` 实测产物**：落败——打包/解包慢且引入 npm 版本面；JSON/AST 判据已覆盖计划五组不变量。
- **package-invariants 不进 pre-commit（只 CI/pre-push）**：落败——实施计划 §B-2 明列 pre-commit job；`glob: package.json` 把成本限制在发布面变更的提交上。
- **type-aware lint 纳入白名单**：落败——零 async 缺陷 + 11 条 `noUncheckedIndexedAccess` 语境下的误报；HERO-O（不为想象失败面投资）。
- **镜像比对留空实现占位**：落败——无第二实现即无判据，占位闸是死代码。

## Consequences

- 宿主合同漂移从「运行期冒烟才发现」提前到「`tsc` 即红」；`arguments` 不实收窄修正为 `unknown` + 显式窄化。
- 防火墙语义精确化：值/类型 import 分野机器断言，源码面补上 dist 扫描的盲区；devDependency +1（cordis，type-only）。
- 发布面不变量入 `engine/gates.json`（15→16 条）：`main`/`exports` 悬空、`files` 漏项、dist 缺件、白名单外目录四类发布事故在 CI 前置拦下；本地 pre-push 受陈旧 dist 限制（权威面 CI）。
- **gates.json 双用面**：它既是门禁清单，也是基因 `evaluate` 的全集门槛（`engine/evaluate.ts` 逐条跑）——新闸随之进入每次 `noo_evaluate`，故 `package-invariants` 要求评估仓有 `dist/`（本仓自举恒满足；消费仓 evaluate 本已因仓内规则闸失败，无新增退化）。
- 发布面实证（2026-09-08，0.2.2 树）：`npm pack --dry-run` 列 32 件——dist 全件 + `engine/gates.json` + `engine/README.md` + `adapters/dsh/README.md` + `cordis.patch.yml` + `README(.zh).md` + `LICENSE` + `THIRD-PARTY-NOTICES.md`，零 `src/`/`tests/`/`.cache`；`host-api-contract.mjs` = 11B 空模块（type-only 擦除实证）。
- type-aware lint 以证据延后（零 async 缺陷 + 11 条误报 + 墙钟 ~3.7×），触发条件在案。
- 镜像比对判死，零新增代码。
- 评审收口（2026-09-08 FULL 三审）：R1/R2 共指 **B1 = 形状断言钉不住键名**（补键存在性断言 + 改口径 + 修 Alternatives）；R1-B2 = 判据 4 与多条分支零违约夹具（夹具 5→15，含 fail-closed 三档）；R2-B2 = 防火墙漏动态 `import()` / `export-from`（三形态同扫）；R2-S1 = exports 只认字符串/`{default}`（改递归收集）；R2-S2 = 坏 JSON 抛栈非 fail-closed（改 exit 2）；R2-S4 = `adapters/AGENTS.md` 允许集口径自相矛盾（值/类型分野改写）；R1-S1/S2 = `defineTool`/`createUserMessage` 断言零证伪力（删）；R2-S5 = 收窄分支缺非对象/缺席夹具（补）；R2-S3 = fail-closed 无回归夹具（补）。未采纳：R1-S4（门禁与 selftest 镜像同一事实——跨层运行形态不同，不可共 import，边界代价）、R1-S5（源码面值半区与 dist 面重复——源码面给出文件名级定位，保留）。
