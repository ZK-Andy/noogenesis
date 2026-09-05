# HANDOFF-todos — 行动区

> 全部待办明细、状态与预算的**唯一行动区**（HANDOFF.md 待办节只放指针）。`[ ]` 条 ≤16（每条 ≤340 字），`[x]` 压缩为一行指针（≤220 字），总条数 ≤70；由 `scripts/verify-handoff-structure.py` 机器强制。
> 分类速览约定见 [session-close](.agents/workflows/session-close.md)：A 待拍板 / B 待复验 / C 随手候选 / D 远期。

- [x] （A）胶囊 v0.2 评审机械闸 2026-09-05 落地（verify-review-tier + verify-review-brief），ADR [2026-09-05-review-mechanical-gate](.agents/notes/implemented/process/2026-09-05-review-mechanical-gate.md)。
- [x] （A）npm/GitHub 占用核验与注册 2026-09-05：npm 双名占位完成（裸名 `noogenesis@0.0.0` + org `@noogenesis`/`@noogenesis/genesis`，账号 openorbit，真包随首发替换）；GitHub 休眠账号不阻碍 `<宿主>/noogenesis` 仓库名。细节见主设计未决问题 1。
- [x] （B）胶囊 01 v0 首次真实评审：FULL 三审 2026-09-05 完成（Blocker 4→全修），对照样本在 journal 2026-09 卷。
- [x] （C）简化候选三件拍板+实施 2026-09-05（FULL 三审全过），ADR [2026-09-05-consolidate-r1-simplification-candidates](.agents/notes/implemented/simplification/2026-09-05-consolidate-r1-simplification-candidates.md)。
- [x] （C）verify-adr-format.py 虚引用清理 2026-09-05：头注改指单一事实源 notes/README.md（按 consolidate-r1 ADR Decision 4 口径），门禁+self-test 全绿。
- [x] （C）cookbook 第二批原子蒸馏 2026-09-05：desktop 通用 4 条（跨平台 shell 五连坑/YAML≠CI 接受/CI 缓存 ref 隔离/沙箱只验降级分支）+ dsh-continual-evolve FAQ 2 条（推理模型空正文/遍历键当数据键），共 21 条全绿。
- [x] （A）整仓许可切换 AGPL-3.0 2026-09-05：LICENSE/README/共享层设计稿/.agents AGENTS 出处声明同步，上游 MIT 版权与许可文本集中于 THIRD-PARTY-NOTICES.md，ADR [2026-09-05-license-agpl-3](.agents/notes/implemented/process/2026-09-05-license-agpl-3.md)。
- [x] （B）许可切换批 FULL 三审 2026-09-05（R1 0B/2S、R2 1B/2S、R3 0B/4S，全采纳收口）：证据行落 license ADR 头部，tier `--since 2b45531 --enforce` 转绿。
- [ ] **（D）P1 演化引擎立项准备**——发动机骨架待拍板：Gene schema 六字段 + 四接口签名（select/propose/evaluate/solidify）+ `engine/` 目录 + Gene/Event 最小闭环，底座 = ADR [2026-09-05-evomap-evox-engine-anatomy](.agents/notes/proposed/architecture/2026-09-05-evomap-evox-engine-anatomy.md)（码级实证）；对标 dsh-continual-evolve 治理四件套（融合在架构定稿后）；P2 基因库命名/taxonomy 随立项拍板。
