# 胶囊 01 优化轮：问题池与调研全图

> 状态：活跃工作文档（2026-09-06 开卷）。问题池与相关待办自 2026-09-06 起从 [HANDOFF-todos.md](../../HANDOFF-todos.md) 迁入本文件（本文件 = 本轮问题与调研的单一事实源）；行动项的完成勾账也在这里做。durable 结论仍按纪律落 ADR/cookbook/method，本文件不承载决策。
> Provenance：本仓自生调研文档；调研来源 = deepseek-ai/deepseek-harness 本地克隆（MIT）+ GitHub API 检索 + HERO-Anti-OverDefense 本地克隆（MIT），检索日 2026-09-06。
> 缓存位置与索引刷新方法见 §3.8。

## 1. 问题池（用户原版记录，不曲解）

### 1.1 开场六问（2026-09-06 原话）

> 胶囊优化我现在发现需要做的地方过多，排不出优先级，
> 第一 现在胶囊技能已经够了吗？
> 第二 胶囊技能是懒加载吗？
> 第三 文档散乱的毛病改了吗？
> 第四 技能 在失去本地支持的情况下是否真的可以实际运行？
> 第五 写作体系是否应该调整免得重复呢？
> 第六 是否应该引进本地记忆库？
> 等等还有很多问题。

### 1.2 补充问题（2026-09-06 原话）

> 还有软件架构，编码规范，注释规范 等等规范并没有接入协作体系这也是问题，如果调整软件架构，防止上帝类，如何做机械校验如何跟记忆系统连接 都是优化的点。

### 1.3 用户指令（2026-09-06 原话）

> 我说的所有问题都要记录下来，你处理完文档漂移后，我们一个一个解决。
> 处理完文档漂移再说

### 1.4 用户校准（2026-09-06 原话，纠正 agent 曲解）

> 全部曲解了。
>
> 一个一个来，现在胶囊就七八个技能，是否够用呢？比如 需要一个ponytail 这个skill 吗？ 防止过度编码过度设计？ 等等
>
> 用不上的不写，现在不是用上了吗？所以我们需要就要写啊。现在是总结需要哪些技能，后续实施，不立即实施。
> 我从来没说过流程卡技能化，为什么你一直提这个要求？ 是有什么问题吗？一觉得流程卡是自觉读，做成技能会好一点是吗？ 技能难道不是agent 自觉用自觉读吗？ 所以要解决这个问题，不是技能化就解决的。
> 还有很多，架构，注释。编码等等都算得。我觉得不一定是技能，而是有这个问题，需要事前进行。具体怎么解决，还没有思路。
>
> 执行门禁是不是也靠自觉呢？
> 可能我说的不太准确，门禁是挂载到git的钩子，机械校验是靠自觉的对吗？
> 我问的是机械校验，比如 审核简报的校验是靠自觉还是有挂载强制性的呢？
> 回到第一个问题，需要哪些skill，如何校验是否需要使用这些技能，使用了没有，这都是问题。

### 1.5 调研指令（2026-09-06 原话）

> 先去调研一下dsh 使用的协作工作流，我觉得我们还有欠缺不应该有这么大的缺口。
> 你用的这套体系其实就是它开源的"AI 工程流水线 SOP"，DeepSeek 已经开源这套体系了吗？ 你检查一下。
> 你检查一下他们是不是单独有一个 SOP 仓库？
> 我觉得不太对，你把整个 dsh 下载下来，放在缓存里，可以持久用的缓存。 然后用codegraph 建立索引，仔细挖一下SOP，还有我叫它SOP DeepSeek 也这么叫吗？ 不一定，你检查一下有没有AI协作方面的仓库。
> HERO 先例要不要拉下来细读（候选：防过度设计技能的参照实现）。需要拉下来细读。
> 你还需要做一个事情，把这次说的哪些问题，相关的待办，还有调研报告：上游 SOP 全图 + 命名考据 + 外部生态，全部放入一个文档内，在hanoff上建立一个最高优先级的指针，指向这个文档。

### 1.6 用户异议（2026-09-06 原话）

> 非 git 运行仓支持立项，这个我没说支持啊。（→ 经查证属 agent 越权归因，条目已整条删除）
> 缓存谁放到git上呢？（→ 缓存用 .git/info/exclude 本地排除，零仓库痕迹）

## 2. 相关待办（自 HANDOFF-todos 迁入，行动项在此勾账）

> 迁移说明：以下条目 2026-09-06 从 [HANDOFF-todos.md](../../HANDOFF-todos.md) 行动区迁出，迁出件已删除；本文件是其唯一行动区。

### 2.1 待办

- [ ] **技能集总结**（用户拍板：现在只总结需要哪些技能，后续实施）：已确认需要 = 防过度编码/过度设计（事前，该写）；架构/编码/注释算不算技能随总结再定（不一定是技能）；清单待用户补「等等」项；先例参照 = HERO-Anti-OverDefense（见 §3.7）。
- [ ] **技能使用挂载**（②该不该用/③用了没有）：平台原生挂载点在案——agent/pre-step waterfall 可权威拒绝、tool/call ordered pre 可阻断并回消息、packages/hooks 桥覆盖 prompt 提交/工具前后/停止前；我方适配层仅接 system-prompt 节 + 三工具 + agent/created，上述面全未用。解法方向 = 自建 pre-tool/pre-step 守卫/记录插件；上游同款缺口在案（技能调用仍自觉，repeat-tool-reminder 明示 advice never block）。**求解阶段：先出方案（见 §2.2-1）。**
- [ ] **评审实质执行在自觉区**（2026-09-06 会话发现、用户拍板记入）：verify-review-brief 机械可判定但无挂载点（gates.py 头注：仅本地预发射，不入 CI、pre-push 不跑——发射评审前无机器事件，靠主会话自觉想起跑）；pre-push/CI 挂载的 review-tier `--enforce` 只强制形式（ADR 带 Review 证据行），评审是否真跑、三路是否真审，机器验不了。推广问题 = git 边界之前的动作序列零挂载点，与「规范事前接入」同根；解法未定。
- [ ] **规范事前接入**（用户原话：软件架构、编码规范、注释规范等等规范并没有接入协作体系，这也是问题；「我觉得不一定是技能，而是有这个问题，需要事前进行。具体怎么解决，还没有思路」）：问题在案、解决形态未定，待讨论出思路；防上帝类机械校验另条。
- [ ] **上帝类预防闸**：单文件行数/依赖扇出上限类机械门禁（engine 现状健康——最大 selftest.js 486 行、核心命令 ≤170，属预防非治病）；静态可计算 → 挂载即零自觉真强制（§3.4 谱系）；对应设计稿 §10「机械校验（scope/blast-radius）」面。
- [ ] **记忆库/记忆系统连接**（用户定调：文档漂移清账后再议——清账已完成 2026-09-06）：零前案新议题（durable 全域 grep 零命中）；相邻线 = EvoMap memory-graph 精华未建（P1 只落 Gene/Event）+ 痕迹提炼面（仍在 HANDOFF-todos，触发 = 架构定稿）；方向选项 = 本地记忆库立项 / memory-graph 原语 / 融合轮前半场，未拍板。
- [ ] **事实面定案（免行动留档）**：①懒加载已实证——技能目录只发 ≤500 字摘要、正文经 skill 工具按名注入（设计稿 §8 as-needed 生效），rank 600 = 最弱 bundled 层、同名静默遮蔽，兜底位设计安全非缺陷；②技能脱离本仓可运行性分级实证——2 纯方法论 / 3 半绑定 / 2 实质绑定，「正文可带走、机器检查带不走」，SKILL.md 宿主口径行已自认，免行动。

### 2.2 方案设计工作面（2026-09-06 起进入求解阶段——材料已集齐，先出方案，无拍板项）

> 阶段说明：语料与材料收集完毕（§3 全部调研 + HERO 细读），现在开始设计解法；以下是方案设计的切入面，不是决策点——每项先出方案再讨论取舍。

1. **技能使用守卫的方案设计**：基于 §3.4 挂载面证据（pre-tool/pre-step/钩子桥）设计「守卫/记录插件」的方案——它管什么、怎么挂、拦了之后回什么消息、记录落哪里。②「该不该用」③「用了没有」的解法从这里出。
2. **防过度编码/过度设计的方案设计**：以 HERO 细读（§3.7）为参照设计解决形态——技能 / 常驻注入块（HERO 是常驻档实例，作者自认非 enforcement）/ 门禁补挂 / 混合，先用 §3.4 谱系逐档过一遍再定。
3. **小落差评估**：钩子自动安装 / 门禁 DAG 并行 / CI 文件名契约闸 / archived-notes 校验件 / 技能 references/ 形态——逐项评估要不要纳入及何时纳入。
4. **技能清单补全**：第一题的「等等」项——架构/编码/注释算不算技能、还缺什么，与用户继续收集归纳（先例参照 = HERO）。
5. **记忆库线开题**：漂移清账已完成，记忆系统连接（含 EvoMap memory-graph 未建面）如何开题，随方案设计阶段排期。

## 3. 调研报告

### 3.1 上游开源确认与健康度

[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)：公开、**MIT**、2026-08-13 建仓、213,381★、25,093 forks、最近推送 2026-09-04（GitHub API 实测，2026-09-06）。「AI 工程流水线 SOP」整套开源在案；**无单独 SOP 仓库**（org 36 仓查遍，全站关键词检索空手），SOP 即 harness 仓内自托管——与我们「体系管自己」同构。CONTRIBUTING.md 明写不收外部 PR：开源形态 = 可读可克隆可蒸馏，非社区共建。

### 3.2 命名考据：「SOP」是我们的话，不是他们的

全仓 `SOP` 词边界检索（md/ts/mjs/json，排除 vendor）**零命中**。他们的词汇体系：

| 我们/对话中的称呼 | 上游自称 |
|---|---|
| SOP | **Development guide**（docs/development.md："setup tutorial + daily workflow + CI organization"） |
| ADR | **Agent Notes**（.agents/notes/，implemented 1315 / archived 350 / proposed 54 / rejected 18） |
| 高风险动作协议 | **skills**（12 个） |
| 质量门 | **Mechanical quality gates** |
| 踩坑库 | **cookbook**（docs/cookbook/，按任务分篇）+ **postmortems**（docs/postmortem/）+ **defensive-patterns**（docs/defensive-patterns.md） |

奠基 ADR（2026-06-11-quality-gates）哲学原句，即「自觉 vs 挂载」问题的上游官方答案：

> "This codebase is developed primarily by coding agents. **Agents follow enforced gates far more reliably than prose conventions.** … Every mechanically checkable AGENTS.md promise gets a command that exits non-zero."

### 3.3 上游协作体系七层全图

1. **常驻层**：AGENTS.md（全局不变量 + 任务路由）+ packages/AGENTS.md（子树所有权）+ CLAUDE.md（= AGENTS.md 的 Claude Code 兼容副本）+ docs/AGENTS.md。
2. **决策记忆层**：Agent Notes 四生命周期（proposed/implemented/rejected/archived），路径即元数据；implemented 与代码同变更同步（只改事实不改决定）；archived 有 pre-commit 挂载校验件（verify-archived-agent-notes）；双语 i18n 配对 + pairing gate + 专用 merge driver。
3. **技能层**：12 个 SKILL.md（archive-agent-notes / ci-test-reliability / code-review / doc / find-simplifications / merging-stacked-prs / pre-push-checks / prose-standard / translate-docs / trim-cot-leakage / record-browser-git），多个带 `references/` 子目录（技能可携带参考资料与模板——我方 7 个全为单文件，可借鉴）。
4. **门禁层**：lefthook（pre-commit/pre-push glob 分域 job；**postinstall 自动安装**）+ scripts/run-gates.ts（**DAG 依赖图 + 有界并行**，16 种聚合模式）+ CI 16 个 workflow（ci.yml 分 static/coverage/snapshots/node-compat 等；expected-filenames.yml 文件名契约闸；sandbox/landlock 沙箱；issue-lifecycle/issue-policy）。
5. **流程层**：docs/development.md（daily workflow）+ incremental-pr-base-retargeting + **event-directed-pr-review-status**（评审交接 webhook 命令化：review_requested → In review、changes_requested → In progress，机器追踪「谁拥有下一步」）+ merging-stacked-prs 技能。
6. **教训层**：postmortems + defensive-patterns + cookbook。
7. **运行时守卫层**：packages/guard（repeat-tool-reminder——明示 "advice, never a block" 的循环提醒；timeout-policy）+ packages/hooks（Claude Code/Codex hook 桥：会话开始/prompt 提交/工具前后/停止前均可触发，**可阻断 prompt 或 tool call 并回模型可见消息**）。

### 3.4 挂载面对照与自觉谱系（本会话核心发现）

强制 = **机械可判定 × 挂载在机器触发点**，缺一不可。自觉谱系（强→弱）：

| 档 | 机制 | 自觉成分 | 上游实例 | 我方现状 |
|---|---|---|---|---|
| 零自觉 | 常驻注入 | 无 | AGENTS.md/CLAUDE.md + HERO paste-in 块 | 同构（根 AGENTS.md） |
| 零自觉 | 机器触发（git 边界） | 无 | lefthook + CI 矩阵 | 同构（pre-commit/pre-push/CI，11 门禁） |
| 零自觉 | 机器触发（运行时） | 无 | **agent/pre-step waterfall（可权威拒绝一步）、tool/call ordered pre（工具前钩子，可阻断并回消息）**、packages/hooks 桥、guard 包 | **未使用**（适配层仅接 system-prompt 节 + 三工具 + agent/created） |
| 全自觉 | 懒加载技能 | 全 | 12 技能同样自觉调用 | 7 技能同 |
| 全自觉 | 流程卡/正文 | 全 | docs/development.md | 流程卡 6 张同 |

上游同样存在语义面自觉缺口（技能使用无强制、评审实质无强制、守卫只到提醒档）——它的领先在**挂载面利用率**，不在全自动。我方评审体系同构缺口：verify-review-brief 仅本地预发射（gates.py 头注），Review 证据行只强制形式。

### 3.5 小落差清单（求解阶段评估：是否纳入、何时纳入）

钩子自动安装（postinstall vs 手动）/ 门禁 DAG 并行调度（run-gates.ts vs gates.py 串行）/ CI 文件名契约闸（expected-filenames.yml）/ archived-notes 校验件 / 技能 references/ 子目录形态。

### 3.6 外部生态（AI 协作类仓库，2026-09-06 检索）

| 仓库 | ★ | 是什么 | 与心源关系 |
|---|---|---|---|
| ciembor/agent-rules-books | 2695 | Clean Code/DDD 等书籍蒸馏成 AGENTS.md 规则/技能 | 同赛道不同层（编码规则 vs 流程治理） |
| agent0ai/dox | 1447 | 自文档化 AGENTS.md | 观察 |
| hoangnb24/repository-harness | 1211 | 把任意仓变成 agent-ready 工作区 | 观察 |
| sno-ai/mda | 616 | Markdown 超集编译出 SKILL.md/AGENTS.md/CLAUDE.md | 技能分发格式先例 |
| mxyhi/ok-skills | 481 | 技能 + AGENTS.md playbooks 合集 | 同赛道 |
| **wanshuiyin/HERO-Anti-OverDefense** | **415** | 四类 agent 过度防御形态 + paste-in 契约 | **防过度设计需求直接先例**（§3.7） |
| marcusquinn/aidevops | 392 | agent 自动化运维工具栈 | 观察 |

### 3.7 HERO-Anti-OverDefense 细读（防过度设计参照实现）

本地克隆 `.cache/hero-anti-overdefense`（MIT）；纯 Markdown 仓，codegraph 零符号可索引（索引器面向代码符号），细读走直读（README/RULES/cases/hosts 全读）。

**四族 + 兄弟形态**（根因假设：agent 优化「不被怪罪」而非「活好」——标注为假设非定论）：

- **H — Hashing**：无人读的校验和/指纹。判据：哈希必须**替代实质上更贵的操作**且结果改变下一步；「有东西读它」太弱（逐行哈希自己也读）。
- **E — Edge cases**：防御**这里**不会发生的输入。整条规则在「here」一词：受支持用法可达 = 真问题必报；「理论上构造得出」不算。
- **R — Rubrics**：用机器替代判断——评分表/清单/对已定论的东西再验。症状：一整夜工作、完整审计轨迹、零功能。
- **O — Overbuild**：为没人要的未来造脚手架——feature flag/迁移框架/兼容层/守卫守卫守卫。
- 兄弟形态（不入四族防分类学稀释）：over-correction（说东错了一点就搬到大西洋）、defensive prose（交付物成答辩记录，SIB-003/004）、stalling（交菜单不选择，「为了不选错而停在原地本身就是选错」）。

**自诊断引句**（模型自述，被作者引为全病总结）：「把『能提升信心』变成『所以必须建和查』——把可选的不确定性缩减悄悄提升为主任务。可选的不确定性缩减是无限的，任务不是。」

**核心判据**：跑任何检查前先回答「这次运行会检测出什么具体的失败？真出现了我下一步会做什么不同的事？」答不上来就别跑（作者自注：此句确实越界约束了搜索面，诚实限定 = 不能对已有怀疑的缺陷保持沉默）。对的就说对，不要为交差硬找问题。

**三刀（规则迭代的修正记录）**：find versus propose（约束修法不约束找问题——文档示例会产生的「罕见」输入是真 bug）；smoke versus theatre（冒烟是最便宜的现实接触，但「真跑已覆盖同路径时另跑冒烟本身就是戏剧」；判据要命名一个**仍然活着的**不确定性）；hash as cache versus evidence（「有东西读」不够，要看**替代了什么**）。

**形态与安装**：paste-in 块进**常驻加载文件**（CLAUDE.md/AGENTS.md 等 7 宿主表）；9 条规则 + 6 个校准形状 + 2 个反例（✓ 报告这些：省重读的摘要、文档示例会产生罕见输入）；精简版半尺寸。**cases/ 目录故意不加载**——agent 带着整本「这是过度防御」案例集会开始拿相似度驳回真发现（恰是契约要防的失败）；案例目录是**事后辩论武器**：agent 坚持要加固时按 ID 引用（HERO-R-003）问它「你的提案与该案例有何不同」。案例四字段贡献格式：被要求什么 / 做了什么 / 为何不成比例 / 成比例的样子。

**诚实局限（原文照录要点）**：it helps, not a switch（社区共识「有点用」）；模型可拒绝（defeasible 自然语言配置，非 enforcement）；**自己的重流程会压过它**（同一 prompt 里 12 阶段流程打赢泛化克制——具体指令 > 泛化偏好，解法 = 重流程自己写清何时开始何时结束）；长会话衰减（显著性稀释 vs compaction 削薄，对策相反，先诊断再补）；换模型也是杠杆。

**与心源的关系**：①它是「常驻注入档」的实例——零自觉注入 + 自觉服从，与 §3.4 谱系完全对位，作者对天花板诚实；②Rule 7/9（交付物非答辩记录、无生成痕迹/AI 标记）与 noo-prose-standard / noo-trim-cot-leakage **同域**——独立收敛的交叉验证；③Rule 8（推进即交付，反 stalling）是我们体系未覆盖的形态；④「契约进常驻 + 案例目录留人工」的分层是防过度设计条目的现成结构参照；⑤作者把「规则被具体流程压过」点为最可能咬人的失败模式——对我们把流程卡写实的做法是直接提醒。

### 3.8 缓存与索引操作信息

- `.cache/deepseek-harness`（142M / 9080 文件，`--filter=blob:none` 浅历史；刷新 = `git -C .cache/deepseek-harness pull && codegraph sync .cache/deepseek-harness`）。codegraph 索引：4911 文件 / 54,487 节点 / 327,356 边。
- `.cache/hero-anti-overdefense`（5.7M，depth 1；纯 Markdown，codegraph 零符号，直读）。
- 排除方式：`.git/info/exclude` 追加 `/.cache/`（本地排除，不进 git、不动 .gitignore）。
- `/mnt/work` 本体只读（沙箱），故缓存落会话仓内。

### 3.9 作用域化规则（agent-instructions 插件）——机制有（平台自带），实例薄（只有两层）

源码实证（`.cache/deepseek-harness/packages/context/agent-instructions/`，五件 1824 行）：

- **发现**：会话 cwd 向上走到项目根（`.git` 标记），构建 root→cwd 祖先链；链上每层目录的 `AGENTS.md`/`CLAUDE.md`（+ `.local` 变体）与用户全局 `~/.dsh/AGENTS.md` 进 baseline，**首请求前入 durable context**；字节预算（默认源 1MB）+ 内容去重 + resume baseline 校验。
- **动态注入**：agent 以 fs 工具**触碰**文件时，计算 cwd→被触文件目录间的后代目录（`descendantDirsBetween`），链上新出现/变更/删除的子目录 AGENTS.md 经 `agent.inject` 合成消息入 inbox（session types.ts:284：file-change notices、**subdir AGENTS.md**、skill content 同族）。
- **本会话两处活体实证**：①会话开场根 AGENTS.md 常驻在 system prompt；②清账批触碰 `.agents/**` 与修改根 AGENTS.md 时，宿主两次注入「Updated instructions from: AGENTS.md/.agents/AGENTS.md …」——作用域规则机制在心源仓**正在运行**。
- **实例面对照**：心源 = 2 个（根 + `.agents/AGENTS.md`）；上游 = 4+ 层（根 / `packages/AGENTS.md` 子树所有权 / `docs/AGENTS.md` 文档规则 / `.agents/notes/AGENTS.md` + `implemented/AGENTS.md`——同步纪律下钻到生命周期子目录层）。心源的 engine/、adapters/dsh/、scripts/、docs/ 等深层无作用域规则，专属约束（零依赖 CommonJS、dispose 契约、gates.json 消费方、门禁判据面）散在 README/ADR/头注，agent 动这些目录时**不会自动被提醒**。
- **与守卫方案设计的关联**：fs 触碰 → 目录作用域注入是一个**已在运行的工具边界挂载先例**（同宿主内零自觉注入的活体），§2.2-1 方案设计可直接引用其形态。
