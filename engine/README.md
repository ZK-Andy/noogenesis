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
node dist/engine/bin.js solidify <candidate.json> --actor N # 入档：全绿 → genes/ + events/ 同一 commit
node dist/engine/bin.js solidify --retire <domain>/<id> --actor N
node dist/engine/bin.js pull <bank-url> [--cache DIR]       # P2 只读消费：clone/pull 基因库进仓内缓存
node dist/engine/bin.js observe --signal S --gene <domain>/<id> --outcome ok|fail --actor N [--evidence TEXT]
                                                            # 观测输入面：append-only 到 .noogenesis/observations/
node dist/engine/bin.js self-test                           # 元评测夹具（临时沙箱，不触碰真实仓）
```

退出码：`0` 成功；`1` 红（评估不绿 / 拒入档）；`2` 用法错误或 fail-closed 拒跑。

## 目录

| 文件 | 职责 |
|---|---|
| `bin.ts` | CLI 分发 + 用法 |
| `util.ts` | 归一化 / SHA-256 / 结构化 spawn / git 封装 / 槽值推导 |
| `gates.ts` + `gates.json` | 验证白名单（fail-closed 装载） |
| `gene.ts` | Gene 八字段封闭 schema / 目录扫描（含缓存合并扫描） |
| `observe.ts` | 观测输入面（schema / 追加写 / 派生边） |
| `select.ts` / `propose.ts` / `evaluate.ts` / `solidify.ts` / `pull.ts` | 五命令各一（select 兼消费观测派生面） |
| `selftest.ts` | 元评测夹具 |

## 共享消费（P2，只读）

- `pull <bank-url> [--cache DIR]` 把基因库 clone/pull 进仓内缓存 `<repoRoot>/.noogenesis/genes-cache/`（shallow clone，更新走 `--ff-only`）。**默认离线**：不跑 pull 就没有缓存目录，select/propose 行为与无 P2 时完全一致。已有缓存的 origin 与本次 URL 不一致 → fail-closed（换库须显式删缓存或换 `--cache`）；`--cache` 缺值/重复 → exit 2。
- **合并扫描**：缓存在场时并入 `select` / `propose` 的扫描根；同名 ref（`domain/id`）**本仓基因优先**（缓存副本被遮蔽，不报错）——本仓是策展活体，库是分发副本。缓存侧解析失败的基因 warn-skip（stderr 一行，读路径不红——分发副本降级姿态）；本仓 `genes/` 解析失败仍 fail-closed。`evaluate` / `solidify` 恒以本仓 `genes/` 为对象（`{cache: false}`），缓存基因**只读不可评估、不可入档**。
- 缓存目录不进 git（`.gitignore` `/.noogenesis/`）；安全边界：缓存绝不指向仓根本体、`genes/` 本身或其子树。
- 基因库侧的检索索引 = 仓根 `manifest.json`（`scripts/gen-manifest.mts` 生成，确定性输出；`scripts/verify-manifest.mts` 门禁防漂移，已入 `gates.json` 白名单）。

## 观测输入面（融合轮第一期）

- **事实与观测分家**：`events/` 轨只收「写得复算规则」的演化事件；`gene.used` / `gene.outcome` 这类观测不进 git，落 `<repoRoot>/.noogenesis/observations/<YYYY-MM>.jsonl`（append-only、gitignored、可丢弃——丢了只丢观测权重）。
- **记录 schema（封闭六字段）**：`ts` / `actor` / `signal`（写入时按信号归一化规则落键）/ `gene`（`<domain>/<id>` 形状）/ `outcome`（`ok` | `fail`）/ `evidence`（可选单行，≤200 字符）。未知字段与形状/枚举/长度违约 → exit 2 且不落盘。
- **写入触发点 = 人 / 显式目标**：`observe` 命令只在某基因被实际采用、其结果已可判时由人（或经人许可的 agent）显式调用；不随 `solidify`（入档 ≠ 使用成功）、不随 `select` / `propose` 运行自动记录。
- **派生 = 每次 select 现算**：`(signal::gene)→{ok,fail,last_ts}` 由「轨 + 输入面」在 `select` 时现算，只取「本次查询键 ∩ 本次命中基因」的边，不落盘、不进 git；零观测时 `select` 输出与无观测面逐字节相同。
- **姿态分面**：写路径 fail-closed；读路径坏行 warn-skip（每个坏文件一行 stderr 汇总，不让 `select` 变红）。
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
- **constraints 对照面**：当前出账变更面（`outgoing_base...HEAD` 已提交 + 未暂存 + 未跟踪，与 `scripts/change-scope.mts` 同口径）。
- **事件 kind 封闭集**：`gene.added` / `gene.updated` / `gene.retired`；select/propose 运行不记（演化事件 ≠ 运行日志）。

## 消费方

- 引擎自身：`evaluate` 跑白名单全集作为入档门槛。
- `scripts/verify-gene-format.mts`（白名单外独立件）：校验 `genes/` + `events/`，含白名单条目脚本存在性与 `gene_sha` 工作树复算（例外机制单家见 gates.mts 头注）。
- `scripts/gates.mts`（门禁清单单源发射器）：hooks/CI 的门禁清单单源 = 本白名单（结构性例外四件见该脚本头注）。
- `scripts/verify-secrets.mts`（白名单条目 `secrets`）：凭据绊线扫 `genes/` + `events/` + `.noogenesis/observations/` 三面；**best-effort 绊线，不是安全属性**（强度上限与已知盲区写在件头）。
- `adapters/dsh/`（M2 适配层）：spawn CLI 单合同的第一个进程外消费者；引擎与 `gates.json` 对适配层零新增要求。
- CI：`node dist/engine/bin.js self-test`（与 verify-* self-test 平级，不占门禁编号）。
