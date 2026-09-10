# 记忆库线档案页

> 本线状态的**唯一行动区**（档案页制度首个试点，2026-09-10 用户拍板）：一个主题一个状态家，其余提及处（HANDOFF 滚动窗、ADR、journal、设计稿）只放指针、不复述状态。
> 骨架四段固定：决策指针 / 行动区 / 触发条件 / 状态日志；结构漂移待制度化批加机器闸。
> 迁入源：[HANDOFF-todos](../../HANDOFF-todos.md) 痕迹提炼面 D 条（2026-09-10 迁出）+ [优化轮文档](capsule-01-optimization-round.md) §2.1 记忆库条与 §2.2-5 开题条（同批迁出，迁出处留一行指针）。

## 决策指针

决策不落本页，本段只列指针：

- **记忆库线排框架重建后**：charter ADR [2026-09-06-framework-rebuild-charter](../../.agents/notes/implemented/architecture/2026-09-06-framework-rebuild-charter.md) 时序节。
- **痕迹提炼面边界**（非自动沉淀复刻、不让引擎扫会话，只议 session-close 摩擦点落点是否可寻址）：设计稿 [§13.5](dsh-swarm-evolution-framework-design.md) + 2026-09-06 迁移拍板（journal 2026-09 卷）；实物参照 = 旧项目 OBSERVATION 观察生命周期协议（work 区）。
- **2026-09-10 讨论轮拆词定名**：记忆库线 = 引擎记忆原语（memory-graph）+ 痕迹提炼面两件，**不立项「知识库/记忆库」新存储工程**（durable 四家即知识库）；记录类表格化的正身 = Event/memory-graph 追加轨；知识库整体入库（SQLite/RAG）在 92 件自有文档规模下否决（diff 评审/机器门禁/agent 阅读三消费者均被破坏）。
- **设计基准**：[dsh-swarm-evolution-framework-design.md](dsh-swarm-evolution-framework-design.md) §6（memory-graph 原语表）+ §13 未决问题 5（与 dsh-continual-evolve 融合边界）。

## 行动区

- [ ] **记忆库线开题：方向拍板三选一**——本地记忆库立项 / memory-graph 原语（本仓最小版）/ dsh-continual-evolve 融合轮前半场。2026-09-10 讨论倾向：选融合轮（架构定稿已满足触发；本仓先建会与旧体系融合时撞形态）；memory-graph 落地形态 = Event 派生追加轨 + 引擎 Select 消费（纯离线，零会话扫描）。懒加载面：memory-graph 零 token（不注入上下文，Select 时才读），无需新加载机制。
- [ ] **痕迹提炼面归融合轮**（2026-09-06 拍板记录不急，触发 = 架构定稿——已满足）：「纪律留痕→无人提炼→下会话考古」缺口；v0 候选 = session-close 摩擦点寻址（grep `tool/result` 评审痕迹对账），零引擎改动。

## 触发条件

- 文档漂移清账 ✅（2026-09-06）。
- 架构定稿 ✅（charter implemented + 蓝图定稿，2026-09-08）。
- 结论：两线触发均已满足，排期随优化轮问题池排队，方向待拍板。

## 状态日志

- 2026-09-06｜用户定调「处理完文档漂移再说」；痕迹提炼面拍板「记录但不急，归融合轮」（journal 在案）。
- 2026-09-08｜开题前置（漂移清账 + 架构定稿）全部满足，排期未定（优化轮文档状态注，时点在案）。
- 2026-09-10｜开题讨论轮：拆词定名 + 懒加载/本地共享五层边界分析 + 档案页制度画像（痛点 = 状态投影无家 + 记录无 schema）；用户拍板 = 先以记忆库线试点档案页。**制度化（全仓推广 + 机器闸 + ADR）待试点评估后另批，本页 tier 归口（research vs 当下状态）随制度化一并拍。**
