# Agent Note: /evolve 命令面（批次 9 序 44）

Status: implemented
Review: FULL/2026-09-14/R1=ok R2=ok R3=ok

## Problem

主设计 §11.2 的命令扩展面（DSH `CommandInvocation` / `CommandResult`）是五动词设计稿形态（list / consolidate / wrapup / verify / benchmark，行 44）。批次 9 收口到本序时，插件包（`noogenesis-dsh`）的宿主面只有模型工具与 agent/disposed 写路径，用户在宿主 UI 没有任何 `/evolve` 入口可达引擎能力；逐动词逐一判定哪些立、哪些判不立，才能收口批次 9。

## Decision

- **D1 命令面立**：宿主命令合同以真实源码核准（宿主包 `@deepseek-ai/dsh-commands` 类型契约：`ctx.commands.register` + `CommandInvocation` / `CommandResult` + `command/run` / `command/done` 事件），与主设计 §11.1 Command 行、§11.2 命令行逐键吻合。注册形态 = 全局命令 `/evolve`（原文形分派动词），handler 按 invocation 逐次解析 repoRoot（四级回退链）；commands 服务经 `ctx.get("commands")` 懒取用（缺席单次 warn 降级该面，不进 `inject`——defer-装载教训同 userQuestions/tokenMeter 口径），晚到经首个 `agent/created` 幂等补注册。宿主依赖零扩面：`commands.mts` 用本地窄合同接口，零 `@deepseek-ai/*` import，防火墙值允许集与 type-only 闭集都不动。
- **D2 三动词立**：`list`（只读盘点，新增引擎 `list` 命令为整数面 + staging 候选面尾段——引擎是唯一盘点事实源，适配层不自行扫 genes/）；`verify <domain>/<id>`（引擎 `evaluate` 全集的用户位入口，退出码映射同工具面：0/1 是结论文本，exit 1 且双流空 = 引擎故障抛错（工具面同款第四判据），2 抛错由宿主 settle error）；`wrapup`（staging 候选入档的人工入口 = 既有 `runSolidifyTrigger` 命令位复用，与 `agent/disposed` 触发共享同一逐仓 in-flight 闸与 ask 封装——两个入口是同一条写路径，不共享就各自撞候选 exit 2 假失败）。
- **D3 `consolidate` 判不立**：该动词的参照实现（`dsh-continual-evolve`）处理的是 `conflictHint` + 零消费陈旧条目的批量归档——本仓没有多源候选冲突面：staging 目录是单一候选流（distill/staging → solidify 一过节），无第二来源。触发 T1 = staging 面出现真实多来源同 id 候选冲突（≥2 来源）时重议。
- **D4 `benchmark` 判不立**：序 39 已裁（无消费者 + 金标类读数禁入比较通道）；无本序新事实，触发沿用行 39 T1–T3 单源。
- **D5 引擎 `list` 命令**（十命令合同面）：零参数、零写零事件、确定性行格式 `<kind> <domain>/<id>[(cache)]`；缓存基因 `pull` 分发副本以 `(cache)` 标记（「缓存只读」口径沿用）。改动过 README「合同面」节、引擎 AGENTS 计数与 self-test（三用例枚举金样）。

## Alternatives considered

- **五动词全量实现**：落败——consolidate / benchmark 都没有具名消费者与具名失败（防过度设计范围契约：受支持用法可达即可）。
- **命令 handler 内自行扫 genes/ 实现 list**：落败——引擎 `scanGenes` 的缓存合并与 warn-skip 语义是唯一事实源，适配层复制即双源漂移。
- **inject ["commands"] 声明式注册**：落败——缺席服务会推迟整个插件装载，让其余八面陪葬（可缺席服务一律 `ctx.get` 懒取用的既定口径）。
- **宿主 commands 类型 import 进 adapters**：落败——会扩 type-only 闭集与 selftest import 面断言；本地窄合同已由 selftest 假件逐形状对齐，改动宿主合同类型时不必碰适配层。
- **wrapup 独立 in-flight 闸**：落败——与 disposed 触发共享同一候选面，独立闸会让两入口并发跑出候选 exit 2 假失败（既有闸就是为这件事造的）。

## Consequences

- 命令面是便利/可达性面：三动词全部复算既有引擎能力，模型面行为不变；`consolidate` / `benchmark` 的缺席由 D3/D4 触发条封条。
- 引擎合同面九命令 → 十命令：`engine/README.md` 合同面节与 AGENTS 计数已同变更更新；引擎 self-test 增 list 三用例（枚举金样 + cache 标记 + 用法参量 exit 2）。
- 适配层 self-test 增命令面七个夹具组（注册降级 / 注册形状 / help / 未知动词 / verify 三档 / list / wrapup 全流 + 闸释放）；防火墙机器检查覆盖面不变（`commands.mts` 零宿主依赖）。
- 宿主 commands 服务缺席的宿主环境：命令面整体缺席但其余能力面不受影响（降级单 warn 留痕）。
- 三重审核收口（R1/R2/R3 结论逐条裁决）：8 条 Suggestion 全采纳、0 拒绝、0 Blocker——R1 五条（重复注释残留 / relativeTo 手搓换 `path.relative` / gene-ref 谓词层内抽 `tools.mts isGeneRef` 单源 / retry 箭头层拆除并接线上移 / list.ts 顶部 import 与冗余断言）、R2 零发现、R3 三条（批次表 `cfgs` 坏损记号 / 两处 D6 悬空编号改 D2 / verify 第四判据补齐——`exit 1 且双流空 = 抛错`，机器面 gate 全绿复跑 exit 0）。
