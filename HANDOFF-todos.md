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
- [x] （B）CI validate.yml 首跑复验 2026-09-05：push 三触发（2 绿 + 1 concurrency 取消），run 33970832391@74661d4 全绿——七门禁 + review-tier `--since event.before --enforce` 真强制 + 6 self-test；brief 闸按设计仅本地预发射，不入 CI。
- [x] （D）P1 立项收口（三审全采纳）：ADR [p1-engine-skeleton](.agents/notes/implemented/architecture/2026-09-05-p1-engine-skeleton.md)、[gene-event-schema](.agents/notes/implemented/architecture/2026-09-05-gene-event-schema.md)。
- [x] （D）P1 引擎实现轮 2026-09-05（FULL 三审全采纳）：`engine/` 四命令 + gates.json + 第十门禁 + self-test + 首批 6 基因入档；ADR [2026-09-05-p1-engine-implementation](.agents/notes/implemented/architecture/2026-09-05-p1-engine-implementation.md)。
- [x] （C）change-scope.sh quotePath 修复 + selftest e2e 夹具 2026-09-05（FULL 三审全采纳 R1 1B/5S、R2 0B/5S、R3 2B/5S）；ADR [2026-09-05-change-scope-quotepath](.agents/notes/implemented/bug-fix/2026-09-05-change-scope-quotepath.md)。
- [x] （D）M2 适配层立项讨论轮 2026-09-06 四题拍板（插件壳/最小接线/spawn 单合同/技能分发随 P2），ADR [2026-09-06-m2-adapter-wiring](.agents/notes/implemented/architecture/2026-09-06-m2-adapter-wiring.md)。
- [x] （D）M2 适配层实现轮 2026-09-06（插件壳 + 最小接线 + spawn 单合同 + gates.json 单源；FULL 三审 R1 0B/4S、R2 1B/8S、R3 3B/4S 全采纳），ADR [2026-09-06-m2-adapter-wiring](.agents/notes/implemented/architecture/2026-09-06-m2-adapter-wiring.md)。
- [x] （D）npm 真包首发 2026-09-06（release-flow）：`noogenesis@0.1.0` = latest（repository 对齐，commit `cecc815`；tag `v0.1.0`）；desktop 实装 + 空仓退化/真仓命中验证；minimumReleaseAge 单命令豁免（cookbook [环境]）；M2 ADR 发布 gate 清账。
- [ ] （B）新会话重验 `noogenesis-dsh@0.1.1` 三件事：① `noo_select` / `noo_propose` / `noo_evaluate` 三工具都在模型工具面；② 实调 `noo_select`（如 `["git 对账"]`）**零配置**命中本仓基因（repoRoot 四级回退链生效，不再报「不是 Git 仓库」）；③ system-prompt 基座节在场。验过清本条。
- [x] （D）M2 部署收口 2026-09-06（FULL 三审全采纳），ADR [2026-09-06-adapter-deploy-hardening](.agents/notes/implemented/architecture/2026-09-06-adapter-deploy-hardening.md)；`noogenesis-dsh@0.1.1` 发布 + 裸名 deprecate；desktop 实装完成。
