# Agent Note: 批次 8 序 39 裁决——优雅极致实现域：性能 / 复杂度 / benchmark 三闸判不立，域内容单源既有家

Status: implemented

Review: LIGHT/2026-09-14/语义评审（范围化子代理 R2：2 Blocker + 2 Suggestion 全采纳——T1 逐字复述 architecture-standards §4 的构建墙钟触发条却给不同动作 → T1 收窄为「可复现的 I/O 外瓶颈」+ 明写墙钟触发条归 §4；HANDOFF ⏭ 末句「最新批 = 序 38」与本批条目矛盾 → 改序 39；批次表现状事实的命令计数改动与「2026-09-13 实读」日期口径不符 → 改单源指针 + Consequences 记账；T2 漏行 44 `/evolve` benchmark 命令面 → 补）

Related: 批次表 [行 39](2026-09-13-feature-completion-backlog.md) · 主设计 [§10 / §4.1 / §7.2](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 复杂度裁决家 [architecture-standards §4](../../../../docs/method/architecture-standards.md) · 引擎消耗画像 [P1 骨架 ADR](2026-09-05-p1-engine-skeleton.md) · 上下文预算 [护栏建设轮 ADR](2026-09-13-guardrail-construction-round.md) · 改动面度量 [序 4 ADR](2026-09-13-evaluate-blast-radius.md) · 候选比较禁金标 [序 5 ADR](2026-09-13-candidate-comparison-blindness.md) · Detect 裁决组 [序 11 ADR](2026-09-13-detect-source-verdict-session-event.md) · 前序裁决 [序 38](2026-09-14-project-init-domain-verdict.md) / [序 37](2026-09-14-plugin-marketplace-verdict.md) · 范围契约 [anti-overdesign](../../../../docs/method/anti-overdesign.md)

## Problem

批次表行 39（批次 8 内容域第二件）要求「优雅极致实现域（性能 / 复杂度 / benchmark 门禁）」，出处主设计 §10 表行「优雅高效实现 | 性能优先、复杂度评估、失败感知 | 测试门禁、benchmark 门禁」；设计 §4.1 同域条目 =「代码如何优雅高效地实现」。开工前取证（2026-09-14，本仓实读）：

- **引擎消耗画像【推断 · 未证】**：P1 骨架 D1 依据 1 断言消耗画像 = 子进程编排（跑门禁 / git）+ 文件 I/O + 字符串匹配 + 小算术，墙钟瓶颈全在外部进程——CPU 性能是伪命题。该断言由四接口工作量拆解推断，非测量数据。
- **真实性能面 = 上下文预算，已在场**：常驻注入面有字面预算判据（阻断面，判据件落适配层纯函数 + `adapters/dsh/selftest.mts`，由真实门禁实跑）+ `ctx.tokenMeter` 每会话一行读数（观察面）；口径与勘误单源 = 护栏建设轮 ADR。`doc-budgets`（manifest 制）同族。
- **复杂度面已裁决**：architecture-standards §4——上帝类闸判不立（实测 n=38：行数 p50=152 / p90=516 / max=1158、扇出 max=15，无自然拐点、零失控件；判别式 = 一句话说不清职责 / 改写困难 / 评审反复抓同一件）；import 环检测闸判不立（2026-09-10，n=46 源文件、81 条相对 import 边，环 = 0、跨族边 = 0）；project references 拆分不现在做（触发 = 构建 / 类型检查墙钟恶化到阻塞日常迭代）。code-standards §3 承载「一个函数一个职责 / 命名揭示意图」语义面。
- **复杂度度量已在引擎**：`evaluate` 的 blast-radius 对出账改动面现算文件数 / 行 churn / 顶层段分布，报告首行发射；字段边界与判不立面单源 = 序 4 ADR。
- **测试门禁已在场**：engine self-test + adapter self-test + Hermes hook self-test + `verify-*` 族的 `--self-test` 夹具 + pre-push 编排（gates / gene-format / dist 自测 / tier 逐 ref 循环）+ CI 穷尽矩阵。
- **benchmark 面无消费者**：合并携带自校验证据（含 benchmark 结果）= 批次表行 45，依赖行 21 贡献开放轮；行 21/22 为零（[序 37 裁决](2026-09-14-plugin-marketplace-verdict.md)在案）。候选比较判据明令金标类不入通道，benchmark 分是显式泄漏面（序 5 ADR）。
- **失败感知已有家**：基因八字段 schema 含 `avoid`（`propose` 渲染 strategy + avoid）；`distill collect` 只读汇编三类持久失败面（`events/` fail 行 / `capsules/` fail / `genes/` `avoid`）；cookbook 每坑一原子（症状 / 根因 / 规避 / 来源，域标签封闭集，机器强制）；Detect 信号源四源全判不立（自动 Detect 默认关，重拍件 = 序 11 ADR）。
- **优雅 / 简洁已有家**：anti-overdesign 范围契约 + `.agents/notes/*/simplification/` 类 + `noo-find-simplifications` 技能。
- **cookbook 既有判据**：[门禁] 门禁阈值与现实脱节即失效（立阈值先实测样本分布，阈值失守必须触发 ADR）；[演化] 耗时度量不可靠（波动远超信号，n=2 探索性）。

## Decision

### 1. 域内容单源 = 既有家，不新立方法篇

「性能优先 / 复杂度评估 / 失败感知」三句话的事实各有家（见 Problem）。按 [ai-collaboration-method](../../../../docs/method/ai-collaboration-method.md) §一.1「每个事实只有一个家」与 §一.2「先长后立，不强行嫁接」，为填设计 §10 表行而另立 `docs/method/` 篇 = 指针页双表示（正文全部是他处链接），不立。触发见 T4。

### 2. 性能门禁判不立

CPU 面无具名失败类：引擎消耗画像 = I/O + 子进程编排（【推断 · 未证】）；且阈值须先有实测分布（cookbook 判据），本仓零失控件。真实性能面（上下文预算）已有阻断面 + 观察面。触发见 T1。

### 3. 复杂度门禁判不立

三条候选（上帝类 / import 环 / 构建墙钟）均已在 architecture-standards §4 裁决不立，各有触发条与实测基线；本域不另立阈值、不重复度量。语义面与测度面分别由 code-standards §3 与 `evaluate` blast-radius 承载。触发沿用 §4，不改写。

### 4. benchmark 门禁判不立

无消费者（行 21/22 与行 45 未开）；且候选比较判据明令金标类不入通道。造 bench 工具与门禁 = 无消费者的脚手架。触发见 T2。

### 5. 测试门禁已交付（指针，零新增）

三族 self-test + `verify-*` 夹具 + pre-push 编排 + CI 穷尽矩阵在场；单源 = [scripts/AGENTS.md](../../../../scripts/AGENTS.md) / [engine/AGENTS.md](../../../../engine/AGENTS.md) / [adapters/AGENTS.md](../../../../adapters/AGENTS.md) / [validate.yml](../../../../.github/workflows/validate.yml)。

### 6. 重议触发

- **T1（性能）**：出现可复现的 I/O 外瓶颈（引擎 / 门禁 CPU 侧失守）→ 开性能测量批（先实测分布，再定阈值；工具形状 = 实测基线档 + 复现脚本）。构建 / 类型检查墙钟的触发条归 architecture-standards §4（project references 拆分），本件不重复、不另给动作。
- **T2（benchmark）**：行 21/22 贡献开放轮落地、行 44（`/evolve` benchmark 命令面）或行 45 开批 → 随该批重估 benchmark 门禁与跨机复验证据面。
- **T3（复杂度）**：真实失控件出现（architecture-standards §4 三判别式之一）→ 按该节触发条评估，以届时实测 max × 1.5 为候选阈值。
- **T4（新篇）**：出现第一条既有家都装不下的「优雅高效实现」规则 → 另立 `docs/method/` 篇。

## Alternatives considered

- **新立 `docs/method/implementation-standards.md`（性能 / 复杂度 / 失败感知规范）**：落败——三面事实各有家；另立篇 = 指针页，违「先长后立 / 一个事实一个家」。
- **立 benchmark 门禁（bench 工具 + 阈值 + `gates.json` 条目）**：落败——无消费者（行 21/22 为零、行 45 未开）；阈值先于实测分布 = cookbook 判据反例；金标禁令在案。
- **立性能门禁（引擎 / 门禁墙钟预算）**：落败——CPU 无具名失败类（【推断 · 未证】的 I/O 画像），真实性能面已交付。
- **立复杂度阈值闸（文件行数 / 扇出上限）**：落败——architecture-standards §4 已以实测分布判不立；重复度量 = 对已定论的东西再跑校验。
- **判「已交付、零动作」**：落败——测试门禁与失败感知确已交付，但性能 / 复杂度 / benchmark 三面的判不立理由与触发条需要有家；判已交付会把「未覆盖」记成已满足，触发条失去载体。

## Consequences

- **批次表单源更新**：行 39 备注改 `done（指针 = 本件）`；「未交付」计数 11 → 10；游标 = 序 40（踩坑原子化）；同处把「现状事实」的引擎命令面表述改为单源指针（手抄计数不随交付更新）。
- **档位**：纯文档收口，路径触发集未命中（无 `docs/method/**` / `engine/**` / `adapters/**` / `scripts/**` / `templates/**` / `.agents/workflows/**` / 任意 AGENTS.md 变更）→ LIGHT 单路语义评审（R2）。
- **机制零变化**：`engine/**`、`adapters/**`、`scripts/**`、`package.json`、`engine/gates.json` 均不动。
- **单源**：域内三判不立结论与触发条以本件为家；复杂度裁决单源 = architecture-standards §4；上下文预算单源 = 护栏建设轮 ADR；失败感知单源 = `engine/README.md`（基因字段 + `distill collect` 汇编面）+ cookbook；测试门禁单源 = 各族 AGENTS.md + validate.yml。
- **评审结论**：LIGHT 单路 R2——2 Blocker + 2 Suggestion 全采纳、拒 0（findings 处置见 [journal](../../../../journal/2026-09.md) 本批节）。
