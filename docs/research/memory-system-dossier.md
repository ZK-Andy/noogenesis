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
- **2026-09-10 融合轮开题拍板**：边界形态 = 按机制收、按两半裁（不收自动沉淀全家）；机制吸收补丁清单与待拍板三项 = [2026-09-10-memory-line-fusion-charter](../../.agents/notes/proposed/architecture/2026-09-10-memory-line-fusion-charter.md)。

## 行动区

- [x] **开题方向拍板**（2026-09-10 用户三选一）：**dsh-continual-evolve 融合轮前半场**——本地记忆库立项与本仓 memory-graph 最小版均否决（本仓先建会与旧体系融合撞形态）；memory-graph 落地形态 = Event 派生追加轨 + 引擎 Select 消费（纯离线，零会话扫描）；剩余工作 = 融合轮排期（见下条）。
- [ ] **融合轮待拍板**（开题 + 接口契约 + 代码归属 = 本仓已拍 2026-09-10）：① 痕迹提炼面归属（挂起）② 实现顺序与第一期交付 ③ 行为评估自建形态与第二期范围——契约、吸收补丁与 D8 观测输入面见 [融合立宪 ADR](../../.agents/notes/proposed/architecture/2026-09-10-memory-line-fusion-charter.md)。痕迹提炼 v0 候选（session-close 摩擦点寻址，零引擎改动）若提前独立先跑，须落在该 ADR D4 的触发与对象口径内。

## 触发条件

- 文档漂移清账 ✅（2026-09-06）。
- 架构定稿 ✅（charter implemented + 蓝图定稿，2026-09-08）。
- 结论：两线触发均已满足；融合轮已开题（2026-09-10），边界已拍，待拍板三项在 ADR。

## 状态日志

- 2026-09-06｜用户定调「处理完文档漂移再说」；痕迹提炼面拍板「记录但不急，归融合轮」（journal 在案）。
- 2026-09-08｜开题前置（漂移清账 + 架构定稿）全部满足，排期未定（优化轮文档状态注，时点在案）。
- 2026-09-10｜开题讨论轮：拆词定名 + 懒加载/本地共享五层边界分析 + 档案页制度画像（痛点 = 状态投影无家 + 记录无 schema）；用户拍板 = 先以记忆库线试点档案页。**制度化（全仓推广 + 机器闸 + ADR）待试点评估后另批，本页 tier 归口（research vs 当下状态）随制度化一并拍。**
- 2026-09-10｜**开题方向拍板：融合轮**（三选一收口；本地记忆库立项 / 本仓 memory-graph 最小版均否决）。线状态 = 待融合轮排期；痕迹提炼 v0 是否提前零改动先跑，随排期评估。
- 2026-09-10｜**融合轮开题讨论轮**：旧引擎缺陷存档取证（work 区 `HANDOFF.md` 第 18 条 + 本仓 cookbook 两条 + work 区 `OBSERVATION.md` 形态结论）→ 定判「按仓库整体融合会带缺陷、按机制逐件收不会」；用户拍板边界 = 按机制收 + 收机制换触发与对象（不收自动沉淀全家），memory-graph 的家 = 本仓 `events/` 演化轨。落 [融合立宪 ADR](../../.agents/notes/proposed/architecture/2026-09-10-memory-line-fusion-charter.md)（proposed）；代码归属 / 痕迹提炼面归属 / 实现顺序三项显式挂起。
- 2026-09-10｜**接口契约拍板（同会话续）**：四类接口中三类向内、仅一类向外 → ① 事件轨 kind 准入 = 可复算才进轨，memory-graph 的边为派生数据（Select 现算 + 可选缓存，不进 git）② 验证面 = 行为评估落适配层（可复算部分物化为白名单命令、LLM 判断只作 evidence 指针）③ 宿主挂载面暂不立（触发 = 两者同装）④ 向外只读证据面暂不立。代码归属随接口形态倾向本仓，待确认；新增待裁项 = 行为评估自建形态与第二期范围。
- 2026-09-10｜**D8 输入面 + 代码归属落定**：D7-1 留下的洞（`used`/`outcome` 不进轨则边无输入源）由 **D8 独立 append-only 观测输入面**（gitignored、可丢弃、边现算）补上；**机制代码归属 = 本仓**（向外接口全判暂不立后唯一自洽落点）。余项待拍板 = 痕迹提炼面归属（挂起）/ 实现顺序与第一期交付 / 行为评估自建与第二期范围。
