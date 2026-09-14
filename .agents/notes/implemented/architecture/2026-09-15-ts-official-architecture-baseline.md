# Agent Note: 架构基准——TS 官方编译器架构对照（三处差异裁决 / 第二基线读数 / 一处判不立）

Status: implemented
Review: FULL/2026-09-15/pending（三重审核进行中，收口时回填真实结论）

Related: 架构规范 [architecture-standards](../../../../docs/method/architecture-standards.md) · 规范立项 [2026-09-10-architecture-standards-charter](2026-09-10-architecture-standards-charter.md) · 适配层单合同 [2026-09-06-m2-adapter-wiring](2026-09-06-m2-adapter-wiring.md) · 部署收口 [2026-09-06-adapter-deploy-hardening](2026-09-06-adapter-deploy-hardening.md) · 两族运行形态 [2026-09-08-b2-engine-adapter-ts](2026-09-08-b2-engine-adapter-ts.md) · select stdout 合同 [2026-09-11-memory-line-phase1-observation-face](2026-09-11-memory-line-phase1-observation-face.md) · 十命令面 [2026-09-14-evolve-command-surface](2026-09-14-evolve-command-surface.md)

## Problem

2026-09-15 讨论轮以 TS 官方架构文档为基准对本仓做了一次架构对照。基准出处：[Architectural Overview（wiki）](https://github.com/microsoft/TypeScript/wiki/Architectural-Overview)、[Compiler Notes](https://github.com/microsoft/TypeScript-Compiler-Notes)（`intro/README.md`）、[Coding guidelines](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines)、[Design Goals](https://github.com/microsoft/TypeScript/wiki/TypeScript-Design-Goals)。

本仓的「基准蒸馏」已是既定方法（charter Decision 2），但基准覆盖面只到 TS 的**组织面与模块语义**（Google TS Style Guide + TS Handbook + Node ESM + desktop 体裁）——**官方编译器架构本身**（单仓多入口 / 分层方向 / 组件粒度 / 构建边界）零对照记录。缺这一面有两个具体代价：

1. 本仓三处与 TS 官方架构的有意差异没有家：未来贡献者按 TS 形态「对齐」（拆 project references、把自测件移出发布面、给引擎加 `bin`），会被当成修复而非改设计。
2. [architecture-standards](../../../../docs/method/architecture-standards.md) §4 的两条判不立（上帝类闸 / import 环检测闸）只有单一样本（2026-09-10，n=46），缺第二个可复算读数与上游先例。

## Decision

### 1. 基准面扩展：TS 官方编译器架构进入架构评审的参照集

六条可判定原则（出处见 Problem；分层名取自 wiki Layer Overview 图与 compiler-notes 目录结构）：

1. **单仓 → 多入口产物**：`typescript.js`（API `import * as ts`）/ `tsc.js`（CLI）/ `typescriptServices.js` / `tsserver.js`，三入口 = API / CLI / tsserver；
2. **分层单向**：core → compiler → services → server，上层依赖下层；
3. **组件粒度**：1 file per logical component；共享件收敛（`types.ts`）；导出面最小化；组件外对象不可变；
4. **行数不是失控判据**：`checker.ts` ≈ 4 万行，guideline 明写 "Do not add new files :)"；
5. **阶段可缺席**：type check 可选、checker 惰性求值；
6. **构建边界按需拆**：project references 是手段不是信条；non-goal = 不提供端到端构建流水线，改为让外部工具消费编译器。

**对照结论：六条无一条被实质违背**；第 2 条本仓更强——`adapters` → `engine` 是进程边界（spawn CLI + stdout 文本 + 退出码三档）而非 import 约定，编译期不可能反向依赖，且 R1a 有防火墙断言。

### 2. 实测基线（第二样本，可复算）

口径 = 相对 import 静态建图（三族全部 TS 源：`engine/**/*.ts` + `adapters/**/*.mts` + `scripts/**/*.mts`；排除 dist / node_modules / `.noogenesis` 缓存）+ DFS 环检测，同一脚本一次跑出。

- 2026-09-10（charter 实施批）：n=46 源文件 / 81 相对 import 边 / 环 0 / 跨族 0；
- **2026-09-15（本轮，HEAD `81d7013`）：n=64 / 146 边 / 环 0 / 跨族 0 / 未解析 0**。规模：engine 15 件 2,959 行、adapters 20 件 4,853 行（dsh 17 + hermes 3）、scripts 29 件 10,317 行。
- 宿主依赖面实测同 R1a：值 import 仅 `adapters/dsh/index.mts`（`dsh-tools` + `dsh-llm`）；`engine/` 只有 node 内建（`fs` / `path` / `crypto` / `child_process` / `os`）。
- **【探索性】：基线样本 n=2**，不作趋势判断；两个样本同向支持 §4「import 环检测闸 / 层方向 lint 判不立」维持不立。

### 3. 三处有意差异逐条裁决（各带触发）

- **a. 引擎 CLI 无 `bin` 面，只被适配层以包内相对路径 spawn**——维持现状。消费者 = 适配层（`ENGINE_ENTRY` 自锚定）；自托管仓按 `engine/README.md` 直跑 `node dist/engine/bin.js`。TS 的 `tsc` 是发布面一等公民，是因为它有仓外 CLI 消费者；本仓没有。**触发**：出现仓外或第三宿主的 CLI 消费者，或引擎需脱离 DSH 独立安装。
- **b. 两个 `selftest` 随 `dist/` 进发布面**——维持现状。engine 侧是设计（README 让自托管用户跑 `node dist/engine/bin.js self-test`，自测即可复算证据面）；adapters 侧 selftest 的消费者是仓内开发者与 pre-push / CI。**触发**：包体积或消费者困惑成为具名问题（届时评估 build 侧排除面，先核 dist 自锚定路径的耦合）。
- **c. 两族 import 形态分野（`.mts` 源跑 / `.ts` dist 跑）不适配此基准**——TS 官方必须先编译，没有 node ≥22.18 原生 type stripping 的分野；本仓分野由「门禁零运行时依赖 + 发布面走 dist」两条本地约束推出，R6 已落 `[M]`。**基准的适用边界在此，禁止拿 TS 形态反推。**

### 4. 判不立：适配层 stdout 解析面不构成「双份金样」纪律缺口

- **解析面清单**：适配层唯一的 stdout 解析器 = `hitsSectionText`（吃 select 输出）；`commands.mts` 的 `list` / `verify` 面只 `trimEnd()` 透传，`tools.mts` 三工具原样回显——无第二个解析器。
- **关联断言在场**：该解析器依赖的两个形态（`(no genes matched)`、`<domain>/<id>  <summary>`）由 `adapters/dsh/selftest.mts` 第 1 组**实跑真实 `dist/engine/bin.js`** 逐条断言，cwd 锚定与信号归一化同组。
- **结论**：两族金样各有消费者与断言面（引擎侧钉自身确定性，适配层侧钉消费形态），「两侧夹具各自绿、生产失配」的通道不存在 → 判不立。
- **触发**：出现第二处 stdout 解析器（新命令被适配层解析而非透传）时，同变更补真实引擎实跑断言。

## Alternatives considered

- **立 `docs/research/` 调研稿承载本次对照**：落败——结论是裁决（三处差异的处置 + 判不立与触发），调研稿是非 durable 结论的家；裁决有家才不会被重做。
- **按 TS 形态「对齐」三处差异**（拆 project references / selftest 移出 dist / 加 `bin`）：落败——三处消费者与触发均未出现（Decision 3）；对齐 = 为不存在的需求加结构，且 project references 已在 §4 判不立。
- **把六条原则写成评审清单 / 评分表**：落败——反过度设计：它约束「怎么看」、不产出可判定读数；评审检查项第 3 条（架构域语义面）已是入口，加表即第二源。
- **只改 architecture-standards §4、不写本笔记**：落败——§4 是规则正文（写当前状态，只放读数与指针），本次对照的 rationale 与否决理由必须落 ADR，否则同一轮对照会被重复做一遍。
- **为跨族文本合同立共享断言 / 纪律件**：落败——适配层唯一解析器的依赖形态已由真实引擎实跑断言覆盖（见 Decision 4），失配通道不存在；触发条件已具名，届时再立。

## Consequences

- **单源与指针**：本笔记 = 对照结论与三处差异裁决的单源；第二基线读数与 TS 上游先例已回填 [architecture-standards](../../../../docs/method/architecture-standards.md) §4（各条指本笔记）。
- **零机器面变更**：无新命令、无 schema / 门禁清单 / 事件键集 / 发布面变更，无新夹具。
- **相邻决策不重开**：charter Decision 2 的基准范围只扩不缩；§4 五条判不立原样维持，本次仅补读数与先例；R1a / R1b / R6 口径不变。
- **强度上限**：本笔记是**评审参照**，不是闸——六条原则不产生机器读数，不排序、不打分、不阻断。
- **勘误通道**：若 TS 官方文档的分层描述被推翻，或本仓出现对六条原则的实质违背，按 [notes/README](../../README.md)「勘误」在 Status 下插 `Erratum: YYYY-MM-DD — …` 行，正文不动。
