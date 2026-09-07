# HANDOFF-todos — 行动区

> 全部待办明细、状态与预算的**唯一行动区**（HANDOFF.md 待办节只放指针）。`[ ]` 条 ≤16（每条 ≤340 字），`[x]` 压缩为一行指针（≤220 字），总条数 ≤70；由 `scripts/verify-handoff-structure.py` 机器强制。
> 分类速览约定见 [session-close](.agents/workflows/session-close.md)：A 待拍板 / B 待复验 / C 随手候选 / D 远期。
> 胶囊 01 优化轮问题池与相关待办已迁出（2026-09-06）：唯一行动区 = [docs/research/capsule-01-optimization-round.md](docs/research/capsule-01-optimization-round.md)，本文件不再承载该轮条目。

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
- [x] （B）`noogenesis-dsh@0.1.1` 新会话重验 2026-09-06：三工具在工具面 + `noo_select(["git 对账"])` 零配置命中本仓基因 + system-prompt 基座节在场，三件全绿。
- [x] （D）M2 部署收口 2026-09-06（FULL 三审全采纳），ADR [2026-09-06-adapter-deploy-hardening](.agents/notes/implemented/architecture/2026-09-06-adapter-deploy-hardening.md)；`noogenesis-dsh@0.1.1` 发布 + 裸名 deprecate；desktop 实装完成。
- [x] （C）0.1.3 重装重验通过（2026-09-06）：genes-cache 落会话仓 + remote=官方库 + HEAD `a81c3a0` + 缓存基因并入扫描（liveproof 实证）；技能面 7 件在位，rank 600 遮蔽关系符合验收口径；ADR `2026-09-06-bank-pull-session-trigger`。
- [x] （C）pre-push 钩子 tag 缺口修复 2026-09-06（FULL 三审 0B，建议全采纳）：可达 tag 跳过档位强制（rev-list 空集），发版豁免前提消失；ADR [2026-09-06-pre-push-tag-outgoing](.agents/notes/implemented/bug-fix/2026-09-06-pre-push-tag-outgoing.md)。
- [x] （A）胶囊 01 优化轮拍板落账（2026-09-06 用户逐题）：范围 = 先文档漂移清账批，随后问题池逐项解决（验收口径批次收口制不变）；记忆库线用户定调「处理完文档漂移再说」；护栏三件触发点仍 = 优化轮完成。前置全清账（0.1.3 重验 ✅ / 技能进胶囊可运行 ✅ / 环境定调解除 ✅）。
- [x] （A）文档漂移清账批 2026-09-06（FULL 三审 R1 0B/1S、R2 0B/4S、R3 1B/3S 全采纳收口；搬迁计划下沉 journal/ 非 archived，口径以 ADR 为准），ADR [2026-09-06-doc-single-sourcing](.agents/notes/implemented/process/2026-09-06-doc-single-sourcing.md)。
- [ ] （D）协作层重建实现轮（单源：立项 ADR [2026-09-06-collab-rebuild-impl](.agents/notes/proposed/architecture/2026-09-06-collab-rebuild-impl.md)；B0 已闭环 2026-09-08，C11/C12 转绿）：下会话首题 = B1 门禁族 TS 化（verify-* ×10 + gates runner DAG + `mdref.ts` + 双跑对账，py 保持权威）；随后 B2→B5（lefthook / 0.2.0）；每批 FULL 三审 + 蓝图对账。
- [x] （A）框架重建立项收口 2026-09-06（推倒重建/先框架后协作层/原地重建；FULL 三审 R1 0B/5S、R2 2B/6S、R3 1B/3S 全采纳），ADR [2026-09-06-framework-rebuild-charter](.agents/notes/implemented/architecture/2026-09-06-framework-rebuild-charter.md)。
- [ ] （C）main 领先包体待随批出包（2026-09-06 用户拍板不单开发版轮）：git 前置条件 + ENOENT 诊断分流已落 main（`b5fcb2e`→`10745e2`），npm 包仍 0.1.3；下一有发版需求的批次 chore(release) bump 0.1.4 一并带出（tag 推送随钩子修复直接放行）。
- [ ] （C）gates.py self-test 夹具脚手架折叠（2026-09-06 R1 建议采纳归后续）：四份 gates_dir/mkdir/write_text 同型脚手架提取助手收敛为一家，行为不变；随下次触碰 gates.py 顺带做，不单开批。
- [ ] （D）护栏延后拍板待收口（ADR [2026-09-06-guardrail-defer-trigger](.agents/notes/proposed/architecture/2026-09-06-guardrail-defer-trigger.md) proposed）：护栏三件（token-meter 真测量 / 严格改进度量 / canary 隔离）需要但延后至首个胶囊优化完成后触发；收口时转 implemented + 修正骨架 ADR 遗留面归口 + 设计稿 §6/§11 API 名以实测修正。对账余项：js-yaml + YAML 迁移器归口、Detect 信号源轮立项（D2 禁区逐源解除，连带 M3 频次重议）。
- [x] （D）P2 实现轮 2026-09-06（FULL 三审 R1 1B/5S、R2 1B/8S、R3 0B/6S 全采纳），ADR [2026-09-06-p2-shared-consumer](.agents/notes/implemented/architecture/2026-09-06-p2-shared-consumer.md) implemented。
- [ ] （D）痕迹提炼面归融合轮（2026-09-06 用户拍板：记录但不急）：「纪律留痕→无人提炼→下会话考古」缺口在案，解法随 dsh-continual-evolve 融合轮再议（触发 = 架构定稿，设计稿 §13.5）；旧项目 OBSERVATION 观察生命周期协议为实物参照（work 区）。边界：非自动沉淀复刻（#18 负面清单有效）、不让引擎扫会话，只议 session-close 摩擦点落点是否可寻址。
