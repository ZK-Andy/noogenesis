# Agent Note: 评审发现的机械化——把可机械判的问题做成机械校验

Status: implemented
Review: FULL/2026-09-11/R1=ok R2=ok R3=ok

Related: 评审契约 [review](../../../../docs/method/review.md)（findings 形态与三路收窄）、阶段位置 [吸收阶段 ADR](2026-09-11-absorption-stage.md) + 主链路 [feature-flow](../../../workflows/feature-flow.md) §5（挂载点）、收尾检查单 [session-close](../../../workflows/session-close.md)（吸收对账行）、门槛判据 [anti-overdesign](../../../../docs/method/anti-overdesign.md)；落地件 [verify-command-surface](../../../../scripts/verify-command-surface.mts)、[verify-package-invariants](../../../../scripts/verify-package-invariants.mts)、[verify-secrets](../../../../scripts/verify-secrets.mts)；写作面 [doc-standards](../../../../docs/method/doc-standards.md) 铁律 6。

## Problem

机器面已经很厚（门禁全跑 + 夹具 + CI 穷尽），但每批评审仍产出大量发现，且**同一类反复出现**——发现落在会话里，没有「分类 → 机械化」的固定动作，于是下一批评审再把同类抓一遍。

三个复发实例（同批或相邻批次实测）：

- **声明面漂移**（2 次）：2026-09-08 `engine/AGENTS.md` 写「四命令」而 `bin.ts` 是五命令；2026-09-11 `bin.ts` 头注写「五命令」而两 README / `engine/AGENTS` / `code-standards` 已是六命令。
- **门禁件自身的盲区**（3 次）：2026-09-05 cookbook 记「门禁未经真实样例校准会带 bug」；2026-09-11 [verify-secrets](../../../../scripts/verify-secrets.mts) 两条——负样例根本没走到 `reject`（只证明上游正则不匹配）、URL 族 `reject` 吃整段匹配致环境变量式口令误报（`postgres://user:$PGPASS@host` 本应放行）。
- **README 版本行**：版本行由独立提交手工同步（`71601e7` 0.1.3→0.2.3、`5b9279c` 0.2.3→0.2.4 各只改 README 版本行；`scripts/release/bump.mts` 只碰 `package.json` 与 lock）+ `session-close` 强制人工核对——机器面此前没有这一项。【推断 · 未证】该手工步骤在每次发版都会出现（无法从仓内证明"每次"，只证明这两轮）。

## Decision

**1. 机械化判据 = 判据稳定（形状可枚举、不看语义）且噪声实测过关即立**；噪声率高才不立（门禁自身是维护面且会带缺陷：[verify-secrets](../../../../scripts/verify-secrets.mts) 的 URL 族误报、本件 Decision 3 的变更史词面闸实测噪声 ≈95%）。单次代价高者（凭据泄漏 / 发布事故 / 数据丢失）不受噪声实测约束。阶段位置与改写理由见 [吸收阶段 ADR](2026-09-11-absorption-stage.md) Decision 7；门槛条文仍以本件为单源。

**2. 本次机械化三件**：

- `scripts/verify-command-surface.mts`（新件，白名单条目 `command-surface`）：事实源 = `engine/bin.ts` 的命令分支（`cmd === '…'`）；判据 = ①`bin.ts` 的 `usage()` 数组区间、②`engine/README.md` 首个含调用的 fenced 代码块——两处**声明区**的命令集逐字等于分支集；③计数面白名单里**同行点名 CLI/engine** 的「N 命令 / N commands」等于核心命令数（去 `self-test`）。声明区清单与计数面白名单的单源 = 该件 `SET_SURFACES` / `COUNT_SURFACES` 常量（本件不抄其条数）。**历史叙事面**（journal / ADR / HANDOFF 滚动窗）不扫（它们合法地记载当时的命令数）；「N 命令各一」描述命令件个数，是显式例外；普通英文散文里的「one command」不是命令面声明（同行无 CLI/engine 即跳过）。
- `scripts/verify-package-invariants.mts` 判据 6（并入既有发布面不变量闸，不新增条目）：三个版本面 —— 两个 README **各自**必须声明 `noogenesis-dsh@X.Y.Z` 且等于 `package.json.version`；`HANDOFF.md` 属状态面（声明了就必须对，不强制有锚）。面清单单源 = 该件 `VERSION_SURFACES` 常量。
- `scripts/verify-secrets.mts` 元断言：`SECRET_PATTERNS` 每条必须有**绑定它的正样例**（命中且 label 相符——按序扫描，落在更早模式上即不合格），带 `reject` 的每条必须有**「匹配后被 reject 否决」的绑定负样例**。首跑即抓出两条名义覆盖夹具（Google key 长度不足、连接串样例被赋值族先命中）。**样例编码附加约束**（外部扫描器误报治理 + 元断言 4 源码自洁）见 [2026-09-12-secret-fixture-fragment-encoding](2026-09-12-secret-fixture-fragment-encoding.md)。

**3. 评估未过（附实测，不装成已解）**：durable 文档「变更史词面闸」不立。【探索性 · n=1 次本机实测】口径 = 扫 `.agents/notes/{implemented,proposed}` + `docs/method` + 两 README + 根 AGENTS（共 64 件 md），标记表 = 英文 5 条（`previously` / `no longer` / `used to be` / `renamed` / `was changed to`）+ 中文 5 条（`曾经` / `之前是` / `改自` / `不再(是|支持|走|用)` / `原先`），逐行正则计数。**现象**：命中 19 处，其中 18 处落在**定义这条禁令的规则文档自身**（`doc-standards` / 根 AGENTS / `code-standards` / `ai-collaboration-method` 引用被禁词表）或正当用法。**该面继续归评审语义面 + `noo-trim-cot-leakage` 技能**（成因未证，不列机制结论）。

**4. 接线与动作点**：[feature-flow](../../../workflows/feature-flow.md) §5「吸收」= 评审结论齐后的同级阶段（逐条 findings 分类归口四出口；不可机械判项按既有归口，**不新造载体**）；[session-close](../../../workflows/session-close.md) 的对账行改为吸收对账（对账 ≠ 动作）。新门禁的 self-test 入 CI 抽查清单（阶段位置随 [吸收阶段 ADR](2026-09-11-absorption-stage.md) Decision 7 改写）。

**5. 反哺**：发现的**类**随批记入 journal（动作在 [feature-flow](../../../workflows/feature-flow.md) §5）——复发计数用于判断类的形态与噪声，不再作为立闸门槛。

## Alternatives considered

- **每个 finding 都建门禁**：落败——门禁是维护面且自身会带缺陷（[verify-secrets](../../../../scripts/verify-secrets.mts) 的 URL 族误报实证）；该落机器面的前提是判据稳定且噪声实测过关，不是 findings 数量。
- **让三路评审代理顺手机械化**：落败——机械化需要跨路视野（同一类常横跨 R1/R2：声明面漂移两路各现一次），且评审的有效载荷应保持 findings 原样；机械化集中一次做。
- **变更史词面闸**：实测噪声约 95%（数据在案），落败——中文标记与"规则自指"把误报推高到不可用。
- **收尾单源同步闸**（档案页/行动区 ↔ 已落地 ADR）：判据模糊——「待启动」字样与 ADR 存在性之间没有稳定关系，不立。
- **把这类判断写进 gene 承载**：本批任务明确不含基因。机械化的对象只限**可机器判**的项；不可机器判的语义面留评审三路与既有流程卡。

## Consequences

- **三类复发不再进评审**：命令面漂移、README 版本漂移、凭据模式表的双向覆盖（后者的夹具面）。
- **成本护栏**：每加一条门禁 = 多一个维护面；判据稳定性与「先实测再立闸」（见 Decision 3 的变更史词面闸实测：噪声过高即不立）是其约束；`command-surface` 的白名单扫描面防止把历史叙事面一并卷入。
- **漂移面先删、必留的落成锚点**：[doc-standards](../../../../docs/method/doc-standards.md) 铁律 6 收紧为「无闸覆盖的计数不进正文」——无闸的漂移面先删；用户面必须保留的计数则落成被 `command-surface` 逐处校核的锚点。门禁只兜底，不替代删除。
- **明确未机械化**（不装成已解）：命名/措辞/证据形态/单源撕裂/外部证据可复现性等语义面，仍靠评审三路 + 根 AGENTS「评审检查项」AI 兜底清单。
