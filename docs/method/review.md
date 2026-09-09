# 评审体系（三重审核契约）

> Provenance：蒸馏自 dotnet-deepseek-harness-desktop（MIT，2026-09-05）：ADR `2026-08-31-review-scope-narrowing` + `2026-09-03-review-tier-escape-proofing` + `2026-09-04-review-brief-gate-self-assertion` + feature-flow 评审节。差异：.NET 具体判据（IPC 帧/csproj）泛化为本仓等价面；机械闸（verify-review-tier / verify-review-brief）已按本仓评审面落地（ADR [2026-09-05-review-mechanical-gate](../../.agents/notes/implemented/process/2026-09-05-review-mechanical-gate.md)），本文承载语义判据（人工面）与简报结构契约，路径触发集的机械化单一事实源在 verify-review-tier.mts。

## 1. 定档判据（命中任一 → FULL 三重审核）

- 触碰**行为契约面**：`src/**`/`tests/**` 之外的契约口径（`.github/workflows/**`、`templates/**`、`docs/method/**`、`.agents/workflows/**` 流程卡、根/子树 AGENTS.md）。
- 涉及 **async/生命周期/事件序/取消/异常/并发** 的语义面。
- 改**跨边界契约**：对外协议/帧格式/存储布局/配置 schema。
- 改**发版链路**（打包/发布脚本、签名/校验面、版本感知机制）。
- **门禁判据本身**的改动（`scripts/verify-*`、`.githooks/**`）——门禁不能由被审者顺手改弱。
- 承诺三重审核的 proposed ADR 的落地变更。
- 用户显式指定的批量事后审核。

**不在清单**（走 LIGHT/简化）：纯换名/纯注释/纯测试断言调整/格式自动修/文档-only 且零行为契约变更。

**零行为变更判据**（轻审前置；命中任一即**不是**零行为变更）：

- 改动进程环境变量注入（增删改传给子进程的 env）。
- 增删改**公共 API 签名/参数**（含常量、参数表）。
- 增删改子进程的参数、工作目录、spawn 形态、安装流程。
- 删除/新增/变更**可观察副作用**（写文件、改 rc、发事件帧）。
- 触碰 async/并发/生命周期（即使只删，也须确认无连带行为）。

判据用法：逐一对照，任一命中 → 重三审；全部未命中且测试/门禁绿 → 轻审。**模棱两可宁可重三审**——轻审只省时间，漏审的代价是行为缺陷漏网。FULL 档路径命中（行为契约面/门禁判据/承诺三审的 ADR）即强制重审，通用轻审判据**不得覆盖**。路径触发的机械化单一事实源 = `scripts/verify-review-tier.mts`（`FULL_TRIGGERS`，含本清单路径面 + `scripts/**` 门禁共享件）；其触发集与本节口径漂移即违约。

**证据随变更**（机械强制，ADR [2026-09-05-review-mechanical-gate](../../.agents/notes/implemented/process/2026-09-05-review-mechanical-gate.md)）：FULL 档变更的评审证据 = 同变更集内 implemented ADR 头部 `Review: FULL/<日期>/R1=ok R2=ok R3=ok` 行（真实日历日；R 值严格 =ok；proposed ADR 不得自证）。push 前 `verify-review-tier --since <远端 sha> --enforce` 拒推缺证据的 FULL 变更；无 ADR 可承载的 FULL 批次加一枚最小 process 笔记。

改动前的**影响面识别通则**（合同/机器/数据/散文四类清单 + 同变更义务）的家 = [architecture-standards](architecture-standards.md) §2.4——定档判据单源在本节，识别通则彼处不重抄。

## 2. 范围收窄（审的范围，不审整仓）

- 一次只审一个逻辑单元：评审代理拿精确 diff（`scripts/change-scope.mts` 界定），**只读** diff 触及的文件 + 一层以内相邻件 + 与本 diff 直接相关的契约/标准段落（如 [doc-standards](doc-standards.md) 对应节、相关 ADR 的 Consequences）。
- **禁止**开局从头读全仓规则面/Agent Notes 树；改为按 diff 面按需引用。
- 量化参考：单次 diff 视野 ≤200 行变更（超限分批）；定向检查项 ≤5 条；明确不做清单 ≥1 条。

## 3. 简报模板（主会话启动每路评审前产出）

```
# R<N> 评审简报（<路名>）

## Scope
- base: <ref>  head: <ref>（评审对象 = git diff <base>..<head>）
- 需深审面（精读，逐行判读）：<承载本路语义判断的文件，不得为空>
- 陪跑文件（机器门禁已盖，扫读确认即可）：<其余变更文件；无则写"无">
- 门禁自证（主会话实跑，exit 随行）：<脚本短名>:<exit>，…（全部为 0）
- diff 面相邻件（一层以内，按需引用）：<清单或"无">

## Directed checks（≤5 条，每条可证伪：验证对象 + 证据位置）
- [ ] …

## Explicitly out of scope（明确不做，≥1 条）
- …

## Report contract
- 返回 Blocker[]/Suggestion[]，每条 `文件:行 + 一句证据`；空即"无发现"
```

字段规则：**「门禁自证」与「陪跑文件」耦合**——声明「已盖」必须同简报携带主会话实跑且 exit 全 0 的门禁清单；漏跑门禁却写「已盖」会把成本转嫁给评审代理（desktop 2026-09-04 exit-2 教训）。`陪跑文件：无` 不声明已盖，免自证。**简报给「材料 + 检查项」，不给「结论倾向」**——评审代理须独立判读，不得被简报带偏。自证只覆盖机器门禁；**ADR↔代码一致性、语义判读永远不属"已盖"**。

**发射前机械闸**：每路简报写毕、评审代理发射前，主会话实跑 `node scripts/verify-review-brief.mts --enforce`（结构合规 + 门禁自证耦合；所需 lane 集由简报自身 base..head 的档位推导——FULL→R1/R2/R3，LIGHT→R2，`--lanes` 可显式覆盖）。简报缺项或自证含非 0 exit 即发射被拦。

## 4. 三路默认收窄

- **R1（简化，noo-find-simplifications）**：只评估本 diff 新增/改动面是否引入可简化的新构造；不做全仓简化扫描。
- **R2（代码，noo-code-review）**：只验证 diff 触及的接口双侧（调用方 + 实现方）+ 「AI 兜底清单」（见 §5）在本 diff 面的命中；不追 diff 外调用方全图。
- **R3（ADR 面，noo-archive-agent-notes）**：只核对本 diff 新增/触碰 ADR 的格式/口径/与直接相关 note 的取代关系；含归档动作才做对应审计。

## 5. 「AI 兜底」清单模式

机器门禁盖不住的语义面规则，以编号清单列于根 AGENTS.md「评审检查项」（**清单单一事实源**；每条编号 + 指向规则的家），评审代理按清单显式核对——防止「评审按默认清单走而漏掉本项目规则」。本节承载契约与机制，不复述清单内容；新增兜底项时同变更更新根 AGENTS.md 该节。

## 6. 并行与纪律

- 三路**最多两路并发**；R3 涉及与代码面关联合并时后置，等 R1/R2 收口再起（禁止三路同时并行——R3 结论可能因代码面修复而失效）。
- **评审任务一次完整跑完**：无「到限中断取部分结论」出口——**中断即未审计**，中断后必须重新完整跑该路。
- **行为保持的第一证据 = 测试 + 门禁**：评审只补机器盖不住的语义/文档面，不重复全量重验。
- **主会话裁决**：对每路评审结论逐条采纳/拒绝（附证据），处理跨路冲突，修复一次性收口。
- v0 定档结论写进收尾/交接条目（档位 + 判据命中项）；路径触发由 `verify-review-tier` 机械分类兜底（push 前 `--enforce` 拒推缺证据的 FULL 变更），语义判据（async/并发等）仍人工。
