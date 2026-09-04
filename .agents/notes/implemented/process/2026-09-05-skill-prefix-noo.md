# Agent Note: 自研技能前缀定为 noo-*

Status: implemented

## Problem

心源的自研技能需要一个稳定命名前缀。来源项目的技能叫 `dsh-*`（dsh-code-review 等），沿袭自上游 deepseek-harness 的生态约定；但心源的技能是"心源胶囊技能"，不是面向 DSH 插件市场的官方生态件，沿用 `dsh-*` 会与官方插件命名空间混淆（根设计文档对 DSH 插件的命名纪律是 `dsh-<域>-<角色>`）。

## Decision

`.agents/skills/` 下自研技能前缀 `noo-*`（如 `noo-code-review`）。`dsh-*` 前缀保留给未来面向 DSH 市场发布的插件本体（含未来的演化引擎插件）。npm/插件注册前照旧查占用。

## Alternatives considered

- **沿用 `dsh-*`**：与上游技能血统一目了然，但混淆官方生态命名，且这些技能已大幅改写、不再是 DSH 官方件。落败。
- **无前缀/项目名全拼前缀（`noogenesis-*`）**：无前缀在多仓复用时易撞名；全拼太长。落败（`noo-` 取项目名词头，短且独占）。

## Consequences

收益：胶囊技能与 DSH 生态插件命名边界清晰，未来两套资产并行发布互不干扰。代价：与来源项目技能名不同源，对照桌面版时需按此映射（noo-code-review ↔ dsh-code-review）。
