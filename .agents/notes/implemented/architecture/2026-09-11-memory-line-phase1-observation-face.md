# Agent Note: 记忆库线第一期——观测输入面 + Select 建议档 + 凭据绊线

Status: implemented
Review: FULL/2026-09-11/R1=ok R2=ok R3=ok

Related: 融合立宪 [2026-09-10-memory-line-fusion-charter](../../proposed/architecture/2026-09-10-memory-line-fusion-charter.md)（proposed；本件落其 D8/D10 三件与两个待定设计点，不改其边界）；协议面 [2026-09-05-gene-event-schema](2026-09-05-gene-event-schema.md)（事件 kind 准入「可复算才进轨」——本件观测面不触碰该判据）；只读消费面 [2026-09-06-p2-shared-consumer](2026-09-06-p2-shared-consumer.md)（`.noogenesis/` 缓存落点与「读路径降级 / 本仓 fail-closed」姿态先例）；线状态唯一家 [memory-system-dossier](../../../../docs/research/memory-system-dossier.md)；命令合同面 [engine/README](../../../../engine/README.md)。

## Problem

融合轮立宪已拍边界与范围（2026-09-10）：按机制收、按两半裁；第一期 IN = 观测输入面 + 派生与 Select 建议档 + 凭据筛查（D10）。两个设计点显式留给实现批：**输入面的写入触发点**与 **Select 输出契约的改法**——本文落这两点，并把三件的验收面写成可执行形式。

现状事实（本机实读）：

- `select` stdout 合同 = 首行 `signals: …` + 每行 `<domain>/<id>  <summary>`；无命中为 `(no genes matched)`。适配层 `hitsSectionText` 按「非 `signals:` 行且非 `(no genes matched)`」逐行取命中（[section.mts](../../../../adapters/dsh/section.mts)）。
- 引擎无任何观测面：`events/` 轨的 kind 准入判据是**写得出复算规则**（S2），`gene.used` / `gene.outcome` 这类观测写不出复算规则，故不进轨（D7-1）——观测数据的家因此悬空。
- 凭据筛查在本仓**零机器面**。旧引擎 `dsh-continual-evolve@0.6.0`（冻结外部参照，`github.com/ZK-Andy/dsh-continual-evolve`）的实现 `secretLeakReason` 只覆盖其全局写入路径，模式面只认**带引号赋值**，漏 env 式赋值 / JWT / 连接串内嵌凭据（`src/promotion.ts:55-80`），且落盘 0644——故 D3 要求「只当 best-effort 绊线，不作安全属性」。

## Decision

**1. 观测输入面 = `<repoRoot>/.noogenesis/observations/<YYYY-MM>.jsonl`**（gitignored、append-only、可丢弃）。落点与 P2 缓存同属 `.noogenesis/` 本地状态命名空间（`.gitignore` 已整目录忽略）；月卷节奏与 `events/` / `journal/` 同。记录 schema 是**封闭六字段**、违约一律 fail-closed（exit 2，不落盘）——字段表与逐条校验规则的唯一家 = [engine/README](../../../../engine/README.md)「观测输入面」节，本件不重抄。本件保留的是两条判定理由：`ts` 须严格 ISO 8601 UTC、`signal` 须已归一，因为两者都会被原样拼进 `advice` 行（stdout 契约面），宽松形状会在该行内插入空白/换行，让第二行不以 `advice:` 开头而穿过适配层过滤进常驻节；写读两侧共用同一校验器是唯一防线。

**2. 写入触发点 = 人 / 显式目标**（D4 口径）：某基因**被实际采用且其结果已可判**时，由人或经人许可的 agent 显式调用新命令 `node dist/engine/bin.js observe --signal S --gene <domain>/<id> --outcome ok|fail --actor N [--evidence TEXT]` 写入。不随 `solidify` 自动记（**入档 ≠ 使用成功**）、不随 `select` / `propose` 运行记（运行不记，继承 S2 精神）；不加流程卡常备义务——触发权归人，避免自动沉淀那套常开成本（不收清单 D2 的形态）。**本期写者集合 = 人 / 经人许可的 agent**；D8 列的另一类写者「适配层」属宿主挂载面（D7-3 暂不立），适配层不写观测面。

**3. 派生 = 每次 select 现算**：读输入面（目录缺席 = 空集 = 默认零成本，同 P2 离线姿态），只取「本次查询键 ∩ 本次命中基因」的边 `(signal::gene)→{ok,fail,last_ts}`。不落盘、不缓存、不进 git（派生数据口径 D7-1）；读路径 warn-skip（观测可丢弃，不因它让 select 变红：坏 JSON 行、schema 违约行、非归一键都只丢自身权重 + 一行 stderr；观测面存在却不可列举则退为空集 + 一行 stderr），写路径 fail-closed（含落盘失败 → exit 2：observe 无红态，退出码空间恒 0/2）。**边的事实侧身份（命中 ref 与 signal）取自本次 `genes/` 扫描，`events/` 轨不参与边计算**——D8 的「轨 + 输入面」在本仓的实现形态即「事实在 genes/ 面、观测在输入面」。

**4. Select 输出契约 = 追加式建议档**：命中行与其后不变，仅在全部命中行**之后**追加 `advice: <signal> :: <ref>  ok=<n> fail=<n> last=<YYYY-MM-DD>` 行（每个有观测的边一行，命中顺序 × 查询键顺序）。**零观测时不发射任何 advice 行**：stdout 恒为「`signals:` 首行 + 命中行」，与观测面缺席时逐字节相同（不变量，非版本比较）。本期**不排序、不禁用、无阈值、无半衰期衰减**：命中数 6 对上限 12（排序无可观察效果）、样本量 O(1)（比率被噪声支配，别把稀疏噪声当优选依据）——触发 = 命中数逼近 `maxGenes` 上限，或观测样本量足以支撑排序时另立 ADR。

**5. 建议档的消费面 = `noo_select` 工具输出**（按需读，零常驻成本）。system-prompt 命中节**不注入** advice 行：适配层 `hitsSectionText` 增过滤（`advice:` 前缀与既有 `signals:` / `(no genes matched)` 同列），夹具钉死。理由 = 常驻面每步重复付费，而建议只在真正要取基因时有价值。

**6. 凭据筛查 = 新独立门禁件 `scripts/verify-secrets.mts`**（入 `engine/gates.json` 白名单 + pre-commit 钩子 + CI self-test 行）。best-effort 绊线，覆盖三面：`genes/**/*.json`（全字符串字段）、`events/**/*.jsonl`（含 `evidence`）、`.noogenesis/observations/**/*.jsonl`（新输入面，在场才扫）。模式集 = provider token 形状 + **env 式无引号赋值** + **JWT** + **连接串内嵌凭据**（后三类即旧引擎漏掉的；模式清单与其已知盲区写在件头）。命中即红；输出脱敏（家族标签 + 截断值，绝不回显全值）。**明确不是安全属性**：净过 ≠ 无凭据。pre-commit job 的 `glob` 只收 `genes/**` + `events/**`（暂存面才有意义），但被调脚本恒扫全部三面——本地观测面里的凭据同样拦提交（**是有意为之**：它是工作区里的凭据实物，值得在任何提交前清掉；触发 = 出现「本地观测凭据拦住与之无关的提交」的真实场景时，再加「只扫 git 面」模式）。占位符与环境变量引用（`$VAR` / `{{…}}` / `<…>`）不算凭据——URL 族的否决吃口令捕获组而非整段匹配，否则 `postgres://user:$PGPASS@host` 这类合法写法会被误报。

**7. 合同面与文档同步**：CLI 合同面 5 → 6 命令（`observe` 入 README「合同面」节与 `engine/AGENTS.md` 纪律行）；`.noogenesis/` 的 `.gitignore` 注释与 engine README 目录表同批更新；`noo_select` 工具描述增 advice 行说明（模型面英文口径）。

**超车检查**：不取代任何活跃笔记——融合立宪 ADR 拥有边界/清单/待拍板（本件只落其 D10 三件的实现与两个设计点，不重复其判据）；schema ADR 拥有基因/事件协议（本件不触碰 kind 准入与 Event 形状）；P2 ADR 拥有 `.noogenesis/` 缓存语义（本件只共用该命名空间，不改缓存面）。三处均已按「同决定不重复创建」核对。

## Alternatives considered

- **观测进 `events/` 轨**：落败——破「可复算才进轨」判据（S2/D7-1），且观测是概率性噪声，进 git 事实面即进评审与复算面。
- **观测面落 git（`events/` 外新目录）**：落败——事实面与观测面分家是 D8 的核心取舍；观测可丢弃、可重算，不该有版本压力。
- **自动写入（select/propose 运行时记，或 solidify 时顺带记）**：落败——这正是 A 半缺陷形态（成本常开 × 零可追溯收益），且 D4 已把触发权判归人；入档不等于被采用。
- **`observe` 做进 `scripts/*.mts` 而非引擎命令**：落败——观测 schema 的校验器与消费者（select 派生）必须同一实现，否则写读两侧口径双源；引擎是本仓唯一的 schema 持有者。
- **注解在命中的同一行尾**（`<ref>  <summary>  [obs …]`）：落败——summary 是不受约束文本，同行拼接让「哪里是摘要、哪里是注解」不可判，且适配层截断面会切掉注解。
- **改 `--json` / 新子命令输出派生面**：落败——消费方（适配层 + 模型工具输出）零需求，新增协议面换不来收益。
- **排序 / 禁用 / 阈值 / 半衰期**（旧引擎 memory-graph 的形态）：本期判不立——无对象：命中数远低于 `maxGenes` 上限（排序无可观察效果），每边样本 O(1)（比率被噪声支配；Laplace 平滑也救不了 n=1 的排序依据）。触发见 Decision 4。
- **advice 行注入 system-prompt 命中节**：落败——常驻面每模型步重复付费；建议档按需读即可。
- **凭据筛查做进 solidify 写路径（引擎内实现）**：落败——solidify 的落盘动作走 `git commit`，pre-commit 钩子已是同一道边界；引擎内再实现一遍模式集 = 双源（且引擎读不到 `scripts/` 面）。改钩子 + 白名单单源覆盖写读两侧。
- **凭据筛查扫全仓**：落败——越 D10 三面范围；文档/调研面误报成本高（引用别家 token 形状即命中）。

## Consequences

- **默认零成本**：无观测记录时 `select` stdout 只由 `signals:` 首行与命中行构成（与观测面缺席时逐字节相同），适配层过滤亦无新增行；观测目录缺席不是错误。
- **降级姿态分面**：写路径 fail-closed（坏记录写不进）；读路径 warn-skip（坏行不阻断 select，只丢该行权重）——与 P2「缓存侧 warn-skip / 本仓 fail-closed」同构。
- **凭据面强度上限写死在件头**：best-effort；门禁绿不构成「无凭据」证明；入 git 面的真正防线是 pre-commit 钩子（`git commit` 前拦下），全量跑是回归网。
- **观测数据在无自动接线时依赖人显式记录**（D7-3 挂载面暂不立）。长期零记录时派生面为空、成本为零——这是可接受的失败态，不是待补的缺口；重新评估的触发 = 出现「需要无人写入」的真实场景。
- **D3 吸收面现状**：凭据筛查 = best-effort 绊线（覆盖 provider 形状 / 赋值 / JWT / URL 与连接串内嵌凭据）；审计事件轨 = 既有 `events/`（kind 准入不变）；写入守卫与注入预算 = 本仓既有形态；两段式评估协议的形态与范围归第二期（D7-2）。
- **余项**：痕迹提炼面归属（挂起）、行为评估自建与第二期范围（D7-2）——两者都不因本批改变，唯一家仍在融合立宪 ADR。
