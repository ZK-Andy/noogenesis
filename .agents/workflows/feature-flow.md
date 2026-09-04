# 功能开发流程（feature-flow）

> Provenance：蒸馏自 dotnet-deepseek-harness-desktop（MIT，2026-09-05）。差异：.NET 命令 → 本仓门禁面；评审机械闸已落地（ADR [2026-09-05-review-mechanical-gate](../notes/implemented/process/2026-09-05-review-mechanical-gate.md)），路径触发机械分类 + 语义判据人工定档，按 [docs/method/review.md](../../docs/method/review.md) 判据；**结构重排**——源版步骤 5 为 321 词单段（超密长段教训），本版全部契约拆小节，段落密度纪律：单段 ≤120 词，多契约用小节或表格。
>
> 非平凡功能/变更的主链路；琐碎修改走简化路径（实现+门禁+提交）。

## 1. 定案

方案讨论收敛 → 写 ADR；`## Alternatives considered` 强制。同会话内即落地的，proposed→implemented 可折叠——直接以 implemented 格式落档（格式由 `verify-adr-format.py` 把关）。

## 2. 实现

按 ADR 范围动 src/docs/scripts；越界想法记 TODO 不顺手做。

## 3. 测试与门禁

- 本仓可执行门禁见根 AGENTS「质量门」七脚本；提交时 `pre-commit` 自动快检，push 前 `pre-push` 全跑。
- 新建/修改 ADR、技能、cookbook、HANDOFF 各自即跑对应门禁（新建即校验）。
- 行为级变更必须配套可复现证据（脚本/用例/门禁输出）；证据随变更提交。

## 4. 评审（三重审核执行契约，v0 人工定档）

### 4.1 定档

- 按 [review.md](../../docs/method/review.md)「定档判据」判定 FULL / LIGHT：判 FULL 即须三重审核（证据随变更）；判 LIGHT 才可轻审/简化；**判据模棱两可宁可重审**。
- 路径触发由 `verify-review-tier` 机械分类（push 前 `--enforce` 拒推缺证据的 FULL 变更）；定档结论仍写进收尾/交接条目（档位 + 判据命中项），语义判据人工判定。

### 4.2 范围

- 收窄规则（一次一个逻辑单元、只读 diff 触及件 + 一层相邻件、按需引用标准面）单一事实源在 [review.md](../../docs/method/review.md) §2。

### 4.3 简报先行

- 简报模板与字段规则（含「材料 + 检查项，不给结论倾向」、门禁自证耦合）单一事实源在 [review.md](../../docs/method/review.md) §3。

### 4.4 并行与报告

- 并行纪律（≤2 路、R3 后置）、一次完整跑完、报告契约与主会话裁决规则单一事实源在 [review.md](../../docs/method/review.md) §3/§6。

### 4.5 等待纪律

后台评审子代理返回时系统自动通知，主会话静候通知即为完成态。**禁止**：sleep + 轮询空转；催促子代理；`interrupt_agent` 中断评审索取部分结论。评审结论未齐前**不改在审文件**（避免评审读的 diff 漂移）。等待空档只用于与在审 diff 不冲突的只读备料/自查。

## 5. 提交

逻辑单元分粒度提交，conventional commits 格式。

## 6. 推送 + 观察 CI

main 推送触发 `.github/workflows/validate.yml`，绿了才算完。

## 7. 收尾

每个功能批次完成即执行，不积压到会话结束；前置门 = 触发评审的批次必须评审通过且修复已收口（CI 绿）。按 [session-close](session-close.md) 过检查单。**done = 通过全部验证**：ADR（需要时）→ 门禁 → 评审（需要时）→ CI 全绿。
