# Agent Note: 批次 8 序 38 裁决——项目初始化域：初始化脚本 / CI 骨架复刻判不立，模板指针就地同步

Status: implemented

Review: FULL/2026-09-14/R1=ok R2=ok R3=ok

Related: 批次表 [行 38](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · 主设计 [§10 / §4.1 / §12-P4](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 初始化内容家 [ai-collaboration-method](../../../../docs/method/ai-collaboration-method.md) · [一行安装 ADR](2026-09-14-one-line-install.md) · [技能随库分发 ADR](2026-09-06-skills-ride-bank.md) · [M2 适配层 ADR](2026-09-06-m2-adapter-wiring.md) · 前序裁决 [序 36](2026-09-14-capsule-composition-verdict.md) / [序 37](2026-09-14-plugin-marketplace-verdict.md) · 档位判据 [review.md](../../../../docs/method/review.md)

## Problem

批次表行 38（批次 8 首件，内容域）要求「项目初始化域（模板 / CI 骨架 / 一键安装）」，出处主设计 §10 表行「项目初始化 | 模板、依赖、目录结构、CI 骨架、插件接线 | 初始化脚本、`verify-*`、一键安装」；现状备注 = 仅 `templates/` 三件。开工前取证（2026-09-14，本仓实读）：

- **初始化内容已在场**：`docs/method/ai-collaboration-method.md` §二「形制骨架」给出与语言 / 平台无关的最小目录结构，§四「分发与生长」给出新项目上手序（建最小骨架 + 根 `AGENTS.md` + `verify-adr-format` → 跑起来 → 攒行为）；`templates/` 三件给出 ADR 与分层 `AGENTS.md` 的填空骨架。
- **依赖 / 插件接线 / 一键安装已交付**：npm `noogenesis-dsh@0.2.6`；`dsh.bundle.patch` 自动入层；宿主 `dsh plugin` 首用初始化 profile——消费者四条路径 = 根 README 安装节（[序 34 ADR](2026-09-14-one-line-install.md)）。
- **`verify-*` 门禁族已交付**：20 门单源 `engine/gates.json` + `scripts/gates.mts` DAG runner；CI = `.github/workflows/validate.yml` 穷尽矩阵。
- **目录结构**：根 README §Structure 即参照实现。
- **无「初始化脚本」产物**：包 `files` 白名单（单源 = `package.json`）不含 `scripts/`、`templates/`、`docs/`、`.agents/` 任一项——这四类均不随包分发。
- **消费者面**：无外部消费者（[序 37 裁决](2026-09-14-plugin-marketplace-verdict.md) 在案；序 21/22 贡献开放轮为零）。
- **模板具名缺陷**：`templates/agents-hierarchy.md` 两处指针指向源仓未随迁文档——§3 代码块注「引用模板 `docs/方法论提炼.md` §2.2」、§5「`.claude/skills/`、`.agents/skills/` 等技能放置见 `docs/ADAPTATION.md` §1」；本仓 `docs/` 无此两件，按模板操作会撞空。

## Decision

### 1. 本域「内容半边」的单源 = ai-collaboration-method 形制骨架 + `templates/`

初始化内容不做第二份：`ai-collaboration-method.md` §二 / §四承载「结构与上手序」，`templates/` 承载「填空骨架」。本件不复述其内容。

### 2. 一键安装 / `verify-*` 门禁族 = 已交付（指针，不重做）

序 34 已闭合安装链；门禁族单源 `engine/gates.json`。这两项在本域无新增面。

### 3. 「初始化脚本」判不立

宿主 `dsh plugin` 首用已闭合「初始化 profile + 装包 + 层对账」，插件分发取代了「把模板文件拷进目标仓」的适配形态（[技能随库分发 ADR](2026-09-06-skills-ride-bank.md)）。再造 scaffold 子命令 / bin = 重复宿主命令，落败判据与代价面单源 = [序 34 ADR](2026-09-14-one-line-install.md) 对 `noogenesis-setup` 包装器的裁决。触发见 T1。

### 4. 「CI 骨架复刻」判不立

本仓 `.github/workflows/validate.yml` 是**参照实现**而非可分发的骨架：它绑本仓门禁脚本（`scripts/gates.mts` + `engine/gates.json` + `verify-*.mts`），而 `files` 白名单不含 `scripts/`——无分发通道、消费者为零。新建参数化 CI 模板 = 无消费者的脚手架。触发见 T2。

### 5. 本域首刀 = `templates/agents-hierarchy.md` 两处悬空指针就地同步

- §3 代码块注 `docs/方法论提炼.md` §2.2 → 真实家 = `.agents/notes/README.md`（笔记规则单源）。
- §5 的 `docs/ADAPTATION.md` §1 → 本仓无对应件：逐 agent 文件拷贝式适配已被插件分发取代；改写为放置约定（技能目录按各宿主原生机制放）。
- provenance 行补本仓差异说明。

### 6. 重议触发

- **T1**：出现真实的新项目初始化消费者（用户点名或外部采纳）且有包侧预置骨架的具名需求 → 开「初始化脚本」批。
- **T2**：外部消费者出现或序 21/22 贡献开放轮落地 → 随该轮重估 CI 骨架与门禁族的可分发性（可与序 37 T1 的 git 安装通道合并）。
- **T3**：模板再出现指向未随迁文档的指针，或本域新增可分发件 → 重开本件、重排域内清单。

## Alternatives considered

- **造「初始化脚本」（scaffold 子命令 / bin）**：落败——重复宿主命令（序 34 同判据）；无消费者。
- **造 CI 骨架模板（`templates/validate.yml` + gates 骨架）**：落败——`files` 无分发通道、消费者为零；本仓 `validate.yml` 已是参照实现。
- **写《项目初始化手册》（类 devops-template `docs/ADAPTATION.md`）**：落败——其前提（把文件拷进你的 agent 环境）已被插件分发取代；且与 `ai-collaboration-method.md` §二 / §四 + README 安装节构成双源。
- **判「已交付、零动作」**：落败——模板两处悬空指针是具名缺陷，按模板操作的新项目会撞空。

## Consequences

- **批次表单源更新**：行 38 备注改 `done（指针 = 本件）`；「未交付」计数 12 → 11；游标 = 序 39。
- **档位**：`templates/**` 属行为契约面路径触发（[review.md](../../../../docs/method/review.md) §1），本批 FULL 三审。
- **机制零变化**：`engine/**`、`adapters/**`、`scripts/**`、`package.json`、`cordis.patch.yml` 均不动。
- **单源**：域内判据（脚本 / CI 骨架判不立与触发条）以本件为家；初始化内容单源 = `ai-collaboration-method.md` 形制骨架 + `templates/`；安装路径单源 = 根 README。
- **三审结论**：R1 0B+3S、R2 1B+1S、R3 0B+1S，全采纳、拒 0（findings 处置见 journal 2026-09 卷本批节）。
- **批次 8 开轮**：本件为内容域首件；序 39–42 待办。
