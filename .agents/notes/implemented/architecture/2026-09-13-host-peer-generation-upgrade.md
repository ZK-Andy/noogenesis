# Agent Note: 宿主 peer 集升代批——全件同代至 0.1.5-rc.2 + tokenMeter 读数升为类型契约断言

Status: implemented
Review: FULL/2026-09-13/pending（三重审核进行中，收口时回填真实结论）

## Problem

本仓树的宿主 peer 钉在 `0.1.0-rc.8` 世代，宿主实跑树已是 `0.1.5-rc.2`（2026-09-13 实测：`/home/zk/.local/lib/node_modules/@deepseek-ai/dsh@0.1.5-rc.2` 及其内嵌 `dsh-llm` / `dsh-tools` / `dsh-token-meter` / `dsh-compaction` / `dsh-session` / `dsh-util-values` 全为 `0.1.5-rc.2`）。断言面与运行面因而不同源：`host-api-contract.mts` 的类型断言可以在旧代 d.ts 上编译绿，而宿主机跑的是另一代合同。

护栏建设轮 ADR 决定 1 的 tokenMeter 漂移通道暂为运行期形状闸（`surfaceTokens` 非数值或 `measure` 抛错 → 每会话一条 warn），其触发条（host peer 集整体升代）由本批到达。运行期闸只能发现已发生的漂移，且只在有会话时才响；类型断言把同一条漂移提前到 `tsc` 面。

单件跨代装不可行（2026-09-13 实测）：`@deepseek-ai/dsh-token-meter@0.1.5-rc.2` 的 peer 指向同世代 `dsh-compaction` / `dsh-llm-retry` / `dsh-session-projection`，在 `0.1.0-rc.8` 树上 `npm install` 报 ERESOLVE（现象与规避见 [cookbook](../../../../docs/cookbook.md)「环境」条）。host 世代是整组换的。

## Decision

1. **目标代 = 宿主实跑代 `0.1.5-rc.2`；全件同代 + lock 同提交。** 根 `peerDependencies` 两件同对齐 `^0.1.5-rc.2`（dsh-tools 由 `^0.1.0-rc.6` 一并收齐）；传递 peer 交 npm 解析到同代；`package-lock.json` 与 `package.json` 同一提交钉住解析结果。
2. **`@deepseek-ai/dsh-token-meter` 以精确 devDependency（`0.1.5-rc.2`）落编译期契约面，不进 peer 允许集。** 本层只对它做 type-only import（发射期擦除，值为零），且运行时缺席静默是既定语义——peer 声明会把可选观察面误称成运行时要求。与既有 `@deepseek-ai/cordis`（同为 type-only 面的 devDep）同款。值允许集不变（仍 dsh-tools + dsh-llm 两件），故防火墙规则与 selftest 断言零改动。
3. **断言面落 `host-api-contract.mts`：服务键 `tokenMeter` + `TokenMeasurement` 的 `surfaceTokens` / `totalTokens` 为 `number` + `measure` 返回 `TokenMeasurement`。** 运行期形状闸保留——类型面盖声明漂移（宿主改名/换型即 `tsc` 红），运行期面盖真实返回值与缺席降级，两者互补不是替代。

## Alternatives considered

- **token-meter 走 optional peerDependencies**：落败——peer 语义是「消费者需自备」，而本插件的契约是「服务在场则读、缺席静默」；optional peer 仍会把该包算进 peer 面，让「宿主 peer 允许集」与运行期事实失真，换来的只是 package.json 里一句描述。
- **只升 peer、不补类型断言**：落败——升代的收益恰在断言面同源；不补则运行期形状闸仍是唯一漂移通道，本次升代的机器证据只剩「`tsc` 恰好还绿」。
- **把 tokenMeter 契约做进运行期（值 import 服务或引入其值依赖）**：落败——值允许集是已拍板封底，扩集须单独拍板；且服务缺席是常态路径，值依赖会把缺席从「静默降级」推向「装载失败」。
- **升到 `0.1.5-alpha.x` 或其它中间代**：落败——alpha 代与宿主实跑代不同源，等于把断言面钉到无人运行的世代；registry 上 `0.1.5-rc.2` 即该代线最新。
- **放宽 `^0.1.0-rc.8` 兼容区间而不升代**：落败——旧代 d.ts 不再对应任何实跑树；放宽只会让断言面在两代之间取其一，证伪力更弱。

## Consequences

- **正面**：断言面与运行面同源（两树实测均 `0.1.5-rc.2`）；tokenMeter 漂移从「运行期 warn」提前到 `tsc` 红；传递依赖树由 `0.1.0-rc.8` 世代整体前移到 `0.1.5-rc.2`。
- **负面（自诺的账）**：`dsh-token-meter` 是精确钉法，不再随 peer 区间浮动——**下次升代必须带它同代**，否则断言面钉在旧代而 peer 面已前移。本次由 lock 钉住整树，该漂移只在未来人工升代时出现。
- **依赖与环境**：装机须 `--cache=<可写目录>`（本机 `~/.npm` 只读，cookbook「环境」条）；npm 12 的 install-scripts 策略拦了 `lefthook` 的 postinstall，与本次变更无关（钩子由本仓既有实装承担）。
- **未覆盖缺口（显式接受）**：类型断言只盖声明面，不盖宿主实现与声明不符的情形（如 `measure` 声明返 `TokenMeasurement` 却返 `undefined`）——那由运行期形状闸兜住。

## 影响面清账（四类）

| 面 | 触碰 | 清账 |
|---|---|---|
| 合同面 | 根 `peerDependencies` 版本区间（消费者可见）；新增 type-only 契约依赖 | 本 ADR 承载；跨边界契约 → FULL 定档 |
| 机器面 | 无判据/夹具改动 | selftest 两条 import 面断言逐条复核未受影响：type-only 闭集按**文件**、值允许集按 **index.\* 包名**，两者均未变 |
| 数据面 | 无 | — |
| 散文面 | 护栏 ADR 的「待补」表述转当前态 | 同变更改写；cookbook 条仍为正确的未来操作指导（预算 2687/2700，不增字） |

## 实现落账（2026-09-13）

- **升代实测**：升代前 `node_modules/@deepseek-ai/` 的 `dsh-*` 共 13 件、全 `0.1.0-rc.8`；升代后 `dsh-*` 共 20 件、全 `0.1.5-rc.2`（新增件由 token-meter 的 peer 面拉入：`dsh-commands` / `dsh-compaction` / `dsh-llm-retry` / `dsh-session-projection` / `dsh-util-crypto` / `dsh-util-values`），lock 内零 `0.1.0-rc` 残留。`cordis@4.0.2` / `cosmokit@1.8.3` / `schemastery@3.18.2` 为独立版本线，不属该代。
- **类型面零漂移**：升代前后 `tsc --noEmit` 均 exit 0——既证明既有断言面对新代仍成立，也说明断言面同源是**补上**而非**修红**。
- **反证探针（判据有牙齿，两例实测）**：
  - 探针 A：把已装 `dsh-token-meter` 的 `types.d.ts` 里 `surfaceTokens` 改名 → `tsc` 报 `TS2344`（`_TokenSurfaceTokensNumber` 约束不满足）与 `TS2339`；还原后 `tsc` 绿（`sha256sum -c` 核对还原件）。
  - 探针 B：临时删掉 `host-api-contract.mts` 的 token-meter import（保留服务键断言）→ `"tokenMeter" extends keyof Context` 报 `TS2344`；还原后 `tsc` 绿。证明服务键断言的真值来源是该包的 cordis Context 混入面，而非 `Context` 自带成员。
- **门禁**：`ts-typecheck` / `lint` / adapter selftest（109 夹具组）/ `package-invariants` / `host-service-reads` / `export-docs` / `adr-format` / `doc-budgets` / `md-links` 全绿（`scripts/gates.mts --run --skip review-tier,review-brief,change-scope`）；三道结构性例外按各自机制单独跑。
