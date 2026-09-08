# Agent Note: 编码规范机器拦升格——A4 写码 block 拦回 + pre-commit lint 收窄暂存面

Status: implemented
Review: FULL/2026-09-09/R1=ok R2=ok R3=ok

## Problem

编码规范机器面已三层闭环（c2 的 `lint`/`export-docs` 闸 + 轨道 B 契约/发布面闸 + 轨道 A 写码在环反馈），但近程仍有两个缺口：

- **A4 只启用 `context` 建议档**：write/edit 成功后 oxlint 诊断**可见但不拦**——模型可无视 `context` 行继续下一动作，机器可判违规仍能静默越过 git 边界。`block` 档（结果面拦回纠正消息）能力已在 [b4-mount-wiring](./2026-09-08-b4-mount-wiring.md) 合并器 + `index.mts` handler 接线实证（`merged.block` → 替换工具结果，不调 `next()`），但 [轨道 A](./2026-09-08-lint-in-loop-feedback.md) 拍板「首批策略件不使用阻断档」——能力通了，策略层零使用，升格未触发。轨道 A Alternatives 对 A3（工具前阻断）的排除理由（`deny` 无 context 通道、`edit` 需模拟应用）**不适用于 A4 block**：block 是工具已执行后的结果面拦回，feedback 自带文本、模型看得到原因，无需模拟应用。
- **pre-commit lint 全仓跑**：`lefthook.yml` pre-commit 的 `lint` job 直调 `verify-lint.mts`（默认目标 `["."]` 全仓）——提交时扫的是**整仓**而非**本次暂存面**：无关文件的历史违规会挡本次提交，快检变质为全仓穷尽。B3 已立「钩子只做快检查、CI 拥有穷尽矩阵」基线（[2026-09-08-b3-hooks-install](./2026-09-08-b3-hooks-install.md)），lint 全仓在 pre-commit 属基线违反。

## Decision

本批 = 编码规范机器拦近程升格两件（用户 2026-09-09 拍板立项，替代分类：不取代活跃 ADR，是轨道 A / b4「首批建议档」拍板的**升格批**，升格单源 = 本 ADR）。

1. **A4 block 升格**（`adapters/dsh/lint-feedback.mts`）：write/edit 成功 + oxlint 非空诊断 → `toolPost` 决策从 `{ kind: "context", lines }` 改为 `{ kind: "block", feedback }`（违规清单合单条文本，内容 = 现 `context` 行格式 `rel:line:col rule: msg` + 截断尾行）。模型收到 block 后必须修正才能继续该文件写码。**降级面全部保留**（缺基建/异常/非 `.ts/.mts`/出仓 → `void` 静默 + warn-once；`result.isError` → `void`）——block 只在确有判据时触发，不改变降级纪律。
2. **pre-commit lint 收窄暂存面**：`scripts/verify-lint.mts` 新增 `--staged` 模式——目标 = `git diff --cached --name-only --diff-filter=ACMR`（含 R 档 rename 目标，R2 实证 ACM 漏 rename）且扩展名 ∈ `.ts/.mts`；无匹配 → exit 0。`lefthook.yml` pre-commit `lint` job 改调 `verify-lint.mts --staged`；`engine/gates.json` 的 `lint` 条目不变（默认全仓）→ **pre-push 与 CI 仍全仓穷尽**，收窄只作用于 pre-commit 快检档。

## 子设计

- **block 防死锁**：per-session per-file 连续 block 计数，同文件达上限（常量 N=3）后降级 `context`（违规仍可见、不再拦）——防「模型改不对 → 无限重试」；计数按会话隔离，文件重写成功即复位。
- **夹具**：`verify-lint.mts` self-test 增 `--staged` 分支（临时 git 仓 + staged 违规必红 / staged 干净必绿 / 无 staged 文件 exit 0）；`adapters/dsh/selftest.mts` 现 context 断言改 block 断言（违规 → block、干净 → void）+ 死锁降级两例 + 降级面回归保持。
- **docs 同步**：`code-standards.md` §6「写码在环反馈」句改「机器可判违规写码当轮拦回（block）」并注明收窄；[轨道 A ADR](./2026-09-08-lint-in-loop-feedback.md) Consequences「本策略只用 context」句同步为升格事实（implemented 笔记与上线现实同步规则）；`adapters/AGENTS.md`「A4 写码在环反馈」条同步。
- **明确不做（后续项，各自触发条件）**：A3 写入前阻断（写前 lint 双跑 + deny 无 context 通道，单独过 HERO）；type-aware lint 仍延后（触发 = 真实 async 失守，[轨道 B D6](./2026-09-08-coding-enforcement-track-b.md)）；[R] 语义判据的「自觉点前移」（常驻注入判别式）另案。

## Alternatives considered

- **A3 写入前阻断（工具执行前 deny）**：落败——`edit` 最终内容应用前不可知，需模拟 diff 应用 = 自建第二条写入路径（[轨道 A ADR](./2026-09-08-lint-in-loop-feedback.md) Alternatives 同款）；`PreToolDecision` deny 无 context 通道，模型看不到拒绝原因。write 面单独可 lint 但形态割裂（拦 write 不拦 edit）。→ 中程单独评估。
- **保持 context 建议档、把 git 边界后拦作为兜底**：落败——context 只让违规「可见」，模型可无视继续；「可见」到「过不去」之间无强制，机器可判违规仍静默进 git 边界。
- **pre-commit lint 直接删除（靠 CI 穷尽）**：落败——CI 在 push 后，反馈晚于本地提交点；pre-commit 快检是 git 边界内最后一道本地闸，收窄而非删除保留它。
- **verify-lint 环境嗅探自动切 `--staged`**：落败——按调用方显式传参更可测（self-test 夹具直测两形态）；环境嗅探是隐式行为面，难自证。

## Consequences

- **写码当轮机器可判违规被拦**：write/edit 成功 + oxlint 非空 → A4 `block`（结果被替换为纠正消息，模型须修正才能继续），不再「可见但可无视」；干净代码零 block 零注入。
- **死锁防护**：同文件连续 block 第 4 次起降级 `context`（违规仍可见、不再拦），一次干净写码 delete 复位重武装——block 状态按会话 WeakMap 隔离。
- **降级面保持**：缺 `.oxlintrc.json`/oxlint 二进制、路径出仓、非 `.ts/.mts`、`result.isError`、runLint 抛错 → 一律 `void` + 每会话至多一条 warn；策略件永不抛（A4 建议档纪律的既有降级面原样继承）。
- **pre-commit lint 收窄暂存面**：`verify-lint.mts --staged` 只 lint 暂存 `.ts/.mts`（`git diff --cached --name-only --diff-filter=ACMR`）；无匹配 exit 0；`gates.json` `lint` 条目不变 → pre-push/CI 仍全仓穷尽（B3 分层基线恢复）。
- **宿主 A4 消费面**：`index.mts` 对 `merged.block` 直接 `{ kind: "block", feedback }`（不调 `next()`）；A3 deny/ask、A5、A2 reject 仍零策略件使用（能力位在场）。

## 验收（收口核对）

- write/edit 写含 `var` 的 `.ts` → 工具结果被 block 替换为违规纠正（`rel:line:col no-var: …`）；模型修正后重写才通过。
- 干净代码写码 → 零 block 零 context（零注入零 token）。
- pre-commit：只暂存干净文件 → 绿；暂存含违规 `.ts` → 红；仓内历史违规（未暂存）不挡本次提交。
- pre-push/CI `lint` 仍全仓穷尽（gates.json 条目不变）；降级面回归全绿（缺基建/异常 → warn-once 不阻断）。
- 同文件连续 block ≥3 次 → 降级 context（不死锁）。

## Risks

- **block 误伤**：oxlint 白名单误报会强迫模型修非问题（反复 block）→ 死锁上限兜底；误报本身按 c2 白名单纪律逐条复审（配置改动走门禁判据批，FULL 三审）。
- **升格偏离「首批建议档」既有拍板**：本 ADR 为升格单源（b4 / 轨道 A 处只留指针），评审 FULL 三审收口后转 implemented。
- **staged 收窄后本地漏网**（未暂存违规不挡提交）：由 pre-push 全仓 + CI 穷尽兜底（B3 分层基线显式接受）。
- **block 依赖宿主 A4 决策语义**：`feedback` 替换成功回执——若宿主升级改变 block 消费形态，`host-api-contract.mts` 断言面（`PostToolDecision` 判别式）即红。

## 评审收口（2026-09-09 FULL 三审）

- **R1（简化）0B/5S**：采纳折叠 state 初始化、删 `--full` 零消费者、git 失败返回 `null` 弃哨兵数组；夹具五态覆盖确认；「未暂存违规不拦」属设计已接受上下文（S4 接受不修）；docs 同步义务漏项并入 R2 B2 处理。
- **R2（code-review）2B/3S**：B1 = `--diff-filter=ACM` 漏 rename 档（R 目标实测漏拦 exit 0）→ 改 `ACMR` + rename 违规必红夹具；B2 = 09-08 轨道 A ADR 三处未同步 → 同变更改写 + Related 指针；S1 = 根 AGENTS 检查项「建议档不阻断」残留 → 改 block 拦回；S2 = git.status 非零未 fail-closed → 并入 B1 修；S3 = edit 中间态计死锁（代理偏差，非缺陷）**接受不修**。
- **R3（ADR 面）0B/3S**：S1 = 09-09 自述单源却两处仍写 `ACM` → 改 `ACMR`；S2 = 「b4 处只留指针」失实（b4 无指针）→ b4 Related 补升格指针；S3 = `Design notes（…）` 标题中英混杂 + 无日期框架语 → 改「## 子设计」。
- **全采纳收口**；三路各复跑门禁全绿；Review: FULL/2026-09-09/R1=ok R2=ok R3=ok。
