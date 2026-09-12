# Agent Note: 简报闸补 base 可解析判据——base 笔误时泳道推导静默保守回退

Status: implemented
Review: FULL/2026-09-13/R1=ok R2=ok R3=ok

> Related：同族先例 = [简报闸明细兜底](2026-09-10-review-brief-detail-fallback.md)、[head 钉住 HEAD 判据](../process/2026-09-11-stage-card-structure.md)（阶段卡结构批出口）；契约家 = [review.md](../../../../docs/method/review.md) §3；出处 = [演化轮池](../../../../HANDOFF-evolution-pool.md) 候选「简报闸未判 base 可解析」。

## Problem

`verify-review-brief.mts` 对简报声明的 `head` 有两条发射前判据（可解析 + 钉住本仓 HEAD），对 `base` 只有间接消费：`lanesFromBriefRange` 用 `git diff <base>..<head>` 推泳道，**命令失败即保守回退三条全要**、闸照 `exit 0`。

于是 base 写成笔误的全 SHA 时无人知：泳道集看起来更严（三条全要），但简报声明的评审范围与实际评审对象不一致（记录漂移）。三份简报若写**同一个**错 base，跨泳道范围分歧判据也不触发（`distinct.size === 1`）——闸全绿、范围声明失真。

证据强度：漏网路径 = 【实测】夹具 15a（base 面不可解析档；同族 head 面是 14b）——`git rev-parse --verify <ref>^{commit}` 对笔误 SHA 非 0；真实漏网为池候选在评审自核中发现（该批 `--enforce` 静默 exit 0），非本件新增测量。

## Decision

1. **加发射前判据**：简报声明的 `base` 必须可解析（`git rev-parse --verify <base>^{commit}` 成功），否则违约——文案与同族 `head` 判据同形：`<lane>: brief base '<ref>' is not a resolvable commit in this repo (launch-time check)`。
2. **非 git 上下文跳过**（HEAD 不可解析即返回空集）：与同族范围判据的保守回退一致，评测无 git 时不误红。
3. **判据面清单同步**：闸件头注的判据列表、`--self-test` 夹具（14 → 15：base 不可解析必拒 + 可解析 base 放行）与汇总行同变更更新；[review.md](../../../../docs/method/review.md) §3 的发射前拦截面补 `base` 不可解析一项。base 与 head 两个 ref 判据共用 `resolveCommit` / `forEachDeclaredRef` 两个小助手（同一 `rev-parse --verify <ref>^{commit}` + 非 git 跳过；判据语义各自保留：base 只判可解析，head 另判等值）。

## Alternatives considered

- **在泳道推导失败时报警**：落败——推导失败即保守回退三条全要是**有意**的降级设计（远端 ref 未拉取等场景合法），把它变成违约会让合法场景硬红；发射前判据只判声明面自洽。
- **把 `git diff` 的失败信息直通输出**：落败——闸的输出面按泳道分组且不变式为「每条违规恰输出一次」（夹具 13 钉住），直通 git stderr 会破坏该契约。
- **连祖先关系一并判**（base 必须是 head 的祖先）：本轮不做——无噪声实测，且「非祖先 base」的合法形态（跨分支范围）未定；触发 = 真实出现该形态的漏网。
- **不动**：落败——池候选已记录真实漏网（base 笔误 → `--enforce` exit 0），修法本身就是一行 `rev-parse` 判据 + 夹具。

## Consequences

- **行为面**：简报 `base` 不可解析 → 发射前 `--enforce` 拒（无此判据时笔误静默放行：泳道推导保守回退三条全要、闸照绿）；非 git 上下文与无简报在飞两态行为不变。
- **采用面**：`scripts/verify-review-brief.mts`（判据函数 + 两处调用点 + 头注 + 夹具）、[review.md](../../../../docs/method/review.md) §3。
- **评审收口（2026-09-13，FULL 三审）**：R3 指出证据行把 head 面夹具 14b 与 base 面夹具 15a 并列引用不当——改为只引 15a；三路计数与采纳明细单源 = [上闸 ADR](../process/2026-09-13-host-service-reads-gate.md) 的评审收口条。
- **未覆盖（如实记）**：base 是否 head 的祖先不判；`base` 与 `head` 相等（空范围）同样不判——两者都等真实漏网或形态定论再议，不预铺判据。
