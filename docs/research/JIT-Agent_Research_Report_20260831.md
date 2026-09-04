# JIT-Agent（github.com/bingreeky/JIT）研究报告

| 项目 | 内容 |
|---|---|
| 研究对象 | [bingreeky/JIT](https://github.com/bingreeky/JIT) — "Scaling Harness Intelligence via Just-in-Time Harness Evolution"（宣称自进化，且效果很大） |
| 论文 | [arXiv:2608.25593](https://arxiv.org/abs/2608.25593)（2026-08-26 v1，cs.CL） |
| 模型 | [JIT-Agent/jit-27b](https://huggingface.co/JIT-Agent/jit-27b)（27.36B，基座 Qwen3.6-27B） |
| 数据 | [JIT-Agent/jit-meta-harness](https://huggingface.co/datasets/JIT-Agent/jit-meta-harness)（2,852 条 / 1,427 任务） |
| 研究日期 | 2026-08-31 |
| 核验方式 | 克隆仓库（jit-repo/，2,906 文件 / 132MB）、下载 arXiv LaTeX 源码（paper/，main.tex 全文通读）、抓取 HF 模型卡与数据集、交叉检索作者与基准上游 |
| 附录 | [附录 A：可移植设计模式骨架](#附录-a可移植设计模式骨架ci-风格生成校验修复-流水线) |

---

## 0. 摘要（结论先行）

1. **真实性：成立。** 论文、模型、训练数据子集、作者（LV-NUS Lab：Guibin Zhang @ NUS SoC，导师 Shuicheng Yan）、基准上游全部真实存在；代码是完整可运行的实现，非占位。
2. **本质：** 训练一个 27B"元智能体"，在推理时为每个任务**现场编写一套可执行的 agent harness**（记忆/规划/行动/工具策略四模块 + prompt），再交给任意现成 LLM 执行——"Model-as-a-Harness"。
3. **"自进化"语义：** 部署期模型权重冻结，进化发生在 **harness 档案库（检索上下文）层面**；训练期通过 Evo-GDPO 学会"提出超越当前前沿的 harness"。**不是权重的自我改进。**
4. **效果：** 宣称相当大（同骨干平均 +7.7~+8.8，单项最高 +24.8，声称"基于 DeepSeek-V4-Flash 超过 GPT-5.6"），但**主表数字当前无法独立复现**：训练代码、最终 checkpoint、评测日志、数值超参、主表样本量均未公开。
5. **价值判断：** 该工作最有价值的部分是把"生成–校验–修复–保守更新"做成可落地工程循环；其收益与反馈信号的结构化程度高度相关——**在确定性门禁/脚本校验/代码编写场景适用，在开放 agent 执行场景价值有限**（详见 §7）。

---

## 1. 真实性核验

### 1.1 仓库

- 公开仓库，2026-08-31 时点：**200 stars、19 forks、3 commits**（Initial release + 两条文档提交），Apache-2.0。
- 体量：2,906 个文件 / 132MB，含 benchmark 数据集（多数数据随仓库发布）。
- 结构完整：`jit/`（元智能体与 best-of-N 管线）、`scripts/`（kernel/工具/模型/评测引擎/双 runner）、`harness_factory/`（11 个手写 harness 种子库）、`benchmark/`（7 个适配器 + vendored 官方评测器）、`dataset/`（7 个基准数据）。

### 1.2 论文

- [arXiv:2608.25593](https://arxiv.org/abs/2608.25593) 真实存在，2026-08-26 提交，cs.CL，16 位作者（一作 Guibin Zhang，通讯 Wangchunshu Zhou、Shuicheng Yan），单位 LV-NUS Lab。
- 内容与仓库 README 完全对应（含仓库布局、用法、引用格式）。

### 1.3 模型与数据（HuggingFace）

- 模型 [JIT-Agent/jit-27b](https://huggingface.co/JIT-Agent/jit-27b)：27.36B BF16，基座 Qwen3.6-27B（Apache 2.0），上下文 262,144，推荐服务长度 163,840；输出五文件标签块格式（`<<<PYTHON_MEMORY>>>…<<<END_YAML>>>`）。
- 模型卡明确：*"The checkpoint builds on the Stage-I harness-customization model and is further trained through **distillation from the final research checkpoint**."* → **发布的是"最终研究 checkpoint"的蒸馏版，不是论文主表用的那个 checkpoint。**
- 数据集 [jit-meta-harness](https://huggingface.co/datasets/JIT-Agent/jit-meta-harness)：2,852 例（1,427 个唯一任务，每任务 1–3 个 harness），字段 = scaffold_id + task_instruction + 四 python 模块 + prompt_yaml，102MB，与论文 Stage I 数据形态一致。

### 1.4 作者与团队

- Guibin Zhang：NUS SoC 的 CS 博士（[LinkedIn](https://sg.linkedin.com/in/guibin-z-65451623a)，导师 Shuicheng Yan）；[ResearchGate](https://www.researchgate.net/scientific-contributions/Guibin-Zhang-2259145567) 显示其 2026 年成果含本篇。
- 团队前作叙事连贯：论文脚注称延续 MemEvolve（记忆演化）→ TodoEvolve（规划演化）→ JIT-Agent（完整 harness 演化）的脉络。

### 1.5 基准数据上游（均真实）

| 仓库键 | 上游 | 随仓库发布 |
|---|---|---|
| xbench | [xbench/DeepSearch](https://huggingface.co/datasets/xbench/DeepSearch)（X-Bench AGI Tracking，prompt 为 canary-XOR 加密） | ✅ 100 例（88KB） |
| deepsearchqa | [google/deepsearchqa](https://huggingface.co/datasets/google/deepsearchqa)（900 prompts，17 领域） | ✅ 900 例（352KB） |
| agentif | [xbench/AgentIF-OneDay](https://huggingface.co/datasets/xbench/AgentIF-OneDay) | ⚠️ 104 题在库，附件 250MB 需下载 |
| officebench | [OfficeBench](https://github.com/zlwang-cs/OfficeBench) | ✅ 295 例（22MB） |
| odyssey | [OdysseyBench](https://github.com/OdysseyBench/OdysseyBench) | ✅ 300 例（55MB） |
| shopping / travel | [Qwen/DeepPlanning](https://huggingface.co/datasets/Qwen/DeepPlanning) | ⚠️ travel 数据库 748MB 需下载 |

### 1.6 代码真实性抽查

- `scripts/kernel/protocols.py`：四个 ABC 接口（BaseMemory / BasePlanning / BaseAction / BaseToolPolicy），签名完整。
- `jit/meta_agent.py`：1,666 行，generate→validate→repair 循环、prompt 模板、超时（60min）、token 预算等均为真实实现。
- `jit/selector.py`：best-of-N 双策略（logprob / judge）+ 静态门禁 + fallback，注释明确"选择时无基准分数、用即泄漏"。
- `scripts/eval/runner.py`：`repair_only_on_error: bool = True` 默认值，`max_repairs` 默认 5。

---

## 2. 核心方法

### 2.1 核心命题：Model-as-a-Harness

> Agent 能力 = 基座模型 × **harness**（决定保留什么历史、如何形成意图、暴露哪些工具、何时校验/恢复的操作脚手架）。与其 AOT（Ahead-of-Time）预编译一个通用框架，不如训练一个元智能体 JIT（Just-in-Time）为当前任务现场合成 harness。

### 2.2 四模块协议

`h = (M, P, A, F)`，运行时依赖序 M→P→F→A：

- **M（Memory）**：从不可变事件历史构建工作视图；
- **P（Planning）**：视图 → 局部指令（无规划器则退化为空指令 d∅，保持类型一致）；
- **F（Capability orchestration）**：按指令裁剪工具/技能注册表；
- **A（Action）**：消费组装上下文，更新控制器状态并发出动作（工具调用 ∪ 终止输出）。

固定协议把"自由 agent 程序"收窄为"结构化、可校验的模块代码"，使生成变为可行、验证变为可判定。

### 2.3 HarnessFactory 种子库

论文表 2 列出 13 个复现的当代脚手架（ReAct、Plan-and-Execute、ReSum、Flash-Searcher、GAM、MemoBrain、AggAgent、OAgent、AgentFold、HiAgent、DeepAgent、ROMA、AOrchestra）；仓库实际提供 11 个（`harness_factory/harnesses/`，每套五文件 + `description.yaml`）。种子库双重角色：Stage I 生成的参考锚点 + 后续档案库的初始种群。

### 2.4 三阶段训练

| 阶段 | 目标 | 数据 | 损失 |
|---|---|---|---|
| **Stage I：定制** | 学会"任务→协议合规 harness" | 更强教师 qϕ 合成，经 ValidΠ 校验才保留；偏好对按"奖励提高 ∧ 效率不恶化 ∧ 至少一维严格变好"（Eq.12 支配关系）构造 | SFT 生成损失 + 参考锚定偏好损失（Eq.13，ref = Stage-I SFT 检查点） |
| **Stage II：修复** | 学会把失败生成修到可执行 | 仅保留**≤2 轮内可修复**的失败轨迹（Eq.16，K⋆≤2）；编译器错误/接口不匹配/运行时异常 → 结构化诊断 → 教师修订 | 逐轮条件修复损失（Eq.18） |
| **Stage III：进化** | 学会提出超越档案前沿的 harness | 在线采样：任务 + 从当前档案 Bn 检索参考 + 同冻结执行器/预算/种子的执行反馈；组大小 G>1 | **Evo-GDPO**（Eq.19-21）：奖励主通道 `rᵢ + λ_evo[rᵢ−b_r]₊`；效率通道以 `𝕀[rᵢ≥b_r]` 门控（成绩不缩水才计分）；三通道各自 z-score 归一化后按 `w_rew > w_lat + w_cost` 合并；含裁剪 + KL 惩罚 |

**档案更新规则（保留规则，训练与部署共用）：** 候选只有在"达到或超过当前奖励前沿，且至少在奖励/延迟/成本某一维上**严格改进**"时才入档；否则档案不变。→ 档案在奖励维上**单调不降**。

### 2.5 推理架构

- **静态推理**（默认）：每任务并行生成 N=3 个 harness（温度 1.0）→ 选择 1 个 → 只执行选中者。测试时扩展候选多样性，不增加环境 rollout。
- **流式推理**：跨任务序列保留经验——执行后评估奖励，按保留规则决定是否写入档案；下一任务的参考集从新档案检索。**生成器 θ 全程冻结**（论文原文："at deployment, θ remains frozen"）。

---

## 3. "自进化"的确切含义（语义辨析）

"自进化"在本文中分三个层次，强度递减：

| 层次 | 内容 | 是否已实现/验证 |
|---|---|---|
| ① 训练期进化能力 | Evo-GDPO 让模型学会"提出超越当前档案前沿的 harness" | 论文声称，无训练代码/日志可验证 |
| ② 部署期档案进化 | 流式模式中 harness 档案库随任务流更新（检索上下文进化） | 论文图（shopping/travel/office 累计准确率流式 > 静态），无数值增益、无日志 |
| ③ 权重自进化 | 模型自身权重随经验更新 | **明确没有**（θ 冻结） |

> 结论："自进化"= "**它产出的工件的进化 + 学会更好产出的能力**"，不是通常意义的 self-improving model。这是诚实但**有边界**的宣称——部署期它是"上下文/记忆层面的进化"。

---

## 4. 宣称的效果（论文主表，未独立复现）

### 4.1 主结果（九基准，0–100 分制）

| 骨干 | 九基准均值（vanilla → JIT） | 增幅 | 代表性单项 |
|---|---|---|---|
| GLM-5.2 | 74.1 → 81.8 | **+7.7** | DeepPlanning-Travel **+20.2**（62.8→83.0）；xBench-DS +12.0；AgentIF +6.9 |
| DeepSeek-V4-Flash | 66.7 → 75.5 | **+8.8** | DeepPlanning-Shopping **+24.8**（59.1→83.9）；xBench-DS +11.9；DeepSearchQA +8.9 |

- 宣称 18 个"骨干×基准"配对全部为正增益。
- 宣称基于开放骨干达到 9 列中的 8 列最优（GLM-5.2 + JIT 在 7 个基准第一）；"DeepSeek-V4-Flash + JIT 超过 GPT-5.6（DeepSearchQA +9.1、OdysseyBench +4.3、PinchBench +8.7）"。
- 注意：OfficeBench +2.4~5.4、OdysseyBench +2.0~3.4——开放工作区任务的增益明显小。

### 4.2 受控 harness 对比（同一骨干、只换 harness，DeepSearchQA / xBench-DS / AgentIF）

- 6 个"骨干×基准"设定中：性能 4/6 第一；**Token 消耗与 API 成本 6/6 最低**；相对最便宜固定 harness 成本降 14.9%–54.1%（平均 36%）。
- 两处例外为有界权衡：DS-Flash@AgentIF 输 Claude Code 3.1 分、Qwen3.6-Flash@DSQA 输 NanoBot 3.9 分，但均用远少 token。

### 4.3 模型对泛化（3 家族 × 2 变体，ReAct vs JIT）

- 24 组配对平均 +7.6；DeepSeek V4 家族平均 +10.2、Mimo 2.5 +8.6、Qwen 3.6 +4.0；DeepSearchQA 平均 +15.2（Mimo-Pro +22.2、DS-Flash +19.0）。
- 注：该图用子集（DSQA 100 例，其他三基准各 50 例）；**主表样本量未声明**。

### 4.4 收益与"反馈结构化程度"的相关性（本研究发现，原论文未点明）

| 任务类型 | 反馈类型 | 最大增益 | 可信度 |
|---|---|---|---|
| Shopping / Travel | 确定性约束检查器 + 本地数据库 | +20~25 | 高 |
| xBench-DS / PinchBench | LLM judge / 评分 | +11~12 | 中 |
| DeepSearchQA | 答案 F1（可确定性计算） | +8.9 | 中 |
| Office / Odyssey | 确定性工件检查 | +2~5 | 高但增益小 |

**规律：改进幅度随"反馈回路有多硬"递减。** 该规律是判定本工作实际价值半径的关键证据（见 §7）。

---

## 5. 可复现性与警戒点

1. **训练代码完全未公开**：仓库中搜索训练相关符号仅命中 vendored 评测代码与 runtime；Stage I/II/III 只存在于论文公式中，无法复现。
2. **发布的 checkpoint ≠ 论文主表用的 checkpoint**：模型卡明示为"最终研究 checkpoint 的蒸馏版"（且 base 于 Stage-I 模型），主表数字与发布权重的一致性不可核。
3. **仓库无任何 runs/ 评测日志**：主表 18 个配对、受控表、模型对图、流式图均无原始轨迹与分数可审计。
4. **论文无一个数值超参**：α_r/α_ℓ/α_κ、β_pref、λ_pref、λ_evo、组大小 G、权重 w、ε_clip、β_KL 全部只有符号；无训练数据规模、无 GPU 时数。
5. **主表评测细节缺失**：未声明样本量、种子、方差/误差棒、各基准 judge 模型；与第三方榜单口径存在出入（如 [benchlm.ai 的 DeepSearchQA 快照](https://benchlm.ai/benchmarks/deepsearchqa) 显示 Claude Opus 5 为 95.0，而论文给 GPT-5.6 为 76.0、JIT+GLM-5.2 为 93.9——需说明子集与评估口径后才能对照）。
6. **9 个评测基准 vs 7 个发布适配器**：BrowseComp-Plus、PinchBench 两列的宣称数字无法从发布物复现。
7. **两条代码路径并存（金标泄漏风险点）**：
   - **发布路径**（`scripts/run_jit.py`）：Phase A 生成 `generate_only=True, max_repairs=0`（代码注释："Generation never executes anything"）→ Phase B 选择（logprob/judge，注释："no benchmark score is available at selection time, and using one would be leakage"）→ Phase C 执行 `repair_only_on_error=True`（低分不修复、抛异常才重生成）。**全程不触碰金标答案。**
   - **非发布路径**（直接调用 `jit/meta_agent.py` 的循环）：`_validate_harness` 会在测试 item 上执行 harness，用 `item.get("answer")` 判 `passed` 并据此修复（L1539、L1580-1625）。**读者若绕过 run_jit 直接使用该循环，会得到金标污染的版本。**
8. **部署期演化缺乏奖励燃料**：流式演化的保留决策依赖奖励信号，论文实验用的是基准金标评估器；真实任务无金标，只能退化为 judge/用户反馈等代理，代理有偏则进化方向有偏。
9. 方法论提醒：harness 是逐实例（per-task）生成的，且生成时可见该题任务描述——这是设计本意（JIT 适应性），但意味着"vanilla 固定 harness"对比并非传统同条件对比。

---

## 6. "演化正向性"保证机制分析（深度）

**总判断：不是形式化保证，而是"分层防护 + 保守更新"的工程组合。可执行性保证强；任务表现"正向"只有统计意义（答案盲选择 + 分数不修复 + 保守前沿更新）。**

### 6.1 可执行性保证（强）

| 层 | 机制 | 依据 |
|---|---|---|
| ① 结构约束 | 生成钉死在四模块 ABC 接口上（protocols.py），输出是"符合接口的结构化代码"而非自由程序 | `scripts/kernel/protocols.py` |
| ② 静态门禁 | 候选必须吐全 5 个标签块（n_sub==5），不完整者不参与选择 | `jit/selector.py::_pick` |
| ③ 沙箱执行验证 | 真实装上 AgentRuntime 跑一遍：60min 超时、步数预算、模型调用预算 3×max_steps；捕获 import 错误/接口不匹配/运行时异常 → 结构化诊断 | `jit/meta_agent.py::_validate_harness`（L1229-1300） |
| ④ 有界修复 | `--max-repairs` 限制轮数；训练侧 Stage II 只保留 ≤2 轮可修复轨迹（论文 Eq.16） | `runner.py`、论文 §4.2 |
| ⑤ 兜底 | 无有效候选时退回 rollout 0，不丢弃 case（不悄悄缩小评测集） | `selector.py` L52-54 |

### 6.2 任务表现"正向"保证（弱 / 统计）

1. **答案盲选择**：logprob（模型对候选的 teacher-forced 似然 = 自信度代理）或 judge（另一模型看"任务+设计"挑选）；代码注释明确"使用即泄漏"。→ 选择代理信号 ≠ 金标分。
2. **低分不修复**：`repair_only_on_error=True`——门禁失败才重试，评分低绝不针对基准优化（防过拟合/防泄漏）。
3. **保守存档更新**：只有"达到前沿且严格改进至少一维"才入档；否则档案不变 → **档案奖励前沿单调不降**（更差的 harness 永不污染存档）。
4. **Evo-GDPO 奖励门控**：效率通道以 `𝕀[rᵢ≥b_r]` 激活（防"牺牲准确率换低延迟"被奖励）；三通道分别 z-score 归一化后按 `w_rew > w_lat + w_cost` 合并。
5. **去噪比较**：奖励/延迟/成本取重复 rollout 平均（相同骨干、相同种子）后才比较（Eq.12）。
6. **训练期信号同构**：Stage I 偏好对要求帕累托式支配；Stage II 只学"短视界、高杠杆"修复。
7. **语义护栏**：检索上下文只来自"被验证过更好"的档案 → 潜在正反馈。

### 6.3 三层防线之外的边界（必须声明）

1. **选择代理可能选错**：logprob 是自信度、judge 是 LLM 主观偏好，二者都无法保证选中最优；best-of-N 全差时退回 rollout 0 只是"不缩水评测集"，不是"不退化表现"。
2. **部署无金标**：真实任务的"进化决策"只能依赖代理奖励；论文的流式演化实验用的是基准自己的评估器（评测合法，落地不成立）。
3. **无负向护栏**：保留规则保护档案，但不保护"每轮生成"；任务分布漂移时，历史最优档案可能反过来拖累新任务（无检出/回退机制）。
4. **非发布路径的泄漏风险**：`meta_agent.py` 的直接循环用金标判 passed 并驱动修复（§5.7），误用会污染结果。

### 6.4 小结

"正向性"来自工程护栏而非数学保证：结构协议 + 沙箱执行验证 ⇒ 可执行基本有保障；答案盲选择 + 分数不修复 + 保守前沿更新 + 奖励门控 ⇒ 表现统计性偏向正漂移。设计克制（尤其"选择防泄漏、低分不修复"），但防线边界清晰。逐候选可审计资产：`select/selection.json`（选择规则、fallback 数、每候选 n_sub）、`execute/cases/<qid>/rollout_0/`（轨迹与分数）。

---

## 7. 实践价值评估（本研究结论）

### 7.1 价值分布规律（由 4.4 支撑）

**收益 ∝ 反馈回路的结构化程度。** 据此把应用场景分三档：

| 档位 | 场景 | 反馈信号 | 价值 |
|---|---|---|---|
| 高 | 确定性门禁、脚本校验、代码/配置生成、CI、约束可判定的规划任务 | 编译/测试/约束检查器（硬） | **高**：演化可精确吃到"差在哪"，收敛可预期 |
| 中 | 带评分题的半结构化任务（LLM judge 或可计算指标） | 评分（软） | 中：收益存在但噪声大、审计弱 |
| 低 | 开放 agent 执行（web agent、通用助手），部署态无金标 | 无稳定判别器 | **低**：演化无燃料，增益不可信，退化为"LLM 写框架、LLM 评框架、LLM 执行"的三层泡泡 |

### 7.2 可移植的五条设计模式（来自本工作，可独立复用）

1. **协议约束生成**：让 LLM 输出满足你定义接口/格式的结构化产物（对应四模块协议），可校验性从源头建立。
2. **有界修复 + 结构化诊断**：错误原文回喂 → 限 N 轮（作者只保留 2 轮内修好的，防止不可修复错误无限放大成本）。
3. **只修异常、不修低分**（`repair_only_on_error`）：一切"LLM 写代码"流水线的纪律——避免针对弱评分者过拟合。
4. **保守存档**：只有"严格更好且不回归"的产物才进版本库/参考集。
5. **答案盲选择**：候选比较不用 ground truth（best-of-N 用 logprob/judge），防评测集泄漏。

### 7.3 建议的独立验证路径（最低成本）

```bash
# 静态推理模式即可复现"生成→选择→执行→评分"全链路
python -m scripts.run_jit --bench xbench \
  --meta-model <托管API模型> --meta-base <API base> \
  --selector judge --rollouts 3 --max-samples 5
```

- 需要 SERPER_KEY / JINA_KEY（web_search、crawl_page）；5 例即可观察到选择规则、fallback 数与轨迹质量。
- 判断真伪的审计点：`select/selection.json` 的 `rule` 分布（若钉死 `{"0": N}` 说明选择静默 fallback）、`execute/` 轨迹的步数与 token、以及实际答案质量。

---

## 8. 参考链接

- 仓库：[https://github.com/bingreeky/JIT](https://github.com/bingreeky/JIT)
- 论文：[arXiv:2608.25593](https://arxiv.org/abs/2608.25593)｜[HTML 全文](https://arxiv.org/html/2608.25593v1)
- 模型：[JIT-Agent/jit-27b](https://huggingface.co/JIT-Agent/jit-27b)
- 数据：[JIT-Agent/jit-meta-harness](https://huggingface.co/datasets/JIT-Agent/jit-meta-harness)
- 基准上游：[google/deepsearchqa](https://huggingface.co/datasets/google/deepsearchqa)｜[xbench/DeepSearch](https://huggingface.co/datasets/xbench/DeepSearch)｜[Qwen/DeepPlanning](https://huggingface.co/datasets/Qwen/DeepPlanning)
- 作者：[Guibin Zhang LinkedIn](https://sg.linkedin.com/in/guibin-z-65451623a)｜[ResearchGate](https://www.researchgate.net/scientific-contributions/Guibin-Zhang-2259145567)
- 第三方口径：[benchlm.ai DeepSearchQA 榜单](https://benchlm.ai/benchmarks/deepsearchqa)
- 本研究物证：克隆仓库本地路径 `jit-repo/`；论文源码 `paper/main.tex`（已全文通读）

---

## 附录 A：可移植设计模式骨架（CI 风格"生成–校验–修复"流水线）

面向"LLM 按接口生成脚本/代码"的日常场景，将该工作的机制压缩为最小可复用骨架（伪代码）：

```python
MAX_REPAIRS = 2            # 规则 2：有界修复（作者训练数据只保留 2 轮内修好的）

def run_pipeline(task: str, interface_schema: dict, env: dict) -> Artifact:
    # ---- 规则 1：协议约束生成 ----
    artifact = llm_generate(task, schema=interface_schema, refs=retrieve_from_bank(task))
    if not validate_static_completeness(artifact):          # 规则：静态门禁（如必须含全部必需文件/符号）
        artifact = regenerate(task, reason="incomplete")    # 重新生成，不修复
        if not complete(artifact):
            return fallback()                               # 兜底：不悄悄丢弃，记录 fallback

    for attempt in range(MAX_REPAIRS + 1):
        # ---- 规则：沙箱执行验证 ----
        report = run_in_sandbox(artifact, env, timeout=..., step_budget=...)
        if report.ok:
            break
        if not is_exception(report):                        # 规则 3：只修异常、不修低分
            break                                           # 低分不触发修复（防针对弱评分过拟合）
        artifact = repair(artifact, diagnostics=report.error_text, history=prev_errors)
    return artifact

def update_bank(bank, task, artifact, result):              # 规则 4：保守存档
    inc = bank.incumbent(task)
    is_admissible = (result.reward >= inc.reward
                     and (result.latency < inc.latency or result.cost < inc.cost))
    if is_admissible:
        bank.store(task, artifact, result)                  # 只有严格改进才入档
    # 否则档案不变 → 档案前沿单调不降

def select_best(candidates):                                # 规则 5：答案盲选择
    # 用模型自信度（logprob）或独立评判（judge）；绝不用 ground-truth 答案
    return pick_by_logprob_or_judge(candidates, task_only=True)
```

配套纪律：比较候选用重复运行平均、固定种子；任何"评分低"不进入修复；每轮产物留审计日志（选择了谁、规则是什么、每候选完整性）。