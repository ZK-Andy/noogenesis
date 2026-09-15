# Agent Note: 状态面收进 .noogenesis/ + 基因形态收窄为约束声明

Status: implemented

Review: FULL/2026-09-16/R1=ok R2=ok R3=ok

> Provenance：本仓原创（2026-09-16 讨论轮收敛 → 同轮实现）。取代 [gene-event-schema](2026-09-05-gene-event-schema.md) S1 的字段表行与落盘目录行（该 ADR 其余口径不变）；相关 = [P1 骨架](2026-09-05-p1-engine-skeleton.md) D1/D3、[P2 共享消费](2026-09-06-p2-shared-consumer.md) D2/D5/D6、[技能随库分发](2026-09-06-skills-ride-bank.md)。

## Problem

两件事同源：基因被写成了「操作手册」，且引擎的状态面散在仓根。

1. **`strategy` 无机器读者**：`propose` 只把它按序号渲染成文本，`verify-gene-format` 只查它「≥1 项字符串」——没有闸读它、没有 `evaluate` 读它。它却是基因里最长的一块内容，且逐件与流程卡/技能同说一件事（push 前检查、文档预算处理序、对账步、force-with-lease 都是三处重复）。一份**声明**如果不能被判，就不该穿基因的外衣。
2. **状态面在仓根**：`genes/`、`events/`、`manifest.json` 与项目自身的 `engine/`、`scripts/`、`docs/` 平铺。它们全由 CLI 管（`solidify` / `gen-manifest` 是入口，手改即门禁红），却没有一处「这些不是人管的东西」的信号。已落点的 `.noogenesis/`（genes-cache、observations）说明该家原本只收了一半。
3. **跨状态面消费者靠手拼路径**：状态路径字面量散在 engine 十一件、scripts 四件与两侧夹具里；`.gitignore` 整目录忽略 `.noogenesis/` 还使 `git add` 在树内直接拒（`solidify` 的原子提交会静默失效）。

## Decision

### 1. 状态根 = 仓根 `.noogenesis/`，可再生子面之外全部 tracked

```
<repo>/.noogenesis/
├── genes/         tracked  基因本体（solidify 唯一入口）
├── events/        tracked  事件审计（与基因同 commit 原子）
├── capsules/      tracked  Capsule（capsule add 唯一入口）
├── mutations/     tracked  Mutation（mutation add 唯一入口）
├── candidates/    tracked  distill 候选暂存
├── manifest.json  tracked  基因检索索引（gen-manifest 生成）
├── genes-cache/   ignored  pull 的只读缓存（可丢弃）
└── observations/  ignored  observe 的观测输入面（可丢弃）
```

.gitignore 只忽略两个可再生子面（`/.noogenesis/genes-cache/`、`/.noogenesis/observations/`）。**整目录忽略 + 负向规则不可用**：git 在被排除目录内不重扫，`!/.noogenesis/genes/` 无效；`git add -f` 也不解决——首次强加后，已跟踪文件的普通 `git add` 仍以 exit 1 告终（索引已更新），正是 `solidify` 最怕的「非零退出 + 已暂存」半应用态。

### 2. 路径单源 = `engine/state.ts` + `scripts/state.mts`

两侧各持一份（同常量、同子目录名）：三族相对 import 互斥（`engine/` 与 `scripts/` 不互相 import）优先于去重。engine 侧供 `gene` / `capsule` / `mutation` / `solidify` / `distill` / `list` / `pull` / `observe`；scripts 侧供 manifest 生成与校验。`protocol.ts` 的落点参数由「仓根 + 目录名」改为「目录绝对路径」——落点事实只由 state 件决定。

### 3. 基因形态收窄：删 `strategy`，基因只留判得了的东西

字段表（4 必选——`summary` / `signals` + `id` / `domain` 两锚点；3 可选）：`id` / `domain` / `summary` / `signals`（触发，唯一机器读者）/ `constraints`（可执行谓词：`max_files`、`forbidden_paths`）/ `validation`（要求通过的白名单闸名）/ `avoid`（失败面警告）。`strategy` 删除——执行步骤的家是流程卡与技能（[doc-standards](../../../../docs/method/doc-standards.md) 的 tier 表），不是被演化物。

存量六件同批改写：只删 `strategy` 字段，未降格、未改域。逐件补 `gene.updated` 事件（新 sha），与 `git mv` 同批提交——内容寻址复算面因此自洽。

## Alternatives considered

- **`strategy` 保留、只把步骤改写得更「像约束」**：落败——换措辞不产生机器面，字段仍是零读者文本；删字段才让「没有判据就不该声明」这条纪律在 schema 层成立。
- **新增 `constraint` 自由文本字段 + 要求与闸配对**：落败——配对判据在 v0 无可判形态（多数纪律条目没有对应闸），会把「装饰性声明」制度化；先删 `strategy`，`requires`（宿主侧要求）留后续批。
- **仓根保留 `genes/`、只把其余收进 `.noogenesis/`**：落败——状态面被劈成两半，「哪些由工具管」的信号失效，正是问题 2 的病灶。
- **`.noogenesis/` 整目录忽略 + `git add -f`**：落败——实测首次强加后普通 `git add` 对已跟踪文件仍 exit 1（索引已更新），`solidify` 的 fail-closed 提交面会被迫把「非零退出」读成成功或半应用。
- **单份 state 件跨族 import**：落败——破坏 engine/ 与 scripts/ 的相对 import 互斥（[architecture-standards](../../../../docs/method/architecture-standards.md) R1b）。

## Consequences

- **采用面**：新增 `engine/state.ts`、`scripts/state.mts`；`engine/{gene,capsule,mutation,protocol,solidify,distill,list,pull,observe,propose,bin,selftest}.ts`、`scripts/{verify-gene-format,gen-manifest,verify-manifest}.mts`、`adapters/dsh/{section,tools,selftest}.mts`、`.gitignore`、`engine/README.md`、`engine/AGENTS.md`、`docs/method/architecture-standards.md` 同步。
- **`pull` 的缓存镜像语义**：缓存是银行仓的浅克隆，其状态面同样在 `.noogenesis/` 下，故合并扫描根 = `<cache>/.noogenesis/genes`。缓存目录安全边界改为「拒仓外路径、拒仓根状态面里除 `genes-cache` 之外的子树」——判据随布局改写，防误清仓的意图不变。
- **事件轨不回填**：既有事件行保持原样；六件存量基因的复算由本批追加的 `gene.updated` 承担。
- **残余**：`list` 命令的 cache 标记路径此前缺一层（`.noogenesis/genes-cache/genes` 应为 `<cache>/.noogenesis/genes`），本批随路径重写一并纠正。
- **证据**：`tsc --noEmit`、`npm run build`、engine self-test、adapter self-test 118 组、hermes self-test 25 断言、`verify-gene-format`（20 项）与 `verify-manifest`（12 项）全绿。


## Related

- 被取代的字段表行：[gene-event-schema](2026-09-05-gene-event-schema.md) S1。
- 缓存与共享语义：[P2 共享消费](2026-09-06-p2-shared-consumer.md)。
- 分发面（技能与状态面同源问题）：[技能随库分发](2026-09-06-skills-ride-bank.md)。