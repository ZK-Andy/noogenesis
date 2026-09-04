# EvoMap evolver 引擎演化史解剖（MIT 时代快照）

> Provenance：本仓原创调研（2026-09-05）。分析对象：`bit-cook/evolver` fork（MIT 时代快照，LICENSE "MIT License, Copyright (c) 2026 OpenClaw"，`fa7a011` = 2026-03-09，121 提交全历史）。提炼后记录，零源码拷贝入库；本地镜像 `/.research-mirror/evolver-mit-20260309`（gitignored，fork 主删除后可按同日窗口的其他 fork 重找）。
>
> 配套：码级机制结论在 ADR [2026-09-05-evomap-evox-engine-anatomy](../../.agents/notes/proposed/architecture/2026-09-05-evomap-evox-engine-anatomy.md)（接口映射/记忆图参数/Genesis 世界观）；本文只记**引擎怎么一步步长出来**（更新思路）。

## 一周长成引擎（2026-02-03 → 02-07）

| 日 | 里程碑提交 | 思路 |
|---|---|---|
| D1 02-03 | `695ed05` initial dev workspace | 私有开发仓起步（公共仓后来只是发布面） |
| D2 02-04 | `cd5f09b` **Refactor to use GEP protocol** | **协议先行**：先定 Gene/Capsule/Event 结构化资产，引擎围着协议长 |
| D2 02-04 | `03dea09` persist candidates + **prompt budget** | 候选持久化 + 提示词预算（token 纪律引擎内建） |
| D2 02-04 | `ae09a7b` public build pipeline + ClawHub 同步 | 发布面与开发面分离（后来混淆/重写历史的基建） |
| D3 02-06 | `73c59eb` **memory graph v1** | 因果演化一天落地最小版 |
| D3 02-06 | `a6574b6` **memory graph v2 + A2A exchange** | 最小可用后立即加交换层（agent-to-agent） |
| D3 02-06 | `67aaea0` **mutation protocol + personality evolution** | 变异协议（防局部最优）+ 人格演化 |
| D3 02-06 | `0531d88` fix(solidify): blast radius 排除基线未跟踪文件 | 入档闸边角当日成立即修 |
| D3 02-06 | `08baf7b` **validation command safety check + security model docs**（v1.4.4） | **护栏与功能同节奏**：验证命令白名单 + 安全模型文档同日进 |
| D4 02-07 | `e5536ec` content addressing + env fingerprint + validation report + A2A（v1.5.0） | 信任层四件套一次进：SHA 防篡改/环境指纹/验证报告/交换协议 |
| D4 02-07 | `67ae241` **internal daemon loop with suicide guard** | 守护进程化 + 自杀式重启保护（防带坏代码复活） |
| D4 02-07 | `becf042` **containerized vibe testing 16 条 + LLM 评审**（Gemini 评 JSON） | 用 LLM 评测自己引擎的行为（元评测） |
| D4 02-07 | `08bdf12` innovation signal detection + auto-innovate | 创新信号与自动创新变异 |
| D5+ 02-08→ | 高频发布（v1.7→v1.28 squash 提交）+ 社区 PR（dry-run/env 路径/max_files 约束） | 公共仓只有 squash 发布与社区修复——**真开发历史从未在公共面** |

## 对心源发动机的六条可借思路

1. **协议先行**：GEP 结构化资产（gene/capsule/event）在第 2 天定稿，此后所有模块围绕协议生长——对应我们的"Gene schema 先定稿、引擎后实现"。
2. **记忆图分两拍**：v1 当天最小闭环（因果边+衰减），v2 次日加交换——先单机闭环、后共享层，与我们"本地优先、可离线"同构。
3. **护栏与功能同节奏**：validation 安全检查 + 安全模型文档与功能同日进（不等"以后补"）。
4. **canary/自杀守卫**：入档前隔离子进程验引擎自身完整性；daemon 重启前先验证——对应我们"门禁全绿才许提交"的引擎侧同构物。
5. **元评测早建**：16 条容器化行为测试 + LLM 评审，引擎出生即有行为回归面。
6. **发布面≠开发面**：公共仓只有 squash 发布（真历史在私有仓）——这也解释了后续混淆与历史重写；我们反向设计：**过程即资产，历史全公开**（journal 入 git）。

## 局限

- 快照止于 2026-03-09（v1.28.0）：其后的 ATP 市场层、skill distiller、hub 积分经济只在混淆版可见，机制仅能从现行 schema 与文档侧推（设计稿 §3 已有结论）。
- squash 发布提交不可 diff——02-08 之后的逐版变化只能靠发布说明与现行代码反推。
