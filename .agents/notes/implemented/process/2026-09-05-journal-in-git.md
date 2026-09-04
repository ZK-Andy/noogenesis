# Agent Note: 会话叙事卷（journal）纳入 git 跟踪

Status: implemented

## Problem

来源项目（desktop / frecency）把会话叙事、评审简报、规划文档全部 gitignore：换机器即丢全部过程资产，可复现性只能靠"复述进 durable 家"的人工纪律兜底。心源的立场相反：过程即资产——会话轨迹是未来蜂群演化的原料（[主设计 §2.3](../../../../docs/research/dsh-swarm-evolution-framework-design.md)：DSH 把经验记成可回放、可分叉的事件流），丢叙事等于丢基因。

## Decision

`journal/`（月卷，如 `journal/2026-09.md`）纳入 git 跟踪；HANDOFF.md / HANDOFF-todos.md 同样提交。durable 结论仍只落四家（ADR/cookbook/README/AGENTS），journal 只承载过程叙事，不复述 durable 结论（单源原则不变）。`.gitignore` 不含 HANDOFF 与 journal。

边界（同步 2026-09-05）：评审简报 `.review-briefs/` **不入 git**——它是一次性调度工件（生命止于该次评审收口），其结论与证据落 journal/交接条目；这与 Problem 中批评的"评审档案整体 gitignore 换机即丢"不冲突：入 git 的是有演化价值的轨迹（叙事卷/交接），一次性调度件不是。

## Alternatives considered

- **沿用 desktop 惯例（gitignore 纯本地）**：仓库干净、无提交噪音，但与"过程即资产"直接冲突，且四源盘点已把"换机即丢"列为缺陷。落败。
- **叙事只进 DSH 会话日志、不落仓**：DSH 事件流在 `~/.dsh` 本地态，跨机器/跨人不可见，不满足蜂群共享前提。落败。
- **journal 入 git 但按年归档压缩**：月卷粒度已足够有界（每卷一条叙事流），年压缩是过度设计。落败（留待体量证明需要时再立 ADR）。

## Consequences

收益：过程资产可复现、可跨机、可入未来演化管线。代价：仓库体积随叙事增长；缓解——月卷有界 + verify-handoff-structure 强制滚动窗/待办区预算，失控即触发治理。
