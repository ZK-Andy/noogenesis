# Agent Note: P1 实现轮拍板（实现层协议口径六题）

Status: implemented
Review: FULL/2026-09-05/R1=ok R2=ok R3=ok

> Provenance：本仓原创（2026-09-05 P1 实现轮）。骨架与协议上游拍板见 [2026-09-05-p1-engine-skeleton](2026-09-05-p1-engine-skeleton.md)（D1–D4）与 [2026-09-05-gene-event-schema](2026-09-05-gene-event-schema.md)（S1–S3）；本 ADR 记实现轮遇到的协议未定细节，逐题拍板，引擎代码与 `scripts/verify-gene-format.py` 以此为口径。

## Problem

骨架/schema 两 ADR 定了四命令与 Gene/Event 协议，但实现时暴露六处未定口径：候选文件在 `genes/` 之外时目录锚点如何判、拒因在 Event 里怎么编码、retire 是否要过入档闸、constraints 对照哪个变更面、空数组算不算合法字段、CLI 退出码。不拍板则 JS 引擎与 Python 第十门禁会各写各的。

## Decision

### D1（2026-09-05）：入档候选豁免目录锚点；ID=文件名锚点对候选仍生效

- 候选文件可放 `genes/` 之外（如临时 staging 目录），`domain` == 父目录的锚点只约束 `genes/` 内的最终落盘位置（落盘位置由 solidify 依 `domain` 字段决定）。
- `id` == 文件名（stem）锚点对候选同样生效：候选文件须以 `<id>.json` 命名——这让"这批文件是哪个基因"在入档前就无歧义。
- 依据：目录锚点的语义是"防 genes/ 内漂移"，对入档前的候选无物可锚；ID 锚点的语义是"人可读 + 可 grep"，候选期同样需要。

### D2（2026-09-05）：Event `outcome` 编码 = `"ok"` 或 `"fail: <拒因>"` 单字符串

- 七字段最小集不变（schema ADR S2），拒因折叠进 `outcome` 单字符串（`fail: ` 前缀 + 一行拒因），不新增 `reason` 字段。
- 拒绝事件的 `kind` = 本次入档尝试的 kind（新增尝试失败记 `gene.added`+fail，更新尝试失败记 `gene.updated`+fail）——kind 描述"尝试了什么"，outcome 描述"结果如何"。
- 依据：S2 已钉死字段最小集；加字段即死字段的教训（schema ADR S2 对 §5.1 的裁剪理由同样适用）。

### D3（2026-09-05）：retire 不过入档闸（无需 evaluate）

- 退役 = 删除文件 + `gene.retired` 事件（`gene_sha` = 最后内容 SHA），单 commit；不跑 gates.json 全集。
- 依据：入档闸守"前沿单调不降"——退役不引入任何前沿内容，闸无物可守；schema ADR S2 也未给 retire 挂 evaluate 语义。误退役由 git 历史可溯恢复。

### D4（2026-09-05）：constraints 对照"出账变更面"，与 change-scope.sh 同口径

- 出账面 = `{outgoing_base}...HEAD` 已提交 diff + 未暂存 diff + 未跟踪文件（dedupe）；`outgoing_base` = 与上游 merge-base，无上游（临时仓/自举仓）回退根提交——全部从 git 事实推导（骨架 ADR D4 槽值纪律的同一推导）。
- "同口径"仅指三条 changed-path git 命令的集合一致（见 Consequences ①）；base 推导与 change-scope.sh 不同源（彼用 fork-point，此用上游 merge-base），差异是有意为之。
- 依据：基因约束治理的是"这次变更"，入档时刻的这次变更 = 出账面；与 `scripts/change-scope.sh` 保持同口径避免双推导漂移。

### D5（2026-09-05）：数组字段封闭——空数组拒收，省略即无

- `signals`/`strategy` ≥1（无信号/无步骤的基因是死物）；`validation`/`avoid`/`constraints` 空即违约（`omit the field instead`）。
- 依据：空数组与字段缺省在语义上无差别，双形态徒增漂移面；schema ADR S1 本就定义这三者为可选。

### D6（2026-09-05）：CLI 退出码三档 = 0 成功 / 1 红 / 2 用法或 fail-closed 拒跑

- `1` = 评估不绿或拒入档（结果性红）；`2` = 用法错误或 fail-closed（白名单坏、基因 schema 违约、git 事实推导失败）。
- 依据：调用方（宿主会话/CI）需要区分"闸说红"与"引擎本身拒绝执行"——后者是环境问题，重试无益。

## Alternatives considered

- **候选也强制目录锚点（候选必须放 `genes/` 内）**：落败——候选落 `genes/` 即触发"工作树基因无事件轨"违约（schema ADR S2 复算规则），自相矛盾。
- **拒因独立成 Event 第八字段 `reason`**：落败——S2 字段最小集刚拍完就加字段，违背自己；一行 `fail: <拒因>` 足够机读。
- **retire 也跑全集**：落败——闸守前沿不降，退役无前沿内容；跑闸只会让"删一个死基因"依赖九门禁全绿的巧合时机。

## Consequences

- **采用面**：`engine/`（bin/util/gates/gene/select/propose/evaluate/solidify/selftest + gates.json + README）与 `scripts/verify-gene-format.py`（第十门禁，含 self-test）按 D1–D6 实现；hooks/CI/AGENTS 质量门同步挂入。首批 6 基因（process/doc/gates 三域）已人工策展并经 solidify 原子入档（事件轨 `events/2026-09.jsonl`）。
- **域封闭集起点**：首批三域 = process / doc / gates；后续新域经 solidify 创建目录自然生长。
- **双实现镜像**：协议语义 JS（engine）与 Python（第十门禁）各有一份校验实现，漂移由两侧 self-test 夹具兜底；改动协议必须同轮改两侧夹具。
- **评审收口口径（2026-09-05 FULL 三审采纳项）**：①D4 的"与 change-scope.sh 同口径"仅指三条 changed-path git 命令同集合；两侧 changed-path 命令同带 `-c core.quotePath=off`（change-scope.sh 的八进制转义同源病已随 bug-fix ADR [2026-09-05-change-scope-quotepath](../bug-fix/2026-09-05-change-scope-quotepath.md) 修复，同口径自此严格成立）；②复算规则细化 = retired 划段 + 段内 ok 的 added/updated 对工作树复算、fail 只查结构（schema ADR S2"fail/retired 不作工作树复算"的精确化）+ 跨卷 ts 接续校验；③solidify 的 commit 失败必须回滚写面（不留半应用状态）；④跨树 id 唯一性在 solidify 写路径强制（第十门禁只做事后兜底）。
