# 功能开发流程（feature-flow）

> Provenance：蒸馏自 dotnet-deepseek-harness-desktop（MIT，2026-09-05）。差异：.NET 命令 → 本仓门禁面；评审机械闸已落地（ADR [2026-09-05-review-mechanical-gate](../notes/implemented/process/2026-09-05-review-mechanical-gate.md)），路径触发机械分类 + 语义判据人工定档，按 [docs/method/review.md](../../docs/method/review.md) 判据；**结构重排**——源版步骤 5 为 321 词单段（超密长段教训），本版全部契约拆小节，段落密度纪律：单段 ≤120 词，多契约用小节或表格。
>
> 非平凡功能/变更的主链路；琐碎修改走简化路径（实现+门禁+提交）。

## 1. 定案

方案讨论收敛 → 写 ADR；`## Alternatives considered` 强制。同会话内即落地的，proposed→implemented 可折叠——直接以 implemented 格式落档（格式由 `verify-adr-format.mts` 把关）。

## 2. 实现

按 ADR 范围动 src/docs/scripts；越界想法记 TODO 不顺手做。动码/动目录前读对应规范面：[code-standards](../../docs/method/code-standards.md)（编码/注释）+ [architecture-standards](../../docs/method/architecture-standards.md)（分层/依赖/新目录准入四问）；机器可判面 lint 写码当轮已拦。

## 3. 测试与门禁

- 本仓可执行门禁清单见根 AGENTS「质量门」（单源 `engine/gates.json`）；提交时 `pre-commit` 自动快检，push 前 `pre-push` 全跑。
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

## 5. 吸收（评审结论齐后即办，主会话执行）

吸收是 findings 齐、主会话裁决完毕后的**分类归口阶段**，与 §4 评审同级：每批评审必须走完，不是评审的可选尾声。

- **四出口**（逐条 findings 落且只落一家）：
  - **机械校验**：判据稳定（形状可枚举、不看语义）且噪声实测过关 → 落门禁 / 夹具 / 元断言；单次代价高者（凭据泄漏 / 发布事故 / 数据丢失）不受噪声实测约束——判据与例外单源 = [发现机械化 ADR](../notes/implemented/process/2026-09-11-review-finding-mechanization.md)。
  - **cookbook 踩坑**：不可机械判、具「症状/根因/规避」形态 → 加一条带域标签的原子（格式与域标签单源 = [cookbook](../../docs/cookbook.md)）。
  - **流程卡纪律**：纪律漏项（流程缺一步、证据形态错位）→ 改对应流程卡。
  - **不入库**：一次性措辞与证据形态 → 就地修完即止，**不新造载体**。
- **产出 = 吸收账**：每批给出「类 / 本批证据 / 可机械判性 / 去向」，随批汇报；发现的**类**记入 journal（复发计数用于形态与噪声判断）。
- 本阶段不新增评审代理；首例与实测数据单源 = [发现机械化 ADR](../notes/implemented/process/2026-09-11-review-finding-mechanization.md)。

## 6. 提交

逻辑单元分粒度提交，conventional commits 格式。

## 7. 推送 + 观察 CI

main 推送触发 `.github/workflows/validate.yml`，绿了才算完。

## 8. 收尾

每个功能批次完成即执行，不积压到会话结束；前置门 = 触发评审的批次必须评审通过、吸收账已出且修复已收口（CI 绿）。按 [session-close](session-close.md) 过检查单。**done = 通过全部验证**：ADR（需要时）→ 门禁 → 评审（需要时）→ 吸收 → CI 全绿。
