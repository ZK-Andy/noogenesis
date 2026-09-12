# 文档标准（元规则）

> Provenance：蒸馏自 devops-template `docs/方法论提炼.md` §2 与 dotnet-deepseek-harness-desktop 文档纪律（MIT，2026-09-05）；tier taxonomy 按心源四层精简，双语/生成式目录层按本仓决策删除。

## 1. Tier：每个事实只有一个家

| 层 | 职责 | 明确禁止放这里 |
|---|---|---|
| 根 AGENTS.md | 常驻命令，每条 1-3 行 + 链接 | 故事、示例、情境流程、重复他处内容 |
| .agents/AGENTS.md | 协作层专属规则 | 根文件已承载的仓库级规则 |
| docs/method/ | 方法论正文（被演化的内容域） | 项目当下的状态快照（→README/ADR） |
| docs/research/ | 设计文档与调研（设计意图与外部解剖，非当下状态） | 当前状态快照（→README/ADR）、方法论正文（→method） |
| docs/state/ | 主题状态页（档案页）——一个主题一个状态家，骨架四段封闭集 | durable 结论（→ADR）、方法论正文（→method）、调研稿（→research） |
| docs/cookbook.md | 带域标签的踩坑原子（procedure） | 设计理由（→ 所链接的 ADR） |
| ADR | 活跃决策：为什么、放弃了什么、需要什么验证 | 迁移计划、验收清单、spec 用语 |
| README | 项目契约：是什么、怎么用、当前计数 | JSDoc/目录复述、他处事项 |
| journal/ + HANDOFF | 过程叙事与交接（有界） | durable 结论（只落上表各层） |

放置口诀：**bugs → cookbook；rationale → ADR；procedures → cookbook/method；contracts → README；standing orders → AGENTS.md + 链接。**

### 主题状态页（`docs/state/`）

- **立页判据**：跨会话未决项 ≥3 且状态散落 ≥2 处，或有独立触发条件与状态日志——不满足不立（不预铺空页）。
- **骨架四段（封闭集，按序）**：`## 决策指针`（只列指针，每条带相对链接）→ `## 行动区`（`- [ ]` / `- [x]` 条目，open ≤12）→ `## 触发条件`（待观察面）→ `## 状态日志`（`- YYYY-MM-DD｜` 条目，≤40 条，超限把最旧条目压缩为一行）。第五个 `##` 节违规——新素材归其 tier 的家。
- **头部说明块**：H1 + 首个 `##` 之前至少一行 `> `（自述唯一状态家身份与迁入源）。
- **摩擦点落点**（「可寻址」验收单源）：踩坑 → [cookbook](../cookbook.md)；方法论 → 本目录；决策 → ADR；叙事 → `journal/`；未决 → [演化轮池](../../HANDOFF-evolution-pool.md) + [行动区](../../HANDOFF-todos.md)；主题状态 → 本层档案页。
- **冻结通道**：主题收口后迁 `docs/research/` 作调研档案（先例 = [优化轮文档](../research/capsule-01-optimization-round.md)）。
- 机器闸 = `verify-dossier-format`（立项 = [制度 ADR](../../.agents/notes/implemented/process/2026-09-13-dossier-institution.md)）。

## 2. 写作铁律

1. **写当前状态，不写变更历史**：durable 文档禁止 "previously / now / no longer / used to / renamed"、PR 号、提交哈希叙事；变更故事只能进 commit/PR/ADR。
2. **每自然段一行**，编辑器软换行；代码块/表格保持格式。
3. **交叉引用用相对 Markdown 路径**，`verify-md-links` 拒绝缺失目标和死锚点——禁止裸文件名或笔记编号。
4. **用具体术语点名**：写 `contract`/`boundary`/`shape` 前先问有没有更精确的词（`response fields` 而非 `response shape`）。
5. **文档中的代码块必须可运行/可编译**，或明确标注为示意；粘贴类型声明防漂移。
6. **可推导的计数与清单不进正文，除非它被闸看住**：命令数、门禁条数、条目数这类能从单源推出来的数字写进 prose 就是漂移面——要么改指单源（`bin.ts` usage、`gates.mts --list`），要么落成**被门禁逐处校核的锚点**（如 CLI 命令数由 `verify-command-surface` 同步）；无闸覆盖的计数不进正文。
7. **流程卡与阶段卡写成步序，不写成名词清单**：每个阶段必须写明**步序**（谁先谁后）、**角色位**（哪步是人、哪步是 agent）、**关口**（哪一步停下等确认/等闸过，未过不得继续）。只有出口清单与产出物的阶段会被按最低成本解释——「产出 = 某物」不构成完成判据。义务面 = **新增与改写的阶段卡**；存量卡在其下一次被改到时一并补齐（不设专项 retrofit 批）。（出处 = ADR [2026-09-11-stage-card-structure](../../.agents/notes/implemented/process/2026-09-11-stage-card-structure.md)；评审兜底 = 根 AGENTS「评审检查项」第 6 条。）

## 3. Slop 清单（审计全部散文时按此对号）

- 同一规则出现在多个家 → `grep` 标志性短语，留一家其余改链接
- 叙事史/战争故事（"previously"、"now"、"renamed"…）
- 实现状态标注（"implemented!"、"future: …"）——状态会腐烂
- 手抄目录/清单——源头或生成器才是权威
- 推理过程转写（分步实现叙事、明显分支的证明）
- 并列兄弟条目旁重复的理由——只留拥有方一处
- 段落墙（一段多规则 + 括注）——单段 ≤120 词，多契约拆小节/表格
- 强调通胀（满屏 bold/CAPS/"critically"——强调只留给改变行为的从句）

## 4. CoT 泄漏治理

**判定唯一测试**：*一个在 HEAD 的读者，拿不到任何会话记录、PR 线程、未提交草稿，能否解析每个引用、验证每个断言？* 不能 → 从仓库视角重述存活的实情、删除其余。

八类泄漏与 keep 规则的完整分类学见技能 `noo-trim-cot-leakage`（单一事实源在彼，此处不重述）。

## 5. 字数预算

manifest 驱动（`scripts/doc-budgets.manifest.json`）：超限处理序 = 迁移到其他层（留一行链接）→ 精简 → 才允许提额度（`_justify_bump` 留理由）。**预算过低本身是 bug**——提额度必须说清净增量。

## 6. 证据严肃性

对推断与测量数字（ADR/文档通用）：推断成因标【推断 · 未证】；测量数字带 n + 实验设置，n<3 标【探索性】；勘误走 Erratum 通道（详见 [.agents/notes/README.md](../../.agents/notes/README.md)）。
