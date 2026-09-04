# Agent Note: EvoMap/EvoX 引擎码级解剖（发动机架构底座）

Status: proposed

> Provenance：本仓原创调研（2026-09-05，gh CLI + fork 考古；分析对象为第三方仓库源码，提炼不搬运——合规姿态见 Alternatives）。引擎**更新史解剖**（一周长成的里程碑序列与可借思路）在 [evomap-evolver-engine-evolution.md](../../../../docs/research/evomap-evolver-engine-evolution.md)；本地镜像 `/.research-mirror/`（gitignored）。

## Problem

P1 演化发动机的讨论此前停在理念层：设计稿 §3 对 EvoMap/EvoX 的提炼是**文档级**的（自述结论 + Behind EvoMap 批判），缺**码级**实证——四接口（select/propose/evaluate/solidify）切法是否经过实战、记忆图的真实复杂度、验证闸的真实形态，都无源码依据。直接拍 Gene schema 会拍在想象上。

**考古线索**（官方渠道已清痕）：EvoMap/evolver 公开 git 历史被重写——起头即 v1.66.0 且从首提交起全为 `_0x` 混淆码（source-available 转型公告在第 4 个提交）；npm 撤下 1.67.0 前全部版本。**fork 网络保留了原始可读源码**：

- `andipermana8/evolver@41f95e0`（2026-02-03，MIT 时代 v1.0.38）：单文件原型"Capability Evolver"（OpenClaw 时代：扫会话日志→自修→随机漂移防局部最优）。
- `bit-cook/evolver@fa7a011`（2026-03-09 快照，121 提交，MIT 时代）：**GEP 引擎全可读**——`evolve.js` 1704 行 + 32 个 gep 模块（含 memoryGraph/selector/solidify/mutation/validationReport/signals/reflection）。
- `djun/evolver@105cd5b`（2026-02-10，50 提交）为中间态旁证。
- EvoX 侧：`EMI-Group/genesis`（Elixir，AGPL-3.0，公开全可读）；EMI-Group/evox 为 GPU 演化计算库（另一物，勿混）。

## Proposal

将码级实证记录为发动机架构与 Gene schema 拍板的底座，四个结论进架构 ADR：

1. **四接口切法经过实战印证**（非我们的发明）：evolver 实际模块与 `select/propose/evaluate/solidify` 一一对应——`gep/selector.js`（模式匹配打分 + 记忆图建议）↔ select；`gep/prompt.js`（gene.strategy 编译进提示词）↔ propose；`gep/validationReport.js`（真跑 gene.validation 命令收 exit code）+ 约束检查（max_files/forbidden_paths）+ **canary**（隔离子进程加载入口文件，"daemon 带坏代码重启前最后的安全网"）↔ evaluate；`gep/solidify.js`（四道闸任一失败即 `buildFailureReason` 拒入档，rollbackOnFailure）↔ solidify。
2. **记忆图真实复杂度 = 核心 ~200 行**，参数可直接借鉴：边 `(signal_key::gene_id) → {success, fail, last_ts}`；期望成功率 Laplace 平滑 `p=(s+1)/(n+2)`；指数半衰期衰减 `w=0.5^(age/30天)`，价值 `p×w`；信号相似度 Jaccard ≥ 0.34 算同情境；两条 ban 规则（低于效率阈值 / 全局持续差评）；输出仅 `memory_prefer` + `memory_ban` 两清单；`--drift` 绕过 ban（随机漂移逃局部最优）。
3. **Genesis 的世界观**（P2 基因，P1 不做）：时间维 = git 本身（PhyloGraphNode：base_commit 固定、current_commit 前进、diff 评估部分进度、crossover 即 git merge）；空间维 = 子目录递归分解（ContextNode）；agent 有限生命（SQLite 任务账本带租约），**只有被接受的结果被后来的 agent 继承**。
4. **P1 发动机骨架据此定稿**：独立 CLI（零 DSH 依赖，裸仓自洽——"发动机不插电也能转"）；四命令 + Gene/Event 最小 schema；首批 gene 从本仓 AGENTS/流程卡/门禁手工策展翻译（不自动生成，#18 负结果约束）；钩子/DSH 插件为 M2 适配层。

合规姿态：只研读 MIT 时代 fork 快照（41f95e0 / fa7a011）；GPL/AGPL 时代代码只取思想；克隆已删除，证据 = 本节 SHA（可复现）；按本仓"提炼后搬迁"纪律，未来引擎代码零第三方源码拷贝。

## Alternatives considered

- **直接照搬 evolver/genesis 代码**：落败——evolver 现行 GPL/转 source-available 且循环体已混淆；genesis AGPL；且其演化对象（代码仓库/长程软件世界）与本仓（方法论文档）体量错配，设计稿 §3 早已否定照搬。
- **只信设计稿文档级提炼、不做码级调研**：落败——本轮已实证文档级结论有两处需修正精度：①记忆图远比"因果记忆图驱动选择"的抽象表述简单可落地；②evolver 循环的三道闸（约束/验证/canary）是文档未展开的硬结构。
- **把 fork 克隆留在工作区备查**：落败——工作区常驻第三方 GPL 源码拷贝是合规隐患；SHA 指针 + 重克隆即可复现。

## Acceptance criteria

- 后续 Gene schema ADR 与引擎架构 ADR 的四接口签名、记忆图参数（半衰期/平滑/相似度阈值/ban 规则）、canary-入档闸，均能引用本 ADR 的实证条目为据。
- 本仓 git 历史与工作区无任何 evolver/genesis 源码文件（`git log --all --diff-filter=A -- '*evolver*' '*genesis*'` 为空；`find . -name "_0x*"` 无果）。

## Risks

- fork 快照可能被 fork 主删除/转私有——证据以 SHA 记录，但届时需重找其他 fork（843 个，2026-02 上旬窗口内多个）。
- 混淆版现行行为可能与 MIT 时代实现有漂移——本 ADR 只声称"机制思路实证"，不声称对应当前版本行为。
- 记忆图参数（半衰期 30 天等）是 evolver 对其"代码演化"域的调参——迁到"方法论文档"域时需按本仓节奏重调，不得当默认值照抄。
