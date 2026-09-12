# HANDOFF-evolution-pool — 演化轮池（候选归集区）

> 本件 = 演化轮候选的**归集面**（HANDOFF 家庭行动区的第二件）；规则与步序单源 = [feature-flow](.agents/workflows/feature-flow.md) §4.6（攒账三类 / 开轮触发 / 成批处理 / 销账）；「候选」节语义恒 = 未处理项（销账 = 处理完即删，口径单源 = [销账 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-candidate-disposal.md)）。
> 归集面决策 = [池件 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-file.md)；立闸门槛单源 = [发现机械化 ADR](.agents/notes/implemented/process/2026-09-11-review-finding-mechanization.md) Decision 1；准则条文 = [主设计 §6](docs/research/dsh-swarm-evolution-framework-design.md)。

## 候选

- **（2026-09-12）`verify-review-brief` 未判简报 base 可解析**：base 全 SHA 笔误时 `--enforce` 仍 exit 0，三路靠评审 agent 自核出真值（该闸只判 head）。修法 = 加 base `git rev-parse --verify` 存在性判据 + 违约夹具。出处 = [secret-fixture ADR](.agents/notes/implemented/process/2026-09-12-secret-fixture-fragment-encoding.md)（门禁判据类）。

## 待定（已记录的需求，待后续拍板）

- **池件自身的机器面**：条数 / 字数预算是否上闸（形态参照 [verify-handoff-structure](scripts/verify-handoff-structure.mts)），待池规模有实测再判。
