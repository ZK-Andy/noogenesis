# Agent Note: Capsule 原语——落盘协议、写读命令与校验复算（批次 1 序 1）

Status: implemented
Review: FULL/2026-09-13/R1=ok R2=ok R3=ok

Related: 批次表 [2026-09-13-feature-completion-backlog](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · 主设计 [§5.1/§6/§9.1](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 共享层稿 [§6.2](../../../../docs/research/dsh-collective-evolution-shared-layer.md) · 既有协议 [gene-event-schema](2026-09-05-gene-event-schema.md)（S1–S3）· 骨架拍板 [p1-engine-skeleton](2026-09-05-p1-engine-skeleton.md)（D3/D4）· 说明 `capsules/` 只有本仓面，共享/贡献面见批次表序 21/31

## Problem

批次表序 1 的落点没有单一事实源，同名的 Capsule 在三处设计文里指三个对象，协议面（落盘 / 写读命令 / 校验闸 / 复算规则）完全没有家：

- 主设计 §5.1 = **一次真实执行的审计记录**（`gene` / `trigger` / `diff` / `outcome` / `blast_radius` / `confidence` / `cost_*`），§6 的 Solidify 造它。
- 共享层稿 §6.2 = **已验证执行路径的组合件**（`capsule_id` / `gene_ids` / `steps` / `evidence`），§9.1 给它 `capsules/<domain>/<id>.capsule.yaml`。
- 主设计 §8.2 = **知识原子**（一条知识 = 一个 content-addressable capsule），与执行记录无关。

另有两条既有拍板被本项触及、必须同批处理：骨架 D3（propose 不产新基因 → 产出面是否扩到 Capsule）与 schema S2（事件 kind 封闭集三件、事件键集固定七键）。

## Decision

### C1（语义与落位）：`capsules/` = Capsule 原语目录，语义以主设计 §5.1 为准

- Capsule = **一次真实执行的审计记录**；共享层稿 §6.2 的 `gene_ids` / `steps` / `evidence` 是同一对象的**可复现路径面**，不是第二个原语——一份 schema 两用，不建两套。
- §8.2 的知识原子**不落 `capsules/`**：它是内容层对象（内容包内的知识原子），与执行记录不同粒面；其落地归批次表序 42，术语拍板（序 27）随之收窄为「`capsules/` 只指 Capsule 原语」。
- **依据**：§5.1 是主设计的原语定义表，§9.1 的目录布局与它同指；§8.2 出现在知识懒加载章，讲的是加载模型不是原语。

### C2（落盘协议）：`capsules/<domain>/<id>.json`，封闭七字段

镜像 S1 的结构纪律（ID = 文件名、`domain` = 父目录、全树 id 唯一、封闭 schema、JSON）。

| 字段 | 类型 | 语义 |
|---|---|---|
| `id` | string | kebab-case，= 文件名 |
| `domain` | string | kebab-case，= 父目录（对齐胶囊域） |
| `gene_ids` | string[]，≥1 | `<domain>/<id>` 引用，须命中所属仓 `genes/` |
| `trigger` | string | 触发信号（主设计 §5.1 `trigger`） |
| `steps` | string[]，≥1 | 已验证执行路径（共享层稿 §6.2） |
| `outcome` | object | `{status: ok \| fail, reason?}`；`fail` 必带 `reason`，`ok` 不得带 |
| `evidence` | string[]，≥1 | 一行证据摘要（门禁 / 评审 / CI 输出） |

**不收的字段**（逐条理由）：`diff` / `content`——git 自身即内容面单源，复写一份是双记账；`score`——骨架 D4 已拍文档域无可信改进分数，二值 `status` 是其可执行形态；`blast_radius`——度量随批次表序 4 落地时同批扩字段（S2 的「字段先于原语 = 死字段」同则）；`confidence` / `cost_tokens` / `cost_usd`——无生产者。

### C3（写读命令）：`capsule add` / `capsule show`，写路径与基因共用原子提交面

- `capsule add <candidate.json> --actor N`：结构闸 + 基因引用可解析 → 落 `capsules/` + 追加 `capsule.added` 事件 → 两者同一 commit；commit 失败回滚工作树**与索引**（只清工作树会让回滚的记录以暂存态残留，被下一次提交扫入），与 `solidify` 共用同一提交助手。
- `capsule show <domain>/<id>`：确定性渲染人读面（`[noo-capsule <domain>/<id>]` + trigger / outcome / genes / steps / evidence）。
- **append-only**：同 id 重复记录拒收——审计记录不修订，故无 `capsule.updated` / `capsule.retired`。
- **人工在环**：A8 会话事件轨撤除后没有自动 Solidify 位点（[撤除 ADR](2026-09-08-a8-session-record-projection-removal.md)），Capsule 由真实执行后显式记录。引擎**不重跑门禁**——`evidence` 由调用方给出；执行者 / 评审者分离的自动复跑归批次表序 43。

### C4（校验闸与复算）：扩展 `verify-gene-format.mts`，不新增门禁件

- 协议闸落在既有白名单外独立件（它已覆盖 `genes/` + `events/` + 白名单），新增 `capsules/` 一节的布局 / schema / 跨域 id 唯一判据——守住 S2「仍单脚本、gate 数量克制」的纪律。
- **复算三条**：① 最近一条 `capsule.added`(ok) 的 `capsule_sha` = 文件字节 sha256，工作树 Capsule 必须有事件轨（`capsule add` 是唯一入口）；② 引用判据两侧粒度不同——**写入前置（引擎）**按 `genes/<domain>/<id>.json` 存在性判，`gene_ids` 每项须活在本仓，缓存副本从不算数（缓存可丢弃，引用会悬空）；**落档后的常住判据（闸件）**只按 id 级判「曾成功入档」= 工作树在场或事件轨上有过 ok 的 `gene.added`/`gene.updated`（域不参与判定）。两侧差集恰是「退役」：**退役不使既有引用追溯失效**（retire 只删工作树文件、git 历史仍可溯，Capsule 又是 append-only），故常住判据按历史成立性判、写入前置按当下在场判；③ 布局与锚点同 S1。
- 违约夹具与合规夹具同批入 self-test（含悬空引用、退役后引用仍合法、sha 失配、无事件轨、事件键集错配、跨域重名、空 `gene_ids`、`ok` 带 reason、布局与 id 锚点）。

### C5（重拍两项，均收窄不松绑）

- **骨架 D3 重拍**：产出面由「只有基因」扩为「基因 + Capsule」。D3 的实质（propose 是确定性渲染器、变异不自动发生）不变——Capsule 也由显式声明产生，不接 LLM、不自动变异。
- **schema S2 重拍**：kind 封闭集三件 → 四件（增 `capsule.added`）；事件键集由固定七键改为**按 kind 条件化**——五键共通（`ts` / `actor` / `kind` / `outcome` / `evidence`）+ gene 面 `gene` / `gene_sha` 或 capsule 面 `capsule` / `capsule_sha`。S2 的落盘语义与复算分型不变。**现值随序 2 第二次重拍**（kind 五件、键集三面）：见 [Mutation ADR](2026-09-13-mutation-primitive.md) C4。

## Alternatives considered

- **按共享层稿 §6.2 建独立「组合胶囊」原语（两个 Capsule）**：落败——两名一物会把复算、事件与闸面都翻倍；§5.1 与 §6.2 描述的本来就是同一次执行的两个面。
- **把 Capsule 写入并入 `solidify`**：落败——`solidify` 的合同是「evaluate 全绿 → 基因入档」，Capsule 没有 evaluate 前置；合并会让一个命令承载两套入档判据。设计 §6 的 Solidify **阶段**对应的是引擎里成对的两条命令。
- **新增第十一门禁 `verify-capsule-format.mts`**：落败——S2 已把「治理自身协议面」收在一个白名单外独立件里，拆件只为命名好看而增一条门禁与一处登记面。
- **按主设计 §8.2 把知识原子也落 `capsules/`**：落败——执行审计与内容原子同目录会让两者都失去单源；内容原子的落位归序 42 独立拍。
- **记录 `diff` / `score` / `blast_radius` / `confidence` / `cost` 全字段**：落败——见 C2 逐条理由，多为死字段或双记账。

## Consequences

- **采用面**：`engine/capsule.ts`（协议 + 渲染）+ `engine/solidify.ts` 的 `recordCapsule`（写路径）+ `bin.ts` 的 `capsule add|show`；`verify-gene-format.mts` 覆盖 `capsules/` 与条件化事件键集；引擎 self-test 与门禁 self-test 各带合规 / 违约夹具。
- **声明面同步**：`engine/README.md`（命令面 + Capsule 节）、`engine/AGENTS.md`、两 README、`code-standards` 的命令计数——由 `verify-command-surface` 机械校核。
- **单源指针**：协议细节单源 = 本 ADR + `engine/README.md`「Capsule 面」节；S1–S3 的其余口径仍在 schema ADR，本 ADR 只记与其相异处（S2 的 kind 集与键集）。
- **遗留面（逐条归口）**：`blast_radius` 随序 4、Event 扩字段四件（`mutation_id` / `capsule_id` / `env_fingerprint` / `validation_report_id`）随序 3；Capsule 的共享 / 贡献面（staging、PR、CI 跨机器复验）随批次表序 21/31；§8.2 知识原子随序 42。
- **已命名的覆盖缺口**：本批无实测 Capsule 落盘（`capsules/` 尚无成员）——首次真实 `capsule add` 要等第一次「按基因执行」；同一路径由闸件 16 组夹具与引擎 self-test 5.7 覆盖，缺口是 e2e 证据而非判据。
- **批次表状态**：序 1 已收口，批次表对应行标 done 并指向本笔记。
