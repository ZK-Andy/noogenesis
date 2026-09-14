# HANDOFF-evolution-pool — 演化轮池（候选归集区）

> 本件 = 演化轮候选的**归集面**（HANDOFF 家庭行动区的第二件）；规则与步序单源 = [feature-flow](.agents/workflows/feature-flow.md) §4.6（攒账三类 / 开轮触发 / 成批处理 / 销账）；「候选」节语义恒 = 未处理项（销账 = 处理完即删，口径单源 = [销账 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-candidate-disposal.md)）。
> 归集面决策 = [池件 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-file.md)；立闸门槛单源 = [发现机械化 ADR](.agents/notes/implemented/process/2026-09-11-review-finding-mechanization.md) Decision 1；准则条文 = [主设计 §6](docs/research/dsh-swarm-evolution-framework-design.md)。

## 候选

- **（2026-09-13，序 3 更新）简化候选：同族原语的第三份拷贝已到共享件拐点**：症状 = `engine/mutation.ts` 的身份/读入外壳与 `capsule.ts`/`gene.ts` 逐字节同形（`validate*` 字段守卫 10 行、`read*` 读入抛物、`assert*IdUnique`、`*Path` 四组），`recordMutation` 与 `recordCapsule` 只差一行引用校验；`verify-gene-format.mts` 的 mutations 布局段与 capsules 段约 2/3 行是标识符替换，复算段同理（`<domain>/<id>` 正则一项已随批次 1 序 3 折叠为 `engine/util.ts` 的 `KEBAB_REF_RE` 单一来源，不在本候选内）。抽 `engine/protocol.ts` / 按 `{dir,noun,idKey,shaKey}` 参数化闸件段的收益 = 消除第三份拷贝且错误文案可保面名；代价 = 回触已冻结的 `gene.ts`/`capsule.ts` 与 py-parity 移植件「每面一段」的直读形状。触发 = 第 4 个原语落地前。出处 = 批次 1 序 2 R1 评审 Suggestion 1/2 + 序 3 R1 Suggestion 1。

















## 待定（已记录的需求，待后续拍板）

- **池件自身的机器面**：条数 / 字数预算是否上闸（形态参照 [verify-handoff-structure](scripts/verify-handoff-structure.mts)），待池规模有实测再判。
