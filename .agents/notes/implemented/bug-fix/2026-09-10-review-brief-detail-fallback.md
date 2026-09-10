# Agent Note: verify-review-brief 明细输出缺口——未命中泳道前缀的违规串被静默吞掉

Status: implemented
Review: FULL/2026-09-10/R1=ok R2=ok R3=ok

> Provenance：本仓原创修复（2026-09-10，优化轮收口批随批）。候选出处：HANDOFF-todos（C）「verify-review-brief 明细输出缺口」（2026-09-10 注释面在环批评审发射前实遇）。
> Related：本件属 [2026-09-05-review-mechanical-gate](../process/2026-09-05-review-mechanical-gate.md) 建立的简报闸实现面（相关非取代）。

## Problem

`verify-review-brief.mts` 的明细输出按泳道过滤：`violations.filter(v => v.startsWith(\`${lane}:\`))`，只打印命中泳道前缀的串。而违规生产面里有一类**跨泳道、不带前缀**的串——`inconsistentRangeViolations` 的 `briefs declare inconsistent diff ranges — …`（防泳道降级闸）。它进得了计数、进不了任何泳道打印循环：实测（2026-09-10 注释面在环批发射前）`--enforce` 红、`review-brief: 1 violation(s)` 在场，stdout 却无对应明细行，主会话只能人工回读 `checkRepo` 才认出是范围分歧。

判定本身不受影响（计数非零即退出码 1），故**不是假通过**——损失在定位成本：有计数无明细时，修复方要靠猜。

## Decision

1. **明细打印兜底**：输出面从「按泳道过滤」改为「泳道分组 + 未命中前缀项落兜底节」，兜底节带标签行 `review-brief: violations outside lane scope:`。
2. **不变式**：每条违规恰输出一次——明细行（去掉标签行）= 违规串集合。判据面（哪些串算违规、退出码语义、`--enforce` 行为）零变化。
3. **实现**：打印面折叠为纯函数 `formatViolations(violations)`（`main()` 只负责逐行输出），泳道分组序维持 R1→R2→R3。
4. **夹具**：selfTest 增 fixture 13——复用 fixture 12 的范围分歧构造（`checkRepo` 单次调用、两处消费），断言 `formatViolations` 的输出与违规串**多重集相等**（同时钉住丢失与重复两个方向）且兜底节标签行恰出现一次。fixtures 12→13；CI 跑 `--self-test` 即覆盖。

## Alternatives considered

- **给跨泳道串补泳道前缀**（改 `inconsistentRangeViolations` 返回 `${lane}: …`）：落败——范围分歧是跨泳道事实，挂到任一泳道都是错误归因，读的人会去改那一份简报。
- **兜底项直接接在 R3 组后、不加标签行**：落败——无标签行时它看起来像 R3 的违规，把定位方向带偏。
- **保持现状（静默）**：落败——「有计数无明细」把定位成本转嫁给主会话；本仓已有一次实遇，修法局限在打印面一个函数。

## Consequences

- **采用面**：`scripts/verify-review-brief.mts`（`formatViolations` 新增 + `OUTSIDE_LANE_LABEL` 常量〔实现与夹具同源消费〕+ `main()` 输出改走它 + 头注「输出面」段为契约单一之家 + fixture 13，12→13）。
- **行为面**：stdout 仅在存在跨泳道违规时多一行标签；既有泳道明细的文本、顺序与计数行不变。
- **消费面**：无脚本解析本件 stdout——`gates.mts` 只取退出码、`pre-push` 跳过本件、CI 仅跑 `--self-test`，输出面变化无下游耦合。
- **同类面**：其余违规生产点（重复泳道、逐泳道结构违约、缺简报）均带泳道前缀，兜底节当前只有一个成员。
