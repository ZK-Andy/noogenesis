# HANDOFF-todos — 行动区

> 全部待办明细、状态与预算的**唯一行动区**（HANDOFF.md 待办节只放指针）。`[ ]` 条 ≤16（每条 ≤340 字），`[x]` 压缩为一行指针（≤220 字），总条数 ≤70；由 `scripts/verify-handoff-structure.py` 机器强制。
> 分类速览约定见 [session-close](.agents/workflows/session-close.md)：A 待拍板 / B 待复验 / C 随手候选 / D 远期。

- [ ] **（A）胶囊 v0.2：评审机械闸**——按本仓评审面重写 verify-review-tier 与 verify-review-brief（契约见 [review.md](docs/method/review.md) §1/§3 与 ADR [2026-09-05-review-mechanical-gate-deferred](.agents/notes/implemented/process/2026-09-05-review-mechanical-gate-deferred.md)）；前置：≥1 个真实 FULL 档评审案例作回归对照。
- [ ] **（A）基因库 repo 名与 npm 注册核验**——npm `@noogenesis` org / `noogenesis` 包名占用再验一次（搜索服务恢复后或手动）；基因库仓库名拍板（设计稿暂用 `dsh-gene-bank`，与 noo-* 技能前缀同理考虑改名）；域名等 taxonomy 细分（主设计 §13.1 开放项）。
- [x] （B）胶囊 01 v0 首次真实评审：FULL 三审 2026-09-05 完成（Blocker 4→全修），对照样本在 journal 2026-09 卷。
- [ ] **（C）简化候选实施（三件已拍板，ADR [2026-09-05-consolidate-r1-simplification-candidates](.agents/notes/proposed/simplification/2026-09-05-consolidate-r1-simplification-candidates.md)）**——按 ADR 顺序实施：③ feature-flow 评审节收敛为指针 +「不给结论倾向」迁入 review.md §3 → ① `scripts/mdref.py` 收敛链接校验五件套 → ② self-test 约定随 v0.2 机械闸新脚本生效（存量不回改）；完成后 ADR 转 implemented。
- [ ] **（C）cookbook 原子持续蒸馏**——来源仓剩余有价值的踩坑（desktop cookbook 未搬条目、dsh-continual-evolve docs/FAQ 通用项）按需蒸馏；宁少勿滥，每条须有真实症状/根因/规避。
- [ ] **（D）P1 演化引擎立项准备**——Gene/Capsule Schema 定稿（主设计 §5.1）；对标 dsh-continual-evolve 治理四件套与两段式评估（融合仅在架构定稿后，主设计 §13.5）。
