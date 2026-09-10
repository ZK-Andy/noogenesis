# 编码强制实施计划：写码在环反馈 + TS 类型语义门禁

> 状态：批 1（轨道 A）与批 2（B-1/B-2）已落地——ADR [2026-09-08-lint-in-loop-feedback](../../.agents/notes/implemented/architecture/2026-09-08-lint-in-loop-feedback.md) / [2026-09-08-coding-enforcement-track-b](../../.agents/notes/implemented/architecture/2026-09-08-coding-enforcement-track-b.md)；批 3（B-4 测量）结论 = 以证据延后（零真实 async 缺陷；触发 = 真实 async 失守，见 track-b ADR D6）。2026-09-08 讨论轮产出、用户拍板「两个都做，不要妥协」。**2026-09-10 扩面批**（[2026-09-10-export-docs-inloop](../../.agents/notes/proposed/architecture/2026-09-10-export-docs-inloop.md)）：A4 在环面从 lint 单判据扩到**注释面**（`export-docs-feedback.mts` + 判据件文件目标模式）；procedure 见 §1-A5。
> 家：本文件 = 两轨实施的单一事实源（procedure / 执行序）；决策理由与取舍落各批 ADR，本文件不承载决策。
> 依据：问题池 [capsule-01-optimization-round.md](capsule-01-optimization-round.md) §2.1「规范事前接入」+ §2.2-6「TS 统一解锁语义门禁但未建」；能力面单源 [framework-rebuild-blueprint.md](framework-rebuild-blueprint.md) §7 A1–A8 / M1–M3；规范单源 [code-standards](../method/code-standards.md)；判据单源 `.oxlintrc.json` + `scripts/verify-export-docs.mts`（ADR [2026-09-08-c2-lint-enforcement](../../.agents/notes/implemented/architecture/2026-09-08-c2-lint-enforcement.md)）。

## 0. 目标 / 非目标

- **轨道 A（写码时符合规范）**：AI 写码产生的**机械违规**在同一轮被反馈纠正——不依赖模型事先读过规范。
- **轨道 B（TS 类型语义门禁）**：把「TS 统一解锁但未建」的账还上——宿主 API 签名核对（类型级）+ 发布面不变量（AST/JSON 级）；镜像比对判死；type-aware lint 评估后定。
- **非目标**：散文语义机器化（注释复述控制流 / 命名意图 / 答辩腔——机器不可判，DSH 亦不做，证据 §5）；A3 写入前阻断、A6 停止前扫描、自动 `--fix`（升格候选，触发条件 §1-A4）。

## 1. 轨道 A：A4 在环反馈 + 一行指针

### A-1 现状与挂载点（证据）

- 四挂载点已接线：`adapters/dsh/index.mts:158-217`（A5/A2/A3/A4）；策略件空位 = `adapters/dsh/mount-policies.mts` 的 `toolPre` / `sessionStart` 空数组（`toolPost` 已挂轨道 A 策略）——**本轨只往 `toolPost` 加一件**。
- A4 合同：`ToolPostPolicy = (exec, result) => {kind:"block";feedback} | {kind:"context";lines} | void`（`adapters/dsh/mount.mts:66,74`）；`context` 经 `index.mts:214-216` 转 `additionalContexts`，宿主作为 user message 注入 agent loop（DSH 合同 `packages/core/tools/src/index.ts:590`，消费点 `packages/core/agent-loop/src/tool-calls.ts:157`）。
- 工具名/参数实证：`write{file_path,content}`、`edit{file_path,old_string,new_string,replace_all?}`（DSH `packages/fs/tool-fs/src/write.ts:69`、`edit.ts:83`）；`exec.arguments` = 解析后参数（bug-fix ADR [2026-09-08-mount-exec-arguments-field](../../.agents/notes/implemented/bug-fix/2026-09-08-mount-exec-arguments-field.md)）。

### A-2 实现（新件 `adapters/dsh/lint-feedback.mts`）

- 工厂：`createLintFeedbackPolicies(config: RepoRootConfig, deps?: { runLint?: RunLint; warn?: (message: string) => void }): { toolPost: ToolPostPolicy }`；`deps` = 执行面/日志面注入缝。
- `RunLint = (ctx: LintRunContext) => LintDiagnostic[]`（`LintRunContext` = `{ bin; config; file; cwd }`）；默认实现 `spawnSync(process.execPath, [bin, "--config", config, "--deny-warnings", "-f", "json", file])`，timeout 5s。
- 行为合同（逐条可测）：
  1. `exec.name ∉ {write, edit}` → `void`；
  2. `exec.arguments?.file_path` 非 string → `void`；
  3. `result.isError === true` → `void`（被拒/失败的调用没改文件）；
  4. `repoRoot = resolveRepoRoot(config, sessionWorkspaceOf(exec))`，`abs = path.resolve(sessionWorkspaceOf(exec) ?? repoRoot, filePath)`，`abs` 不在 `repoRoot` 内 → `void`；
  5. 扩展名 ∉ `{.ts,.mts}` → `void`；
  6. `<repoRoot>/.oxlintrc.json` 或 `<repoRoot>/node_modules/oxlint/bin/oxlint` 缺 → `void`（静默降级 + 每会话 warn 一次；离线降级纪律同 bank-pull）；
  7. 诊断空 → `void`；非空 → `{kind:"context", lines}`，≤10 条 + `…(+N more)` 尾行；
  8. 任何异常 → `void`（策略件自身不抛；index.mts 胶水已 catch + warn）。
- 接线：`mount-policies.mts` 的 `createMountPolicies` 把该策略（与 §1-A5 注释面判据同面）挂进 `toolPost`；`index.mts` 只把既有 `logger.warn` 透传进 deps（不新增 listener；偏离本计划原「零改动」字面，理由见 ADR Decision 2）。
- A-2b 指针行：`createSubtreeRulesPolicies` 的地图在 `docs/method/code-standards.md` 实存时追加一行写码规范指针——**文案单源 = `adapters/dsh/mount-policies.mts`（selftest 夹具钉死）**；本计划不复述串面（复述即第二家，随文案演进漂移）。

### A-3 测试（`adapters/dsh/selftest.mts` 追加夹具组）

- 注入 `runLint` 桩：① write + 1 条诊断 → `context` 且行含 `规则: 消息`；② read 工具 → `void`；③ `isError:true` → `void`；④ 路径在 repoRoot 外（相对 + 绝对）→ `void`；⑤ 非 `.ts`/`.mts` → `void`；⑥ 桩抛错 → `void`（降级）；⑦ >10 条 → 截断 + 尾行；⑧ 空诊断 → `void`（桩被调用）。
- 真件 e2e（1 组）：临时目录 + 复制 `.oxlintrc.json` + symlink `node_modules` → 写入含 `var` 的 `.ts` → 默认 `runLint` 返回 `context`。
- 防火墙：`node dist/adapters/dsh/selftest.mjs` 全绿（import 面机器断言不新增宿主依赖）。

### A-4 不做（升格候选 + 触发条件）

- **A3 写入前阻断**：`PreToolDecision` 只有 allow/deny/ask、**无 context 通道**；且 `edit` 是 diff，写入前需模拟应用才知道最终内容。触发 = A4 记录到同一文件反复违规 ≥2 次。
- **自动 `--fix`**：静默改文件会让模型心智模型漂移。触发 = 用户显式要求。
- **A6 停止前扫描**：git 边界已覆盖推送面。触发 = 出现「不推送就交付」的实际会话。

### A-5 注释面在环（2026-09-10 扩面批）

- **新件 `adapters/dsh/export-docs-feedback.mts`**：write/edit 成功 → 跑仓内判据件 `<repoRoot>/scripts/verify-export-docs.mts <file>`（文件目标模式）→ 退出码 1 = 违约（`FAIL: ` 前缀行，≤10 行 + 尾行）→ A4 `block`；0 → `void`（复位同文件计数）；2 / spawn 异常 / 判据件缺席 → `void` + 每会话至多一条 warn（判据件故障不是写码方违规）。死锁降级（同文件连续 block 达上限 → `context`）与降级纪律与 A4 lint 面同款。
- **判据件增文件目标模式**（`scripts/verify-export-docs.mts`）：域归属由判据件单源判定（调用方不复刻域表）；无参 = 全量扫描，`gates.json` / pre-commit / CI 条目与行为零变化。**在环消费协议 = stdout 的 `FAIL: ` 前缀行**。
- **目标解析前言折叠单源**：`engine-bridge.mts` 的 `resolveInLoopTarget`（lint 与注释面两判据共用）。
- **组装序** = lint → 注释面（`mergeToolPost` 首 block 胜出：lint 未过时不叠加注释面反馈）。
- **机制与成本单源** = [2026-09-10-export-docs-inloop](../../.agents/notes/proposed/architecture/2026-09-10-export-docs-inloop.md)（本计划不重抄判据）。

## 2. 轨道 B：TS 类型语义门禁

### B-1 宿主 API 签名核对（类型级，建）

- 新件 `adapters/dsh/host-api-contract.mts`：**纯类型断言、零运行时代码**——判据 = `tsc --noEmit`（`ts-typecheck` 闸已有，零新门禁脚本）。
- 断言面（依赖的宿主合同）**两组互补**：**键存在性**（`Events` 六键；`ToolExecution` 的 `name`/`arguments`/`agent`/`signal`；`ToolExecutionResult` 的 `isError`/`content`；`PostToolDecision.additionalContexts`）+ **形状相容**（`ToolExecution`/`ToolExecutionResult` extends `mount.mts` 窄类型）；另有决策判别式（`PreToolDecision` 三态、`PostToolDecision` accept/block）。`defineTool` 参数/返回与 `createUserMessage` 入参**不入断言面**——真实调用点由编译器同参数类型检查。
- 手法：`type Assert<T extends true> = T` + `type _k1 = Assert<…>`；上游漂移 → tsc 红。
- 验收：`tsc` 零错；负向手验（改键名/收窄形状 → 红，不留仓）。无 `--self-test`（判据 = 编译器，同 `ts-typecheck` 先例）。

### B-2 发布面不变量（AST/JSON 级，建）

- 新件 `scripts/verify-package-invariants.mts` + `engine/gates.json` 条目 `package-invariants`（15→16 条）+ `.github/workflows/validate.yml` self-test 行 + `lefthook.yml` pre-commit job。
- 判据：
  1. `main` / `exports`（递归收集全部字符串目标——裸字符串、条件对象、嵌套条件）指向 dist 实存件；
  2. `files` 白名单覆盖 `exports`/`main` 全部路径 + `engine/gates.json`、`engine/README.md`、`adapters/dsh/README.md`、`cordis.patch.yml`、`README.md`、`LICENSE`、`THIRD-PARTY-NOTICES.md`；
  3. dist 关键件存在：`dist/adapters/dsh/index.mjs`、`dist/engine/bin.js`、`dist/engine/gates.json`；
  4. `engines.node` 在场；`dsh.bundle.patch` 指向实存件；`peerDependencies` 的 `@deepseek-ai/*` 在场；
  5. 白名单外目录（`src`/`tests`/`.cache`）不得进入 `files`。
- `--self-test` 15 夹具：合规包（含 exports 条件对象形态）PASS；缺 dist 件 / `files` 漏项 / `files` 未覆盖 main / `exports` 悬空（字符串与裸字符串）/ 多余 `src`（带斜杠与裸目录名）/ `engines` 缺失 / `bundle.patch` 悬空 / peer 缺失各 FAIL；另三例钉 fail-closed 三档（缺 package.json / 缺 dist / 坏 JSON）。
- 前置：`npm run build`（**权威面 = CI**：`validate.yml` 先构建再跑；pre-push 只检查 dist 存在、不重建）；缺 dist → fail-closed exit 2。

### B-3 双实现镜像比对（判死）

- 前提消失：B5 已删 py 权威件 13 件 + 旧 js 源 10/9 件，**无第二实现可镜像**。关闭，理由落批 2 ADR 的 D5。〔状态 2026-09-08：判死已落 track-b ADR D5。〕

### B-4 类型感知 lint（评估后定）

- 只读测量：装 `oxlint-tsgolint`（devDependency，精确钉版），`--type-aware` 跑 `typescript/no-floating-promises`、`no-misused-promises`、`await-thenable`、`no-unnecessary-condition`。
- 判定：≥1 条**真实** async 缺陷 → 纳入白名单 + `lint` 命令加 `--type-aware`；零真实缺陷 → 以证据延后（HERO），触发 = 后续出现 async 失守。
- 成本闸：先测 lint 墙钟增量（当前 ~50ms）；>1s 则评估 pre-commit 降级为 pre-push。〔状态 2026-09-08：测量完成 → **延后**（四规则零真实 async 缺陷 + 11 条误报 + 墙钟 ~3.7×）；见 track-b ADR D6。〕

## 3. 批次与执行序

| 批 | 范围 | 交付 | 评审 |
|---|---|---|---|
| 1 | 轨道 A | `lint-feedback.mts` + `mount-policies` 接线 + selftest 夹具组 + 指针行 | FULL 三审 |
| 2 | 轨道 B-1 + B-2 | `host-api-contract.ts` + `verify-package-invariants.mts` + gates.json/CI/lefthook 接线 + B-3 判死记录 | FULL 三审 |
| 3（条件） | 轨道 B-4 | 测量报告 + 纳入/延后结论（证据随行） | 随批 2 或另批 |

- 每批流程：ADR（proposed→implemented + `Review` 证据行）→ 实现 → 门禁全绿 → FULL 三审 → push/CI 绿 → 收尾。
- 纪律：一次一个逻辑单元；批 1（挂载面）与批 2（门禁面）不同批。

## 4. 验收

- 机器面：gates 全绿 + `tsc` + engine/adapter self-test + pre-push e2e；CI 绿。
- 批 1 真机：会话内写一段含 `var` 的代码 → 同轮出现规范反馈；干净代码 → 零反馈。
- 批 2 负向手验：临时改断言 / 删 dist / `files` 漏项 → 对应门禁红。
- 文档同步：code-standards §2.1/§6、`adapters/AGENTS.md`、`scripts/AGENTS.md`、根 AGENTS 兜底第 4 条、README 结构行。

## 5. 风险与开放项

- **反馈循环**：模型反复改同一文件——只报诊断、不阻断；首批观察。
- **延迟**：每次 write/edit +~30–60ms；批 1 实测并记录。
- **范围**：v1 只对 repoRoot 内文件生效（self-hosting / 带 `.oxlintrc.json` + oxlint 的宿主仓）；泛化到「按文件所属仓找 lint 配置」列为后续。
- **注释面生效条件**：仓根存在 `scripts/verify-export-docs.mts`（self-hosting 面）；其它仓静默降级。执行面 = A4 唯一跑仓内脚本的面（四条纪律与成本见 §1-A5 指针 ADR）。
- **散文语义不立闸**：证据 = DSH 无 prose 机器门禁（`ls scripts/ | grep -iE "prose|comment|naming|style"` 空），只有 `dsh-prose-standard`/`dsh-trim-cot-leakage` 技能；本仓同构（注入 + 评审兜底）。
- **JSDoc 标签一致性闸空转**：DSH `scripts/jsdoc.ts` 的 `checkParams`/`checkReturns` 同类；本仓 `@param/@returns` 实测用量 **0** → 不立。

## 6. 证据锚点

| 事实 | 锚点 |
|---|---|
| 四挂载点接线 / 空策略位 | `adapters/dsh/index.mts:158-217`、`adapters/dsh/mount-policies.mts:71-73` |
| A4 决策形态与 additionalContexts 通道 | `adapters/dsh/mount.mts:66,74`、`packages/core/tools/src/index.ts:590`、`packages/core/agent-loop/src/tool-calls.ts:157` |
| write/edit 参数形状 | `packages/fs/tool-fs/src/write.ts:69`、`packages/fs/tool-fs/src/edit.ts:83` |
| 判据单源 | `.oxlintrc.json`、`scripts/verify-lint.mts`、`scripts/verify-export-docs.mts`、`engine/gates.json` |
| 上游语义门禁先例 | `scripts/package-invariants.ts`、`scripts/cordis-core-api.ts`、`scripts/jsdoc.ts`（`.cache/deepseek-harness/`） |
| 散文无机器门禁 | 上游 `ls scripts/ \| grep -iE "prose\|comment\|naming\|style"` 空；只有 `dsh-prose-standard`/`dsh-trim-cot-leakage` 技能 |
| TS 统一与语义门禁欠账 | [capsule-01-optimization-round.md](capsule-01-optimization-round.md) §2.2-6 |
