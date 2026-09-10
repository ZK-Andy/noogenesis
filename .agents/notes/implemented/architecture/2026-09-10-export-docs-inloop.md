# Agent Note: 注释面在环接入——导出契约注释随写码当轮拦回

Status: implemented
Review: FULL/2026-09-10/R1=ok R2=ok R3=ok

Related: 轨道 A [2026-09-08-lint-in-loop-feedback](../../implemented/architecture/2026-09-08-lint-in-loop-feedback.md)（A4 在环面创始件；本批 = 该面扩一名判据，勘误面 = 其 Consequences「export-docs 不入在环面」句）；[2026-09-09-lint-block-and-staged-hook](../../implemented/architecture/2026-09-09-lint-block-and-staged-hook.md)（`block` 档 + 死锁降级纪律单源）；procedure 单源 [coding-enforcement-impl-plan](../../../../docs/research/coding-enforcement-impl-plan.md)；判据单源 [verify-export-docs.mts](../../../../scripts/verify-export-docs.mts) + [code-standards](../../../../docs/method/code-standards.md)；候选出处 [capsule-01-optimization-round](../../../../docs/research/capsule-01-optimization-round.md) §2.1「规范事前接入」（该文档 2026-09-10 收口冻结，此行仅作出处记录——触发与判据单源在本件 Problem / Alternatives）。

## Problem

「规范事前接入」的机制矩阵里，注释规范是唯一在环缺位面：编码面有 A4 oxlint 拦回，注释面的唯一机器判据 `export-docs` 全在 git 边界之后（pre-commit 无条件 + pre-push + CI）。写新导出函数/类忘紧邻 JSDoc，要到提交时才可见——与轨道 A 立项时「写码循环内无纠正回路」同型。

- **在环排除理由被实读证伪**：轨道 A ADR 记「export-docs 不入在环面，其判据是声明面整体，写码中途不成立」。实读 `checkSource(file, text)`：纯单文件 AST 判定（`ts.createSourceFile` + 导出声明/尾随导出组判 JSDoc 紧邻），「整体」只是遍历范围 `SOURCE_ROOTS`。单文件可判——该句须勘误。
- **体量实测**（2026-09-10 本机，n=3，【探索性】）：全量跑（38 件）0.83–0.85s；在环单文件跑（同适配层形态：绝对路径 + `cwd` = 仓根）0.50–0.52s——node 启动 + `typescript` 模块加载主导，文件数不是主要项。
- **用户拍板**（2026-09-10）：在环扩面范围选「注释面补齐」；通用化候选未过 HERO 两问（判定见 Alternatives），lint 泛化维持后续——**触发 = 会话内出现跨仓写码场景（按文件所属仓解析 lint 配置的真实需求）；该判定的单源在本行**，不指向优化轮文档（池文档 2026-09-10 收口冻结）。

## Decision

**新件 `adapters/dsh/export-docs-feedback.mts` 承载 A4 注释面判据；`mount-policies.mts` 把它挂进 `toolPost`（序在 lint 判据之后）；仓内判据件 `verify-export-docs.mts` 增文件目标模式——判据单源，适配层不重写判定逻辑。**

1. **判据来源 = 仓内判据件**：适配层 spawn `<repoRoot>/scripts/verify-export-docs.mts <file>`。这是 A4 面首次执行**仓内脚本**（既有在环执行体 = `<repoRoot>/node_modules` 的工具 + 仓根配置）。纪律写死：文件名固定、参数数组直传（无 shell 拼接）、`cwd` = 仓根、timeout 5s、只读、退出码三档映射（0 通过 / 1 违约 / 2 或异常 = 判据件故障 → 静默降级）。
2. **文件目标模式**（`verify-export-docs.mts`）：`node scripts/verify-export-docs.mts <file>...` 只判落在 `SOURCE_ROOTS` 内的给定件；**域归属由判据件单源判定**（调用方不复刻域表，避免双源漂移）。无参调用 = 全量扫描，`gates.json` / pre-commit / CI 的条目与行为零变化。在环消费协议 = stdout 的 `FAIL: ` 前缀行（判据违约行）。
3. **行为合同**（与 lint 判据同构，逐条对夹具）：
   - 目标解析：非 write/edit、参数面缺失、`result.isError`、出仓、扩展名 ∉ `{.ts,.mts}` → `void`。该前言与 lint 判据**折叠单源**（`resolveInLoopTarget` 归口 engine-bridge，lint 判据同批改吃它）。
   - 判据件缺席（`<repoRoot>/scripts/verify-export-docs.mts` 不存在）→ `void` + 每会话至多一条 warn。
   - 退出码 0 → `void`（干净写码复位同文件计数）；1 → `block`（`FAIL:` 行 ≤10 + `…(+N more)` 尾行）；2/其他/spawn 异常 → `void` + warn-once——判据件自身故障不是写码方的违规。
   - 死锁降级：同文件连续 block 达上限后降级 `context`（违规仍可见、不再拦），一次干净写码复位。**计数协议与上限单源** = `mount.mts` 的 `createBlockGate`（与 lint 判据共用；两件不复写计数/复位段，本件不复述上限数值）。
4. **组装序**：`toolPost: [lintFeedback.toolPost, exportDocs.toolPost]`。合并器 `mergeToolPost` 首 block 胜出——lint 未过时不叠加注释面反馈，反馈保持聚焦。
5. **文案与文档同步**：A2 地图的 code-standards 指针行改在环事实（文案单源 = `mount-policies.mts`，selftest 夹具钉死）。同步面 = [code-standards](../../../../docs/method/code-standards.md)（§2.1 判据面 + §6 机器强制面）/ 根 [AGENTS.md](../../../../AGENTS.md) 检查项 4 / `adapters/AGENTS.md` / `adapters/dsh/README.md`（挂载面 + 语言口径面）/ `adapters/dsh/mount.mts` 头注 / `adapters/dsh/index.mts` 接线注释 / [architecture-standards](../../../../docs/method/architecture-standards.md) §3 指针表 / [实施计划](../../../../docs/research/coding-enforcement-impl-plan.md)（§1-A5 + §5 + A-2b）/ 优化轮 §2.1 状态注。
6. **勘误**：轨道 A ADR 的排除句（Consequences）与接线句（Decision 2）改写为当前事实 + 本件指针——implemented 笔记与上线现实同步纪律，只改事实不改决定。
7. **模型面语言**：判据件违约行（`FAIL: ` 行）改英文——该行经适配层原样进入模型面 `block` 反馈，属模型面字符串口径面（单源 = `adapters/dsh/README.md`「模型面字符串语言口径」行）；本件自撰的协议兜底文本与降级 warn 同为英文，判据件其余输出（OK / fail-closed 摘要）维持中文（人面）。在环执行面的 env 按继承（本件纪律面不含 env 项，同 lint 判据）——引擎通道的 `minimalEnv` 白名单是另一执行面，不类推。

超车检查：本条不取代活跃笔记——轨道 A / 升格批拥有 A4 面机制与 `block` 档（本件只扩一名判据消费者并勘误其一句事实），按升格批同款「新批 + 旧件改事实」形态处理，不重复创建。

## Alternatives considered

- **全量跑，不给判据件加文件模式**：落败——全量 0.85s/次同步阻塞宿主事件循环，约 lint 判据（轨道 A ADR 实测 0.07–0.12s，n=5）的 5–8 倍；文件模式实测 0.50–0.52s（n=3）且判据零复制。
- **适配层自实现「导出声明缺 JSDoc」判定**：落败——需要 TS 解析器（适配层零宿主依赖面不引入 `typescript`），且判据必然与仓内闸双源（改一处忘一处即静默漂移）。
- **通用化：`gates.json` 增 `inloop` 字段，声明式跑任意仓内门禁**：本批判不立——为「提交前修 → 写码当轮修」一步之差造机制（HERO-O 范围契约）；触发 = 第二件确有需要的仓内判据出现时再评估形态。
- **只对 write 生效、不对 edit 生效**（规避中间态）：落败——lint 判据不作此区分（同为 A4 面），区别对待会让同一挂载点的两条判据纪律分裂；中间态由死锁降级兜底。
- **用 `context` 建议档替代 `block`**：落败——同升格批理由（「可见」不等于「过不去」），机器可判违规应在 git 边界之前拦住。
- **A3 写入前档（`tools/pre-execute` deny）替代**：落败理由单源在轨道 A / 升格批 Alternatives（`deny` 无 context 通道；`edit` 最终内容应用前不可知）。

## Consequences

- 注释规范机制四档齐：常驻指路（A2 地图 + 子树 AGENTS 原生注入）/ 在环 `block` / git 边界 `export-docs` / 评审语义面（检查项 4）。
- 在环新增一类执行面：**仓内判据脚本**（此前只有仓根解析的工具与配置）。本批只开固定名一件，形态泛化判不立（见 Alternatives）。
- 成本【探索性，n=3】：每次 `.ts/.mts` 写码 +0.50–0.52s 同步开销（在环单文件实跑，同适配层形态）；与既有 lint 判据（轨道 A ADR 实测 0.07–0.12s）叠加后约 0.6s/次——异步化升格触发（可感知卡顿）单源在轨道 A ADR Alternatives。
- 域外写码（如 `engine/**`）也付该下限成本（判据件判域后无语义）——以「调用方不复刻域表」换单源；engine 写码面小，接受。
- 生效条件 = 仓根存在 `scripts/verify-export-docs.mts`（self-hosting 面）；其它仓静默降级，不阻断写码。
- 判据零新增：与 `export-docs` 闸消费同一判据件与同一 `SOURCE_ROOTS`。
- 模型面反馈 = 判据件 `FAIL:` 行（英文：`<相对路径>:<行>: exported <kind> <name> lacks an adjacent JSDoc contract comment`）+ 适配层兜底文本（英文）；判据件人面输出（OK / fail-closed 摘要）维持中文。

## Risks

- **误报逼模型修非问题**：死锁上限（缺省值单源 = `createBlockGate` → `context`）兜底；判据误报本身按 c2 白名单纪律逐条复审（判据改动走门禁批）。
- **同步延迟翻倍**（~0.1 → ~0.6s/次写码）：观测到可感知卡顿即触发异步化评估（触发条件单源 = 轨道 A ADR）。
- **在环执行仓内脚本是新姿态**：以固定文件名 + 数组直传 + 超时 + 只读四条纪律约束；通用化需另过 HERO。
- **判据件输出协议漂移**：`FAIL: ` 前缀行是适配层消费协议——改前缀或改其语言（模型面英文，见本件「模型面语言」条）即破在环面，故在判据件头注标为协议面。
