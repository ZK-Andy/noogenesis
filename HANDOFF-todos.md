# HANDOFF-todos — 行动区

> 全部待办明细、状态与预算的**唯一行动区**（HANDOFF.md 待办节只放指针）。`[ ]` 条 ≤16（每条 ≤340 字），`[x]` 压缩为一行指针（≤220 字），总条数 ≤70；由 `scripts/verify-handoff-structure.mts` 机器强制。
> 分类速览约定见 [session-close](.agents/workflows/session-close.md)：A 待拍板 / B 待复验 / C 随手候选 / D 远期。
> 胶囊 01 优化轮已收口（2026-09-10）：其问题池冻结为调研档案，终态与去向 = [该文档 §2.3 收口账](docs/research/capsule-01-optimization-round.md)；跨会话遗留（下方 D 条三件）由本行动区承载。
> 记忆库线（含痕迹提炼面 D 条）已迁出（2026-09-10）：唯一状态家 = [docs/research/memory-system-dossier.md](docs/research/memory-system-dossier.md)（档案页制度试点）。

- [x] （A）胶囊 v0.2 评审机械闸 2026-09-05 落地（verify-review-tier + verify-review-brief），ADR [2026-09-05-review-mechanical-gate](.agents/notes/implemented/process/2026-09-05-review-mechanical-gate.md)。
- [x] （A）npm/GitHub 占用核验与注册 2026-09-05：npm 双名占位完成（裸名 `noogenesis@0.0.0` + org `@noogenesis`/`@noogenesis/genesis`，账号 openorbit，真包随首发替换）；GitHub 休眠账号不阻碍 `<宿主>/noogenesis` 仓库名。细节见主设计未决问题 1。
- [x] （B）胶囊 01 v0 首次真实评审：FULL 三审 2026-09-05 完成（Blocker 4→全修），对照样本在 journal 2026-09 卷。
- [x] （C）简化候选三件拍板+实施 2026-09-05（FULL 三审全过），ADR [2026-09-05-consolidate-r1-simplification-candidates](.agents/notes/implemented/simplification/2026-09-05-consolidate-r1-simplification-candidates.md)。
- [x] （C）verify-adr-format.mts 虚引用清理 2026-09-05：头注改指单一事实源 notes/README.md（按 consolidate-r1 ADR Decision 4 口径），门禁+self-test 全绿。
- [x] （C）cookbook 第二批原子蒸馏 2026-09-05：desktop 通用 4 条（跨平台 shell 五连坑/YAML≠CI 接受/CI 缓存 ref 隔离/沙箱只验降级分支）+ dsh-continual-evolve FAQ 2 条（推理模型空正文/遍历键当数据键），共 21 条全绿。
- [x] （A）整仓许可切换 AGPL-3.0 2026-09-05：LICENSE/README/共享层设计稿/.agents AGENTS 出处声明同步，上游 MIT 版权与许可文本集中于 THIRD-PARTY-NOTICES.md，ADR [2026-09-05-license-agpl-3](.agents/notes/implemented/process/2026-09-05-license-agpl-3.md)。
- [x] （B）许可切换批 FULL 三审 2026-09-05（R1 0B/2S、R2 1B/2S、R3 0B/4S，全采纳收口）：证据行落 license ADR 头部，tier `--since 2b45531 --enforce` 转绿。
- [x] （B）CI validate.yml 首跑复验 2026-09-05：push 三触发（2 绿 + 1 concurrency 取消），run 33970832391@74661d4 全绿——七门禁 + review-tier `--since event.before --enforce` 真强制 + 6 self-test；brief 闸按设计仅本地预发射，不入 CI。
- [x] （D）P1 立项收口（三审全采纳）：ADR [p1-engine-skeleton](.agents/notes/implemented/architecture/2026-09-05-p1-engine-skeleton.md)、[gene-event-schema](.agents/notes/implemented/architecture/2026-09-05-gene-event-schema.md)。
- [x] （D）P1 引擎实现轮 2026-09-05（FULL 三审全采纳）：`engine/` 四命令 + gates.json + 第十门禁 + self-test + 首批 6 基因入档；ADR [2026-09-05-p1-engine-implementation](.agents/notes/implemented/architecture/2026-09-05-p1-engine-implementation.md)。
- [x] （C）change-scope.mts quotePath 修复 + selftest e2e 夹具 2026-09-05（FULL 三审全采纳 R1 1B/5S、R2 0B/5S、R3 2B/5S）；ADR [2026-09-05-change-scope-quotepath](.agents/notes/implemented/bug-fix/2026-09-05-change-scope-quotepath.md)。
- [x] （D）M2 适配层立项讨论轮 2026-09-06 四题拍板（插件壳/最小接线/spawn 单合同/技能分发随 P2），ADR [2026-09-06-m2-adapter-wiring](.agents/notes/implemented/architecture/2026-09-06-m2-adapter-wiring.md)。
- [x] （D）M2 适配层实现轮 2026-09-06（插件壳 + 最小接线 + spawn 单合同 + gates.json 单源；FULL 三审 R1 0B/4S、R2 1B/8S、R3 3B/4S 全采纳），ADR [2026-09-06-m2-adapter-wiring](.agents/notes/implemented/architecture/2026-09-06-m2-adapter-wiring.md)。
- [x] （D）npm 真包首发 2026-09-06（release-flow）：`noogenesis@0.1.0` = latest（repository 对齐，commit `cecc815`；tag `v0.1.0`）；desktop 实装 + 空仓退化/真仓命中验证；minimumReleaseAge 单命令豁免（cookbook [环境]）；M2 ADR 发布 gate 清账。
- [x] （B）`noogenesis-dsh@0.1.1` 新会话重验 2026-09-06：三工具在工具面 + `noo_select(["git 对账"])` 零配置命中本仓基因 + system-prompt 基座节在场，三件全绿。
- [x] （D）M2 部署收口 2026-09-06（FULL 三审全采纳），ADR [2026-09-06-adapter-deploy-hardening](.agents/notes/implemented/architecture/2026-09-06-adapter-deploy-hardening.md)；`noogenesis-dsh@0.1.1` 发布 + 裸名 deprecate；desktop 实装完成。
- [x] （C）0.1.3 重装重验通过（2026-09-06）：genes-cache 落会话仓 + remote=官方库 + HEAD `a81c3a0` + 缓存基因并入扫描（liveproof 实证）；技能面 7 件在位，rank 600 遮蔽关系符合验收口径；ADR `2026-09-06-bank-pull-session-trigger`。
- [x] （C）pre-push 钩子 tag 缺口修复 2026-09-06（FULL 三审 0B，建议全采纳）：可达 tag 跳过档位强制（rev-list 空集），发版豁免前提消失；ADR [2026-09-06-pre-push-tag-outgoing](.agents/notes/implemented/bug-fix/2026-09-06-pre-push-tag-outgoing.md)。
- [x] （A）胶囊 01 优化轮拍板落账（2026-09-06 用户逐题）：范围 = 先文档漂移清账批，随后问题池逐项解决（验收口径批次收口制不变）；记忆库线用户定调「处理完文档漂移再说」；护栏三件触发点仍 = 优化轮完成。前置全清账（0.1.3 重验 ✅ / 技能进胶囊可运行 ✅ / 环境定调解除 ✅）。
- [x] （A）文档漂移清账批 2026-09-06（FULL 三审 R1 0B/1S、R2 0B/4S、R3 1B/3S 全采纳收口；搬迁计划下沉 journal/ 非 archived，口径以 ADR 为准），ADR [2026-09-06-doc-single-sourcing](.agents/notes/implemented/process/2026-09-06-doc-single-sourcing.md)。
- [x] （D）B1 门禁族 TS 化批 2026-09-08（FULL 三审全采纳收口；C5 转绿），ADR [2026-09-08-collab-rebuild-b1-gates-ts](.agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md)。
- [x] （D）B2 引擎+适配层 TS 化批 2026-09-08（FULL 三审 0B 全采纳收口；双跑对账零 diff；npm 发布面切 dist；C3/C10 转绿 + C9 逐批核过），ADR [2026-09-08-b2-engine-adapter-ts](.agents/notes/implemented/architecture/2026-09-08-b2-engine-adapter-ts.md)。
- [x] （D）B3 钩子与安装面批 2026-09-08（FULL 三审全采纳收口；tier 触发集对账；C2 部分/C4/C6 部分/C13 部分），ADR [2026-09-08-b3-hooks-install](.agents/notes/implemented/architecture/2026-09-08-b3-hooks-install.md)。
- [x] （D）B4 挂载面接线批 2026-09-08（FULL 三审全采纳收口；C7/C8/C15 落账 + C9 逐批核过；实机重验 = todos B 条），ADR [2026-09-08-b4-mount-wiring](.agents/notes/implemented/architecture/2026-09-08-b4-mount-wiring.md)。
- [x] （B）B4 实机重验 + 0.2.0 消费面 2026-09-08（真机探针，journal 在案；M1/M2 零投影实锤 → 修复轮；勘误：持久化容忍度撤回、投影面退役——[撤除 ADR](.agents/notes/implemented/architecture/2026-09-08-a8-session-record-projection-removal.md)）。
- [x] （B）M1/M2 exec 载荷字段修复 2026-09-08（FULL 三审 R1 1B/R2 1B/1S/R3 0B 全采纳收口；0.2.1 发版 + B4 ADR 同步/勘误落账），ADR [2026-09-08-mount-exec-arguments-field](.agents/notes/implemented/bug-fix/2026-09-08-mount-exec-arguments-field.md)。
- [x] （B）A8 会话记录投影撤除 2026-09-08（宿主读路径拒解释含未标 ignorable 插件事件的日志且 append 无写入口——投影面退役，A2 地图与能力层保留；0.2.2 bump），ADR [撤除 ADR](.agents/notes/implemented/architecture/2026-09-08-a8-session-record-projection-removal.md)。
- [x] （B）0.2.2 重装重验 2026-09-08 通过（A8 撤除批）：桌面重启后新会话真机探针——历史加载正常 + 会话日志零 `noogenesis/*` 自定义事件（装机树 0.2.2 + genes-cache HEAD 对齐远端在案）。
- [x] （C）engine/bin.ts pull guard 合并 2026-09-08 随 B5 兑现（B2 R1 延后项，同文案 fail 合一 + 不可达 continue 消除，行为零变化）；B5 ADR Decision 6。
- [x] （A）框架重建立项收口 2026-09-06（推倒重建/先框架后协作层/原地重建；FULL 三审 R1 0B/5S、R2 2B/6S、R3 1B/3S 全采纳），ADR [2026-09-06-framework-rebuild-charter](.agents/notes/implemented/architecture/2026-09-06-framework-rebuild-charter.md)。
- [x] （C）main 领先包体出包 2026-09-08 随 B5 0.2.0 断点销账（git 前置条件 + ENOENT 诊断 `b5fcb2e`→`10745e2` 已带出；tag `v0.2.0` + npm latest 在案）。
- [x] （A）术语口径 2026-09-11 拍板：内容包层保留「胶囊」（含包内知识原子），原语层写设计稿英文原名、`Capsule` 不译——规则落根 AGENTS「文档纪律」，ADR [2026-09-11-capsule-term-layering](.agents/notes/implemented/process/2026-09-11-capsule-term-layering.md)。
- [ ] （D）技能清单「等等」候选收集（优化轮收口遗留，显式挂起）：用户拍板暂不新增技能（用不上不写），既有技能 references/ 已补；触发 = 用户再给候选时重开（先例参照 = HERO-Anti-OverDefense）。决定单源 = [skill-references-fill](.agents/notes/implemented/process/2026-09-10-skill-references-fill.md)；池文档收口账 = [§2.3](docs/research/capsule-01-optimization-round.md)。
- [ ] （D）优化轮收口遗留缓议两件：技能 A3 写入前阻断档 + 评审收口触点提醒。触发 = 会话内出现需要写入前阻断的真实场景 / step-2 对账抓到真实漏网。判据与预拍板单源 = [lint-in-loop](.agents/notes/implemented/architecture/2026-09-08-lint-in-loop-feedback.md) + [review-exec](.agents/notes/implemented/architecture/2026-09-10-review-execution-reconciliation.md)。
- [ ] （D）护栏建设轮待排期（触发已满足）：收口 ADR [三条件](.agents/notes/implemented/process/2026-09-10-optimization-round-closure.md) 已兑现 → [护栏 ADR](.agents/notes/proposed/architecture/2026-09-06-guardrail-defer-trigger.md) 达成。立项轮逐件拍板（token-meter / 改进度量 / canary）后转 implemented（收口细节见该 ADR）。待证点 = 在环反馈是否让模型更合规。余项：js-yaml 归口、Detect 信号源轮立项（D2 逐源解除，连带 M3 重议）。
- [x] （D）架构规范实现批 2026-09-10（FULL 三审三轮全采纳收口；import 环实测 n=46/81 零环零跨族），ADR [2026-09-10-architecture-standards-charter](.agents/notes/implemented/architecture/2026-09-10-architecture-standards-charter.md)。
- [x] （D）P2 实现轮 2026-09-06（FULL 三审 R1 1B/5S、R2 1B/8S、R3 0B/6S 全采纳），ADR [2026-09-06-p2-shared-consumer](.agents/notes/implemented/architecture/2026-09-06-p2-shared-consumer.md) implemented。
- [x] （C）编码规范 c1 评审恢复与收口 2026-09-08（FULL 三审恢复重跑：R1 1B/4S、R2 1B/4S、R3 2B/3S 全采纳收口），ADR [2026-09-08-coding-standards](.agents/notes/implemented/architecture/2026-09-08-coding-standards.md) implemented。
- [x] （C）mdref 共享件副本折叠 2026-09-10：mdref 增补 pyStrip 导出 + 四消费方删本地 split/pyStrip 副本（净 −2 行，豁免 7→3）；ADR [2026-09-10-mdref-py-primitives-fold](.agents/notes/implemented/simplification/2026-09-10-mdref-py-primitives-fold.md)。
- [x] （B）规范语义面审计修复批 2026-09-10（FULL 三审 0B 全采纳；行为 7 处 + 注释批），ADR [2026-09-10-standards-audit-fix-batch](.agents/notes/implemented/bug-fix/2026-09-10-standards-audit-fix-batch.md)。
- [x] （C）pypara 原语归口 + 职责下分 2026-09-10（FULL 三审全采纳；gene-format 1151→656；夹具同件拍板），ADR [2026-09-10-pypara-fold-responsibility-split](.agents/notes/implemented/simplification/2026-09-10-pypara-fold-responsibility-split.md)。
- [x] （C）D 批简化候选 5 项 2026-09-10 收口（FULL 三审 1B+1B 全采纳修毕），ADR [候选 ADR](.agents/notes/implemented/simplification/2026-09-10-standards-audit-simplification-candidates.md)。
- [x] （C）review-tier 证据继承弱点修复 2026-09-10：Review 行须由本变更引入（旧 ADR 不搭车），fixtures 12→17；ADR [2026-09-10-review-tier-evidence-ride-along](.agents/notes/implemented/bug-fix/2026-09-10-review-tier-evidence-ride-along.md)。
- [x] （C）verify-review-tier 三态映射单源 + untracked 集传递去重 2026-09-10（零行为重构独立批；FULL 三审全采纳），ADR [2026-09-10-review-tier-diff-moment-dedup](.agents/notes/implemented/simplification/2026-09-10-review-tier-diff-moment-dedup.md)。
- [x] （A）编码强制两轨闭环：批 1（`2026-09-08-lint-in-loop-feedback`）+ 批 2（`2026-09-08-coding-enforcement-track-b`）均 implemented + FULL 三审全采纳（R1/R2 各 2B、R3 1B，全修）；批 3 测量 → 延后。
- [x] （A）编码规范机器拦升格批 2026-09-09（FULL 三审 0B 全采纳），ADR [2026-09-09-lint-block-and-staged-hook](.agents/notes/implemented/architecture/2026-09-09-lint-block-and-staged-hook.md)；0.2.3 发版含本批。
- [x] （B）批 1 真机复验 2026-09-09（用户重装 0.2.3 + 重启；全判据命中，journal 在案）：var 写码同轮 block / 修正零反馈 / 连续 ×3 第 4 次降级 context / 干净写码复位 / edit 同拦 / 非 .ts 零反馈 / staged 红。宿主基线已升 0.1.5-alpha.1（用户确认主动升级）。
- [x] （B）M1 守卫三件套 + 防过度契约块真机复验 2026-09-10（0.2.4 装机）：A2 技能路标行在场；A3 对 `docs/` 写码投递 advice 一行不阻断、重复不重提、载对口技能后消失；契约块随基座注入（journal 在案）。
- [x] （B）release 工具族首验 2026-09-10（0.2.4 实发）：bump 产 `chore(release)`+lock 同提交（`6fe74ea`）、tag `dsh-v0.2.4` 过 pre-push、npm latest 0.2.4、双语 Release Latest；证据 = ADR `release-shape-alignment` 落地验证节。
- [ ] （C）宿主 OpenCode Go 会话头收尾（2026-09-10 诊断批遗留，本地环境不入仓）：官方 sessionHeader（pi-ai 包方向，上游 pi#9326）落地后退役 `dsh-opencode-session` 插件（`dsh plugin --profile dotnet-desktop remove`）；`~/.dsh/settings.yaml` 的 omenalpha 死块（含静态 headers 行）随用户清理删除。坑与解法已入 cookbook [环境]。
- [x] （B）注释面在环判据真机复验 2026-09-10（0.2.4 装机）：域内缺 JSDoc → 当轮 `block`（英文违约行替换结果）；连续 3 次后第 4 次降级 `context`；合规写通过并复位；域外/非 `.ts` 零反馈；判据件缺席降级面 = self-test 夹具（journal 在案）。
- [x] （C）verify-review-brief 明细输出缺口 2026-09-10 修复（随收口批）：明细打印兜底无泳道前缀项，fixtures 12→13；ADR [2026-09-10-review-brief-detail-fallback](.agents/notes/implemented/bug-fix/2026-09-10-review-brief-detail-fallback.md)。
- [ ] （C）release-note 大批次归并档缺失（2026-09-10 0.2.4 首验实遇）：v0.2.3→0.2.4 跨 59 笔时「其他变更」节输出 47 条过程条目（body 147 行），发布者须手工按批次归并；修法 = 脚本增按批次/scope 的聚合档。触发 = 下次发版仍须手工归并。
- [ ] （C）档案页制度批（2026-09-10 试点拍板的后续）：试点件 = [memory-system-dossier.md](docs/research/memory-system-dossier.md)；内容 = 全仓推广评估 + 骨架四段机器闸（仿 verify-handoff-structure）+ tier 归口拍板（research 层「非当下状态」vs 状态页先例）+ ADR 立项（proposed→implemented）。触发 = 试点跑一段评估。
- [x] （A）M1 批 A 守卫三件套 2026-09-10（FULL 三审全采纳；三件 v0 落地），ADR [2026-09-10-m1-guard-anti-overdesign](.agents/notes/implemented/architecture/2026-09-10-m1-guard-anti-overdesign.md) implemented（分批批注）。
- [x] （A）M1 批 B 防过度混合 D 2026-09-10（FULL 三审全采纳；契约块 + 蒸馏篇 + cases 索引 + 检查项第 5 条），ADR [2026-09-10-m1-guard-anti-overdesign](.agents/notes/implemented/architecture/2026-09-10-m1-guard-anti-overdesign.md) 第二条 Review 行在案。
