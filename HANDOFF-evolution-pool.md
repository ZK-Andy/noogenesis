# HANDOFF-evolution-pool — 演化轮池（候选归集区）

> 本件 = 演化轮候选的**归集面**（HANDOFF 家庭行动区的第二件）；规则与步序单源 = [feature-flow](.agents/workflows/feature-flow.md) §4.6（攒账三类 / 开轮触发 / 成批处理）。
> 归集面决策 = [池件 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-file.md)；立闸门槛单源 = [发现机械化 ADR](.agents/notes/implemented/process/2026-09-11-review-finding-mechanization.md) Decision 1；准则条文 = [主设计 §6](docs/research/dsh-swarm-evolution-framework-design.md)。

## 候选

- [ ] **（2026-09-12）bank 技能 provider 注册失效**：desktop 199/199 会话目录 `noo-*`=0、自举仓 262/262 由文件系统 provider 掩盖（provider 代码与缓存均正常）。三件同批 = `inject` 补 `skills` + 可重试注册 / 提醒面目录感知（A2 行 + `skillGuards` 默认值）/ 外仓 marker 实证夹具。立项件 = [proposed ADR](.agents/notes/proposed/bug-fix/2026-09-12-bank-skill-provider-registration.md)。
- [ ] **（2026-09-12）`verify-review-brief` 未判简报 base 可解析**：base 全 SHA 笔误时 `--enforce` 仍 exit 0，三路靠评审 agent 自核出真值（该闸只判 head）。修法 = 加 base `git rev-parse --verify` 存在性判据 + 违约夹具。出处 = [secret-fixture ADR](.agents/notes/implemented/process/2026-09-12-secret-fixture-fragment-encoding.md)（门禁判据类）。
- [ ] **（2026-09-12）技能触点提醒的 push 面正则不覆盖 `git -c … push`**：[config.mts](adapters/dsh/config.mts) 用 `\bgit\s+push\b`（要求相邻），无凭据助手的本机只能 `git -c credential.helper=… push`——本机 3 次推送 0 次命中，push 前 pre-push-checks 提醒结构上不可达。修法 = 允许 `-c`/`--git-dir` 等前置选项 + 夹具；与待办（B）触发面复验同批复核（同批关系见 [HANDOFF-todos](HANDOFF-todos.md)（B）条）。

## 待定（已记录的需求，待后续拍板）

- **候选被演化轮吸收之后的处置**：条目在落闸 / 落卡 / 落条目之后如何销账（勾账 / 删除 / 迁 ADR）与是否归档，尚无规则；触发 = 首次演化轮落账。
- **池件自身的机器面**：条数 / 字数预算是否上闸（形态参照 [verify-handoff-structure](scripts/verify-handoff-structure.mts)），待池规模有实测再判。
