# Agent Note: 胶囊 01 协作方法论提炼搬迁（四源蒸馏立项）

Status: implemented

> Provenance：决策依据为 `capsule-01-migration-plan.md`（评审定稿 2026-09-05）；四路来源盘点结论已并入该计划 §3/§5/§6/§7。

## Problem

心源（Noogenesis）是新仓库，但 AI 协作方法论已在四个来源项目里被实战打磨：`devops-template`（上游 DSH 体系的二次蒸馏模板）、`dotnet-deepseek-harness-desktop`（最成熟的实战体系）、`dsh-frecency`（小仓最小可用集）、work 区（`dsh-continual-evolve` 自演化引擎 + 长期工作台的负面教训）。心源的第一个胶囊就是这套方法论本身，需要把四源资产搬进来作为胶囊 v0 种群——但照搬已被证明有害：frecency 逐字节搬 11 个技能导致引用链全断；desktop 的 .NET/C# 规范无法泛化；work 区的自动沉淀机制被实证否定。

## Decision

按"提炼后搬迁"执行（计划 §2 六原则）：常驻基座（双层 AGENTS）+ 流程卡 6 张 + ADR 生命周期 + 门禁第一梯队 7 个零依赖脚本 + cookbook 原子踩坑 + HANDOFF 家庭；评审机械闸（verify-review-tier / verify-review-brief）延后胶囊 v0.2；dsh-continual-evolve 整仓冻结留原地、仅作 P1 演化引擎对标。负面清单（不搬项）以计划 §6 为准，其中"自动沉淀零收益"等负面结论将蒸馏为 cookbook 原子保留失败面。每件资产头部带 provenance 行；已知缺陷 9 条在搬迁时修复（计划 §7）。本仓同时 self-hosting：用心源体系开发心源。

## Alternatives considered

- **照搬 desktop 全仓协作层**：最完整但强绑定 .NET/C# 评审面与 GitHub 治理件，机械闸的 FULL 路径模式在新仓必然返工；且会把 gitignore 过程资产生态一并搬入（与"过程即资产"相反）。落败。
- **只搬门禁脚本、不搬流程卡与文档体系**：门禁脱离流程卡就只是散件，三重审核契约、交接协议才是体系主链路；devops-template 已证明"文档讲的体系 > 仓库装的骨架"不可持续。落败。
- **接续 dsh-continual-evolve 原仓开发**：与主设计 §13"推倒重建、旧仓冻结 v0.6.0"拍板冲突，且其自动沉淀核心已被 #18 负结果否定。落败（融合仅在新架构定稿后）。

## Consequences

收益：四源被验证的纪律以零平台绑定的形式落入本仓；每条纪律自带门禁与出处，成为 P1 gene 协议化的现成基因池。代价：评审机械闸延后意味着 v0 阶段评审靠流程卡契约 + 人工执行（已知缝隙，v0.2 补机械闸）；journal/HANDOFF 入 git 会带来仓库体积与提交噪音增长。验收标准见计划 §9。
