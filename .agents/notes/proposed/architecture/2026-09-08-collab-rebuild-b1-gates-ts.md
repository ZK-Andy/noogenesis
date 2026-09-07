# Agent Note: B1 门禁族 TS 化——13 件迁移 + DAG runner + tsc 工具链 + 双跑对账

Status: proposed

Related: [2026-09-06-collab-rebuild-impl](../../proposed/architecture/2026-09-06-collab-rebuild-impl.md)（五批立项，本 ADR 为 B1 批实现轮）；[2026-09-08-b0-framework-structure](../../implemented/architecture/2026-09-08-b0-framework-structure.md)（TS 钉形与最小切片）；蓝图对账单源 [framework-rebuild-blueprint](../../../../docs/research/framework-rebuild-blueprint.md) §2 DAG 蒸馏约束 + C1 部分/C5/C6 基线

## Problem

B0 拍板新门禁直接 TS 并钉形（.mts 显式 ESM、node ≥22.18 原生 type stripping、零 devDependency 直跑），但 B1 未立项实现细节：runner DAG 形态与 gates.json 扩展口径、tsc/tsconfig 落点、双跑对账的判据与形态、共享库命名。2026-09-08 实测机器面：

- 迁移面 13 件 Python（verify-* ×10 + `gates.py` 232 行 + `gen-manifest.py` 75 行 + `mdref.py` 79 行）；TS 已存 2 件（B0 样板）。
- C6 基线：pre-push 等价集（白名单 9 件 + gene-format + engine/adapter self-test）串行墙钟 3.6s【探索性 · n=1 · 本机实测，2026-09-08】。
- 本包 `type:commonjs` 下裸 `.ts` 为 CJS 分类；node 原生直跑实测 `.mts` 之间显式扩展 import 可行（探针 2026-09-08）。
- CI validate.yml 无 npm install 步；仓库无 node_modules / package-lock。

## Proposal

**迁移面 13 件全量 .mts，py 保持权威执行面，TS 件以双跑对账自证；tsconfig + typescript devDependency 就位；runner = `gates.mts` 支持 needs/after DAG。**

1. **共享库命名修正**：`mdref.py` → `scripts/mdref.mts`（立项 ADR「mdref.ts」表述随 B0 钉形修正——`type:commonjs` 下裸 `.ts` 装不下 import，共享模块与直跑件同为 .mts；消费方 `verify-md-links.mts` / `verify-skill-format.mts` 以 `./mdref.mts` 显式扩展 import）。
2. **runner**：`scripts/gates.mts`（沿用 py 单源发射器名——hooks/CI/引擎消费的是「gates」契约面；蓝图 §2 上游名 `run-gates.ts` 为描述性名，不搬）。蒸馏三能力（蓝图 §2）：`needs`（硬依赖，依赖失败则下游 skipped）/ `after`（只排先后不传染失败）/ fail-fast + 有界并行（默认并行度 = min(CPU 数, 8)，`--jobs` 可调含 1=串行）；运行前图校验拒绝重 id / 未知依赖 / 环（fail-closed exit 2）。CLI 同 py：`--list` / `--run` / `--self-test` / `--skip` / `--slot`（槽位替换语义同 py：任意 {{key}}、缺值 fail-closed、--list 缺值以 `<key>` 占位）。
3. **gates.json 扩展**：条目集与门禁名不变，只追加可选 `needs` / `after` 数组字段（py runner 只读 name/cmd/args，未知字段静默忽略——并存期安全，实测于夹具）。本批不布真实边：现清单十二门禁两两无执行依赖，伪造边 = 死代码；边随 B3 钩子并行化按真实依赖追加。调度确定性：无边时按清单序拓扑发射，`--jobs 1` 与 py 行为等价；**发射时序口径修正（实测 2026-09-08）**：py 在重定向（管道/文件）下 print 走块缓冲、`-> name` 行收尾统一 flush，子输出先行；TS 用同步 fd 直写即时落序——父行与子输出的交错时序属各语言缓冲行为，不入对账面；对账面 = `--list` 全等 + `--run` 退出码 + stdout/stderr 行集合全等（程序名归一后）。
4. **tsc 工具链**（charter Decision 3 工具链豁免面，不触 engine 零依赖纪律）：`typescript` devDependency + 根 `tsconfig.json`（strict、noEmit、module/target nodenext×es2023、allowImportingTsExtensions，include `scripts/**/*.mts`——engine/adapters 归 B2）。白名单**追加**条目 `ts-typecheck`（cmd `node node_modules/typescript/bin/tsc --noEmit`，append-only 合规，B0 先例）；CI validate.yml 补 `npm ci` 步（最小增补；CI 面全量更新仍归 B5）。
5. **双跑对账**：`scripts/reconcile-b1.mts` 临时代码不入门禁（B5 随旧件删除）：逐件 py vs TS 以同参同 cwd 双跑，比对 stdout/stderr/exit；对账面 = 仓库实跑 + `--self-test`（程序名差异归一）+ gen-manifest 产物字节比对；runner 对账面 = `--list` 全等 + `--run` 退出码与行集合（父行时序不入账，见点 3）。**存量缺口随批补齐**：py verify-md-links / verify-doc-budgets 无 `--self-test`（违背 scripts/AGENTS 夹具纪律的历史缺口），TS 件补最小夹具组，py 侧不对账（无对照面）；py 保持权威执行面（hooks/CI 不改指向），TS 件以对账自证。
6. **C6 基线回填**：3.6s（见 Problem，n=1 探索性）钉入 journal 月卷与本 ADR；并行化收益对比归 B3。
7. **C15 口径**：候选门禁评估（文件名契约闸 / 上帝类预防闸，各带 HERO 判据答案）归 B4（立项表 B4 行明列）；B1 不越界评估。

## Alternatives considered

- **共享库叫 `mdref.ts`（立项 ADR 原文）**：落败——B0 已钉 .mts 形态且实测裸 `.ts` 为 CJS 分类装不下 import；为共享模块开第二种命名形态徒增规则。
- **runner 另名 `run-gates.ts`（蓝图上游名）**：落败——hooks/CI/引擎消费的清单发射契约单源名是「gates」，改名破指针；蓝图名是上游实现描述，蒸馏能力不搬名字。
- **B1 即把 gates.json cmd 重指 TS**：落败——立项 ADR 批纪律明定并存期 py 权威、B5 单批切换；提前重指让「对账自证」失去对照面。
- **needs/after 边现在就布**：落败——现清单无真实执行依赖；为验证 DAG 而伪造边，图校验自测（夹具环/未知依赖）已覆盖能力面。
- **typecheck 不入门禁（仅本地手工）**：落败——unenforced 工具链是死重；scripts/AGENTS「新门禁必须登记」纪律同样适用于本批新工具链闸。
- **C15 评估提前到 B1**：落败——立项表 B4 行明列评估面；提前 = 越界（feature-flow §2：越界想法记 TODO 不顺手做）。

## Consequences

- **采用面（已落地，2026-09-08）**：13 件 .mts（10 verify-* + gates.mts + gen-manifest.mts + mdref.mts）各带/补齐 `--self-test`；`tsconfig.json` + typescript/@types/node devDependency + package-lock.json（入 git）；gates.json 追加 ts-typecheck；validate.yml 补 npm ci + 自测抽查双列（py 权威列 + TS 列，B5 清 py 行）；scripts/AGENTS.md 双轨现状；reconcile-b1.mts 临时代件。**对账结果：12 件全量对账零 diff（reconcile-b1.mts），runner `--list` 全等 + 9 夹具组自证，全仓 tsc 零错。**
- **对账口径（实测后钉死）**：允许差异 = ① 程序名（argparse usage/error 行 `.py`→`.mts` 及其机械派生：usage 续行缩进列数随名长变化）；② invalid-JSON 协议错误文案中的引擎异常子串（py JSONDecodeError 文案 vs V8 SyntaxError 文案——前缀 `FAIL: <路径>: not valid JSON:` 与退出码一致；py 权威件 B5 删除后该差异随之消失）；③ 未捕获崩溃路径的 traceback 形态（py traceback vs node 未捕获 Error 文本，exit 对齐；仅病理输入可达）。除此之外逐字节全等。
- **合并面**：verify-review-brief.mts 经同族 import 消费 verify-review-tier.mts 的 `export classify`（对齐 py importlib 消费契约，分类单源零副本）；被 import 件的入口分发带守卫（import 不触发 main）。
- **风险面**：CJK 计词与 slugify/链接正则语义漂移——对账零 diff 逐件实证 + 消费方夹具同迁覆盖；tsc 对 type stripping 语法子集的兼容差（如 enum/namespace 禁用面）以「夹具与真实件全量过 tsc」实证；npm 工具链进入 CI 增加 install 步（cache 依赖 registry 可用性）；TS 间跨件 import 依赖入口守卫——新跨件消费忘了守卫会连环执行被 import 件（scripts/AGENTS 已立规则）。
- **验收**：12 件对账零 diff（真实跑 + self-test + 违约夹具双侧抽样）+ runner `--list` 全等 + DAG 夹具自证（needs 跳过 / after 排序 / 重 id / 未知依赖 / 环 exit 2 / fail-fast / 有界并行）+ `tsc --noEmit` 零错 + py 门禁全绿回归（gates.json 加字段与 ts-typecheck 追加后 py --run 不受影响）+ 蓝图对账 C1 部分/C5/C6 基线行落账 + FULL 三审采纳后转 implemented。
