# Agent Note: M1 立项拍板——技能守卫三件套 v0 + 防过度设计混合形态

Status: implemented
Review: FULL/2026-09-10/R1=ok R2=ok R3=ok

批注（分批翻转）：批 A（守卫三件套）2026-09-10 随本翻转收口——实现 `206ad18` + 评审收口 `51234bc`；三路 findings（R1 0B/3S、R2 0B/8S、R3 3B/5S）全采纳，修复分别落 `51234bc` 与本翻转批；头部 Review 行 = 批 A 证据。批 B（防过度混合 D）待收——随其收口补第二条 Review 行。Acceptance「session-close 对账步留痕」的兑现方式 = 2026-09-10 会话收尾执行 session-close 步骤 2 并入 journal 月卷（本会话即首跑）。

Related: [2026-09-08-b4-mount-wiring](2026-09-08-b4-mount-wiring.md)（tool-pre 挂载面与 A2 地图件先例，本 ADR ①②复用其能力位）；[2026-09-08-a8-session-record-projection-removal](2026-09-08-a8-session-record-projection-removal.md)（「用了没有」证据面 = 宿主日志 `tool/result` 的既定口径）；[2026-09-08-b2-engine-adapter-ts](2026-09-08-b2-engine-adapter-ts.md)（adapters 分层与防火墙边界，批 A 代码面约束）；优化轮 §2.2-1/2（方案要点工作面，[capsule-01-optimization-round](../../../../docs/research/capsule-01-optimization-round.md)）。

## Problem

- **技能使用守卫缺口**：7 个 `noo-*` 技能全自觉调用——「该不该用」（任务对口的技能没载）与「用了没有」（调用痕迹无处对账）均无任何机器面。B4 曾落纯记录件（[2026-09-08-b4-mount-wiring](2026-09-08-b4-mount-wiring.md) Decision 3：A3 观测 + A6 投影），随 [A8 撤除批](2026-09-08-a8-session-record-projection-removal.md)整体退役——宿主无 ignorable 写入口，投影路线不可复用；证据面回归宿主日志 `tool/result` 事件文本（既定口径）。
- **防过度设计缺口**：体系无任何防过度防御/过度工程的护栏档；HERO-Anti-OverDefense（MIT，`.cache/hero-anti-overdefense` 细读在优化轮 §3.7）为直接先例——常驻注入 + 精简契约 + 案例目录事后辩论的分层形态；本体系未覆盖反 stalling 形态（HERO Rule 8）。

## Decision

**用户拍板（2026-09-10 双方案设计轮，两案均取推荐案）：**

1. **技能守卫 = 三件套 v0**（触发交给机器，服从留给自觉）：
   - **① 技能路标**：A2 开场地图加一行「任务型 → 技能名」映射（动 `docs/**` → `noo-doc-standards`；评审收口 → `noo-code-review`；push 前 → `noo-pre-push-checks` 等）——常驻零自觉可见，调用仍自觉。〔批 A 落地：`mount-policies.mts` SKILL_ROSTER_LINE，技能面存在性过滤（活副本 / 随库缓存任一含 `noo-*` 才发行）；A2 发行条件随之自「零子树件」放宽为「零内容」——B4 ADR Decision 4 同批同步。〕
   - **② 触点提醒**：tool-pre 钩子（B4 已证可用的挂载面）按**文件路径模式**判「本会话该载而未载」（写 `docs/**` 而未载 `noo-doc-standards`）→ `agent.inject` 一行 advice，**不阻断**（repeat-tool-reminder 同款哲学）；映射表进 config，条目按需增删。〔批 A 落地：`skill-guard.mts` + A3 advice 档（能力层扩档）+ `config.skillGuards`（缺省表 `docs`/`.agents/notes` 两条，POSIX 相对目录形态 fail-closed）；每会话每技能至多提醒一次。subagent 不跳——A2 全图对窄任务子代理是纯噪音故跳，本件单行路径强相关提醒对子代理同样有效且每（子）会话有界（R3 评审要求书面化，已落 skill-guard 头注）。〕
   - **③ 事后对账**：session-close 流程卡加一步——grep 宿主日志 `tool/result` 技能调用痕迹，列出本会话用了什么；「该不该」的裁断留人/评审（A8 撤除后既定证据面）。〔批 A 落地：session-close 步骤 2。〕
   - **阻断档判不立**（见 Alternatives）。
2. **防过度设计 = 混合形态（HERO 原生分层）**：
   - **精简契约块**（HERO 精简版 ~8 条 + 核心判据「这次运行会检测出什么具体的失败？真出现了下一步做什么不同？」+ Rule 8 反 stalling）进根 AGENTS.md（443/800 词预算内，估 90–120 词）。
   - **完整蒸馏**（9 规则 + 6 校准形状 + 与 noo-prose-standard / noo-trim-cot-leakage 同域交叉验证的归并说明）成 `docs/method/` 新篇，带 manifest 预算。
   - **cases/ 不加载**（HERO 关键设计：整本案例集在手会拿相似度误杀真发现），索引落 `docs/research/` 留作评审辩论武器（按案例 ID 质询「你的提案与该案例有何不同」）。
   - 预期口径 = **护栏非开关**（HERO 诚实局限：helps, not a switch；defeasible）。
3. **实施分两批**，各自带评审与 ADR 翻转：守卫 = 代码批（adapters 挂载件 + A2 地图 + 流程卡）；防过度 = 文档批（根 AGENTS + method 新篇 + cases 索引）。单批先收可先翻——本 ADR 即按此路径随批 A 翻转，分批落点见头部批注。

## Alternatives considered

- **守卫升阻断档**（写 `docs/**` 未载技能 → 拦回）：落败——「该不该用技能」的判定本身是语义判断，机器给不出必报失败；HERO 核心判据「说不出这次运行会检测出什么具体失败就别建」。②的路径×技能相关性是唯一机器可判角落，且 advice 档零误伤成本。
- **轻量两件**（只建路标 + 对账，缓建触点提醒）：落败——①③都盖不住「该载未载」的当下时刻，弃②则三件退回全自觉档，机器触发面归零；②恰是本方案相对现状的唯一增量。
- **防过度 = 纯技能**（noo-anti-overdefense 技能）：落败——全自觉档，HERO 作者自认天花板（模型不想载就不载）。
- **防过度 = 纯常驻块**（全量进根 AGENTS，不建 method 篇）：落败——根 AGENTS 仅剩 ~357 词预算装不下全量蒸馏；归并说明与校准形状无处落，违反 tier 表（方法论正文归 method）。
- **门禁补挂**（机械校验过度防御）：落败——过度防御机器不可判（HERO-O 本尊）；同型判据已在 C15 两候选实证过（文件名契约闸/上帝类闸均判不立）。
- **自动沉淀式守卫**（引擎扫会话推断技能使用）：落败——迁移计划 §6 负面清单在案（非自动沉淀复刻、不让引擎扫会话）；③的 grep 对账即人工可执行的最小形态。

## Consequences

- **批 A 验收状态**：开场地图含技能路标行（`mount-policies.mts` SKILL_ROSTER_LINE，存在性过滤；selftest 81 组夹具在案）✅；写 `docs/**` 而未载对口技能时收到一行 advice（不阻断、可继续；`skill-guard.mts` + A3 接线 + 降级面自测）✅；session-close 步骤 2 在卡，首跑留痕 = 2026-09-10 会话收尾 journal ⏳。
- **批 B 验收面（待收）**：根 AGENTS.md 精简契约块且字数 ≤800；`docs/method/` 新篇存在且过 manifest 预算；cases 索引在 `docs/research/` 且不进任何常驻/懒加载面。
- **触点提醒误报**（路径模式过粗 → 骚扰）：advice 档可忽略无阻断成本；映射表条目按需增删，宁缺勿滥（重复提醒稀释真守卫信号——charter ADR 对价条款）。
- **契约块被具体流程压过**（HERO 作者点名的最可能失败模式）：流程卡写实何时开始/结束的纪律已在；本风险显式接受并随实现批在流程卡自查。
- **长会话衰减**（显著性稀释 / compaction 削薄，HERO 对策相反形态）：不做预防性机制，先诊断再补——显式接受。
