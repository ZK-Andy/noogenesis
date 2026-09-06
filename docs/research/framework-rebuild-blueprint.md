# 框架重建蓝图：七层蒸馏设计

> 状态：设计定稿（2026-09-06 用户拍板通过）· 依据 ADR [2026-09-06-framework-rebuild-charter](../../.agents/notes/proposed/architecture/2026-09-06-framework-rebuild-charter.md)（推倒重建 / 本仓原地重建 / 先框架后协作层），随收口评审批与协作层实现轮更新。
> 事实源：[capsule-01-optimization-round.md](capsule-01-optimization-round.md)（下称「调研」，引用其 § 节号）；协议兼容面单源 = [dsh-swarm-evolution-framework-design.md](dsh-swarm-evolution-framework-design.md)（下称「主设计」）；文档纪律 = [doc-standards](../method/doc-standards.md)。
> 血统：蒸馏自 deepseek-ai/deepseek-harness（MIT，本地缓存 `.cache/deepseek-harness`）——**提炼后搬迁，非逐字节搬运**；文中上游件以缓存内路径标注（缓存零损失整仓保留，调研 §3.10），不设跨仓链接。

## 0. 范围与冻结深度

- 定位：给拍板用的设计草案。拍板对象 = 七层蓝图 + 挂载面全清单 + 协议定案（charter Proposal 1）。
- 冻结深度 = **足以钉死协作层需求**：每层写到「协作层实现轮能直接按图施工」为止。不写实现细节代码，不写迁移步骤时间表（迁移是协作层轮的事，charter 单批切换口径见 §8）。
- 结构约定：每层三段式——上游形态 → 本仓蒸馏形态 → 取舍与边界。数值断言标来源（调研 § 节号 / 实测），推断标【推断 · 未证】。
- 阅读顺序：§1–§7 七层，§8–§10 三横切（协议对接 / 不做清单 / 协作层需求清单）。§10 是协作层重建轮的验收对账表。

## 1. 常驻层

### 上游形态

- 机制（`packages/context/agent-instructions/`，五件 1824 行，源码实证）：会话 cwd 向上走到项目根（`.git` 标记），root→cwd 祖先链上每层 `AGENTS.md`/`CLAUDE.md`（含 `.local` 变体）与用户全局文件进 baseline，**首请求前入 durable context**；字节预算（默认源 1MB）+ 内容去重 + resume baseline 校验（调研 §3.9）。
- 动态注入：agent 以 fs 工具触碰文件时，按 `descendantDirsBetween` 计算后代目录，链上新出现/变更/删除的子树 AGENTS.md 经 `agent.inject` 合成消息入 inbox——子树规则不占常驻预算，触碰才入上下文。
- 实例布点（4+ 层）：根 `AGENTS.md`（全局不变量 + 命令 + 任务路由，实测 1950 词）、`packages/AGENTS.md`（50 包子树所有权）、`docs/AGENTS.md`（文档标准）、`.agents/notes/AGENTS.md`（notes 子树纪律，含 `implemented/AGENTS.md` 下钻到生命周期子目录——同步纪律下钻两层）。

### 本仓蒸馏形态

- 机制不动：宿主 agent-instructions 插件在心源仓**正在运行**（调研 §3.9 活体实证两处）——缺的是布点，不是机制。
- 布点现状：2 处（根 + `.agents/AGENTS.md`）；engine/、adapters/、scripts/、docs/ 等深目录的专属约束散在 README/ADR/脚本头注，agent 动这些目录时不会被自动提醒（调研 §3.9 实证）。
- 布点方案（协作层轮建立，机制零新增，纯资产件）：

| 子树 | 承载的专属约束（现散处） |
|---|---|
| `engine/AGENTS.md` | CLI 命令面语言无关、gates.json 消费方契约、self-test 义务 |
| `adapters/AGENTS.md` | 零宿主依赖、挂载面接线契约（§7）、防火墙 selftest |
| `scripts/AGENTS.md` | 门禁判据面、--self-test 夹具纪律（违约 FAIL/合规 PASS）、DAG 消费口径 |
| `docs/AGENTS.md` | tier 表指针 + 文档纪律链接（指向 [doc-standards](../method/doc-standards.md)，不重抄） |
| `.agents/notes/AGENTS.md` | 新建即超车/取代检查纪律（同上游 notes 子树形态） |

- 预算：子树 AGENTS.md ≤300 词/件；规则 1–3 行 + 链接；禁重抄根文件内容（上游子树 ≤600 词，本仓减半【推断 · 未证：本仓子树约束面窄于上游 50 包体量】）。
- 命名沿用 `AGENTS.md`（宿主发现名，不另立文件名）。

### 取舍与边界

- 立子树件的判据：能说出「agent 动这个目录时会踩什么具体失败」才立（例：动 scripts/ 时忘跑 --self-test、动 adapters/ 时引第三方依赖）——HERO 判据（调研 §3.7）在常驻层的投影。说不出失败的不立（journal/ 无子树件）。
- 不做：上游用户全局层（宿主配置面，非本仓职责）；`CLAUDE.md` 副本（上游多宿主兼容件；当前宿主原生读 AGENTS.md）。

## 2. 决策记忆层

### 上游形态

- Agent Notes 四生命周期（proposed/implemented/rejected/archived），路径即元数据 `{lifecycle}/{class}/yyyy-mm-dd-topic.md`，class 封闭集由树脚本门禁拒绝越轨目录；implemented 与代码同变更同步（只改事实）；archived 永久冻结且有 **verify-archived-agent-notes 校验件**（封闭类树 / 完整三件套 / 归档元数据 / sidecar 哈希 / append-only 冻结内容清单）挂 pre-commit；每条新建笔记触发超车检查；rejected 仅当防重蹈覆辙才保留。
- 双语 i18n 配对 + pairing gate + 专用 merge driver（上游独有件）。

### 本仓蒸馏形态

- 骨架沿用：四生命周期、class 六类封闭集、格式门禁 `verify-adr-format.py`——规则单源在 [.agents/notes/README.md](../../.agents/notes/README.md)，蓝图不重抄。
- 本层蒸馏增量两件：
  1. **archived 校验件**：归档冻结从人工约定升为机器强制（冻结不可改、Status+Archived 行合法、archived 出站链接豁免）——小落差清单件（调研 §2.2-3），挂 pre-commit。
  2. **新建即超车检查**入 `.agents/notes/AGENTS.md` 布点（§1）：新建笔记须先搜活跃树做取代分类，完全取代者合并删旧 + 修入站链接。
- 差异保持：单语（双语配对整族不建，§9）。

### 取舍与边界

- 校验件判据：拒绝「归档后又被改写」这一具体失败，失败后行动 = 提交被拦、回滚违规编辑；archived/ 空时零约束零成本。
- implemented 同步纪律维持评审兜底（根 [AGENTS.md](../../AGENTS.md) 评审检查项 2），不上机器——ADR↔代码一致性是语义面，机器验不了；其挂载面归口 §7 M3。

## 3. 技能层

### 上游形态

- 12 技能，附属资源目录形态：`references/` 子目录（dsh-ci-test-reliability / dsh-doc / dsh-prose-standard / dsh-trim-cot-leakage）+ `templates/`（dsh-doc）+ `scripts/`（record-browser-gif）；SKILL.md 只留操作流，资料与模板下沉。
- 分发是宿主能力：skill 注册表 + 多 provider 合并 + rank 同名遮蔽（rank 600 = 最弱 bundled 层）+ catalog 懒加载（目录只发摘要，正文经 skill 工具按名注入）。

### 本仓蒸馏形态

- 7 个 noo-* 技能维持 SKILL.md 单文件 + 宿主懒加载：懒加载已实证（调研 §2.1 事实面①——目录 ≤500 字摘要、正文按名注入、rank 600 兜底位安全），不做任何分发机制建设。
- **references/ 形态采纳为扩展位**（小落差清单件，调研 §2.2-3）：技能正文超预算或需携带模板/清单时拆 `references/` 子目录，SKILL.md 只留操作流 + 相对链接。首个候选 = noo-doc-standards（上游同款 dsh-doc 即 references/ + templates/ 形态）。
- 门禁沿用 `verify-skill-format.py` + 「引入即适配」纪律（skills/ 相对链接已纳入 verify-md-links 校验）。

### 取舍与边界

- rank/遮蔽、注册表、懒加载全是宿主能力，胶囊零自建——胶囊只产出资产（SKILL.md 与其附属目录）。
- 可运行性分级事实保留：2 纯方法论 / 3 半绑定 / 2 实质绑定，「正文可带走、机器检查带不走」（调研 §2.1 事实面②）；SKILL.md 宿主口径行继续保留。
- 不做：技能生成器 / 编译型分发（外部生态 md 超集编译类）——无当前需求，技能数量 7 个的量级不支持。

## 4. 门禁层

### 上游形态

- lefthook：pre-commit / pre-merge-commit / pre-push 三钩子，glob 分域 job（staged pairing / archived notes / staged lint / third-party notices 再生成 / whitespace / vendor manifest），**postinstall 自动安装**（安装器带探针与诊断，缺失可手动补跑）。
- `scripts/run-gates.ts`：门禁 = `{id, label, cmd, needs, after, quick, allowFailure, streamOutput}` 的 **DAG + 有界并行 + fail-fast**，16 种聚合模式；运行前图校验（重 id / 未知依赖 / 环一律拒绝）；执行器含进程树终止与降级。
- CI 16 workflow；expected-filenames.yml = 文件名契约闸（禁 golden 文件名）。
- 钩子速度教训：每门禁独立 tsx 进程数百 ms，上游对策 = 裁剪——钩子只留 staged 廉价高置信检查，测试/快照/文档/构建一律不进钩子（调研 §2.2-6）。

### 本仓蒸馏形态

全 TS 化既定约束（charter Proposal 3，调研 §2.2-6 定调）下的逐件对照：

| 件 | 上游形态 | 本仓蒸馏形态 |
|---|---|---|
| 钩子框架 | lefthook glob job 调 `tsx scripts/` | lefthook glob job 直接调 `node dist/…`——**钩子永远跑预构建 dist（零转译），tsx 只属开发态** |
| 钩子安装 | postinstall 自动装 + 手动补跑路径 | postinstall 自动安装器接位（`setup-hooks.sh` 退役） |
| 门禁清单 | 散在 runner 内联定义 | **gates.json 单源不变**（`engine/gates.json`，消费方契约见 §8），TS runner 消费同一清单 |
| 门禁实现 | verify-*.ts 52 件（.cache 实测） | Python 13 件（verify-* ×10 + gates.py + gen-manifest.py + mdref.py）全部 TS 化 |
| bash 件 | 仅零星 shell 检查 | bash 三件退役：change-scope → change-scope TS 件；pre-push-selftest → TS 重建；setup-hooks → postinstall 取代 |
| self-test | 脚本内 spec | `--self-test` 夹具模式沿用（违约样例 FAIL / 合规样例 PASS），随 TS 化同迁 |
| CI | 16 workflow 矩阵 | validate.yml 单 workflow 保持；穷尽矩阵由 workflow 内 job 划分 + 门禁 DAG 承载 |
| 契约闸 | expected-filenames（golden 文件名禁令） | 文件名契约闸候选（禁构建产物/缓存文件入库），过 HERO 判据再立 |
| DAG 能力 | needs（硬依赖，失败即跳过）/ after（排序不传染）/ fail-fast | 同三能力蒸馏进 TS runner；图校验同三拒绝项 |

- DAG 设计约束（蒸馏骨架不搬实现）：`needs` 依赖失败则下游 skipped；`after` 只排先后不传染失败；并行度默认 CPU 数、本地文档档设 cap（防 ts.Program 类内存峰值——上游实测教训，调研 §2.2-6 串行 11 件的并行化收益）。

### 取舍与边界

- 钩子只做快检查、CI 拥有穷尽矩阵的原则不变（根 [AGENTS.md](../../AGENTS.md) Git 纪律）；pre-push 按变更面收窄门禁数（change-scope 思想已有）。
- 16 聚合模式不照搬——本仓门禁 10 件量级，聚合按「本地全量 / 文档族 / CI」三档起步【推断 · 未证：起步档数由实现轮按清单实测定】。
- 未定项归属：mdref.py 归宿、pre-push-selftest 四态 e2e 的 TS 重建形态——协作层轮实现决策，蓝图只钉需求（调研 §2.2-6 已声明未定）。

## 5. 流程层

### 上游形态

- docs/development.md：setup tutorial + daily workflow + CI 组织，教程/参照形态分离。
- **event-directed-pr-review-status**（评审交接 webhook 命令化）：`review_requested` → In review（可重复触发）；`changes_requested` → In progress，仅当目标最新状态事件写者是生命周期 actor（人类覆写保留）；普通订阅事件单向前进、唯一回退转移由 actor 守卫。判据三件 = 事件即命令、单向投影、actor 守卫。
- 栈式 PR 件（merging-stacked-prs 技能 + incremental-pr-base-retargeting）——多分支工作流产物。

### 本仓蒸馏形态

- 流程卡 6 张维持自觉档（调研 §3.4 谱系定位：流程卡 = 全自觉层，技能化不解决自觉问题——调研 §1.4 用户校准在案）。
- 本层蒸馏增量 = **评审交接状态机化**：三重审核链路的「谁拥有下一步」从主会话自觉推进改为机器可判定事件链（上游 event-directed 判据的本地蒸馏，评审契约单源在 [review](../method/review.md)）。
- 状态与转移（需求级）：`待评审 → R1 → R2 → R3 → 收口`；每次转移的触发 = 机器可判定证据件（简报发射 = `verify-review-brief` 通过、每路完成 = 评审记录落事件轨、收口 = ADR `Review: FULL/…` 证据行齐 + tier `--enforce` 绿）。证据件归属：简报不入库（现状口径），状态投影落事件轨（语言无关面，§8）。
- 上游「人类覆写保留」判据蒸馏：机器投影不得覆写用户显式给出的状态；回退转移（如 R1 打回）只允许机器事件在最新拥有者是自动化 actor 时发生。

### 取舍与边界

- 上游 GitHub webhook / Project 状态面不搬——本仓评审在本地会话轨，无 PR 基建；蒸馏的是三判据，不是接线。最小实现形态（无 webhook 的纯记录件起步）由协作层轮定。
- 栈式 PR 件不建（单人 + 本地评审，无多分支栈）。
- HERO 判据：说不出「拥有者漂移后下一步动作会不同」之前，状态投影**只做记录件不升阻断闸**——M3（§7）是第一批阻断候选，另案过判据。

## 6. 教训层

### 上游形态

- 三个家：`docs/cookbook/`（按任务分篇 how-to，编号验证步骤）、`docs/postmortem/`（编号事故叙事——散文纪律里唯一允许战争故事叙事的层）、`docs/defensive-patterns.md`（生命周期/并发/子进程/teardown 模式集，动手前必读）。

### 本仓蒸馏形态

- **cookbook**：单文件维持（[../cookbook.md](../cookbook.md)，≤2700 词预算 + verify-cookbook 封闭域标签门禁）；超限处理序（根 [AGENTS.md](../../AGENTS.md) 字数预算）的首选项即拆分，蒸馏形态预先定死 = `docs/cookbook/<域>.md` 按域分篇（沿用封闭集七域），拆分阈值按实测条目分布定（门禁阈值先实测样本分布的教训在案：cookbook「门禁」域首条）。
- **postmortem/ 形态定死、不预铺**：`docs/postmortem/000N-<topic>.md`，编号递增；只放事故叙事（时间线 + 根因 + 修复 + 对 cookbook/ADR 的反哺指针）；事故判据 = 已造成或险些造成返工的具体事件，事后写。无事故不建目录（用不上不写）。
- **defensive-patterns 不设第三家**：「每事实一个家」+ cookbook 封闭域标签已覆盖（防御类 procedure → cookbook 对应域；模式正文 → docs/method/ 各篇，tier 表见 [doc-standards](../method/doc-standards.md)）。上游第三家的前提是 50 包体量的并发/teardown 模式集，本仓体量不支持。

### 取舍与边界

- HERO 判据逐件过：cookbook 分篇（检测的具体失败 = 预算失守，行动 = 拆分——立形态）；postmortem（事故发生即有家可落，行动 = 叙事入库——立命名规则）。
- HERO 案例四字段贡献格式（被要求什么 / 做了什么 / 为何不成比例 / 成比例的样子，调研 §3.7）蒸馏为 postmortem 条目的叙事骨架候选【推断 · 未证：与上游 postmortem 的「时间线+根因+修复」骨架取一，实现轮按首条真实事故定】。

## 7. 运行时守卫层（挂载面核心）

### 上游形态

- `packages/guard/`：repeat-tool-reminder（advice-never-block 循环提醒：阈值 3/5/8、exact-repeat 检测、新用户消息清零）+ timeout-policy（合作式超时：靠工具自身 cancellation，never hard-stop）。**guard 全家零阻断**——真阻断在宿主拦截点与 hooks 桥，档位与机制分离。
- `packages/hooks/`：hook-protocol 共享引擎（matcher/runner/codec/merge——exit 2 = 阻断并回模型可见消息、可附加上下文、其余退出码非阻断只记日志、`hook/*` 日志事件须在开放回合内）+ hooks-claude-code / hooks-codex 两桥（让既有 hooks.json 在 agent 运行时生效：会话开始 / prompt 提交 / 工具前后 / 停止前均可触发）。

### 本仓蒸馏形态：挂载面全清单

能力层全接、策略层逐件增挂（charter Proposal 2 口径）。能力层 = 适配层接线需求；策略层 = 每个挂载物逐件过 HERO 判据。

**能力层全接清单**（适配层把宿主全部机器触发点接上；现状 = 仅 A1/A7/A8 现状栏如实标注，接线面缺口 = A2–A6 + A8，调研 §3.4 与 adapters/dsh 源码实证）：

| # | 挂载点 | 宿主事件 | 能接住的失败 | 现状 |
|---|---|---|---|---|
| A1 | 常驻注入 | system-prompt 有序节（order，空则零 token） | 常驻基座膨胀失控 | 已接 |
| A2 | 一步前瀑布 | agent/pre-step（可权威拒绝一步） | 会话级纪律违约（模式/scope 未声明即推进） | **未接** |
| A3 | 工具前有序拦截 | tool/call ordered pre（可阻断并回消息） | 工具级守卫（写入越界、技能该用没用） | **未接** |
| A4 | 工具结果信号 | tool/result | 门禁红、循环重复等结果面信号 | **未接** |
| A5 | hooks 桥 | packages/hooks 四类时刻（会话开始/prompt 提交/工具前后/停止前） | git 边界之外的宿主级强制 | **未接** |
| A6 | 停止前 | agent/turn-stopping + hooks Stop | 收尾检查单漏跑 | **未接** |
| A7 | agent 生命周期 | agent/created + agent/disposed | 子代理委派守卫 / solidify 唯一写路径触发 | 已接 |
| A8 | 会话事件轨 | session/event / session/flush | 状态投影与记录件落点 | **未接** |

**首批挂载物**（每件带 HERO 判据答案；charter 三件）：

| 挂载物 | 接的点 | 检测的具体失败 | 真出现后下一步不同的事 |
|---|---|---|---|
| M1 技能使用守卫（调研问题池②该不该用 / ③用了没有） | A2/A3 | 应触发 noo-* 技能的会话（FULL 评审、文档写作类）在无技能使用痕迹下推进 | 记录件提示 + 下轮会话开场注入技能目录摘要；重复违约的升格策略由实现轮定 |
| M2 规范事前接入落点（调研问题池：架构/编码/注释规范未接入协作体系） | A2（会话开场）/ A3（edit 前） | 写码会话在未读对应架构/规范面的情况下开始产出 | 一步前注入对应子树 AGENTS.md（§1）/规范面指针，agent 须读入后才推进 |
| M3 评审实质执行记录件（调研问题池：评审实质执行在自觉区） | A6 + A4 + A8 | 评审声称完成但三路无记录 / 简报未发射 | 记录落事件轨（语言无关，§8）；阻断档（停止被拦一次并回模型可见消息）为升格候选，实现 ADR 另案过判据（§5） |

- 提醒档（repeat-tool-reminder 类）**首批不含**，逐件评估再挂（charter 原口径）。

### 取舍与边界

- **档位纪律**：守卫默认建议档，升格阻断须逐件过 HERO——「advice never block」（上游 guard 包显式定位）与「可阻断并回消息」（hooks 桥）是两个档位两种机制，不混装在一件里。
- timeout-policy 不首批建（本仓工具面无长挂调用场景；出现再挂）。
- 两方言桥（claude-code/codex shell-hook 兼容层）不建——蒸馏 hook-protocol 的判定语义（exit 2 阻断 / 上下文附加 / 非阻断降级 / 日志事件回合内约束），接线走本仓适配层原生事件（A2–A6）。
- M2 的「规范」外延（哪些规范面、判什么）是开放设计面：蓝图只钉挂载点与机制，规范清单由重建后跟进（charter 时序：规范事前接入展开排在重建后）。
- M1 可判定性降级路径：若「应触发技能」判据在实现轮不可机器判定（会话类型判据或无痕迹检测不可行），M1 降级为纯记录件（只记录「用了没有」），「该不该用」维持自觉档——降级路径显式在案，防实现轮硬造不可判定的信号（HERO）。

## 8. 横切：协议与资产对接

- **6 基因零改动**：Gene JSON 协议单源 = 主设计 §5.1（蓝图不重抄字段）；`genes/`（doc/gates/process 6 件）零改动。
- **语言无关口径**：CLI 命令面 / gates.json / Gene JSON / 事件轨四面语言无关，TS 化只换内核实现（主设计语言后门通道；调研 §2.2-6 血统考古）。
- **gates.json 单源不变**：门禁清单仍单源于 `engine/gates.json`（结构性例外四件机制见 gates 脚本头注），TS runner 消费同一文件；清单不因语言迁移改名。
- **事件轨三段归属**：事件轨是 §5 状态投影与 §7 M1/M3 记录件的落点；格式单源拆开——会话事件 = 宿主原生事件面（session/event 等，格式随宿主）；journal 月卷格式单源 = 流程卡 [session-close](../../.agents/workflows/session-close.md)（月卷命名/追加纪律）；演化 Event 原语单源 = 主设计 §5.1。
- **资产壳零搬迁**（charter 拍板）：docs / .agents / journal / genes / gates.json / 事件轨原地不动；重建只触机器层（engine / scripts / hooks / CI / npm 管线 / adapters）。
- **并存期权威归属**：重建落地到单批切换的窗口内，本蓝图判据与现行门禁双轨并存——每个重建批次在事件轨标注「本批按蓝图判据」；切换批新机器自测对账后一次删除旧机器件，不长期双轨（charter 原口径；切换失败回退 = git 断点 revert，资产壳未动）。

## 9. 横切：本仓不做清单

显式排除面，HERO 判据 = 说不出「检测什么具体失败、失败后下一步行动不同」的不建：

| 上游件 | 不做理由 |
|---|---|
| 双语 i18n 配对 + merge driver + pairing gate | 本仓单语拍板（[.agents/notes/README.md](../../.agents/notes/README.md) 已声明）；无第二语言读者面 |
| type-equiv / 生成目录生成器族 | 本仓无 API 参考网站；「手抄目录 = slop」纪律反而要求不建 |
| VitePress 网站 / 文档站点投影 | 无发布面需求 |
| 16 workflow CI 矩阵 | 单人单平台；穷尽矩阵单 workflow 内承载（§4） |
| vendoring / rescope | 无 vendor 依赖 |
| invariant 伴生件族 / guard 自挂守卫 | HERO-O 典型形态（为守卫再造守卫）；守卫只在 §7 清单内逐件立 |
| repeat-tool-reminder 首批挂载 | §7 边界已裁（提醒档逐件评估再挂，charter Alternatives 4） |
| 栈式 PR / base retargeting 件 | §5 边界已裁（单人 + 本地评审，无多分支栈） |
| 用户全局 AGENTS.md / CLAUDE.md 副本 | §1 边界已裁（宿主兼容面，非本仓职责） |
| plan/todo/goal/jobs/schedule 包层 | 宿主自带能力，胶囊直接消费不自建 |
| token 基线不变量（dsh-token-meter 面） | 归口主设计 §7（演化护栏），非协作层七层事 |
| defensive-patterns 第三家 | §6 已裁（本仓体量不支持第三家，失败后行动 = 写 cookbook 条目） |

## 10. 横切：协作层需求清单（验收需求）

协作层重建轮按此逐条对账（charter Acceptance criteria 2：以蓝图判据对账）：

| # | 需求 | 验收判据 |
|---|---|---|
| C1 | 语言统一全栈 TS | engine / adapters / scripts 无 .py / .sh 残留（含 `scripts/__pycache__`）；门禁经 node 运行 |
| C2 | 钩子零转译 | lefthook job 全部调 `node dist/…`；钩子链路无 tsx 调用 |
| C3 | 开发态 tsx 边界 | tsx 只出现在 dev 脚本与测试 launcher；发布链路零 tsx |
| C4 | postinstall 自动装钩子 | install 后钩子路径生效，无手动安装步骤；安装器带缺失诊断与补跑路径 |
| C5 | 门禁 DAG | runner 支持 needs / after + 有界并行 + fail-fast；图校验拒绝重 id / 未知依赖 / 环 |
| C6 | 钩子速度约束 | 钩子跑预构建 dist；pre-push 并行化后墙钟快于现行串行 11 件（调研 §2.2-6；基线数值实现轮实测后钉死） |
| C7 | 挂载点覆盖 | §7 A2–A6 + A8 全部接线且各带最小 smoke；接线 ≠ 策略（策略逐件 M 增挂） |
| C8 | 首批挂载物 | M1/M2/M3 各自的实现 ADR 带 HERO 判据答案（检测的失败 + 下一步不同的事） |
| C9 | 协议零改动 | 6 基因 + 事件轨文件 diff 为零；gates.json 条目集与门禁名不变（cmd 随 TS 化重指，不要求文件零 diff）；engine self-test 与 adapter self-test 绿 |
| C10 | 发布形态 | npm 包 = tsc dist 产物（files 白名单 → dist），消费者不背工具链 |
| C11 | 子树布点 | §1 布点表五件落地，逐件 ≤300 词，纳入 doc-budgets manifest |
| C12 | 教训层形态 | postmortem 命名规则入 verify 门禁（目录空时零约束）；cookbook 拆分规则并入 doc-budgets 超限处理序 |
| C13 | bash 退役 | bash 三件的 TS 等价物过 self-test 后同批删除 bash 件 |
| C14 | 并存期标注 | 重建批次在事件轨带「按蓝图判据」标注；切换批后旧机器件全量删除、无长期双轨 |

验收方式：C1–C3/C9/C10/C13/C14 为文件面与链路面，机器可查；C4–C8/C11/C12 以实现轮 ADR + self-test / smoke 承载；C6 基线数值由实现轮首次实测后回填（门禁阈值先实测分布的教训，cookbook「门禁」域）。
