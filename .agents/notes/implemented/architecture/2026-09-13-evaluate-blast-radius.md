# Agent Note: Evaluate 的 blast-radius——改动面度量、判据对接与 Capsule 字段裁决（批次 1 序 4）

Status: implemented
Review: FULL/2026-09-13/R1=ok R2=ok R3=ok

Related: 批次表 [2026-09-13-feature-completion-backlog](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · 主设计 [§5.1/§6/§10](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 相邻原语 [Capsule 原语](2026-09-13-capsule-primitive.md)（序 1）· 出入账口径 [P1 骨架](2026-09-05-p1-engine-skeleton.md)（D4）／[P1 实现](2026-09-05-p1-engine-implementation.md)（D4）· 影响面方法论 [architecture-standards](../../../../docs/method/architecture-standards.md) §2.4

## Problem

主设计 §6 的 Evaluate = blast-radius + 约束检查 + 真执行验证命令 + 评分；本仓 `evaluate` 只落了后三件，改动面只有一行 `outgoing files: N`——文件数，没有行数、没有范围分布，blast-radius 这个量在仓内零家。序 1 把主设计 §5.1 给 Capsule 列的 `blast_radius` 字段显式后置到本序（「度量随批次表序 4 落地时同批扩字段」），所以本序必须同时裁决三件：**度量怎么算、判据怎么接、字段落不落**。

既有度量面还有一处漏面：`changedPaths` 只走三条 git 命令（`base...HEAD` 已提交 + 未暂存 + 未跟踪），**不含 index 面**。实测（mktemp 临时仓，n=1【探索性】；设置 = 提交基线后修改已跟踪文件并 `git add`，不提交）：

| 命令 | 输出 |
|---|---|
| `git diff --name-only` | 空 |
| `git diff --cached --name-only` | `f.txt` |

即「暂存后未提交」这一状态下，出账变更面被读成空集——`max_files` 对这种情况静默放行，而这正是本仓「先评审、后提交」流程里可达的中间态。机制【推断 · 未证】：三条命令分别是 `base→HEAD`、`worktree→index`、未跟踪文件三面，`index→HEAD` 面无人覆盖。

## Decision

### B1（度量口径与家）：`blastRadius(repoRoot, slots)` 是改动面的唯一度量入口

- 一次调用返回 `{files, added, deleted, scope, paths}`，`files === paths.length`；`evaluate` 只调它一次，约束检查与报告都从同一个对象取数（不再各自数一遍出账集）。
- **计量面 = base→工作区**：已提交区间（`base...HEAD`）+ index（`diff --cached`）+ 未暂存 + 未跟踪文件整文件行数。文件面 = 四面并集去重；行面 = 前三面的 `--numstat` 增删之和 + 未跟踪文件的行数（未跟踪没有基线，唯一可复算的读数就是整文件行数）。三条 diff 面的行数**互补而非重叠**：index 面 = index vs HEAD、未暂存面 = worktree vs index、已提交面 = base vs HEAD，同一文件在两面各计自己那段 hunk，三者之和恰是 HEAD→工作区的总 churn。
- **行数记 churn（`added + deleted`）不记净变化**：删 100 行加 100 行的改动面是 200，净变化会读成 0。
- **二进制与不可读文件记 0 行**：`--numstat` 对二进制给 `-`（解析为非数即跳过），未跟踪面按「含 NUL 字节」判二进制跳过——行数不是字节数，二进制面没有行语义。
- **`scope` = 顶层路径段的分布**：`{dir, files}[]`，按文件数降序、同数按段名码点序（确定性）；空集合渲染为 `-`。顶层段答「影响面跨了几棵树」，更细的完整路径表是 `scripts/change-scope.mts` 的职责，不在此复写。
- **路径面不做 trim**：带空白边界的文件名是合法路径，按行原样取用；trim 过的路径读不到实际文件，行数会静默少算。
- **改名按 git 的 rename 检测计一个新路径**（旧路径不出现在变更面）：这是 diff 面的既有语义，`files` 与 `forbidden_paths` 都按它判，本序不改写也不加脚手架——把文件移出 `forbidden_paths` 的改名不会列出旧路径。

### B2（判据对接）：只接 `max_files`，不新增约束键

- `constraints.max_files` 的对照值改由 `blast.files` 供给（与 `forbidden_paths` 同一 `paths` 集合），口径单源在 `blastRadius`；`forbidden_paths` 判据不变。
- **`max_lines` / `max_scope` 判不立**（附具名触发）：现仓零基因声明、零真实失控件——没有出现过「文件数合规而行数/范围失控」的案例；schema 约束键是基因作者的合同面，为尚不存在的失控件预置键 = 死键（schema ADR S2 判据）。触发 = 真实案例出现（某次改动文件数合规但行数或跨度显著失控）时，按 `max_files` 同形扩键并同批改 schema 判据。

### B3（Capsule `blast_radius` 字段）：不进 schema，附具名触发

- **理由与序 1 拒 `diff` / `content` 同源**：blast-radius 是 git 的派生量，复写一份即双记账；且 Capsule 里没有任何区间锚点（base/head 或事件指针），记下的数字事后**不可复算**——而「可复算」正是 Capsule 的立身判据（`capsule_sha` ↔ 文件字节、`gene_ids` ↔ 入档历史）。
- Capsule 的既有字段都是执行者对自己这次执行的**声明**（`steps` / `evidence` / `outcome`），而 blast-radius 不是声明而是读数：它要么由引擎在度量时刻写（此刻 Capsule 还不在），要么由执行者手填（= 不可校验的数字）。
- **本序修正序 1 的预告**：序 1 写「`blast_radius` 随序 4 同批扩字段」，本序裁决为**不扩**（同一条「字段先于消费者 = 死字段」判据的正向应用：当时留待本序判，本序判不立）。
- **触发** = 出现按执行记录对比影响面的真实消费者（跨机贡献的复验面，批次表序 21 / 31 / 45），**且**该消费者同时定义区间锚点（提交区间或事件指针）时，同批扩字段——字段与可复算依据一起进，不单进数字。批次表序 5（候选比较）已收口且**不构成触发**：它判的是「没有这样的消费者」（[序 5 ADR](2026-09-13-candidate-comparison-blindness.md) C3）。
- **字段用途（复议时照看这三类消费者面）**：① **入档/约束对照**——§6 Evaluate 的 blast-radius 与基因 `constraints` 对照，本仓已由 B2 的本次度量承担，留档不是它的前提；② **跨库交换/晋升安全门**——参照实现按改动面大小决定能否交换/晋升（本仓无 A2A 交换面，随批次表序 21/31）；③ **代理信号与预估漂移**——参照实现拿 `files === 0` 数空转周期、并对照执行前的预估报漂移（本仓无 daemon 自动演化、无预估生产者）。三类的共同前提 = **事后按执行记录横向比较**；缺这个前提，字段就只有写入方没有读取方。
- **复议协议（触发到达时先答三问，再决定动手）**：① 谁生产这个数字——引擎在写入时测量（可复算，但量到的是"记录那一刻"而非那次执行）还是执行者声明（语义自洽，但不可校验）？② 区间锚点用什么——`base`/`head`、事件指针，还是接受"不可复算、只作人读声明"？③ 谁消费——给不出具体读取方即判不立延续（先例 = 序 3 对 `validation_report_id` 的同款裁决）。

### B4（补 index 面，重拍出入账口径的事实面）

- `changedPaths` 增第四条命令 `git diff --cached --name-only`；`scripts/change-scope.mts` 同步（其头注已承诺与 `engine changedPaths` 同口径），三面 → 四面。
- 这是**事实同步不是决定改写**：P1 实现 ADR D4 的决定是「与 change-scope 同口径、对照出账变更面」，四面是该决定在漏面被实证后的正确形态；两处 ADR 的事实行与本 ADR 同批改写。
- 影响面：`max_files` / `forbidden_paths` 与评审范围展示在多一个 index 面后只会更完整，不会放松——「暂存未提交」不再能绕过约束。

### B5（报告面）：`evaluate` stdout 一行 blast-radius，合同面同批锁定

- `formatReport` 首行由 `outgoing files: N` 改为：

```text
blast radius: files 3, lines +120/-8, scope engine(2), docs(1)
```

- 零变更时 = `blast radius: files 0, lines +0/-0, scope -`；行数与范围只出现在这一处（不落盘、不进 Event），消费面是人与 `noo_evaluate` 的调用方。
- 合同面同步：`engine/README.md`（合同面注释 + 对照面说明）+ 引擎 self-test 的逐字断言。命令计数与退出码三档不变；`engine/bin.ts` 的 `usage()` 注释不含报告行，无需同步。

## Alternatives considered

- **把 `blast_radius` 落进 Capsule（照序 1 的预告执行）**：落败——见 B3：不可复算的数字位。
- **新增 `max_lines` / `max_scope` 约束键**：落败——见 B2：无声明者、无失控件，键一进 schema 就是合同面与夹具面。
- **照 evolver 口径加 `blast_radius_estimate` + 预估漂移告警 + 分级阈值（hard cap / critical overrun / approaching limit）**：落败——那套服务于 daemon 自动演化与 LLM 预估的生产者，本仓无自动演化、无预估生产者；分级阈值是自造噪声（防过度设计：不为不存在的场景加脚手架）。
- **`scope` 记每文件一行或按域（`genes/` 二级）分组**：落败——顶层段是「影响面跨了几棵树」的最小可读信号，逐文件表已由 `change-scope.mts` 提供；二级分组会把「域」这个内容层概念混进路径度量。
- **行数用 `git diff --shortstat` 取**：落败——输出是人读句（受 locale 与措辞影响），`--numstat` 的制表分隔数字面才是可解析面。
- **只列未跟踪文件数不计其行数**：落败——新建文件常常是行数主体（本批次自身即如此），漏掉会让行读数系统性偏低。
- **顺带把 Capsule / Mutation 的命令面缺口一起修**：落败——一件一交；不在本序范围。
- **把度量抽成独立门禁件（`verify-blast-radius.mts`）**：落败——它是 `evaluate` 的输入而非独立判据，拆件即多一条门禁与一处登记面。

## Consequences

- **采用面**：`engine/util.ts`（`changedPaths` 四面 + 未跟踪面单列返回 + `blastRadius` + `scopeOf` / `numstatTotals` / `untrackedLines`）+ `engine/evaluate.ts`（`checkConstraints` 收 blast、报告行）+ `engine/selftest.ts`（度量八条断言：四面齐备 / index 面 / 未跟踪行数 / 删除侧 / scope 序 / 报告行 / 二进制跳过 / 空白边界文件名）；`scripts/change-scope.mts`（index 面）。
- **声明面同步**：`engine/README.md`（合同面「改动面度量」条、util 行、constraints 对照面）；`verify-command-surface` 机械校核命令面与 README 一致性，命令计数不变。
- **相邻 ADR 事实行同步**：[P1 骨架](2026-09-05-p1-engine-skeleton.md)「收窄归口」（blast-radius 不再后置）、[P1 实现](2026-09-05-p1-engine-implementation.md) D4（三条 → 四条 changed-path 命令）、[Capsule 原语](2026-09-13-capsule-primitive.md)（`blast_radius` 的预告改为指向本 ADR 的判不立）。
- **单源指针**：度量口径单源 = 本 ADR + `engine/README.md`；blast-radius 作为**影响面识别方法论**的口径仍在 [architecture-standards](../../../../docs/method/architecture-standards.md) §2.4 R9（本序只落其机器面），互链不重抄。
- **强度上限（写明）**：度量是**行数、文件数、顶层段分布**三个标量，不是依赖图/编译面/扇出的影响分析——「改动可能影响谁」的语义判断仍归 R9 的人读清单；本序只把可机械计算的改动面读数落地。
- **遗留面（逐条归口）**：Capsule 字段随 B3 的触发；`validation_report_id` 按[序 3 ADR](2026-09-13-event-field-extension.md) E4 具名延期；评分与候选比较已按[序 5 ADR](2026-09-13-candidate-comparison-blindness.md)落判据（不立数值评分、候选比较不做机器面）。
- **实测样本（n=1【探索性】）**：本批收口时对真实仓跑 `evaluate doc/doc-single-home`，首行 = `blast radius: files 23, lines +791/-104, scope engine(9), .agents(8), scripts(2), HANDOFF*.md(3), journal(1)`，exit 0（门禁全绿）。可复算的部分是**形状**（首行格式 + 三个读数在场），不是数值——**行读数随工作树而变**（同批两次读 `+741/-90` → `+791/-104`），因为它没有区间锚点（读数不落盘、不进 Event，与 B3 判不立同一个理由）；文件数与范围面在批内稳定。
- **批次表状态**：序 4 已收口，批次表对应行标 done 并指向本笔记。
