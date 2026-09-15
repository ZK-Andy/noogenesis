# Agent Note: 池件自身的机器面判不设——无实测失控信号，重议触发具名

Status: implemented
Review: FULL/2026-09-15/R1=ok R2=ok R3=ok

> Related：待定条出处 = [池件](../../../../HANDOFF-evolution-pool.md)「待定」节——[池件 ADR](2026-09-12-evolution-pool-file.md) Alternatives 丁与 Consequences 缺口句、[销账 ADR](2026-09-12-evolution-pool-candidate-disposal.md) Decision 4 与 Consequences「未覆盖」三处同指；立闸判据 = [发现机械化 ADR](2026-09-11-review-finding-mechanization.md) Decision 1；形态参照 = [verify-handoff-structure](../../../../scripts/verify-handoff-structure.mts)；同批实现件 = [原语协议归口 ADR](../simplification/2026-09-15-primitive-protocol-shared-shell.md)。

## Problem

池件 2026-09-12 立件与销账两批都把「池件自身的条数 / 字数预算是否上闸」记为待定，触发 = 池规模有实测。实测已到：候选节条数峰值为 25（a586496 / 45c8d03；判据 = 逐提交取 `HANDOFF-evolution-pool.md` 候选节的 `- ` 行计数，覆盖 = 含该件的全部历史提交），此后经四轮演化轮逐批消化（25→22→19→7→1→0）；单条 ≤ 一段。

按 HERO 两问过判据（[发现机械化 ADR](2026-09-11-review-finding-mechanization.md) Decision 1）：第一问无具名失败——峰值期的候选全部经演化轮正常落账，各销账批 ADR 与 journal 无一条把「件规模」列为误读 / 漏读的原因（覆盖 = 2026-09-12 起四次销账批的 ADR 与 journal 叙事）；第二问无不同动作——没有任何一次读盘 / 写盘因池件规模出错。形态参照 verify-handoff-structure 的条数 / 字数上限是为待办区 16 条共享预算设计的，池件不与他人共享预算。

## Decision

1. **暂不立闸**（用户 2026-09-15 拍板）：池件保持无机器面，攒账与销账仍是主会话手工义务（[池件 ADR](2026-09-12-evolution-pool-file.md) Consequences 已如实记）。
2. **重议触发具名**：候选节条数回升至历史峰值量级（25 条）时重议；单件总字数若增长到影响读盘同样触发。重议按 Decision 1 两问过判据。
3. **待定条关闭**：池件「待定」节该条随本件销账删除；结论家 = 本件。

## Alternatives considered

- **现在立闸（条数 + 字数上限，照 verify-handoff-structure 形态）**：落败——无实测失控对象，阈值只能凭感觉取；闸的第一问答不出具名失败，且会让「当场写一行进池」的成本上升。
- **维持待定挂着**：落败——待定节的语义 = 尚无口径的需求（[销账 ADR](2026-09-12-evolution-pool-candidate-disposal.md) Consequences 口径面），口径本轮已有，挂着会被下一次会话读成待办。
- **设软提示（条数超阈值只打印不红）**：落败——无消费者、不改变任何动作；池件是行动区归集面不是流程规则（[池件 ADR](2026-09-12-evolution-pool-file.md) Alternatives 丙）。

## Consequences

- **采用面**：[HANDOFF-evolution-pool.md](../../../../HANDOFF-evolution-pool.md)「待定」节该条删除，「候选」节本轮销账后为空。
- **口径面**：池件无机器闸如实记（同 [销账 ADR](2026-09-12-evolution-pool-candidate-disposal.md) Consequences）；攒账义务不变。
- **重议触发**：Decision 2 两条具名信号——任一出现即重议，重议前不预铺闸件。
- **评审收口（2026-09-15，FULL 三审）**：R3-B1 = 本件 Problem 的峰值读数（7）与 git 史矛盾（实测 25）→ 按逐提交计数改写 Problem 与 Decision 2 的触发表述；R1 / R2 两路对本件零发现。
