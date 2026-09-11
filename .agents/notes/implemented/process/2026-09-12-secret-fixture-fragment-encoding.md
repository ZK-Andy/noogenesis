# Agent Note: 凭据夹具分片编码——外部扫描器误报的根因治理

Status: implemented
Review: FULL/2026-09-12/R1=ok R2=ok R3=ok

Related: 元断言族与夹具覆盖 [2026-09-11-review-finding-mechanization](2026-09-11-review-finding-mechanization.md)（其 Decision 2 的元断言 1/2 不动，本件加第 4 条）；落地件 [verify-secrets](../../../../scripts/verify-secrets.mts)（判据与扫描面头注）；踩坑出口 [cookbook](../../../../docs/cookbook.md) §门禁。

## Problem

公开仓 `ZK-Andy/noogenesis` 的 GitHub secret scanning 对 `scripts/verify-secrets.mts` 正样例表（`positives`）的 Google 行报出一条 `google_api_key` 告警（仓库 public，`publicly_leaked: true`，`validity: unknown`）。该字符串是门禁自测的一条夹具，不是凭据：

- **现象**：字符体为 `A`–`Z` 顺序字母 + `0`–`6`，即手敲字母表；真 Google key 的 35 字符体是 64 符号 base64url 上的均匀随机串。该单样例的分布检验：小写仅 1 个、互异字符 34 个，在真 key 模型下 P(小写 ≤ 1) = 3.0×10⁻⁷、P(互异 ≥ 34) = 1.8×10⁻⁴（n=1，组合概率而非抽样统计；两条件近似独立合并 ≈5×10⁻¹¹）。
- **机制**【推断 · 未证】：Google 形状无校验位，而 GitHub 对该 provider 未做活性验证（告警 `validity: unknown` 是可观测面），因此外部扫描器对这类字符串只能报、不能验——判据只能落在形状上。
- **为什么本仓门禁从不报它**：`SCAN_ROOTS` 只含 `genes/`、`events/`、`.noogenesis/observations/` 三面，不含 `scripts/`；外部扫描器扫全仓。两个扫描面的口径不同，是本告警能出现在"闸全绿"仓里的直接原因。
- 结构性冲突：自测元断言 1 要求每条模式有**绑定它的正样例**，样例因而必须是完整可匹配的形状；而外部扫描器对无校验形状无法区分夹具与真凭据。

## Decision

- provider 形状中**外部扫描器无法自校验**者，其正样例不得以完整字面量留在本件源码里。当前唯一已知形状 = Google API key，清单落在 `selfTest` 的 `unverifiableShapes`；`credentialSample(...)` 分片拼接是满足该约束的形态（判据只判结果，不规定拼法）。
- 该约束由 `--self-test` 的**元断言 4（源码自洁）**机器强制：形状正则取自模式表（单一事实源仍是 `SECRET_PATTERNS`，本件不复写形状），扫本件自身源码文本，命中即 FAIL 并指路 `credentialSample`；`unverifiableShapes` 的 label 命不中模式表同样违约——防拼写漂移静默解除该闸。自身源码不可读时按本件既有档位 fail-closed（exit 2）。
- 告警按 GitHub 设计的 `used_in_tests` 处置（2026-09-12 已 resolve）。**不**排除路径、**不**收窄扫描面。

## Alternatives considered

- **`.github/secret_scanning.yml` 的 `paths-ignore` 排除本件**：落败——用"外部扫描器看不见"换"不报警"。本件恰是最可能在实测中贴入真凭据的文件（夹具即凭据形状），屏蔽它会把真泄露一并遮住。
- **保留字面量、逐次 dismiss 告警**：落败——告警面在 CI 之外，复发静默；每加一条 provider 样例都可能再触发，成本随夹具表增长。
- **改用带校验位的假形状（如 AWS 的文档示例）**：落败——本件要验的正是"形状被识别"，Google 形状没有可用的校验位来标记"假"，此路对该形状不存在。
- **把全部 provider 样例一并分片**：未采纳——其余形状要么带校验位、要么被有效性校验或示例白名单覆盖，实测只报出 1 条告警；全量分片普遍降低夹具可读性而不换来额外覆盖。**重估条件**：出现第二种被外部扫描器误报的无校验形状时，把该 label 加入 `unverifiableShapes`；形状数增长到需要分类时，再把 provider 形状从 `SECRET_PATTERNS` 拆成独立数组。

## Consequences

- 夹具行呈"字面片段 + `credentialSample` 拼接"形态，可读性略降；运行期样例与判据覆盖不变（自测仍验"该形状被命中且 label 相符"）。
- 元断言 4 **无法用本件内嵌夹具自证**——任何承载该形状的内嵌夹具自身即违约。负向验证走文件副本实测【探索性 · n=1，2026-09-12】：把该行还原为完整字面量后副本 `--self-test` 以 exit 1 拦下，报 `self source carries a complete unverifiable credential shape (Google API key)`。
- 分片正是本件头注自陈的已知盲区（"分片/拼接构造的凭据"不被本件扫出）——此处有意自用：夹具必须逃过**外部**扫描器，而判据覆盖由自测在运行期保证。
- `scripts/**` 属 `FULL_TRIGGERS` 的 gate-criteria 面，本件判据改动走三重审核（证据见 Review 行）。
