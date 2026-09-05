# Agent Note: P2 立项拍板——本仓即库 + 只读消费起步 + 引擎侧共享客户端（默认离线）

Status: implemented
Review: FULL/2026-09-06/R1=ok R2=ok R3=ok

> Provenance：本仓原创（2026-09-06 P2 立项讨论轮，用户逐题拍板；同日实现轮 + FULL 三审收口）。上游拍板：P1 骨架/实现（[2026-09-05-p1-engine-skeleton](2026-09-05-p1-engine-skeleton.md) · [2026-09-05-p1-engine-implementation](2026-09-05-p1-engine-implementation.md)）、M2 分层边界（[2026-09-06-m2-adapter-wiring](2026-09-06-m2-adapter-wiring.md)）。设计基准：[主设计 §9/§12](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · [共享层设计稿](../../../../docs/research/dsh-collective-evolution-shared-layer.md)。

## Problem

P1 引擎四命令只扫本地 `genes/`（repoRoot 四级链），共享层零实现——设计稿 §12 的 P2（git 基因库 + CI 验证闸 + 「贡献 → CI → 合入 → pull 复用」闭环 + 观测透镜）整体待立项。立项前有四类未定：

1. **两稿口径分歧**：观测透镜归期——主设计 §12 放 P2，共享层设计稿 §10 放 P3；schema 形态——本仓 genes/ = 八字段 JSON（schema ADR S1），共享层设计稿 §6.2 = gene.yaml 带 `version/schema_rev/keywords/provenance/validation.evidence_ref`。
2. **设计稿未决问题**：未决 1（基因库命名，占位 `dsh-gene-bank` 与 `noo-*` 前缀张力）、未决 3（只读消费起步 vs 直接开放贡献 PR）、未决 4（单人 → 共享迁移开关）。
3. **M2 移交**：gene→skill 渲染语义（M4）、Genesis 世界观基因入档，均标「随 P2」。
4. **事实基线（2026-09-06 实测）**：本仓已是公开仓 `ZK-Andy/noogenesis`（public/main/AGPL-3.0）+ `genes/` 三域 6 基因 + CI `validate.yml` 门禁 + `events/` 月卷——本仓自身已满足「git 基因库 + CI 验证闸」的形态最小集；引擎与 npm 包侧消费端已部署（`noogenesis-dsh@0.1.1`）。

## Decision

用户逐题拍板（2026-09-06）：

**D1 · 基因库形态与命名 = 本仓即库，P2 首批不开新仓。** `ZK-Andy/noogenesis` 的 `genes/` 即基因库；独立基因库仓随「贡献开放」再立，命名走 `noogenesis` 系；设计稿占位名 `dsh-gene-bank` 弃用（未决问题 1 的库名走向收口；**taxonomy 细分——域名划分是否重建——不在本拍板面，仍 open**，随贡献开放拍板）。依据：只读起步阶段独立仓无外部贡献者，两个仓只增维护面；本仓已满足库形态最小集。

**D2 · 首批消费模式 = 只读消费。** 跑通「pull → 注入」；贡献 PR（staging + `evidence_ref` + CI 跨机器重跑 + 维护者合入）随多人阶段再开（未决问题 3 收口为「分阶段」）。依据：直接开放 PR 的前置（维护者仲裁 + fork CI 额度管理）在单人阶段零收益。

**D3 · P2 实现轮范围 = 共享客户端 pull 消费 + manifest 最小检索索引 + 跨仓 genes/ 合并扫描。** 后置（逐项有主）：capsules/ 原语（P1 最小闭环拍板后置）、schema 扩字段与 YAML 迁移（随贡献开放，js-yaml 例外权 open 单源在骨架 ADR）、观测透镜（两稿分歧收口 = 后置，随共享层设计稿 P3 口径；主设计 §12 P2 行的「观测透镜」改读后置）、gene→skill 渲染与技能分发（M4）、Genesis 世界观基因入档（内容策展，随首批外部基因轮）。

**D4 · 共享客户端落点 = `engine/` 新增命令，引擎默认离线，显式配置才接库。** 零依赖纪律不变：git fetch/pull 以子进程调用，库内容缓存到本地目录并入 select 扫描根；不配置则引擎行为与 `0.1.1` 完全一致（未决问题 4 收口 = 保留开关；分层边界不变——M2 ADR 拍板基因库 harness 无关，DSH 特有面收敛 adapter）。

### 实现轮拍板（同日，用户逐题 A/A/A）

- **D5 · 缓存落点与冲突语义**：仓内确定性缓存 `<repoRoot>/.noogenesis/genes-cache/`——select/propose 零额外合同即可发现（目录在场即扫描），`pull <url> [--cache DIR]` 缺省写这里；不跑 pull 就没有该目录 = 天然默认离线。同名 ref（`domain/id`）**本仓基因优先**：缓存副本被遮蔽、不报错——本仓是策展活体，库是分发副本。被否的全局缓存（`~/.cache/noogenesis/`）：HOME 虽在 spawn env 透传白名单内、发现路径可由 HOME 推导，但全局缓存须引擎新增「发现路径」合同面（违 CLI 合同最小面），且跨仓共享缓存使多仓扫描根混叠——仓内缓存使两个问题都不存在（R3 评审 S3 证据强度修正后口径）。
- **D6 · 合并扫描只走读路径**：`select` + `propose` 扫 `genes/` ∪ 缓存；`evaluate` / `solidify` 恒以本仓 `genes/` 为对象（evaluate 传 `{cache: false}`）——缓存基因只读不可评估、不可入档，守住「保守入档在本仓」纪律（schema ADR S2：solidify 是唯一入档入口）。
- **D7 · pull 触发 = adapter 惰性一次**：adapter config 新增 `geneBankUrl`（可选）；在场时插件装载触发一次 `pull`（逐仓 in-flight 去重，拉取完成后不释放——每实例每仓至多一次，刷新 = 重跑 pull 或重启），失败仅 warn 降级离线不阻塞会话——拉取是便利面不是正确性面（本仓基因始终在场）。引擎 `pull` 命令同时保留手动入口。被否的纯手动触发落败于「配置了却忘 pull」的静默陈旧。
- **manifest 语义**：仓根 `manifest.json` = 检索索引（`{version, genes:[{ref,path,summary,signals}]}`，确定性输出按 ref 排序、无时间戳——重跑字节恒等）；`scripts/gen-manifest.py` 生成 + `scripts/verify-manifest.py` 门禁（条目与 genes/ 树逐条对账，缺失/陈旧/漂移即红）入 `gates.json` 白名单（质量门 10→11 件）。消费端检索仍走目录扫描（引擎愚钝纪律），manifest 供人与消费端快速浏览，不进引擎合同面。

## Alternatives considered

- **立即开独立公共仓**（`noogenesis-genes` 或沿用 `dsh-gene-bank`）：落败——只读起步下无外部贡献者，独立仓的存在理由不成立；本仓即库先跑通闭环，独立仓随贡献开放拍板。
- **直接开放贡献 PR**：落败——设计稿本就把「维护者 + 免费 CI 额度管理」列为直接开放的前置成本，单人阶段无收益；且 Behind EvoMap 教训（验证闸必须先于开放）要求先把 CI 仲裁链跑稳。
- **共享客户端放 adapter 层**：落败——M2 分层边界拍板「DSH 特有面收敛适配层内，基因库 harness 无关」；放 adapter 会把 git 消费逻辑绑死单宿主，违分层纪律。
- **schema 迁 YAML + 扩字段先行**：落败——只读消费下本仓现八字段 JSON 直接可用；js-yaml 例外权是骨架 ADR 遗留面 open 项（单源在彼处），随贡献开放一并拍。

## Consequences

- **采用面**：`engine/pull.js`（新命令）、`engine/gene.js`（`defaultCacheDir` 单源 + 合并扫描：本仓优先遮蔽、缓存侧坏 JSON warn-skip）、`engine/bin.js`（pull 分支：`--cache` 缺值/重复 exit 2、恰一 URL）、`engine/evaluate.js`（D6 隔离，`{cache:false}`）、`engine/selftest.js`（P2 夹具节）、`engine/gates.json`（manifest 白名单条目，质量门 10→11）、`scripts/gen-manifest.py` + `scripts/verify-manifest.py` + 仓根 `manifest.json`、`adapters/dsh/bank-pull.mjs`（惰性 pull 触发体）+ `index.mjs`/`config.mjs`（geneBankUrl）+ `solidify-trigger.mjs`（`createInFlightGate` 闸工厂单源）+ 双 selftest 扩夹具、`.gitignore`（`/.noogenesis/`）、`.github/workflows/validate.yml`（manifest self-test）、四处 README/AGENTS 同步。
- **评审收口（2026-09-06，FULL 三审全采纳）**：R1 1B/5S、R2 1B/8S、R3 0B/6S（commits `df297e1` 实现 / `722d5b2` R1/R2 收口 / 本批 R3 收口+转档）。实质项：B1 evaluate 意外并入缓存（双路互证，D6 兑现）；pull 的 origin 与 URL 不一致 fail-closed 指引；缓存目录禁入 `genes/` 子树；缓存侧坏 JSON warn-skip（分发副本降级姿态，本仓仍 fail-closed）；in-flight 闸工厂与缓存路径双单源；verify-manifest ref 全段 kebab + 排序类型过滤 + 死分支清理；bin 头注五命令。R1-S3（gen-manifest 重复校验）不采纳有据：generator 写面防御校验与 verify-gene-format 独立镜像惯例同构。
- **运行边界**：pull 换库 URL fail-closed 指引（删缓存或 `--cache` 显式换）；缓存坏文件只影响该文件（warn-skip），pull 报告计数容错；manifest 漂移红在 CI（`gen-manifest.py` 重跑即修）。首个外部基因来源（贡献开放或 Genesis 基因入档）是共享闭环的下一信号——在此外部消费反馈为零。
- **设计稿回写（随本批完成）**：主设计未决 1（库名走向收口、taxonomy 仍 open）/未决 3（分阶段）/未决 4（保留开关）+ §12 观测透镜后置注记；共享层设计稿未决 1/3/4 同步（[主设计 §12/§13](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · [共享层 §10/§11](../../../../docs/research/dsh-collective-evolution-shared-layer.md)）。
- **验证**：engine self-test（P2 夹具：pull/合并/遮蔽/warn-skip/origin/参数/fail-closed 全套）+ adapter self-test（36 组，含真引擎 pull→缓存命中 e2e + 本仓遮蔽 e2e）+ verify-manifest self-test 全绿；门禁十一件全绿；`verify-review-tier --since f746e12 --enforce` 通过。
