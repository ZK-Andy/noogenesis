# HANDOFF-evolution-pool — 演化轮池（候选归集区）

> 本件 = 演化轮候选的**归集面**（HANDOFF 家庭行动区的第二件）；规则与步序单源 = [feature-flow](.agents/workflows/feature-flow.md) §4.6（攒账三类 / 开轮触发 / 成批处理 / 销账）；「候选」节语义恒 = 未处理项（销账 = 处理完即删，口径单源 = [销账 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-candidate-disposal.md)）。
> 归集面决策 = [池件 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-file.md)；立闸门槛单源 = [发现机械化 ADR](.agents/notes/implemented/process/2026-09-11-review-finding-mechanization.md) Decision 1；准则条文 = [主设计 §6](docs/research/dsh-swarm-evolution-framework-design.md)。

## 候选

- **（2026-09-13）护栏轮之经验：`git add -A` 在多会话共用工作树下会卷走他人在飞改动**：本会话与他会话并行时实际发生（他方 `section.mts` 未提交改动被卷，档位闸拦下后 `reset --soft` 退回）——纪律面已落 [cookbook](docs/cookbook.md)「协作」条；未机械化面 = 「提交前工作树里出现非己方路径」是否值得上闸（机械判定的代价：无法区分合法协同与误卷）。出处 = [护栏建设轮 ADR](.agents/notes/implemented/architecture/2026-09-13-guardrail-construction-round.md) 收口批。
- **（2026-09-13）`verify-review-tier` 在「proposed → implemented 迁移提交」上会把本批证据判为缺**：迁移提交只含 ADR 的改名与新 Review 行时，工作树态（未提交改名）下 `<since>..HEAD` 的 per-path diff 为空 → 证据判负；提交后即刻转绿（本会话实遇，收口提交后 `--enforce` 通过）。判据是否需要把「工作树rename + 同路径新增行」计入 = 待判；当前处置 = 先提交再核（顺序纪律，无需改闸）。出处 = [机械化 ADR](.agents/notes/implemented/process/2026-09-11-review-finding-mechanization.md) 门禁判据类。
- **（2026-09-12）`verify-review-brief` 未判简报 base 可解析**：base 全 SHA 笔误时 `--enforce` 仍 exit 0，三路靠评审 agent 自核出真值（该闸只判 head）。修法 = 加 base `git rev-parse --verify` 存在性判据 + 违约夹具。出处 = [secret-fixture ADR](.agents/notes/implemented/process/2026-09-12-secret-fixture-fragment-encoding.md)（门禁判据类）。

## 待定（已记录的需求，待后续拍板）

- **池件自身的机器面**：条数 / 字数预算是否上闸（形态参照 [verify-handoff-structure](scripts/verify-handoff-structure.mts)），待池规模有实测再判。
