# engine — 演化发动机（P1 + P2 共享消费）

心源演化引擎：Node.js 标准库 only、零第三方依赖、零网络、零 LLM——"发动机不插电也能转"。骨架选型（D1–D4）与协议（S1–S3）的单一事实源：

- 骨架：[.agents/notes/implemented/architecture/2026-09-05-p1-engine-skeleton.md](../.agents/notes/implemented/architecture/2026-09-05-p1-engine-skeleton.md)
- 协议：[.agents/notes/implemented/architecture/2026-09-05-gene-event-schema.md](../.agents/notes/implemented/architecture/2026-09-05-gene-event-schema.md)
- P2 共享消费：[.agents/notes/implemented/architecture/2026-09-06-p2-shared-consumer.md](../.agents/notes/implemented/architecture/2026-09-06-p2-shared-consumer.md)

## 合同面（唯一 CLI）

运行形态：源码 TS，`npm run build` 后经 `dist/` 跑（engine/adapters 族钉 dist，零转译；两族分野见 B2 ADR）。

```sh
node dist/engine/bin.js select <signal>... [--stdin]        # 信号 → 基因（归一化字面匹配，多键并集）
                                                            # + 观测建议档行（advice: …，零观测时不发射）
node dist/engine/bin.js propose <domain>/<id> [--out FILE]  # gene → 注入文本（确定性，同输入必同输出）
node dist/engine/bin.js evaluate <domain>/<id>              # gates.json 全集 + 约束；红即拒，无豁免
node dist/engine/bin.js solidify <candidate.json> --actor N [--mutation <ref>] [--capsule <ref>]  # 入档：全绿 → genes/ + events/ 同一 commit
node dist/engine/bin.js solidify --retire <domain>/<id> --actor N [--mutation <ref>] [--capsule <ref>]
node dist/engine/bin.js pull <bank-url> [--cache DIR]       # P2 只读消费：clone/pull 基因库进仓内缓存
node dist/engine/bin.js observe --signal S --gene <domain>/<id> --outcome ok|fail --actor N [--evidence TEXT]
                                                            # 观测输入面：append-only 到 .noogenesis/observations/
node dist/engine/bin.js capsule add <candidate.json> --actor N [--mutation <ref>]  # Capsule 入档：capsules/ + events/ 同一 commit
node dist/engine/bin.js capsule show <domain>/<id>          # 读并渲染单条 Capsule（确定性输出）
node dist/engine/bin.js mutation add <candidate.json> --actor N  # Mutation 声明：mutations/ + events/ 同一 commit
node dist/engine/bin.js mutation show <domain>/<id>         # 读并渲染单条 Mutation（确定性输出）
node dist/engine/bin.js distill collect                     # 失败面汇编（events fail / capsules fail / genes avoid；只读）
node dist/engine/bin.js distill add <candidate.json>        # 候选落盘 candidates/（基因形；不发事件；压缩在宿主侧）
node dist/engine/bin.js distill show <domain>/<id>          # 读并渲染单条候选（确定性输出）
node dist/engine/bin.js list                                # 只读盘点：genes（含 cache 标记）/capsules/mutations
node dist/engine/bin.js self-test                           # 元评测夹具（临时沙箱，不触碰真实仓）
```

退出码：`0` 成功；`1` 红（评估不绿 / 拒入档）；`2` 用法错误或 fail-closed 拒跑。

## 目录

| 文件 | 职责 |
|---|---|
| `bin.ts` | CLI 分发 + 用法 |
| `util.ts` | 归一化 / SHA-256 / 环境指纹 / 结构化 spawn / git 封装 / 槽值推导 / 改动面度量（blast-radius） |
| `gates.ts` + `gates.json` | 验证白名单（fail-closed 装载） |
| `gene.ts` | Gene 八字段封闭 schema / 目录扫描（含缓存合并扫描） |
| `capsule.ts` | Capsule 七字段封闭 schema / 写入与读取（`capsule add` / `capsule show`） |
| `mutation.ts` | Mutation 六字段封闭 schema / 写入与读取（`mutation add` / `mutation show`） |
| `distill.ts` | 蒸馏面（批次 6 序 30）：失败面汇编 + 候选落盘（`distill collect` / `add` / `show`；候选 = 基因形落 `candidates/`，压缩在宿主侧） |
| `observe.ts` | 观测输入面（schema / 追加写 / 派生边） |
| `list.ts` | 只读盘点面（批次 9 序 44 命令面 ADR）：`list` 三资产枚举，行格式 `<kind> <domain>/<id>[(cache)]` |
| `select.ts` / `propose.ts` / `evaluate.ts` / `solidify.ts` / `pull.ts` | 其余命令各一（select 兼消费观测派生面；solidify 兼 Capsule / Mutation 入档） |
| `selftest.ts` | 元评测夹具 |

## 共享消费（P2，只读）

- `pull <bank-url> [--cache DIR]` 把基因库 clone/pull 进仓内缓存 `<repoRoot>/.noogenesis/genes-cache/`（shallow clone，更新走 `--ff-only`）。**默认离线**：不跑 pull 就没有缓存目录，select/propose 行为与无 P2 时完全一致。已有缓存的 origin 与本次 URL 不一致 → fail-closed（换库须显式删缓存或换 `--cache`）；`--cache` 缺值/重复 → exit 2。
- **合并扫描**：缓存在场时并入 `select` / `propose` 的扫描根；同名 ref（`domain/id`）**本仓基因优先**（缓存副本被遮蔽，不报错）——本仓是策展活体，库是分发副本。缓存侧解析失败的基因 warn-skip（stderr 一行，读路径不红——分发副本降级姿态）；本仓 `genes/` 解析失败仍 fail-closed。`evaluate` / `solidify` 恒以本仓 `genes/` 为对象（`{cache: false}`），缓存基因**只读不可评估、不可入档**。
- 缓存目录不进 git（`.gitignore` `/.noogenesis/`）；安全边界：缓存绝不指向仓根本体、`genes/` 本身或其子树。
- 基因库侧的检索索引 = 仓根 `manifest.json`（`scripts/gen-manifest.mts` 生成，确定性输出；`scripts/verify-manifest.mts` 门禁防漂移，已入 `gates.json` 白名单）。

## 观测输入面（融合轮第一期）

- **事实与观测分家**：`events/` 轨只收「写得复算规则」的演化事件；`gene.used` / `gene.outcome` 这类观测不进 git，落 `<repoRoot>/.noogenesis/observations/<YYYY-MM>.jsonl`（append-only、gitignored、可丢弃——丢了只丢观测权重）。
- **记录 schema（封闭六字段；字段表与校验规则的唯一家 = 本节，决定与理由见 [实现 ADR](../.agents/notes/implemented/architecture/2026-09-11-memory-line-phase1-observation-face.md)）**：`ts`（严格 ISO 8601 UTC）/ `actor` / `signal`（写入时按信号归一化规则落键）/ `gene`（`<domain>/<id>` 形状）/ `outcome`（`ok` | `fail`）/ `evidence`（可选单行，≤200 字符）。未知字段与形状/枚举/长度违约 → exit 2 且不落盘（含落盘失败——本命令无红态，退出码恒 0/2）。
- **写入触发点 = 人 / 显式目标**：`observe` 命令只在某基因被实际采用、其结果已可判时由人（或经人许可的 agent）显式调用；不随 `solidify`（入档 ≠ 使用成功）、不随 `select` / `propose` 运行自动记录。
- **派生 = 每次 select 现算**：`(signal::gene)→{ok,fail,last_ts}` 在 `select` 时现算，只取「本次查询键 ∩ 本次命中基因」的边，不落盘、不进 git；边的事实侧身份（命中 ref 与 signal）来自本次 `genes/` 扫描，`events/` 轨不参与。零观测时 `select` 输出与无观测面逐字节相同。
- **姿态分面**：写路径 fail-closed；读路径 warn-skip——坏 JSON 行、schema 违约行、非归一键、观测面不可列举都只丢权重 + 一行 stderr（每文件/每面至多一行），不让 `select` 变红。
- 强度上限：观测样本 O(1) 时不排序、不禁用、不设阈值（判决与触发单源 = [实现 ADR](../.agents/notes/implemented/architecture/2026-09-11-memory-line-phase1-observation-face.md)）。

## 安全模型（五条，schema ADR S3）

1. **白名单封闭**：`gates.json` 是唯一可执行命令来源；字面匹配；结构化 spawn 参数数组直传，永不 shell 拼接。白名单缺失 / 格式坏 / 条目脚本不存在 → evaluate 拒跑，不静默退化。
2. **引擎零网络**：不发请求、不开端口（骨架 ADR D1/D3 一脉）。
3. **基因不含可执行内容**：`strategy` / `avoid` 是渲染文本，永不 eval；`propose` 只做字符串拼接。
4. **子进程最小 env**：只透传 `PATH` / `HOME` / `LANG`；工作目录锁死仓根。
5. **fail-closed**：任何解析失败（git 事实、白名单、基因 JSON）都是错误而非空集。

## 协议要点（实现层口径，协议单源在 schema ADR）

- **参数槽**：白名单条目可含 `{{outgoing_base}}` / `{{head}}`，取值仅由引擎从 git 事实推导（上游 merge-base，无上游回退根提交；HEAD 解析 oid）。基因只引用不填值。
- **信号归一化**（骨架 ADR D2）：trim → 小写化 → 内部连续空白折叠为单空格；精确匹配，多键取并集。
- **入档语义**：候选文件须以 `<id>.json` 命名（ID=文件名锚点对候选同样生效）；目录锚点（`domain` == 父目录）只约束 `genes/` 内的落盘位置。`gene_sha` = 基因文件字节内容的 SHA-256。
- **原子证据**：`genes/` 变更与 `events/` 追加行放同一 commit；拒绝时只提交事件行（候选不入档），`outcome` 携带拒因。
- **retire 无需 evaluate**：退役不引入前沿内容，入档闸只守新增/更新；删除文件 + `gene.retired` 事件（`gene_sha` = 最后内容 SHA），git 历史仍可溯。
- **改动面度量（blast-radius，[批次 1 序 4 ADR](../.agents/notes/implemented/architecture/2026-09-13-evaluate-blast-radius.md)）**：`evaluate` 对出账变更面一次度量出文件数 / 行 churn / 顶层段分布，报告首行即 `blast radius: files N, lines +A/-D, scope dir(n), …`（零变更时 scope 记 `-`）；`constraints.max_files` 取同一度量的文件数，不再各数一遍。行数记增删之和，未跟踪文件按整文件行数计，二进制计 0 行；上述三个标量是改动面读数，不是依赖/扇出的影响分析。
- **constraints 对照面**：本次改动面度量所属的出账变更面（`outgoing_base...HEAD` 已提交 + index 未提交 + 未暂存 + 未跟踪，与 `scripts/change-scope.mts` 同口径）。
- **事件 kind 封闭集**：`gene.added` / `gene.updated` / `gene.retired` / `capsule.added` / `mutation.added`；select/propose 运行不记（演化事件 ≠ 运行日志）。事件键集 = 按 kind 条件化的**必需键** + 按 kind 的**允许可选键**（单源见下节「Event 面」）。

## Capsule 面（执行审计记录）

- **语义**：Capsule = 一次真实执行的审计记录（主设计 §5.1），其 `gene_ids` / `steps` / `evidence` 同时是该次执行的可复现路径（共享层稿 §6.2）。落 `capsules/<domain>/<id>.json`，JSON、封闭七字段（`id` / `domain` / `gene_ids` / `trigger` / `steps` / `outcome` / `evidence`）。
- **append-only**：同 id 重复记录拒收（无 `capsule.updated` / `capsule.retired` 面）；`outcome` 二值 `ok` | `fail`，`fail` 必带 `reason`。
- **写读命令**：`capsule add <candidate.json> --actor N` 落 `capsules/` + `capsule.added` 事件（同一 commit，原子性同基因入档）；`capsule show <domain>/<id>` 渲染人读面。两者用法错与 fail-closed 都走 exit 2；多余位置参数与重复旗标即用法错（不静默取首个）。
- **复算边界**：`gene_ids` 须曾成功入档——工作树在场，或事件轨上有过 ok 的 `gene.added`/`gene.updated`；写路径的前置更紧（记录时该基因须活在本仓 `genes/`，缓存副本不算）。退役不使既有引用失效。引擎不重跑门禁，`evidence` 由调用方在真实执行后给出（自动复跑归批次表序 43）。
- **不收的字段**：`diff` / `content`（git 自身即内容面单源）、`score`（骨架 ADR D4 已拍文档域无可信改进分数）、`blast_radius`（git 派生量的复写，且 Capsule 无区间锚点 → 数字不可复算；触发见[序 4 ADR](../.agents/notes/implemented/architecture/2026-09-13-evaluate-blast-radius.md) B3）、`confidence` / `cost_*`（无生产者）。

## Mutation 面（执行前的意图声明）

- **语义**：Mutation = 执行前的意图声明（主设计 §5.1：意图 + 风险），§6 Mutate 阶段的产物；与 Capsule（执行后的审计事实）是同一次演化的两端——声明而未执行是合法状态，故两者不合并。落 `mutations/<domain>/<id>.json`，JSON、封闭六字段（`id` / `domain` / `category` / `target` / `expected_effect` / `risk_level`）。
- **字段值域**：`risk_level` 是设计 §5.1 明列的封闭三值 `low` / `medium` / `high`；`category` / `target` / `expected_effect` 为非空字符串、无封闭枚举（taxonomy 仍未决，预设即造分类法）。
- **append-only**：同 id 重复声明拒收（无 `mutation.updated` / `mutation.retired` 面）。
- **写读命令**：`mutation add <candidate.json> --actor N` 落 `mutations/` + `mutation.added` 事件（同一 commit，原子性同基因/Capsule 入档）；`mutation show <domain>/<id>` 渲染人读面。两者用法错与 fail-closed 都走 exit 2；多余位置参数与重复旗标即用法错（不静默取首个）。
- **复算边界**：`mutation.added`(ok) 的 `mutation_sha` 必须等于文件字节 sha256；工作树 Mutation 必须有事件轨（`mutation add` 是唯一入口）。引擎不构造声明内容、不跑门禁——声明由调用方在动改动面之前显式给出。
- **不做的事**：`mutation add` 不要求也不检查引用某条 Capsule 或 gene——关联写在 Event 面（`mutation_id` / `capsule_id` 跨链键，由 `solidify` / `capsule add` 的旗标给出，见下节）；引擎不判断「该不该声明」（Detect/Select/Mutate 的自动性不在引擎，骨架 ADR D2/D3）。

## Event 面（演化事件键集与扩字段）

- **键集两段**（[批次 1 序 3 ADR](../.agents/notes/implemented/architecture/2026-09-13-event-field-extension.md) E5）：**必需键**按 kind 条件化——五键共通 `ts` / `actor` / `kind` / `outcome` / `evidence`，gene 面加 `gene` / `gene_sha`，capsule 面加 `capsule` / `capsule_sha`，mutation 面加 `mutation` / `mutation_sha`；**可选键**是按 kind 的封闭集——gene 面 `mutation_id` / `capsule_id` / `env_fingerprint`，capsule 面 `mutation_id` / `env_fingerprint`，mutation 面 `env_fingerprint`。封闭集外的键仍是违约。
- **跨链键的方向**（E2）：`mutation_id` 指执行前的意图声明（§6 Mutate），`capsule_id` 指执行后的审计记录（§6 Solidify）。声明先于执行，故 `mutation.added` 不带跨链键；`capsule.added` 只带 `mutation_id`（自身即 `capsule` 键）。两者记**裸 id**（与三主体键同口径），旗标取 `<domain>/<id>`——写路径按该路径当下在场判，缺席 exit 2 拒写；闸件按裸 id 命中 `mutations/` / `capsules/` 的 id 集判。
- **`env_fingerprint`**（E3）：引擎在事件写入时计算的运行时规范串 `node<major.minor.patch>[-<prerelease>]/<platform>/<arch>`（如 `node26.8.1/linux/x64`），五 kind 全带。它标识**写事件的那个引擎进程的运行时**，不是完整工具链冻结；`events/` 是 append-only 审计面，无本字段的行保持原样（不回填），故闸件按允许可选键 + 在场即形状校验判。
- **命令面**：`solidify … [--mutation <ref>] [--capsule <ref>]`（add/update 与 `--retire` 同治）、`capsule add … [--mutation <ref>]`；旗标可同时给、可缺省，缺值 fail-loud（exit 2）。
- **未落地的一项**：`validation_report_id` 不进 schema——它指向的「验证报告」对象本仓尚无家（同 ADR E4，触发 = 批次表序 43 / 序 45）。

## 消费方

- 引擎自身：`evaluate` 跑白名单全集作为入档门槛。
- `scripts/verify-gene-format.mts`（白名单外独立件）：校验 `genes/` + `capsules/` + `mutations/` + `events/`，含白名单条目脚本存在性、`gene_sha` / `capsule_sha` / `mutation_sha` 工作树复算、Capsule 的基因引用可解析与事件跨链键可解析（例外机制单家见 gates.mts 头注）。
- `scripts/gates.mts`（门禁清单单源发射器）：hooks/CI 的门禁清单单源 = 本白名单（结构性例外四件见该脚本头注）。
- `scripts/verify-secrets.mts`（白名单条目 `secrets`）：凭据绊线扫 `genes/` + `events/` + `.noogenesis/observations/` 三面；**best-effort 绊线，不是安全属性**（强度上限与已知盲区写在件头）。
- `adapters/dsh/`（M2 适配层）：spawn CLI 单合同的第一个进程外消费者；引擎与 `gates.json` 对适配层零新增要求。
- CI：`node dist/engine/bin.js self-test`（与 verify-* self-test 平级，不占门禁编号）。

## 蒸馏面（批次 6 序 30）

- **边界单源** = [P1 D3 重拍 ADR](../.agents/notes/implemented/architecture/2026-09-14-p1-d3-distillation-reshoot.md) Decision 2/3：显式触发、压缩步在宿主侧（引擎零 LLM，不产基因内容）、产物是候选。
- `distill collect` 只读汇编三类 git 内持久失败面——`events/*.jsonl` 的 `outcome: "fail"` 行、`capsules/` 的 `outcome.status = "fail"`、`genes/` 的 `avoid` 字段；观测面（`.noogenesis/observations/`，gitignored 可丢弃权重）不进汇编。三类面全空 = 空汇总，exit 0。
- `distill add <candidate.json>` 把**基因形候选**落 `candidates/<domain>/<id>.json`（复用 gene 校验器，id=文件名、domain=目录、candidates 内跨域 id 唯一）；重名拒覆盖（fail-closed，改稿 = 显式删后重加）；**零事件、零 git commit**——候选是草稿不是档案。`candidates/` 由 `verify-gene-format` 覆盖（布局封闭 + 协议镜像 + 无复算面）。
- 候选不在 `genes/` → 不进 select 扫描、不进 manifest、不发 `gene.added`；策展完成后走既有 `solidify <candidate.json>` 入档，入档链路零新增。
