# Agent Note: B2 引擎+适配层 TS 化——双模块机械映射、dist 发布形态、js/mjs 权威并存

Status: proposed

Related: [2026-09-06-collab-rebuild-impl](2026-09-06-collab-rebuild-impl.md)（五批立项，本 ADR 为 B2 批实现轮）；[2026-09-08-b1-gates-ts](../../implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md)（B1 双轨先例与对账口径）；[2026-09-06-framework-rebuild-charter](../../implemented/architecture/2026-09-06-framework-rebuild-charter.md)（charter：机器层分批重建、单批切换）

## Problem

立项 ADR B2 行只定范围（engine + adapters → TS；npm 管线 files→tsc dist；蓝图对账 C1 部分/C3/C9/C10），实现细节未立项。2026-09-08 实盘：

- `engine/` 10 件 .js（CommonJS，`type:commonjs` 语义；bin/evaluate/gates/gene/propose/pull/select/selftest/solidify/util；含 selftest 486 行）——立项 ADR「11 件」为 2026-09-06 盘点口径，本批以实盘 10 件为准。
- `adapters/dsh/` 9 件 .mjs（ESM；index/engine-bridge/section/tools/solidify-trigger/config/bank-pull/skill-provider/selftest；含 selftest 630 行）。
- 消费面实锚：`engine-bridge` spawn 单合同指名 `engine/bin.js`；`selftest.mjs` 防火墙扫描 `engine/*.js` 零第三方 require + 包结构契约白名单 needles（`engine/**/*.js` / `adapters/dsh/**/*.mjs`）；`.githooks/pre-push` 与 validate.yml 自测行直跑 `node engine/bin.js self-test` / `node adapters/dsh/selftest.mjs`；package.json `main`/`exports` 指 `adapters/dsh/index.mjs`，`files` 白名单收源码形态。
- node 原生 type stripping 直跑与 tsc 产物的 import 形态冲突：type-stripped 源跑要求显式 `.ts/.mts` 扩展，dist 产物要求发射名 `.js/.mjs` 扩展——两形态不可共存于一份源码，必须钉一边。

## Proposal

**全量 .ts（engine 件）/ .mts（adapters 件）+ tsc 构建产物进 `dist/`；并存期旧 .js/.mjs 保持权威执行面（hooks/CI 自测与 gates cmd 不改指），TS 件以双跑对账自证；npm 发布面本批切 dist（files/main/exports），发布动作仍归 B5（0.2.0）。**

1. **模块映射（机械、保行为）**：engine 源 `.ts`（`type:commonjs` 下 CJS 分类）→ tsc 发射 `.js`（CJS）；adapters 源 `.mts` → tsc 发射 `.mjs`（ESM）。双模块制本批**不统一**：语言统一 ≠ 模块制统一，engine require→import 改写会给 C9 行为恒等添纯风险面，模块制统一不属 C1 判据（落败理由见 Alternatives）。
2. **import 形态（dist 优先）**：engine `.ts` 相对导入用发射名 `.js` 扩展（nodenext 解析回 `.ts`）；adapters `.mts` 用 `.mjs` 扩展（解析回 `.mts`）——与 scripts 族 B1 的 `.mts` 源跑形态（`.mts` 扩展直import）**不同且有意**：scripts 族零构建直跑，engine/adapters 走 dist，源跑不是它们的运行形态。跨件消费带入口守卫（B1 风险面规则，scripts/AGENTS 已立）。
3. **dist 布局**：`tsconfig.build.json`（nodenext、strict + noUncheckedIndexedAccess、rootDir=`.`、outDir=`dist`、零 declaration）→ `dist/engine/*.js` + `dist/adapters/dsh/*.mjs`，相对路径与源一一对应；`npm run build` 脚本 = `tsc -p tsconfig.build.json`。B1 根 tsconfig（noEmit typecheck）include 追加 `engine/**/*.ts` + `adapters/dsh/**/*.mts`，`ts-typecheck` 白名单闸名与条目不变。
4. **npm 发布面本批切换**（C10）：`main`/`exports` → `./dist/adapters/dsh/index.mjs`；`files` 白名单 → `dist/**` + `engine/gates.json`（数据件原地随包）+ 既有文档/许可面。发布链路零 tsx（C3）；消费者不背工具链。不发版——`noogenesis@0.2.0` 归 B5，批间若需 0.1.4 出包（HANDOFF-todos C 条）随批走 dist 即 C10 正形。
5. **运行形态分层**：并存期 hooks/CI 权威自测仍跑旧源（pre-push `node engine/bin.js self-test` / `node adapters/dsh/selftest.mjs` 不动）；TS 面以 dist 实证——CI 加 `npm run build` 步 + `node dist/engine/bin.js self-test` / `node dist/adapters/dsh/selftest.mjs` 两行（与 B1「py 权威列 + TS 列」双列同构；B5 清旧行）。钩子不加 build 步：B2–B4 钩子权威面无 dist 依赖，C6 约束归 B3 落地。
6. **双跑对账**：`scripts/reconcile-b2.mts` 临时代件不入门禁（B5 随旧件删除）：engine 五命令的只读子集（self-test / select / propose；solidify/pull 属写与网络面不入对账，solidify 行为由 self-test 沙箱夹具覆盖）+ adapter self-test，逐件 js 源 vs dist 产物同参同 cwd 双跑，对账面 = stdout/stderr 行集合 + 退出码全等（程序名归一）；TS adapter spawn 的是 dist engine——对账连带覆盖桥接面。TS selftest 的防火墙/包结构契约两件判据面 **js 与 .mts 两份同改**（并存期改判据纪律）：防火墙扫描面追加 `.ts` 源（engine 零第三方依赖判据覆盖 TS 源，import 与 require 两种形态都扫），结构契约 needles 改 dist 形态。
7. **协议与资产零改动**（C9）：gates.json 条目集与门禁名不变（cmd 重指归 B5）；6 基因 + 事件轨文件 diff 零；engine CLI 合同面（五命令 + self-test、退出码三档、stdout 前缀）逐字节不变；genes/events/gates.json 原地不动。**build 资产面**：tsc 不拷贝非 TS 资产，而 evaluate/solidify 经 `ENGINE_ROOT=__dirname` 读 `engine/gates.json`——build 脚本 = tsc + `dist/engine/gates.json` 拷贝步（发布包内引擎自洽，源文件不动）。**lazy require 形态**：bin.js 命令分支内的惰性 require 在 TS 里保留 `require("./x.js")` 调用（`import x = require` 顶层专属，分支内编译不过）——顶层 require 改 ESM import（发射为顶部 require，时序等价）。

## Alternatives considered

- **engine/adapters 同批切 TS 权威（js 即批删除）**：落败——立项 ADR 批纪律（用户拍板）明定并存期旧机器件权威、B5 单批切换；提前切让 B2 独背 20 件行为面风险，且破「单批切换」收敛点。
- **engine 一并 ESM 化（统一模块制）**：落败——require→import 全改写给 C9 行为恒等添无对账收益的风险面；C1 判据只要求「源码无 .js 残留（dist 除外）」，不要求模块制统一；两模块制是既有事实，机械映射零语义漂移。
- **TS 源以 type stripping 直跑（不建 dist）**：落败——`.js` 发射名 import 在直跑下无目标文件，源跑须换 `.ts` 扩展 import，与 dist 产物形态互斥；且 C2/C10 要求 dist 是发布与钩子形态，源跑形态维持两套是徒增规则。
- **npm files 切换推迟到 B5**：落败——C10 是 B2 对账行；files 切换只影响发布时形态，批间 0.1.4 出包随批走 dist 正是 C10 落地验证，推迟只把切换压力堆回 B5。

## Consequences

- **采用面**：engine 10 件 .ts + adapters 9 件 .mts + `tsconfig.build.json` + `npm run build` + 根 tsconfig include 扩展 + package.json（files/main/exports/build 脚本）+ validate.yml（build 步 + TS 双列）+ `scripts/reconcile-b2.mts` 临时代件 + selftest 判据面双份同改（js 与 .mts）。
- **风险面**：TS strict + noUncheckedIndexedAccess 对 10+9 件的类型收紧可能暴露隐性 bug——暴露即修并记 journal，不改行为；双模块 import 形态两套并存（scripts `.mts` 直跑 vs engine/adapters dist 形态）——scripts/AGENTS 补一行分野说明防新件走错形态；dist 入 git 与否随 B3 钩子需要再钉（本批 dist 为构建产物不入 git，CI 每次现建）。
- **对账口径**：允许差异 = 程序名归一（spawn/报错文案中 `engine/bin.js` vs `dist/engine/bin.js` 路径段）；除此之外逐字节全等。C9 每批核：`git diff genes/ events/` 为零 + engine/adapter self-test（权威面与 TS 面双双绿）。

## Acceptance criteria

- engine 10 件 + adapters 9 件 TS 化落地，`tsc --noEmit`（全仓含新 include）零错，`npm run build` 产物 `dist/` 自证。
- 双跑对账零 diff（reconcile-b2）+ 权威面自测绿（pre-push 同面）+ TS 面自测绿（dist）。
- C9：6 基因 + 事件轨 + gates.json 条目集零 diff；C1 部分（engine/adapters 源无 .js 残留——并存期旧 js 权威保留，残留清账归 B5）/C3/C10 对账转绿。
- FULL 三审采纳后转 implemented；journal 月卷落「本批按蓝图判据」标注。
