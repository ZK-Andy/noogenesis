# 架构规范（architecture-standards）

> Provenance：自建（2026-09-10，立项 ADR [2026-09-10-architecture-standards-charter](../../.agents/notes/implemented/architecture/2026-09-10-architecture-standards-charter.md)）；基准 = 蒸馏权威与上游实证——Google TS Style Guide 组织面、TS Handbook（模块语义 / Project References 编译边界）、Node ESM package exports 发布面契约、dotnet-deepseek-harness-desktop `architecture-standards.md` 体裁（MIT，提炼后搬迁）——采纳原理，不搬分项目模板。本仓形状 = 单仓三族（engine/adapters/scripts）+ docs 面与门禁面。
> 现状地图不另立文件：仓库结构单源 = [README](../../README.md)「Structure」节；本篇只写「怎么被组织」（规范与现状分离，[standard-authoring](standard-authoring.md) §2）。子树专属失败各有家（[engine](../../engine/AGENTS.md)/[adapters](../../adapters/AGENTS.md)/[scripts](../../scripts/AGENTS.md) 三件 AGENTS.md），本篇写跨树通则与方向图，不重抄。档位 `[M]`/`[W]`/`[I]`/`[R]` 定义单源 = [standard-authoring](standard-authoring.md) §1。

## 1. 强制力度分档

本篇机器可判面随既有闸落 `[M]`（防火墙 selftest / lint 白名单 / export-docs / package-invariants / ts-typecheck / pre-push e2e——判据单源见各条），不新增闸；意图与完整性语义面留 `[R]`，兜底 = 根 [AGENTS.md](../../AGENTS.md)「评审检查项」第 3 条。候选闸全部不立，触发条件与判不立证据集中在 §4。

## 2. 关键约定

### 2.1 分层与依赖方向

- **R1a `[M]` 宿主依赖允许集封闭**：适配层对宿主（`@deepseek-ai/*`）的依赖封闭——值 import 仅收口 index.mts、type-only import 闭集三件、其余模块零宿主依赖；机器面 = adapters 防火墙 selftest（宿主前缀静态 import / 动态 `import()` / `require()` 三形态扫描 + 值闭集与 type-only 闭集断言），同闸并断言 `engine/*.ts` 零第三方 import/require（相对与内建豁免）。判别式：允许集外出现宿主依赖、或 engine 源出现第三方包 = 违反。允许集成员与扩集拍板单源 = [adapters/AGENTS.md](../../adapters/AGENTS.md)。
- **R1b `[R]` 三族相对 import 互斥**：`engine/`、`adapters/`、`scripts/` 三族源文件之间零相对 import；跨族消费只走各自合同面——适配层 → 引擎 = 仅 spawn `node <包根>/dist/engine/bin.js <命令>`，门禁消费引擎走 `engine/gates.json` 数据件（白名单），scripts 族独立（族内共享件如 `mdref.mts` 同族互 import）。判别式：任一源文件的相对 import 解析落到另一族目录 = 违反。停档理由：判据机械可判，但防火墙 selftest 的真实判据 = 宿主允许集（R1a），不扫跨族相对 import——三族穷尽闸未立（C15 HERO 判据：无失败案例不预立）；实测基线（2026-09-10：环 = 0、跨族边 = 0）单源见 §4。触发 = §4「层方向 lint」。族内新件归族判据有家：[scripts/AGENTS.md](../../scripts/AGENTS.md)「新件先归族再选形态」。
- **R2 `[R]` 新目录准入四问**：新增顶层目录（或族）前必须四问齐答——①归属（代码三族 / docs 面 / 门禁面 / 数据面 / 过程资产）；②合同面（消费者接口：CLI、exports、白名单、事件、schema）；③依赖方向允许集（import 谁、被谁 import、只过什么合同）；④机器面（哪个闸盖它，无闸则登记触发条件）。答不全 = 先立 ADR 再建目录。判别式：新目录无四问答案即违反。停档理由：目录意图与合同归属是语义判断，机器不可判。

### 2.2 TS 模块与导出面

- **R3 `[M]` type-only 分野**：type-only 引用必须 `import type` / `export type`，且 type-only import 不携带运行时副作用——lint `typescript/consistent-type-imports` + `typescript/no-import-type-side-effects`（[.oxlintrc.json](../../.oxlintrc.json)）；adapters 族 type-only 宿主依赖闭集由防火墙 selftest 机器断言（闭集单源 = [adapters/AGENTS.md](../../adapters/AGENTS.md)）。判别式：类型引用未带 type 修饰、或闭集件出现值耦合 = 违反。
- **R4 `[M]`（namespace）/ `[R]`（顶层 require）**：禁 `namespace`（lint `typescript/no-namespace`）；禁模块顶层运行时 `require`（跨模块消费走 ES import）。require 子句停 `[R]` 理由：判别式字面可判，但 lint 白名单无对应规则（无失败类不预立），真实第三方 require 出现即触发白名单评估。判别式：`namespace` 声明、模块顶层 `require` = 违反。
- **R5 `[R]` named-only 导出**：零 `export default`，显式 named 导出，导出即公共契约。判别式：源码出现 default 导出 = 违反。停档理由：判别式字面可判，但 lint 白名单无 default 禁用规则且现状零真实 default 导出（2026-09-10 实测：population = §4 节首 n=46 的主链三族源码，grep 字面全扫，唯一命中 = export-docs 违约夹具字符串，非导出声明）——无失败类预立禁令 = speculative（C2 白名单 HERO 判据）；export-docs 已拒无契约注释的默认导出函数（部分机器面），真实 default 导出出现即触发白名单评估。导出函数/类的契约注释存在性 `[M]` 判据单源 = [code-standards](code-standards.md) §2.1，不重抄。

### 2.3 运行形态与发布面

- **R6 `[M]` 两族运行形态分野**：scripts 族 `.mts` 源跑，engine/adapters 族 tsc 构建跑（dist）。判别式：scripts 内无扩展或 `.js` 扩展的相对 import、engine/adapters 内源名相对 import = 违反；机器面 = ts-typecheck（nodenext 解析失败即 FAIL）+ build + 双族自测。差异缘由与拍板单源 = [scripts/AGENTS.md](../../scripts/AGENTS.md)「TS 两族 import 形态分野」+ B2 ADR。
- **R7 `[M]` 发布面白名单单源**：消费入口、文件集、`main`/`exports` 的单一事实源 = 根 package.json（`exports` = `.` 与 `./package.json` 两入口；`files` 封闭清单）。机器面 = package-invariants 闸（缺 dist fail-closed）。判别式：白名单外路径被消费者引用 = 违反。发布面变更 = 跨边界契约（[review.md](review.md) §1）→ FULL。
- **R8 `[M]` 钩子编排只走 node 直跑**：判别式：钩子编排出现 tsx 或独立转译步骤 = 违反；重型自测消费预构建 dist（先 `npm run build`）；机器面 = pre-push-selftest 四态 e2e（改循环语义必过）。单源 = [scripts/AGENTS.md](../../scripts/AGENTS.md) 钩子面条目。

### 2.4 blast-radius 影响面识别（通则）

- **R9 `[R]` 改动前过四类影响面清单**，每触碰的单源家带同变更义务：

| 面 | 触碰判据 | 同变更义务 | 机器面 |
|---|---|---|---|
| 合同面 | 消费者可见接口：CLI 参数/退出码、gates.json 白名单名、package exports/files、宿主事件 payload、基因 schema 字段 | 契约文档同步（engine/adapters README、拍板 ADR）；跨边界契约 → FULL 定档 | 各族 selftest/e2e；review-tier 机械触发 |
| 机器面 | verify-* 判据、夹具、gates.json 登记、lefthook 编排 | 判据与夹具同批改；新闸登记 gates.json | gates.mts DAG + 各闸 --self-test |
| 数据面 | genes/ 闭 schema、events/ 封闭 kind 集、manifest.json 生成物 | 生成物走生成器禁手改；schema 改动先协议 ADR | verify-manifest、verify-gene-format |
| 散文面 | 入站链接、字数预算、子树 AGENTS、README 收尾核对 | 移动原子改（删老家 + 改每个入站链接）；预算超限处理序（[doc-standards](doc-standards.md) §5）；README 收尾核对程序家 = [session-close](../../.agents/workflows/session-close.md) 步骤 5 | verify-md-links、verify-doc-budgets |

- 判别式：变更无法回答「触碰了哪几类面、各自义务是否清账」= 影响面识别未做。停档理由：完整性是语义判断；右列机器可判子集已各自成闸，diff 范围界定工具 = `scripts/change-scope.mts`（Git 纪律单源 = 根 [AGENTS.md](../../AGENTS.md)）。
- 定档判据（FULL/LIGHT）单源 = [review.md](review.md) §1，互链不重抄；路径机械子集 = `verify-review-tier` 的 FULL_TRIGGERS。

## 3. 行为契约：边界与失败传导

- **通则 `[R]`：跨边界失败传导只有两态**——fail-loud（抛错，或 fail-closed 拒跑/退出码拒绝服务——调用方必须感知，绝不当无失败放行）或显式降级（catch → 降级 + warn 留痕 + 缺席/透传，绝不无痕吞、绝不把降级面变成阻断）。判别式：新增跨边界调用无法回答「失败时调用方拿到什么」= 契约未定义。停档理由：失败态归类需语义判断。
- 已拍板语义各有家，指针不重抄：

| 边界 | 家 |
|---|---|
| 适配层 → 引擎 spawn（退出码三档、失败映射、repoRoot 四级回退链） | [adapters/AGENTS.md](../../adapters/AGENTS.md) |
| 写码在环判据（lint + 注释面：block 拦回 / 连续拦回降级 / 降级清单 / 仓内判据件执行面四条纪律） | [lint-in-loop ADR](../../.agents/notes/implemented/architecture/2026-09-08-lint-in-loop-feedback.md) + [升格批 ADR](../../.agents/notes/implemented/architecture/2026-09-09-lint-block-and-staged-hook.md) + [扩面批 ADR](../../.agents/notes/implemented/architecture/2026-09-10-export-docs-inloop.md) |
| 挂载六点 A2–A6（异常 catch → 降级不阻塞会话） | [B4 ADR](../../.agents/notes/implemented/architecture/2026-09-08-b4-mount-wiring.md) |
| 引擎命令与评审门禁（git 不可解析 = fail-closed） | [engine/README.md](../../engine/README.md)、[verify-review-tier 头注](../../scripts/verify-review-tier.mts) |

- async/生命周期行为契约细则不在本篇（触发 = 真实需要时另立，charter Consequences）。

## 4. 健康闸（触发条件集；全部不立闸）

> 立闸判据 = HERO（检测出什么具体的失败？真出现了下一步做什么不同的事？）；候选按 C15 先例（[B4 ADR Decision 6](../../.agents/notes/implemented/architecture/2026-09-08-b4-mount-wiring.md)）评估，不过者理由与数据在案。测量口径：population = 主链三族全部 TS 源文件（engine/*.ts + adapters/dsh/*.mts + scripts/**/*.mts，排除 dist/node_modules/缓存）；环/边数字实测方法 = 相对 import 静态建图（`.js`/`.mjs` 发射名 → 源名映射）+ DFS 环检测（一次性脚本，2026-09-10，n=46）。

- **上帝类闸（单文件行数/依赖扇出上限）——判不立**：实测分布（2026-09-08，B4 ADR 在案；population = 当时全仓源码 .ts/.mts，n=38：行数 p50=152 / p90=516 / max=1158；扇出 max=15）无自然拐点、零失控件。**行数不是失控的度量——职责 = 一句话可述；大体积的合法来源 = 夹具同件纪律与 py 对齐原语单源（pypara）**。真失控信号判别式 = 一句话说不清职责 / 改写困难 / 评审反复抓同一件（三有其一才触发本条评估）。触发 = 真实失控件出现 → 以届时 max × 1.5 为候选阈值再过判据。
- **import 环检测闸——判不立**：实测（2026-09-10，口径见节首）：81 条相对 import 边，环 = 0、跨族边 = 0、全部可解析——无实证对象，立闸 = 防 speculative。触发 = 真实 import 环出现 → 立环检测闸（本批实测脚本面复用）。
- **层方向 lint——未立**：机器面现状 = adapters 宿主允许集闭集（R1a）；跨族互斥无闸（R1b）。触发 = 家族间违规 import 真实出现（R1b 判据命中）→ 评估穷尽三族的层方向 lint 候选。
- **project references 拆分——不现在做**：现状单 tsconfig 对（`tsconfig.json` noEmit 全仓 + `tsconfig.build.json` 发射面）健康。触发 = 构建/类型检查墙钟实测恶化到阻塞日常迭代 → 按 TS Handbook Project References 评估拆分。
- **文件名契约闸（禁构建产物/缓存入库）——判不立**：全历史 `--diff-filter=A` 零产物入库 + `.gitignore`/CI/评审三层已盖（C15）。触发 = 真实产物入库发生 → 翻案再立。
