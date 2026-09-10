# Agent Note: 评审发现的机械化——把复发的可判问题做成机械校验

Status: implemented

Related: 评审契约 [review](../../../../docs/method/review.md)（findings 形态与三路收窄）、主链路 [feature-flow](../../../workflows/feature-flow.md) §4.6（挂载点）、收尾检查单 [session-close](../../../workflows/session-close.md)（机械化对账行）、门槛判据 [anti-overdesign](../../../../docs/method/anti-overdesign.md)；落地件 [verify-command-surface](../../../../scripts/verify-command-surface.mts)、[verify-package-invariants](../../../../scripts/verify-package-invariants.mts)、[verify-secrets](../../../../scripts/verify-secrets.mts)；写作面 [doc-standards](../../../../docs/method/doc-standards.md) 铁律 6。

## Problem

机器面已经很厚（门禁全跑 + 夹具 + CI 穷尽），但每批评审仍产出大量发现，且**同一类反复出现**——发现落在会话里，没有「分类 → 机械化」的固定动作，于是下一批评审再把同类抓一遍。

三个复发实例（同批或相邻批次实测）：

- **声明面漂移**（2 次）：2026-09-08 `engine/AGENTS.md` 写「四命令」而 `bin.ts` 是五命令；2026-09-11 `bin.ts` 头注写「五命令」而两 README / `engine/AGENTS` / `code-standards` 已是六命令。
- **门禁件自身的盲区**（3 次）：2026-09-05 cookbook 记「门禁未经真实样例校准会带 bug」；本批 R1-S2（负样例根本不走到 `reject`）；本批 R2-B3（URL 族 `reject` 吃整段匹配 → 环境变量式口令误报）。
- **README 版本行**：每次发版靠人工同步（0.2.3、0.2.4 两轮手工改）+ `session-close` 强制人工核对——机器面完全没有这一项。

## Decision

**1. 机械化判据 = 该类复发 ≥2 次，或单次代价高**（凭据泄漏 / 发布事故 / 数据丢失）。首现且代价低者不进机器面——门禁自身是维护面且会带缺陷（本批 R2-B3 实证）。**先实测再立闸**：噪声率高的类不立（见第 3 条）。

**2. 本次机械化三件**：

- `scripts/verify-command-surface.mts`（新件，白名单条目 `command-surface`）：事实源 = `engine/bin.ts` 的命令分支；判据 = ①`bin.ts` usage 行命令集与 ②`engine/README.md` 合同面代码块命令集**逐字等于**分支集，③六个活声明面的「N 命令 / N commands」计数等于核心命令数（去 `self-test`）。扫描面是白名单活声明面；**历史叙事面**（journal / ADR / HANDOFF 滚动窗）不扫（它们合法地记载当时的命令数）；「N 命令各一」描述命令件个数，是显式例外。
- `scripts/verify-package-invariants.mts` 判据 6（并入既有发布面不变量闸，不新增条目）：README（双语）的 `noogenesis-dsh@X.Y.Z` 必须等于 `package.json.version`，且至少声明一次。
- `scripts/verify-secrets.mts` 元断言：`SECRET_PATTERNS` 每条必须有**绑定它的正样例**（命中且 label 相符——按序扫描，落在更早模式上即不合格），带 `reject` 的每条必须有**「匹配后被 reject 否决」的绑定负样例**。首跑即抓出两条名义覆盖夹具（Google key 长度不足、连接串样例被赋值族先命中）。

**3. 评估未过（附实测，不装成已解）**：durable 文档「变更史词面闸」不立——实测 64 件文档、标记命中 19 处，其中 18 处为**规则自指**（标准文档本身引用被禁词表：`doc-standards` / `AGENTS` / `code-standards` / `ai-collaboration-method`）或正当用法，噪声率约 95%。该面继续归评审语义面 + `noo-trim-cot-leakage` 技能。

**4. 接线与动作点**：[feature-flow](../../../workflows/feature-flow.md) §4.6「发现机械化」= 评审收尾后的确定性动作（逐条判可机械判性与门槛；未达门槛或语义面按既有归口，**不新造载体**）；[session-close](../../../workflows/session-close.md) 增机械化对账一行。新门禁的 self-test 入 CI 抽查清单。

**5. 反哺**：每批把发现按「类」记入 journal（复发计数）；类计数达 2 即按第 1 条判据机械化——本批即首例（三个类各带 ≥2 次证据）。

## Alternatives considered

- **每个 finding 都建门禁**：落败——门禁是维护面且自身会带缺陷（本批 R2-B3）；判据必须带门槛。
- **让三路评审代理顺手机械化**：落败——机械化需要跨路视野（同一类常横跨 R1/R2：声明面漂移两路各现一次），且评审的有效载荷应保持 findings 原样；机械化集中一次做。
- **变更史词面闸**：实测噪声约 95%（数据在案），落败——中文标记与"规则自指"把误报推高到不可用。
- **收尾单源同步闸**（档案页/行动区 ↔ 已落地 ADR）：判据模糊——「待启动」字样与 ADR 存在性之间没有稳定关系，不立。
- **把这类判断写进 gene 承载**：本批任务明确不含基因。机械化的对象只限**可机器判**的复发项；不可机器判的语义面留评审三路与既有流程卡。

## Consequences

- **三类复发不再进评审**：命令面漂移、README 版本漂移、凭据模式表的双向覆盖（后者的夹具面）。
- **成本护栏**：每加一条门禁 = 多一个维护面；门槛（复发 ≥2 或代价高）与「先实测再立闸」（M4 例）是其约束；`command-surface` 的白名单扫描面防止把历史叙事面一并卷入。
- **漂移源消除优先于门禁**：[doc-standards](../../../../docs/method/doc-standards.md) 增写作铁律 6（可推导的计数与清单不进正文）——能删的漂移面先删，门禁只兜底。
- **明确未机械化**（不装成已解）：命名/措辞/证据形态/单源撕裂/外部证据可复现性等语义面，仍靠评审三路 + 根 AGENTS「评审检查项」AI 兜底清单。
