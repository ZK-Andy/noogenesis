# Agent Note: Mutation 原语——落盘协议、写读命令与校验（批次 1 序 2）

Status: implemented
Review: FULL/2026-09-13/R1=ok R2=ok R3=ok

Related: 批次表 [2026-09-13-feature-completion-backlog](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · 相邻原语 [Capsule 原语](2026-09-13-capsule-primitive.md)（序 1） · 主设计 [§5.1/§6](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 既有协议 [gene-event-schema](2026-09-05-gene-event-schema.md)（S1–S3） · 骨架拍板 [p1-engine-skeleton](2026-09-05-p1-engine-skeleton.md)（D2/D3） · 新顶层目录准入 [architecture-standards](../../../../docs/method/architecture-standards.md)（R2）

## Problem

批次表序 2 的 Mutation 原语只有主设计 §5.1 的一行字段表（`category` / `target` / `expected_effect` / `risk_level`），协议面（落盘 / 写读命令 / 校验 / 复算）完全没有家；同时它压在三条既有拍板上，必须同批处理：

- **骨架 D3 被否选项 C**（引擎产变异骨架人补全）——否决理由写的是「Mutation 原语提前入场，违反最小闭环拍板；其合理内核留待 M2/P3 蒸馏轮」。本项即该内核的兑现，须与 C 的形态划清：C 是引擎**代拟**声明内容，本批只提供协议与闸。
- **schema S2 的 kind 封闭集与事件键集**（现四件、两面条件化）——新增第三面须重拍。
- **主设计 §5.1 把 `mutation_id` 列进 Event**，属批次表序 3——两序的边界须写死，否则要么字段先于原语，要么原语落在没有消费面的真空中。

落位判据来自下游：§6 的 Hypothesize（批次表序 16）要记「信号 + gene + mutation → 预期结果」，其左边第二项要求 mutation 是**可引用对象**；而「声明了但未执行」在 Capsule 面没有落点（Capsule 的存在前提是执行已发生）。

## Decision

### C1（语义与落位）：`mutations/` = Mutation 原语目录，语义以主设计 §5.1 为准

- Mutation = **执行前的意图声明**：改什么（`target`）、预期什么（`expected_effect`）、什么类别与多大风险（`category` / `risk_level`）。它是主设计 §6 Mutate 阶段的产物，发生在 Execute 之前。
- 与 Capsule 是同一循环的两端，**不合并**：Capsule 记执行后的事实（`outcome` / `evidence` / 可复现路径），Mutation 记执行前的意图；声明而未执行是合法状态，合并会让它失去落点。
- 目录属**数据面**（与 `genes/` / `capsules/` / `events/` 同级），新顶层目录准入四问见 C6。

### C2（落盘协议）：`mutations/<domain>/<id>.json`，封闭六字段

镜像 S1 的结构纪律（ID = 文件名、`domain` = 父目录、全树 id 唯一、封闭 schema、JSON）。

| 字段 | 类型 | 语义 |
|---|---|---|
| `id` | string | kebab-case，= 文件名 |
| `domain` | string | kebab-case，= 父目录（对齐胶囊域） |
| `category` | string | 意图类别（自由非空串） |
| `target` | string | 改动面声明（自由非空串：路径 / 目录 / 域） |
| `expected_effect` | string | 预期结果 |
| `risk_level` | string | 封闭三值 `low` / `medium` / `high`（设计 §5.1） |

- `category` / `target` / `expected_effect` **不收封闭枚举**：主设计未给值域，且 gene 域 taxonomy 本身仍是未决问题（主设计 §13-1，批次表序 23）——预设类别表 = 为一个尚不存在的种群造分类法。强度上限与触发写在 Consequences。
- **不收的字段**（逐条理由）：`gene_ids`——基因链接在主设计的 Event 面（`genes_used`）与 Hypothesize（序 16），Mutation 本身要能被不同 gene 复用；`signals`——§5.1 未列，信号面在 Event（`signals`）与 Select；`outcome` / `evidence`——声明没有结果，事实面归 Capsule；`mutation_id`——自身即 id。

### C3（写读命令）：`mutation add` / `mutation show`，写路径与基因/Capsule 共用原子提交面

- `mutation add <candidate.json> --actor N`：结构闸 → 落 `mutations/` + 追加 `mutation.added` 事件 → 两者同一 commit；commit 失败回滚工作树**与索引**（同一 `commitPaths`，只清工作树会让回滚的记录以暂存态残留）。
- `mutation show <domain>/<id>`：确定性渲染人读面（`[noo-mutation <domain>/<id>]` + category / risk / target / expected effect）。
- **append-only**：同 id 重复声明拒收——声明一旦落盘即审计链一环，改主意 = 用新 id 再声明（无 `mutation.updated` / `mutation.retired` 面）。与 Capsule 同款，复算规则因此保持单向。
- **人工在环**：无自动 Mutate 位点（A8 会话事件轨已撤除）；引擎不构造声明内容、不跑门禁、不检查声明能否兑现——声明由调用方（人 / 经人许可的 agent）在动改动面之前显式给出。

### C4（校验闸与复算）：扩展 `verify-gene-format.mts`，不新增门禁件

- 新增 `mutations/` 一节：布局封闭、schema 封闭六字段、跨域 id 唯一（事件只记 id，引用必须无歧义）。
- **S2 重拍（第二次）**：kind 封闭集四件 → 五件（增 `mutation.added`）；事件键集三面条件化——五键共通（`ts` / `actor` / `kind` / `outcome` / `evidence`）+ gene 面 `gene` / `gene_sha`、capsule 面 `capsule` / `capsule_sha`、mutation 面 `mutation` / `mutation_sha`。S2 的月卷、时间序与复算分型不变。**现值随序 3 第三次重拍**（必需键不变 + 按 kind 的允许可选键）：见 [Event 扩字段 ADR](2026-09-13-event-field-extension.md) E5。
- **复算**：最近一条 `mutation.added`(ok) 的 `mutation_sha` = 文件字节 sha256；工作树 Mutation 必须有事件轨（`mutation add` 是唯一入口）。Mutation 无 update/retire 面，故无分段。
- 违约夹具与合规夹具同批入 self-test（布局 / 非 kebab id / 域锚点 / 未知字段 / 缺字段 / `risk_level` 越界 / 空 `category` / sha 失配 / 无事件轨 / 跨域重名 / 事件键集错配 / 事件无文件 / 文件无 ok 事件）。

### C5（与 Capsule、序 3 的边界）

- `capsule add` **不要求也不检查**引用某条 Mutation：Capsule schema 封闭七字段（无 mutation 面），两者的关联在 Event 面（`mutation_id` 跨链键，已随[批次 1 序 3](2026-09-13-event-field-extension.md)落地）。强制绑定 = 把两条独立命令耦合成一条链。
- 本批**不实现** §6 Mutate 阶段的判断逻辑（谁在何时该声明）：引擎不承担 Detect / Select / Mutate 的自动性（骨架 D2/D3 一脉），只提供协议与闸。

### C6（新顶层目录准入四问，architecture-standards R2）

① **归属** = 数据面（演化原语落盘，与 `genes/` / `capsules/` / `events/` 同类）。② **合同面** = CLI `mutation add|show` + 事件 kind `mutation.added` + 封闭六字段 schema。③ **依赖方向** = `engine/mutation.ts` 只 import node 内建 + `engine/util.js`；消费方 = `engine/solidify.ts`（写路径）+ `engine/bin.ts`（分发）；闸件 `scripts/verify-gene-format.mts` 以数据件形态读它，不 import engine。④ **机器面** = `verify-gene-format`（既有件扩一节）+ 引擎 self-test 私有夹具。

## Alternatives considered

- **把 Mutation 折进 Capsule（同一文件的 `mutation` 子对象）**：落败——声明先于执行，未执行的声明没有 Capsule 可依附；且会迫使 Capsule 的封闭字段面再开一次。见 C1。
- **Mutation 只作 Event 行（不落文件）**：落败——事件行键集按 kind 封闭、没有独立内容面，`mutation_id` 将只能指「某行」；Capsule 已确立本仓「有身份的原语 = 目录 + 封闭 schema + sha 锚点」这一族形态，同族原语分道会双轨。
- **给 `category` 预设封闭集**：落败——设计无值域、taxonomy 未决（序 23），预设即造分类法（C2）。
- **顺带上 Event 的 `mutation_id`**：落败——一件一交；且序 3 还含 `capsule_id` / `env_fingerprint` / `validation_report_id`，各自原语不同批。
- **`mutation add` 强制先于 `capsule add`**：落败——没有任何既有事实要求这条链；强制会新增一条只对部分执行成立的顺序约束（改文档的执行未必声明 Mutation），且 Capsule schema 无此字段（C5）。
- **收 `gene_ids` / `signals` / `outcome` / `evidence` 全字段**：落败——见 C2 逐条理由。

## Consequences

- **采用面**：`engine/mutation.ts`（协议 + 渲染）、`engine/solidify.ts` 的 `recordMutation`（写路径）、`engine/bin.ts` 的 `mutation add|show`；`verify-gene-format.mts` 覆盖 `mutations/` 与三面条件化事件键集；引擎 self-test 与门禁 self-test 各带合规 / 违约夹具。
- **声明面同步**：`engine/README.md`（命令面 + Mutation 节）、`engine/AGENTS.md`、两 README、`code-standards` 的命令计数（七 → 八）——由 `verify-command-surface` 机械校核。
- **单源指针**：协议细节单源 = 本 ADR + `engine/README.md`「Mutation 面」节；S2 的其余口径仍在 schema ADR，本 ADR 只记与其相异处（kind 集与键集）。
- **遗留面（逐条归口）**：Event 扩字段三件（`mutation_id` / `capsule_id` / `env_fingerprint`）已随[批次 1 序 3](2026-09-13-event-field-extension.md)落地，`validation_report_id` 按该 ADR E4 具名延期；Hypothesize（序 16）与 memory-graph 因果边（序 18）是本原语的下游消费者；`category` 的封闭集随真实种群出现再拍（触发 = 同一 category 值在多条声明中稳定复用）。
- **已命名的覆盖缺口**：本批无实测 Mutation 落盘（`mutations/` 尚无成员）——首个真实声明要等「动改动面前显式声明意图」成为流程动作；同一路径由闸件夹具与引擎 self-test 覆盖，缺口是 e2e 证据而非判据。
- **批次表状态**：序 2 已收口，批次表对应行标 done 并指向本笔记。
