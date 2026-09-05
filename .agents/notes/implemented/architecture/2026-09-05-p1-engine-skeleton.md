# Agent Note: P1 发动机骨架拍板（语言·信号入口·propose·评估边界）

Status: implemented
Review: FULL/2026-09-05/R1=ok R2=ok R3=ok

> Provenance：本仓原创设计（2026-09-05 立项讨论轮）。码级底座为 [2026-09-05-evomap-evox-engine-anatomy](../../proposed/architecture/2026-09-05-evomap-evox-engine-anatomy.md)（四接口实战印证/记忆图参数/canary 闸）；本 ADR 承接其 Proposal 条目 4 逐题拍板；协议细节单源在 [2026-09-05-gene-event-schema](2026-09-05-gene-event-schema.md)。讨论过程叙事见 [journal 2026-09 卷](../../../../journal/2026-09.md)。

## Problem

发动机骨架的四个拍板题（语言与依赖姿态 / 信号入口 / propose 形态 / 评估与不变量边界）此前无一家之言：[主设计](../../../../docs/research/dsh-swarm-evolution-framework-design.md) §5 给了原语、§6 给了生命周期，但落地选型（语言、序列化、信号从哪来、propose 是否触 LLM、"严格改进"如何机器判定）全部悬空。逐题拍板，结论落本 ADR，供实现轮引用。

## Decision

### D1（2026-09-05，已拍板）：引擎语言 = Node.js；P1 零第三方依赖；Gene 序列化 = JSON

- **选型**：Node.js（标准库 only），初版不引任何 npm 依赖；`js-yaml` 例外权保留至 M2 插件化时再议。
- **Gene 序列化**：JSON（`JSON.parse` 标准库，真零依赖）；YAML 的策展书写舒适性不做 P1 诉求——首批基因是手工翻译的一次性工作，机器校验为主。
- **合同面**：CLI 四命令（select/propose/evaluate/solidify）为唯一合同面；未来可换内核不改接口（含用其他语言重写内核，接口不变）。
- **依据**（逐条标注证据强度）：
  1. 【推断 · 未证】引擎消耗画像 = 子进程编排（跑门禁/git）+ 文件 I/O + 字符串匹配 + 小算术，墙钟瓶颈全在外部进程——性能是伪命题，Rust/C# 的优势打在非瓶颈上（由四接口工作量拆解推断，非测量数据）；
  2. LLM 不在引擎内（引擎编译提示词、跑验证闸，生成在宿主侧）——设计立场，论证见 D3；
  3. 参考实现 evolver（MIT 时代快照）为 Node.js——机制对照零翻译（[底座 ADR](../../proposed/architecture/2026-09-05-evomap-evox-engine-anatomy.md) 实证）；
  4. 【实测】DSH 全链 Node.js（本机 `@deepseek-ai/dsh` 0.1.2-rc.1 package.json：ESM `"type": "module"` + `bin` 指向 `lib/bin.js`，内核依赖 `@deepseek-ai/cordis`），M2 适配层可从"spawn CLI"升级为同栈进程内复用；
  5. 【实测】P4 分发面走 npm（`noogenesis` 裸名 + org 已占位，2026-09-05 registry 回执；主设计 §13.1）。
- **被否选项**：Rust（单二进制分发被 npm+CI 取代；编译期保证输给 P1 协议 churn 期的迭代速度）；C#（类型系统收益未打中真实约束，.NET 装机面窄）；Python（与门禁同栈，但 M2 反正要 Node，参考代码又是 JS——省下的运行时加了回来）。

### D2（2026-09-05，已拍板）：信号入口 = 显式喂入；Detect 不进引擎

- **选型**：select 的信号输入 = 调用者显式给出（CLI 参数/stdin，一个或多个信号键）；Detect 职责留在方法论侧——人发起、流程卡约定时机，引擎只做机械匹配。
- **口径**：信号键 v0 = 自由字符串，与 gene `signals` 字段（[schema ADR](2026-09-05-gene-event-schema.md) S1 定名）精确匹配；归一化钉死 = trim → 小写化 → 内部连续空白折叠为单空格（self-test 夹具覆盖归一化）；一次 select 可喂多键，命中取并集；信号词汇表不预设封闭集，随首批基因手工翻译自然形成（manifest 索引归 P2 共享库，P1 无 manifest——schema ADR S1）。
- **禁区**：引擎自动扫描固定面（门禁输出/journal/git 推导信号）在 M2（钩子适配层落地）之前禁止实现——"常开自动性"已被 #18 负结果（单例用户判定，[cookbook 条目](../../../../docs/cookbook.md)）约束：自动蒸馏零可追溯收益、token 成本倒挂；按需调用是既定姿态。
- **依据**：胶囊哲学 = 引擎保持愚钝、方法论承担智能；信号发现的判断（"现在像不像踩过那个坑的场景"）放在人与流程卡里，引擎只做匹配——这是主设计 §7"只在无金标下用代理信号"纪律的最诚实版本：P1 连代理信号都不假装有，人就是信号源。
- **被否选项**：B 引擎自动扫固定面（重建 evolver daemon，与 #18 单例判定约束及"不插电也能转"相悖）；C 约定落盘点（session-close 写约定文件、引擎读文件）——本质是"谁来喂"的纪律问题而非引擎能力，留作实现轮流程卡的一行可选增强（遗留面归口），不进引擎合同面。

### D3（2026-09-05，已拍板）：propose = 确定性编译器；"产生新基因"不归 propose

- **选型**：P1 的 propose = gene → 注入文本的**确定性渲染**（gene `strategy` 有序步骤 + `constraints` + `avoid`，字段名按 [schema ADR](2026-09-05-gene-event-schema.md) S1）压缩成紧凑控制信号块，吐 stdout/文件由宿主会话注入；同输入必同输出，可用金样夹具测试（对齐本仓 self-test 惯例）。零 API、零网络、零生成。
- **边界写死**：产生新基因**不是** propose 的职责——新基因只能经人工策展翻译进入（首批 = AGENTS/流程卡/门禁 → gene），经 evaluate 闸验证后由 solidify 入档。P1 的"演化" = **基因种群在闸门守护下通过策展更替**——#18 正面结论（收益全在紧凑手工资产，[cookbook 条目](../../../../docs/cookbook.md)）的引擎化表述。
- **依据**：①零 DSH 零网络（D1/D2 一脉）下 LLM 自动变异无立锥之地；②P1 最小闭环已拍板只有 Gene + Event 两原语，Mutation 后置——变异骨架方案会把 Mutation 从后门拉回，故一并否决。
- **被否选项**：B propose 接 LLM API 自动变异（违反"不插电" + #18 单例判定约束；API key/成本/不可复现）；C 引擎产变异骨架人补全（Mutation 原语提前入场，违反最小闭环拍板；其合理内核留待 M2/P3 蒸馏轮）。
- **P1 闭环全貌**（D2+D3+schema S2 合成）：人策展产出候选 gene → evaluate 闸验证 → solidify 入档（`gene.added` Event）→ 下次 select 命中 → propose 渲染注入 → 真实使用；使用反馈由人消化为下一轮策展（`gene.updated`/`gene.retired` Event）。Event 只在策展更替时产生（schema ADR S2 kind 封闭集）——无环节假装智能，每环节机器可验证。

### D4（2026-09-05，已拍板）：评估 = 保守可执行子集；token 不变量 P1 由 doc-budgets 承担

- **evaluate 执行集（钉死）**：v0 = `gates.json` 全集作为入档门槛；`validation` 字段为可选增补，引用必须 ⊆ 白名单；白名单条目允许引擎注入的上下文参数槽（如 `--since <outgoing base>`，取值仅由引擎从 git 事实推导，基因只引用不填值）——带上下文参数的门禁（review-tier/review-brief/change-scope）以参数槽条目收录，无参门禁直接实例化（载体与安全模型见 schema ADR S3）。
- **入档条件 = 门禁全绿，仅此一条**：红即拒，无豁免——"前沿单调不降"在文档域的可执行形态。
- **"严格改进"正向度量 = 显式 open**（本 ADR 为单源）：文档域无可信改进分数（字数下降可作弊；LLM judge 违反 D1 零网络且无金标）。P1 不假装量化改进；M2 重议（候选信号：评审 Blocker 数追踪、dsh-token-meter 常驻注入度量）。
- **token 基线不变量的 P1 落点 = doc-budgets 字数预算门禁**（已在 CI 真强制）——文档域的"别变臃肿"机器不变量；`dsh-token-meter` 退 M2 适配层（届时量常驻注入 token，与字数预算是同一不变量的两个测量层）。
- **canary 后置**：evolver canary 是 daemon 重启安全网（[底座 ADR](../../proposed/architecture/2026-09-05-evomap-evox-engine-anatomy.md)），P1 无 daemon；入档闸 = 本地门禁全绿 + CI 跨机器复验（已具备），进程隔离 canary 等 M2 常驻形态。
- **被否选项**：B 量化"严格改进"（字数下降可作弊，无真值）；C LLM judge（违反 D1 零网络 + 无金标自报分）。

**收窄归口**：P1 对主设计 §6 完整生命周期的裁剪与 Mutation 同批显式后置 M2——memory-graph 与观测透镜（Select）、blast-radius（Evaluate）、Mutation 原语；M2 钩子适配层恢复完整形态。

## Alternatives considered

- **P1 直接全依赖引入（如 commander + js-yaml 一步到位）**：暂不做——P1 是"裸仓自洽"的证明轮，零依赖是能力声明而非教条；待 CLI 参数面复杂到手写解析开始出 bug，或基因格式迁 YAML 时，随 M2 一并放开。
- **语言问题挂起、先写 schema**：落败——schema 的序列化格式与校验器形态直接受语言约束（零依赖决定 JSON），先拍语言才能让落盘协议（[schema ADR](2026-09-05-gene-event-schema.md) S1）一题收敛。
- **Rust/C#（评审追问后补记）**：性能/内存安全/单二进制/编译期保证全部打在非瓶颈上（见 D1 依据 1【推断】）；真实约束四条（迭代速度/装机普遍性/M2 同栈/参考血缘）全指向 Node。

## Consequences

- **采用面**：`engine/` 目录与四命令按 D1–D4 实现；协议细节按 [schema ADR](2026-09-05-gene-event-schema.md) S1–S3；首批基因人工策展翻译（不自动生成）。
- **遗留面（显式 open，逐条归口）**：严格改进文档域度量（M2，D4 单源）；dsh-token-meter 接入（M2）；js-yaml 例外权与基因格式 YAML 化迁移器（M2，单源在本条）；canary 进程隔离（M2 常驻形态）；流程卡"谁来喂信号"可选增强（实现轮）；hooks/CI 引 `gates.json` 完整合一（M2，schema ADR S3 记 open）。
- **依赖姿态是门禁级约束**：engine 引入任何第三方依赖须先修订本 ADR D1（或其例外条款）。
- **运行时假设**：Node 单运行时——若未来引擎要进无 Node 环境（边缘/容器最小镜像），CLI 合同面保证可换 Go/Rust 内核而不动接口。
