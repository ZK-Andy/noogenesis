# Agent Note: 同族原语协议归口——engine/protocol.ts 共享外壳 + 闸件面参数化

Status: implemented
Review: FULL/2026-09-15/R1=ok R2=ok R3=ok

> Related：候选出处 = [演化轮池](../../../../HANDOFF-evolution-pool.md)「简化候选：同族原语的第三份拷贝已到共享件拐点」（判据来自批次 1 序 2 R1 Suggestion 1/2 + 序 3 R1 Suggestion 1）；同类前作 = [pypara 归口 ADR](2026-09-10-pypara-fold-responsibility-split.md)（py 原语单源，归口判据「语义逐字恒等的副本才归口」沿用）；触发条 = 第 4 个原语落地前；同族原语落盘 ADR（现值句随本批同步）= [Mutation 原语 ADR](../architecture/2026-09-13-mutation-primitive.md)。

## Problem

1. **同族原语的协议外壳已是多份拷贝**：`gene.ts` / `capsule.ts` / `mutation.ts` 的「封闭字段面 + id=文件名 + domain=父目录」身份段逐字节同形（仅对象早退行的面名不同），`read*` 读入抛物（读失败 / JSON 解析失败 / 校验失败三段）同形，`*Path` 三件同形；跨域 id 唯一壳共四份——`capsule.ts` / `mutation.ts` 各一、gene 的私有副本在 `solidify.ts`（`assertIdUnique`）、candidate 的在 `distill.ts`（`assertCandidateIdUnique`），换 noun 即同。第三个原语（Mutation）落地即第三份——第 4 个原语要抄第 4 份。
2. **闸件的 capsules / mutations 两节三分之二行是标识符替换**：`verify-gene-format.mts` 布局段（基线 `git show c91ec27:scripts/verify-gene-format.mts` 的 489–519 / 521–551）归一化面名后 22/31 行逐字相同（判据 = 两段逐行比对、面部名与 `capsules`/`mutations` 词面归一，2026-09-15 实测）；复算段（同基线 690–724 / 726–761）归一化目录名、变量前缀与 sha 键后只剩注释与一个动词差（`record` vs `declare`）。
3. **闸件与 engine 不得互相 import**（三族相对 import 互斥，[architecture-standards](../../../../docs/method/architecture-standards.md) §2.1 R1b）——两侧各自去重，共享的是形状不是代码；故这是两个落点而非一次抽取。

## Decision

**1. engine 侧立 `engine/protocol.ts` 共享外壳。** 四件：`protocolNonObject`（非对象面早退，面名由调用方给）、`protocolIdentityErrors`（未知顶层字段 + id/domain 双锚点）、`readProtocolFile`（读入 + 解析 + 校验抛物，校验器由调用方注入）、`protocolPath` 与 `assertProtocolIdUnique`（落盘路径、跨域 id 唯一）。跨域 id 唯一（`assertProtocolIdUnique`）与落盘路径（`protocolPath`）按 dir + noun 参数化，四面（genes / capsules / mutations / candidates）共用——`solidify.ts` 与 `distill.ts` 的两份私有副本随本批折叠。四面各自的字段值域校验（gene 的 signals/constraints、capsule 的 outcome、mutation 的 risk_level、candidate 无自有值域）留在本家；公开名（`validateGene` / `readCapsule` / `capsulePath` / `assertCapsuleIdUnique` …）不变——调用方零改动，面名与协议常量仍归各原语件。

**2. 闸件侧按面规格参数化。** 引入两类规格：`FaceSpec`（`dir` + `noun` + `check` 回调）驱动布局扫描，genes / capsules / mutations / candidates 四面共用 `scanFace`；`TrackSpec`（`noun` / `eventKind` / `shaKey` / `sealHint` / `trailHint`）驱动 append-only 复算，capsules / mutations 两面具用 `recomputeAppendOnly`。gene 的 retire 分段复算（有退役语义）与 candidates 的无事件轨面保持各自形状，不套用。

**3. 判据与文案逐字不变。** 本批零判据变化：错误文案是门禁的语言面（夹具逐条钉死），参数化必须保面名（`capsule …` / `mutation …`）与句子逐字——证据 = 夹具全绿 + 新旧差分零 diff（读数见 Consequences）。

## Alternatives considered

- **只做 engine 侧 `protocol.ts`、闸件段不动**：落败——闸件侧可去重量（归一化后 ~90 行）比 engine 侧更大；候选两侧同一根因（第三份拷贝），只做一半等于把同一个拐点留到下次。
- **闸件抽独立共享件（如 `scripts/faces.mts`）**：落败——消费方只有本件一个，单消费者抽独立件只是换个文件放，多一层指针而无第二个消费者；[scripts/AGENTS.md](../../../../scripts/AGENTS.md)「共享件单源」条把 `mdref.mts` / `pypara.mts` 立为共享件的理由是它们各有多个门禁消费方。
- **engine 侧按配置表统一驱动三原语（一张表 + 泛型校验器）**：落败——三原语的字段值域与语义分化（gene 的约束对象、capsule 的二值 outcome、mutation 的三值 risk_level）远大于外壳；配置表会把值域校验抽象成声明式小语言，比三份外壳更难读。归口外壳即可。
- **闸件把 capsules / mutations 两节合并为「同段双跑」**：落败——两面错误文案必须保面名，双跑需要运行期注入面名（等价于参数化）却丢掉静态可读的分节；显式规格实例更直。

## Consequences

- **采用面**：新增 `engine/protocol.ts`；`engine/gene.ts` / `capsule.ts` / `mutation.ts` 的身份 / 读入 / 路径壳与 capsule / mutation 的 id 唯一壳改调共享件（公开导出面不变）；`engine/solidify.ts` 的 gene 跨域唯一副本、`engine/distill.ts` 的 candidate 跨域唯一与落盘路径副本折叠到同一共享件；`scripts/verify-gene-format.mts` 增 `scanFace` / `recomputeAppendOnly` / `domainCopies`，四面布局与两面复算的重复节收敛为规格实例。
- **行为面**：零行为变更。证据两路（2026-09-15 实测，旧件 = `git worktree add c91ec27`）：①旧 / 新 `verify-gene-format.mts` 在两棵构造违约树（覆 gene/capsule/mutation/candidate 四面的布局、协议、复算、跨链违约）与本仓上输出逐字节相同，三仓分别为 24 / 10 / 3 行、逐仓 `diff` 为空；②旧 / 新引擎模块 49 项调用读数逐条相同、0 mismatch（三原语 `validate*` / `read*` 共 19 例 + `solidify` 的 gene 跨域唯一 + `distill` 的 candidate 跨域唯一与 `*Path` 三件 + 目录锚点 / 缺失文件文案；旧件 = 同一工作树 `tsc` 构建）。两侧 `--self-test` 与 `engine self-test` 全绿。
- **单源变化**：同族原语的协议外壳家 = `engine/protocol.ts`（身份 / 读入 / 跨域 id 唯一 / 落盘路径四壳，四面共用）；新增原语不再抄第 N 份壳。
- **触发关闭**：池件该候选随本批销账。重议触发 = 第 4 个原语的字段面一旦接不上同一外壳（外壳与字段面被迫按原语分叉），把外壳退回各件。
- **评审收口（2026-09-15，FULL 三审）**：R1 0B/3S、R2 1B/1S、R3 3B/2S——采纳 7、拒 1。R2-B1 = 本件落笔时池件候选尚未销账（现值失真）→ 收口提交删除池件该条；R3-B1 = Problem 1 把 gene 的 id 唯一壳记在 `gene.ts`（实在 `solidify.ts`，candidate 同理在 `distill.ts`）→ 按四份实情改写并随本批把两份私有副本折叠进共享件；R3-B3 = [Mutation 原语 ADR](../architecture/2026-09-13-mutation-primitive.md) 的现值句「只 import node 内建 + `engine/util.js`」被本批证伪 → 同批同步 + 交叉链接；R3-S1 = 读数行标基线件（`git show c91ec27:`）；R3-S2 = 「共享件门槛 = 多消费方」系近似改写 → 改述被引件原文；R1-S1 = 闸件面规格注释把四面布局说成四面复算 → 改写；R1-S2 = gene 复算的候选发现与共享段重复 → 抽 `domainCopies`；R2-S1 = 读数句未标各仓对应 → 改写。拒 = R1-S3（`assertCapsuleIdUnique` / `assertMutationIdUnique` 一行转发）：面名与协议常量归原语件所有，内联会把 `'capsules'` / `'capsule'` 字面搬进 `solidify.ts`，Decision 1 已拍板公开名不变。
