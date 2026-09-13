# Agent Note: Event 扩字段——跨链键、环境指纹与验证报告面的裁决（批次 1 序 3）

Status: implemented
Review: FULL/2026-09-13/R1=ok R2=ok R3=ok

Related: 批次表 [2026-09-13-feature-completion-backlog](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · 既有协议 [gene-event-schema](2026-09-05-gene-event-schema.md)（S2）· 相邻原语 [Capsule 原语](2026-09-13-capsule-primitive.md)（序 1）／[Mutation 原语](2026-09-13-mutation-primitive.md)（序 2）· 主设计 [§5.1/§6](../../../../docs/research/dsh-swarm-evolution-framework-design.md)

## Problem

主设计 §5.1 给 Event 列了八个关键字段（`intent` / `signals` / `genes_used` / `mutation_id` / `outcome` / `capsule_id` / `env_fingerprint` / `validation_report_id`），本仓只落了五键共通面与三面主体键。余下四件在 S2 里被显式后置，后置规则写的是「字段先于原语出现即死字段」。序 1 / 序 2 落地后这条规则必须逐条执行：

- `mutation_id` / `capsule_id` 指向的两个原语（`mutations/`、`capsules/`）已到位，但两条命令都刻意不互相引用（序 2 C5 把关联推给本序）——字段与生产者面都得由本笔记定。
- `env_fingerprint` 没有独立原语，它是"事件记录环境"本身，须定值形态与写入位点。
- `validation_report_id` 指向"验证报告"——本仓没有这个对象：evaluate 的报告只渲染到 stdout，无 id、无落盘、无检索面。

同时 S2 的事件键集判据（按 kind 条件化、精确等于七键）须第三次重拍，否则可选跨链键一进来就被判违约。

## Decision

### E1（总则）：进 schema 的两个条件——对象已到位 + 有真实生产者

- 字段进 Event schema 前须同时满足：① 它指向的对象已有原语或家（不是"以后会有"）；② 有真实生产者（引擎写路径或显式命令参数），且机器可判（形状 + 可解析）。任一不成立即不进——死字段在审计面上的代价是假数据位，不是多一列。
- 据此裁决：`mutation_id` / `capsule_id` / `env_fingerprint` 进（E2 / E3）；`validation_report_id` 不进（E4）。这不是砍范围，是本序备注写明的解锁手续。

### E2（跨链键）：`mutation_id` / `capsule_id` = 事件到本轮演化两端的指针

- **语义与方向**：`mutation_id` 指执行前的意图声明（§6 Mutate），`capsule_id` 指执行后的审计记录（§6 Solidify）。阶段序固定方向，故按键分面：

| kind | 允许的跨链键 | 理由 |
|---|---|---|
| `gene.added` / `gene.updated` / `gene.retired` | `mutation_id`、`capsule_id` | 基因是这轮演化的资产落点，两端都可指向 |
| `capsule.added` | `mutation_id` | 执行兑现了哪条声明；`capsule_id` 即自身 `capsule` 键，不重复 |
| `mutation.added` | 无 | 声明先于执行，此时没有可指的执行记录 |

- **形态**：事件键记**裸 id**——与 `gene` / `capsule` / `mutation` 三主体键同口径（事件只记 id，跨域唯一由写路径与闸件的重复 id 判据保证）；CLI 旗标取 `<domain>/<id>`（直接定位被引文件，与 `--retire` 同形）。
- **可选性**：不是每轮演化都有声明或执行记录，两键均可选。必填即造链——序 2 C5 已拒「强制声明先于记录」，本序不推翻。
- **可解析判据两侧同粒度**：写路径（引擎）按 `mutations/<domain>/<id>.json` / `capsules/<domain>/<id>.json` 当下在场判，缺席即 EngineError（exit 2、不落盘）；常住判据（闸件）按裸 id 命中同名文件判。两者都 append-only、无退役面，故不存在 Capsule 的 `gene_ids` 那种"历史成立 vs 当下在场"差集。

### E3（`env_fingerprint`）：引擎进程运行时三元的可读规范串

- **值** = `node<major.minor.patch>[-<prerelease>]/<platform>/<arch>`（如 `node26.8.1/linux/x64`），写入时由引擎计算，五 kind 全带。预发布后缀（nightly / rc）放行——Node 的 `process.version` 带该后缀，收窄会让引擎写得出、闸件判违约。
- **形态取可读串而非 sha**：消费者是「人读审计 + 跨机比较」，可读串直接答"哪台、哪个运行时"，sha 只能答"同/不同"；本仓 sha 锚点族（`gene_sha` 等）是防篡改面，本字段不是。
- **强度上限（写明）**：它标识**写这条事件的引擎进程的运行时**，不是完整工具链冻结——门禁子进程的解释器版本、宿主 OS 补丁级别都不在内。做成完整清单 = 为一个不存在的"环境一致性"诉求建脚手架；跨机复现的真正证据是 CI 复验（批次表序 21）。
- **闸面形态**：允许可选键 + 在场即形状校验。既有 8 行事件写于本字段之前、且审计行 append-only 不可改写，故闸面不追溯强制（见 Consequences）；"新写入恒带"由引擎 self-test 锁。

### E4（`validation_report_id`）：不进 schema，附具名触发

- 本仓无"验证报告"对象：`evaluate` 的报告渲染到 stdout 即散，`evidence` 是它当下的唯一落点，没有 id 可言。
- 现在落它只有三条路，都违 E1：假内容（指向不存在的报告）、半成品（自造报告仓，与批次表序 43 / 序 45 撞车）、死键（调用方自由填、无人消费）。
- **触发**：批次表序 43（子代理自动执行验证）或序 45（合并携带自校验证据）落地"验证报告"对象时，同批扩这条键——与 Capsule / Mutation 的「原语到位后解锁」同一手续。

### E5（S2 第三次重拍）：键集从「按 kind 条件化」到「必需键 + 允许可选键」

- 每 kind 的**必需键不变**（五共通 `ts` / `actor` / `kind` / `outcome` / `evidence` + 主体两键）；**可选键**是按 kind 的封闭集：gene 面 = {`mutation_id`, `capsule_id`, `env_fingerprint`}，capsule 面 = {`mutation_id`, `env_fingerprint`}，mutation 面 = {`env_fingerprint`}。
- 封闭性不松绑：未列键（含写进别的 kind 的跨链键）仍是违约；必需键缺席、可选键形状错、指向不存在的对象也都是违约。
- **命令面**（命令计数与退出码三档不变，旗标可选、可同时给）：
  - `solidify <candidate.json> --actor N [--mutation <domain>/<id>] [--capsule <domain>/<id>]`
  - `solidify --retire <domain>/<id> --actor N [--mutation <domain>/<id>] [--capsule <domain>/<id>]`
  - `capsule add <candidate.json> --actor N [--mutation <domain>/<id>]`

### E6（校验与夹具）：扩展 `verify-gene-format.mts`，不新增门禁件

- 三段判据：① 必需键 + 允许可选键（封闭集外即违约）；② 可选键形状（`env_fingerprint` 正则、两个跨链键 kebab 裸 id）；③ 跨链可解析（`mutation_id` 命中 `mutations/` 的 id 集、`capsule_id` 命中 `capsules/` 的 id 集）。
- 违约夹具与合规夹具同批入 self-test（未知可选键、写成别 kind 的键、`env_fingerprint` 形状坏、跨链键悬空、裸 id 非 kebab）；引擎 self-test 加一节覆盖写入面（五 kind 恒带指纹、跨链键落事件、悬空引用拒写、CLI 旗标端到端）。

## Alternatives considered

- **`validation_report_id` 落成"调用方自由填的字符串"**：落败——无消费者、无命名空间，正是 E1 定义的死键；序 43 定下报告对象时格式还会被推翻重来。
- **`env_fingerprint` 取 `sha256`**：落败——跨机比较只答"不同"不答"哪里不同"，审计面不可读；为消除歧义还得把摘要口径写成第二份规范。
- **`env_fingerprint` 收完整工具链清单**（node + python + git + OS 版本…）：落败——要枚举并探测子进程解释器，成本与脆弱度都高，且真正的跨机证据是 CI 复验（E3 强度上限）。
- **跨链键记 `<domain>/<id>` 全形**：落败——与事件三主体键（裸 id）双轨；跨域唯一性已由 `assert*IdUnique`（写路径）与闸件的重复 id 判据（常住）保证，全形只增抄写面。
- **跨链键必填**（如 `capsule add` 必带 `--mutation`）：落败——序 2 C5 已判「不强制声明先于记录」，必填把两条独立命令耦合成一条只对部分执行成立的链。
- **`env_fingerprint` 也做成必填并回填 8 行历史事件**：落败——append-only 审计行不可改写，回填等于伪造记录环境；为 8 行建冻结清单或日期切点 = 迁移脚手架，正是根 AGENTS 防过度设计禁的那类构造。
- **顺带修 `solidify` / `capsule add` 吞多余位置参数的既有契约缺陷**：落败——一件一交；该缺陷已单列池件候选，与两条命令同批收紧。

## Consequences

- **采用面**：`engine/util.ts`（`envFingerprint`）+ `engine/solidify.ts`（跨链解析、事件构造）+ `engine/bin.ts`（旗标解析）+ `engine/selftest.ts` 新增一节；`scripts/verify-gene-format.mts`（允许键集 / 形状 / 可解析三段 + 夹具）。
- **声明面同步**：`engine/README.md`（合同面块 + 事件面一节）、`engine/AGENTS.md`——命令计数不变（仍八命令），由 `verify-command-surface` 机械校核。
- **单源指针**：协议细节单源 = 本 ADR + `engine/README.md`；S2 的其余口径（kind 集、月卷、时间序、复算分型）仍在 schema ADR，本 ADR 只记与其相异处（键集形态 + 四件裁决）。
- **既有数据**：`events/2026-09.jsonl` 的 8 行写于本字段之前，闸面按"允许可选键"容纳，不回填、不追溯；新写入五 kind 全带 `env_fingerprint`，由引擎 self-test 锁死。
- **遗留面（逐条归口）**：`validation_report_id` 随序 43 / 序 45 的报告对象；§5.1 的 `intent` / `signals` / `genes_used` 三键随序 16（Hypothesize）与序 18（memory-graph）——同一条"对象先于字段"手续。
- **已命名的覆盖缺口**：事件轨尚无带跨链键的真实行（`capsules/` 与 `mutations/` 目前无成员）——首个真实演化才产生；同一路径由引擎 self-test 与闸件夹具覆盖，缺口是 e2e 证据而非判据。
- **批次表状态**：序 3 已收口（三件落地、一件按 E4 具名延期），批次表对应行标 done 并指向本笔记。
