# Agent Note: P2 立项拍板——本仓即库 + 只读消费起步 + 引擎侧共享客户端（默认离线）

Status: proposed

> Provenance：本仓原创（2026-09-06 P2 立项讨论轮，用户逐题拍板）。上游拍板：P1 骨架/实现（[2026-09-05-p1-engine-skeleton](../../implemented/architecture/2026-09-05-p1-engine-skeleton.md) · [2026-09-05-p1-engine-implementation](../../implemented/architecture/2026-09-05-p1-engine-implementation.md)）、M2 分层边界（[2026-09-06-m2-adapter-wiring](../../implemented/architecture/2026-09-06-m2-adapter-wiring.md)）。设计基准：[主设计 §9/§12](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · [共享层设计稿](../../../../docs/research/dsh-collective-evolution-shared-layer.md)。

## Problem

P1 引擎四命令只扫本地 `genes/`（repoRoot 四级链），共享层零实现——设计稿 §12 的 P2（git 基因库 + CI 验证闸 + 「贡献 → CI → 合入 → pull 复用」闭环 + 观测透镜）整体待立项。立项前有四类未定：

1. **两稿口径分歧**：观测透镜归期——主设计 §12 放 P2，共享层设计稿 §10 放 P3；schema 形态——本仓 genes/ = 八字段 JSON（schema ADR S1），共享层设计稿 §6.2 = gene.yaml 带 `version/schema_rev/keywords/provenance/validation.evidence_ref`。
2. **设计稿未决问题**：未决 1（基因库命名，占位 `dsh-gene-bank` 与 `noo-*` 前缀张力）、未决 3（只读消费起步 vs 直接开放贡献 PR）、未决 4（单人 → 共享迁移开关）。
3. **M2 移交**：gene→skill 渲染语义（M4）、Genesis 世界观基因入档，均标「随 P2」。
4. **事实基线（2026-09-06 实测）**：本仓已是公开仓 `ZK-Andy/noogenesis`（public/main/AGPL-3.0）+ `genes/` 三域 6 基因 + CI `validate.yml` 七门禁 + `events/` 月卷——本仓自身已满足「git 基因库 + CI 验证闸」的形态最小集；引擎与 npm 包侧消费端已部署（`noogenesis-dsh@0.1.1`）。

## Proposal

用户逐题拍板（2026-09-06）：

**D1 · 基因库形态与命名 = 本仓即库，P2 首批不开新仓。** `ZK-Andy/noogenesis` 的 `genes/` 即基因库；独立基因库仓随「贡献开放」再立，命名走 `noogenesis` 系；设计稿占位名 `dsh-gene-bank` 弃用（未决问题 1 收口）。依据：只读起步阶段独立仓无外部贡献者，两个仓只增维护面；本仓已满足库形态最小集。

**D2 · 首批消费模式 = 只读消费。** 跑通「pull → 注入」；贡献 PR（staging + `evidence_ref` + CI 跨机器重跑 + 维护者合入）随多人阶段再开（未决问题 3 收口为「分阶段」）。依据：直接开放 PR 的前置（维护者仲裁 + fork CI 额度管理）在单人阶段零收益。

**D3 · P2 实现轮范围 = 共享客户端 pull 消费 + manifest 最小检索索引 + 跨仓 genes/ 合并扫描。** 后置（逐项有主）：capsules/ 原语（P1 最小闭环拍板后置）、schema 扩字段与 YAML 迁移（随贡献开放，js-yaml 例外权 open 单源在骨架 ADR）、观测透镜（两稿分歧收口 = 后置，随共享层设计稿 P3 口径；主设计 §12 P2 行的「观测透镜」改读后置）、gene→skill 渲染与技能分发（M4）、Genesis 世界观基因入档（内容策展，随首批外部基因轮）。

**D4 · 共享客户端落点 = `engine/` 新增命令，引擎默认离线，显式配置才接库。** 零依赖纪律不变：git fetch/pull 以子进程调用，库内容缓存到本地目录并入 select 扫描根；不配置则引擎行为与 `0.1.1` 完全一致（未决问题 4 收口 = 保留开关；分层边界不变——M2 ADR 拍板基因库 harness 无关，DSH 特有面收敛 adapter）。

## Alternatives considered

- **立即开独立公共仓**（`noogenesis-genes` 或沿用 `dsh-gene-bank`）：落败——只读起步下无外部贡献者，独立仓的存在理由不成立；本仓即库先跑通闭环，独立仓随贡献开放拍板。
- **直接开放贡献 PR**：落败——设计稿本就把「维护者 + 免费 CI 额度管理」列为直接开放的前置成本，单人阶段无收益；且 Behind EvoMap 教训（验证闸必须先于开放）要求先把 CI 仲裁链跑稳。
- **共享客户端放 adapter 层**：落败——M2 分层边界拍板「DSH 特有面收敛适配层内，基因库 harness 无关」；放 adapter 会把 git 消费逻辑绑死单宿主，违分层纪律。
- **schema 迁 YAML + 扩字段先行**：落败——只读消费下本仓现八字段 JSON 直接可用；js-yaml 例外权是骨架 ADR 遗留面 open 项（单源在彼处），随贡献开放一并拍。

## Acceptance criteria

- 实现轮后：配置指向基因库 URL 的环境可 pull 缓存并在 `noo_select` 命中库内基因；不配置时引擎行为与 `0.1.1` 逐字节一致（离线开关有夹具验证）；manifest 生成器 + 对应门禁入 CI。
- 缓存目录与 repoRoot 四级链的优先级、同名基因冲突语义随实现轮拍板（本 ADR 不预设）。

## Risks

- **本仓即库的双角色**：`genes/` 同时是「本仓被演化资产」与「对外共享库」——pull 缓存若与 repoRoot 扫描根混叠，可能把外部基因误当本仓资产；实现轮须显式隔离缓存目录。
- **只读闭环暂无外部基因**：闭环真值有限，首个外部基因来源（贡献开放或 Genesis 基因入档）是下一信号；在此外部消费者反馈为零。
