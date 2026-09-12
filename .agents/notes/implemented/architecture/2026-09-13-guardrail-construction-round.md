# Agent Note: 护栏建设轮立项——token 基线改两轨（字面预算判据 + 宿主读数建议行），改进度量与 canary 判不立

Status: implemented
Review: FULL/2026-09-13/R1=ok R2=ok R3=ok

## Problem

护栏三件（`dsh-token-meter` 真测量层 / 严格改进正向度量 / canary 进程隔离）的归口与触发点原以 [2026-09-06-guardrail-defer-trigger](../../proposed/architecture/2026-09-06-guardrail-defer-trigger.md)（下称延后 ADR）单源。触发点「首个胶囊优化完成」的验收口径已由 [2026-09-10-optimization-round-closure](../../implemented/process/2026-09-10-optimization-round-closure.md) 定义为三条件并兑现，本 ADR 即该触发点到达后的立项讨论轮产出：逐件拍板接入形态与验收口径。

立项前复测三件的真实暴露面（本机实测，2026-09-13）：

- **token 基线面**：`ctx.tokenMeter` 服务在本 profile 在场——`@deepseek-ai/dsh-base` 的 bundle patch 以 `- id: token-meter` 挂载 `@deepseek-ai/dsh-token-meter`；实测版本 `0.1.5-rc.2`，公开面 = `measure(session, requestHeader?)` → `TokenMeasurement`（`totalTokens` / `surfaceTokens` / `nodes[]`，`estimateMessage(message)` 另路）。**缺口 = 上界无机器判据**（实测）：适配层常驻注入 = `BASE_SECTION`（`adapters/dsh/section.mts`，实测 5 行 545 字符，常量）+ 命中节（实测每行摘要封顶 `MAX_SUMMARY_CHARS` = 160）。命中节**不随基因库增长**——命中行按 `hitLines.slice(0, maxGenes)` 封顶且逐行截断（同件实现），故注入量只随配置行数变化：`maxIndexGenes` = 4/8/12 时上界约 688 / 1376 / 2064 字符。缺口在**该上界今天无机器判据**：`verify-doc-budgets.mts` 只盖 `docs/` 等文件清单，不盖会话常驻注入，配置把行数调大或单价常量上调都无闸拦。
- **改进度量面**：本仓架构域无可比数值分值——变化量是 prose 与机制件，不是 benchmark 指标；可回溯的真实信号只有评审账（`.agents/notes/implemented/**` 中 `Review: FULL` 行 59 条）与发版后修复批。
- **canary 面**：本插件无常驻进程——宿主 spawn 每次调用一子进程（[2026-09-06-m2-adapter-wiring](../../implemented/architecture/2026-09-06-m2-adapter-wiring.md) 的接口形态），无「进程内被污染」的可 observe 形态。

两条既有拍板约束了每件的候选形态：引擎**零第三方依赖**（token 估算逻辑不可落 `engine/`，见 [engine/AGENTS.md](../../../../engine/AGENTS.md)）；适配层值 import 允许集封底 = `dsh-tools` + `dsh-llm` 两件、扩集须同变更拍板，且**已有一条反例教训**——`userQuestions` 进 `inject` 声明会让服务缺席时整个插件装载被推迟（[adapters/AGENTS.md](../../../../adapters/AGENTS.md)），故任何宿主服务读数的接线都不得进 `inject` 声明。

## Decision

**用户拍板（2026-09-13，三题逐条）：token 基线改两轨——字面预算判据为主、宿主读数建议行降级为辅；严格改进度量不立数值评分表，改记两本账；canary 判不立（非延期）。** 三题的决定形态如下，token 基线轨的落地实况与勘误见末节。

### 决定 1：token 基线不变量 = 字面预算判据（阻断）+ 宿主真读数建议行（非阻断）

- **判据（阻断面）**：常驻注入面的上界写成字面预算——`BASE_SECTION` 冻结为固定值（实测 545 字符），命中节给字符预算（缺省 2048，即 12 行 ×160 摘要 + 前缀 + 溢出提示行的余量）。判据件落适配层纯函数 + `adapters/dsh/selftest.mts` 断言块：该 selftest 由真实门禁实跑（`.github/workflows/validate.yml` 的 `node dist/adapters/dsh/selftest.mjs` + `scripts/pre-push.mts` 的 `adapter-selftest` 组），不是空转夹具。预算值口径单源 = 本件的实现落账节 + `section.mts` 常量；改动预算须走同变更 ADR。
- **建议行（非阻断面）**：prompt 组装点若 `ctx.tokenMeter` 在场，按会话至多读一次真实注入面 token 数（`measure(session)` 的 surface 读数），写一行 diagnostics 留痕；读数**不进 `inject` 声明**（懒取用 + 缺席静默降级，避 userQuestions 教训）。该行是观察面，不是门槛。
- **为什么不追真值**：`measure()` 返回的是整条 hosted system 面的读数，含宿主 persona、AGENTS.md 注入等本插件不可控内容；repo 内做不出来源纯净的「本插件注入面」读数。唯一干净的实测面是我们自己渲染的节文本，而它的判据不必用 token 单位——字符预算与 token 预算是同一个不变量的两个刻度。设计稿 §7.2 与 §11.2 两处 API 名（`estimateContent` / `contextBreakdown` / `contextPressure`）按此实测口径修正为 `measure` / `estimateMessage`，随本 ADR 收口执行。

### 决定 2：严格改进正向度量 = 记两本账，不立数值评分

- 每批变更同时记：**评审 Blocker 账**（各轮 R1/R2/R3 Blocker 数与采纳数，现成面 = ADR 头 `Review:` 行 + HANDOFF 滚动窗条目）+ **发版后修复账**（该版本区间内 bug-fix 类 ADR 批数）。
- 不引入改进分数、阈值或排序裁决：架构域分值必然落在 prose 质量上，为它建评分表就是 [主设计 §7.1](../../../../docs/research/dsh-swarm-evolution-framework-design.md) 第 3 条「只修异常、不修低分」要防的过拟合对象。守「前沿单调不降」的职责仍由既有机器门禁 + 评审实质执行承担。
- 两本账**只作记录，无门槛**；出现「连续多批 Blocker 上升或发版后修复批激增」时再立判据（触发写在本 ADR 的 Consequences 通道）。

### 决定 3：canary 进程隔离 = 判不立

- 理由：可 observe 的失败形态不存在——插件无常驻进程，每次调用一子进程；repo 级改动的候选与生效面分离已由 `review-tier`（评审档位触发面）+ `change-scope`（变更范围）覆盖。为不存在的宿主进程状态造脚手架属范围外建设。
- 重议触发 = 出现跨进程常驻状态（如常驻服务、watch 循环）或依赖环境快照的演化形态时重开。

### 验收口径（进入实现轮的入口条件）

1. 常驻注入面存在机器判据，且该判据由 pre-push 与 CI 实跑（非仅本地手跑）。
2. 判据对「新增知识抬高常驻基线」的失败形态实测能拦——实现轮须给具异常样例（超预算的注入面文本）与失败输出。
3. [主设计](../../../../docs/research/dsh-swarm-evolution-framework-design.md) §6/§11 三处 API 名与延后 ADR 的「API 漂移」条同步为实测口径。
4. 两本账有可回填的落点（评审账与发版账各一处指针），且不需要新工具即能手动回填。

## Alternatives considered

- **真调宿主 `ctx.tokenMeter` 做门槛**：落败——先要扩适配层值允许集（`dsh-token-meter` 入封底集），再要处理缺席降级，最后读数仍被宿主 persona 与 AGENTS.md 注入稀释；为 4 字符启发式精度付三层复杂度。
- **只冻结 `BASE_SECTION`、不设命中节预算**：落败——可变面恰在命中节的上界（`maxIndexGenes` 与单价常量可调大），基因库增长本身已被行封顶与逐行截断兜住；只冻结常量基线等于对着不动的量立闸。
- **把 token 判据做进 `engine/` 的 gene evaluate 白名单**：落败——engine 零第三方依赖是骨架拍板；把估算器搬进 engine 既违依赖纪律，也让「本仓改写一下就能过闸」的判据失去独立刻度（评估者与被执行者同源）。
- **立数值改进评分**：落败——分值在架构域无金标，且会诱导为分值优化（改写作风格刷分），与 §7.1 第 3 条直接冲突。
- **canary 延后而非判不立**：落败——「延后」语义要求触发点可判定；本件缺失的是观察对象而非时机，留延期标签只会让归口失真（延后 ADR 自身即为「归口失真」这一缺陷的修复件）。
- **三件全延后到有真实回归样本再建**：落败——token 基线面的缺口已有实证形态（命中节上界无闸），不是想象的投资对象。

## Consequences

- **正面**：常驻注入面获得与 doc-budgets 同族的机器判据，且落在 pre-push 与 CI 实跑的既有自测里；`ctx.tokenMeter` 由「延后的测量层」转为在环观察面，主体形状已实测（服务在场、API 名、返回值形状）。
- **负面（自诺的账）**：token 基线不是真测量——4 字符启发式对 CJK 与 JSON schema 系统性低估（包 README「已知限制」自陈），阈值语义是「注入面字符预算」而非「模型侧 token」。该自诺的落账 = 本件实现落账节的成本模型（字符口径，无 token 换算）。
- **依赖与环境**：建议行的接线依赖 tokenMeter 在场（本 profile 已实测在场），缺席时静默降级为不写行——不阻断 prompt 组装，也不改工具面。
- **API 漂移残留风险**：实测版本为 `0.1.5-rc.2`（延后 ADR 记 0.1.2-rc.1）；漂移通道 = 运行期形状闸（`surfaceTokens` 非数值或 `measure` 抛错 → 每会话一条 warn，不静默降级）；类型契约断言待 host peer 集升代后补（理由与触发条见「决定 1 建议行的实现落账」勘误）。
- **未覆盖缺口（显式接受）**：两本账无门槛 → 「评审通过但效用为负」的批次只能事后观察，不能事前拒绝；记录本身不构成护栏。
- **流程归口**：本 ADR 收口转 implemented 时同步三处归口——延后 ADR 的「触发点到达」条款指向本件、[2026-09-05-p1-engine-skeleton](../../implemented/architecture/2026-09-05-p1-engine-skeleton.md)「遗留面」三件护栏（含 canary，原写「等 M2 常驻形态」）改指本件终局、[framework-rebuild-blueprint](../../../../docs/research/framework-rebuild-blueprint.md) 的 token 基线归口行由「非本层事」改为指向本件（阻断面已落适配层）。

## 决定 1 的实现落账（2026-09-13）

- **判据落点**：`section.mts`（预算、单价、上界、判据同件，字面量不跨文件重复）+ `config.mts`（装载期调用，违约即 fail-closed 拒载）+ `adapters/dsh/selftest.mts` 断言块（6 条：基线字符数钉住 / 缺省过判据 / 上界加一拒收 / 本仓全部基因 ref 不越 `MAX_HIT_REF_CHARS` / 两条最坏渲染〔上界行数与触发溢出行〕均在预算内 / `validateConfig` 装载期拒收越界配置）。
- **评审收口（FULL 三审，2026-09-13；R1 0B/4S、R2 0B/4S、R3 1B/8S，采纳 16 条拒绝 0 条）**：代码面（R1/R2）——上界与判据共用导出常量（原两处各推一遍公式，仅因余数巧合同值）、行开销收回模块私有并改为「具名上界 + 自测逐件核验真实基因 ref」、固定开销按实文与位数上界改正、判据去掉与 `config.mts` 重复的正整数守卫（原诊断会把非整数归因成超预算）、删模块装载期断言与无因果的基因夹具；ADR 面（R3）——本 Problem 段原写「命中节随基因库累积单调增长」为假（行封顶 + 逐行截断使其不随库增长），已改为「上界无机器判据」并统一单价口径；设计稿 §7.1/§7.3 与 blueprint 的 token-meter 归口行同步为「阻断面 = 字面预算、token-meter = 观察面」。
- **勘误（预算数值口径）**：决定 1 原拟「命中节字符预算（缺省 2048）」。实现期实测该值与**已发布缺省 `maxIndexGenes=12`** 不相容——12 行 ×（摘要上界 161 + 行开销）已超 2048，即插件会拿自己的缺省配置装载失败。改为**预算由已发布缺省推导**：`HITS_SECTION_CHAR_BUDGET = 固定开销 + MAX_HIT_LINES × 每行成本`（`MAX_HIT_LINES` = 缺省 + 1；评审收口后当前值 = 80 + 13 × 228 = 3044，可配上界 13）。决定语义（字面预算为阻断面）不变，变的只是阈值的推导来源与数值。
- **判据覆盖面与假设面（如实记）**：基座节是常量（漂移由自测钉住 545 字符），命中节字面上界只随 `maxIndexGenes` 变化，故本判据覆盖「配置把行数调大」这一条路径；「基因库增长」路径由 `maxIndexGenes` 封顶**加逐行摘要截断**覆盖——上游超长 summary 不放大注入量。成本模型里唯一的估值项（命中行 ref 的 `MAX_HIT_REF_CHARS`）不再靠手抄：自测逐件遍历本仓 `genes/` 断言无一越界，越界即红并提示同变更调整常量；越界形态（引擎原样回显超长 domain/id）因而可被拦下。

## 决定 1 建议行的实现落账（2026-09-13）

- **落点**：`adapters/dsh/token-baseline.mts`（能力件——懒取用宿主服务、按会话至多一次、降级面内部消化）+ `index.mts`（复用 A2 `agent/pre-step` listener，每挂载点仍恰一个宿主 listener；`ctx.tokenMeter` 不进 `inject` 声明）；`adapters/dsh/selftest.mts` 断言组 5 条（每会话恰一行 / 缺席静默且不消耗该会话读数预算 / 形状不符每会话一条 warn / `measure` 抛错同降级 / 无会话对象静默）另加 index 接线冒烟 1 条。
- **读数口径**：每会话至多一行 `noogenesis token baseline reading: surfaceTokens=<n> (whole hosted surface, host heuristic estimate; observation only)`——读的是整条 hosted system 面（含宿主 persona 与 AGENTS.md 注入），不是本插件注入面真值，不进任何判据。
- **勘误（形状断言 → 运行期形状闸，2026-09-13）**：Consequences 原拟「照宿主 API 契约断言先例做类型断言」。实现期实测该断言要求引入跨代宿主依赖——`@deepseek-ai/dsh-token-meter@0.1.5-rc.2`（宿主实跑代）的 peer 指向同世代 `dsh-compaction` / `dsh-llm` 等，而本仓树钉 `0.1.0-rc.8` 世代，`npm install` 报 ERESOLVE；退到同世代 `0.1.0-rc.8` 则断言面与宿主实跑代**不同源**，证伪力可疑。故漂移通道改为运行期形状闸（非数值即 warn `host token-meter drift`），依赖面零变化。**触发条**：host peer 集整体升代（`0.1.0-rc.8` → `0.1.5-rc.x`，全件同代 + lock 同提交）时把该读数升为 `host-api-contract.mts` 的类型契约断言——断言面与运行面同源后零额外成本。现象与规避另入 [cookbook](../../../../docs/cookbook.md)「环境」条。

## 决定 2 落点（2026-09-13）

- **评审账**（各轮 Blocker 数与采纳数）：两处既有面——ADR 头 `Review:` 行（每批一行）+ [HANDOFF](../../../../HANDOFF.md) 滚动窗条目（每批一句带 R1/R2/R3 计数），零新工具。
- **发版后修复账**（该版本区间内 bug-fix 类 ADR 批数）：落点 = [release-shape-alignment](../process/2026-09-09-release-shape-alignment.md) 各「实发」节末行；口径 = 相邻 tag 之间新增的 `.agents/notes/implemented/bug-fix/**` 件数（`git log --diff-filter=A --name-only <base>..<tag>` 手填），三次实发节已回填。
