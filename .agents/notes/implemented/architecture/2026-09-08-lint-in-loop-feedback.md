# Agent Note: 轨道 A 写码在环规范反馈——A4 lint 策略件与挂载接线

Status: implemented
Review: FULL/2026-09-08/R1=ok R2=ok R3=ok

Related: 实施计划 [coding-enforcement-impl-plan](../../../../docs/research/coding-enforcement-impl-plan.md)（本批 = 批 1 轨道 A，procedure 单源）；能力层与档位纪律 [2026-09-08-b4-mount-wiring](2026-09-08-b4-mount-wiring.md)（A4 决策形态 `additionalContexts` + 建议档）；防火墙与允许集 [2026-09-06-m2-adapter-wiring](2026-09-06-m2-adapter-wiring.md)；离线降级纪律 [2026-09-06-bank-pull-session-trigger](../bug-fix/2026-09-06-bank-pull-session-trigger.md)；判据单源 [code-standards](../../../../docs/method/code-standards.md) + [.oxlintrc.json](../../../../.oxlintrc.json)（c2 立项 [2026-09-08-c2-lint-enforcement](2026-09-08-c2-lint-enforcement.md)）；问题池余项 [capsule-01-optimization-round](../../../../docs/research/capsule-01-optimization-round.md) §2.1「规范事前接入」

## Problem

- 编码规范已「成文 + 机器拦」（[code-standards](../../../../docs/method/code-standards.md) + c2 的 `lint` / `export-docs` 两闸），但机器面全部在 **git 边界之后**：pre-commit 在提交时触发（lint 判据仍是全仓跑，非仅暂存面）、pre-push/CI 在推送面。写码当轮模型拿不到任何规范反馈——违反规范要到提交时才可见，AI 写码循环内无纠正回路（问题池「规范事前接入」条余项）。
- A4 能力位（`tools/post-execute` → `additionalContexts`）已接线且合并器语义在案（B4 ADR Decision 1），但策略 lane 零件（A8 撤除后 `toolPost` 空）；实施计划 §1 定批 1 = 轨道 A。
- 判据面已就位、无新增判据：仓根 `.oxlintrc.json` 白名单 + `node_modules/oxlint` 二进制即 c2 既有判据；缺口只在「写码成功后同轮回注」。

## Decision

**新件 `adapters/dsh/lint-feedback.mts`（零宿主依赖）承载 A4 写码反馈策略；`mount-policies.mts` 的 `createMountPolicies` 把它挂进 `toolPost`；不新增 `ctx.on` listener（每挂载点恰一个的既有原则不变）。**

1. **策略工厂与行为合同**：`createLintFeedbackPolicies(config: RepoRootConfig, deps?: { runLint?: RunLint; warn?: (message: string) => void }): { toolPost: ToolPostPolicy }`。逐条（实现与 selftest 夹具一一对应）：

   | # | 条件 | 结果 |
   |---|---|---|
   | 1 | `exec.name ∉ {write, edit}` | `void` |
   | 2 | `exec.arguments?.file_path` 非 string | `void` |
   | 3 | `result.isError === true` | `void`（被拒/失败调用没改文件） |
   | 4 | 绝对路径（`sessionWorkspaceOf` 为基）不在 `repoRoot` 内 | `void` |
   | 5 | 扩展名 ∉ `{.ts, .mts}` | `void` |
   | 6 | 仓根缺 `.oxlintrc.json` 或 `node_modules/oxlint/bin/oxlint` | `void` + 每会话至多一条 warn（离线降级，同 [bank-pull](../bug-fix/2026-09-06-bank-pull-session-trigger.md) 纪律） |
   | 7 | 诊断空 / 非空 | `void` / `{kind:"context", lines}`（≤10 行 + `…(+N more)` 尾行） |
   | 8 | 任何异常 | `void` + 每会话至多一条 warn（策略件自身永不抛） |

   - `RunLint = (ctx: LintRunContext) => LintDiagnostic[]`（`LintRunContext` = `{ bin; config; file; cwd }`）为执行面注入缝；默认实现 `spawnSync(process.execPath, [bin, "--config", config, "--deny-warnings", "-f", "json", file])`（timeout 5s，`cwd` = 仓根），解析 oxlint JSON 的 `diagnostics[].labels[0].span`（行/列 1 基）。
   - 状态键 = `exec.agent?.session`（`createSessionStore`，同 [M2](2026-09-06-m2-adapter-wiring.md) 口径）；无会话键时降级为即席状态（warn 可能重复，与 M2 同款边界）。降级提示自身经 try/catch 自保（注入的 `warn` 抛错不得逃出策略件）。

2. **接线**：`createMountPolicies(config, deps)` 组装 `toolPost: [lintFeedback.toolPost]`；`index.mts` 只把既有 `logger.warn` 透传进 deps。**这偏离实施计划 §1-A2「`index.mts` 零改动」的字面**：计划同条要求「每会话 warn 一次」，而策略层若无 logger 注入则该要求不可达；透传既有 logger 不触宿主接线面（不新增 listener、不改注入声明），形态同 `registerBankSkills(ctx, {config, logger})` / `createBankPullScheduler({... logger ...})` 既有两件。计划该句的括号理由（每挂载点恰一个 listener）仍然成立。

3. **A2 指针行**：`createSubtreeRulesPolicies` 的开场地图在 `docs/method/code-standards.md` 实存时追加一行 `- 写码规范：docs/method/code-standards.md（机器面 lint 写码后自动反馈；export-docs 在门禁面）`——地图已承载「动工前先读哪份规则」，写码规范指针与 A4 反馈同批落地；零布点件、或缺 `docs/method/code-standards.md` 的仓不加（指针行与布点件同款存在性过滤）。反馈本身另需仓根 `.oxlintrc.json` + oxlint 二进制，缺席时静默降级（第 1 节第 6 条）。

4. **测试**：`adapters/dsh/selftest.mts` 追加夹具组——①–⑧ 逐条合同（注入桩，含空诊断、`.mts` 正例、绝对出仓、截断与尾行）、缺基建 warn-once（文案钉死）、默认 `runLint` 真件 e2e（临时仓 + `.oxlintrc.json` + `node_modules` 符号链接 + 含 `var` 的 `.ts` → `context`；干净文件 → `void`）、index 接线面 warn-once 冒烟、A2 指针行存在性正负两例。防火墙自测（import 面机器断言）同批全绿。

5. **不做（升格触发条件照实施计划 §1-A4）**：A3 写入前阻断（`PreToolDecision` 无 context 通道；`edit` 是 diff，写入前需模拟应用）、自动 `--fix`（静默改文件致模型心智模型漂移）、A6 停止前扫描（git 边界已覆盖推送面）。

## Alternatives considered

- **严格照计划「`index.mts` 零改动」，生产面静默无 warn**：落败——计划同条要求「每会话 warn 一次」；缺基建的仓需要一条可诊断的降级痕迹，而 `deps.warn` 只由测试消费即死缝。
- **策略内 `console.warn` 直写**：落败——适配层日志面统一走宿主 `ctx.logger`（M2/bank-pull 先例），直写进程 stderr 绕开宿主日志面。
- **A3 写入前阻断（`tools/pre-execute` deny）**：落败——决策三态无 context 通道，且 `edit` 的最终内容在应用前不可知（模拟 diff 应用 = 自建第二条写入路径）。
- **自动 `--fix`**：落败——静默改写让模型对文件状态的心智模型漂移；触发 = 用户显式要求。
- **只报首条诊断**：落败——oxlint 单文件诊断本就是写码粒度，10 行上限 + 尾行已控噪，截到 1 条反而放大往返轮次。
- **只对写码面报变更行**：落败——需要 diff 行映射（`edit` 的 old/new 位置），判据复杂度远超收益；整文件诊断与门禁面判据同口径。
- **A4 合同改 async 以消除事件循环阻塞**：本批落败——改 `ToolPostPolicy` / 合并器 / index 接线三处合同面超出轨道 A 范围，而同步 ~0.1s 与写码往返同量级；升格触发 = 观测到可感知卡顿（会话/流式输出受影响为【推断 · 未证】）。

## Consequences

- 写码当轮（write/edit 成功后下一模型步）收到 ≤10 条 `文件:行:列 规则: 消息` 行；干净代码零注入零 token。规范从「提交时才发现」提前到「写码当轮」。
- 延迟实测（n=5，`node node_modules/oxlint/bin/oxlint --config .oxlintrc.json --deny-warnings -f json <单文件>`，2026-09-08 本机，【探索性】）：0.07–0.12s/次；实施计划估的 30–60ms 偏低（进程启动主导为【推断 · 未证】），仍属可接受写码往返开销。
- 泛化边界：v1 只对 `repoRoot` 内、仓根带 `.oxlintrc.json` + oxlint 的仓生效（self-hosting 面）；按文件所属仓找 lint 配置列为后续（实施计划 §5 同口径）。
- 判据零新增：与 `lint` 闸消费同一 `.oxlintrc.json`；`export-docs` 不入在环面（其判据是声明面整体，写码中途不成立）。
- 不触碰阻断路径：A4 的 `block` 能力仍在合并器单源承载，本策略只用 `context`（建议档纪律）。
- **同步面代价**：`spawnSync` 在 A4 listener 的同步段、早于 `next()` 执行——每次 write/edit 阻塞宿主事件循环 ~0.1s（非仅该会话往返；「流式输出同受影响」为【推断 · 未证】）。异步化见 Alternatives 升格触发。
- **出仓判定语义**：`path.relative` 三段判据（`..` 自身 / `..<sep>` 前缀 / 绝对路径）；仓内经 symlink 指向仓外的文件按仓内处理（v1 无 realpath 解析）。
- 评审收口（2026-09-08 FULL 三审）：R1 抓出指针行「export-docs 在环」口径矛盾（改文案）+ 三处可简化（`rel === ""` 冗余、运行入参类型三写、空串校验冗余）；R2 抓出 A4「零策略」口径五处未同步（`README.md` / `mount.mts` ×3 / `index.mts`）、`warnOnce` 未自保、出仓前缀判定过宽、指针行缺存在性过滤、夹具五处弱断言/缺正例；R3 抓出两处未标【推断 · 未证】的成因/影响、A8 撤除 ADR 的 A4 零策略事实未同步、实施计划 procedure 单源与偏离自陈矛盾，另采纳测量设置补全、指针行门条件口径、Related 补链、`adapters/AGENTS.md` 常量去重、README 拍板单源补链、本笔记归 `architecture/` 类目。**全采纳**。
