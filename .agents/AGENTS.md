# AGENTS.md — .agents/（AI 协作层）

本子树专属规则：**AI 协作机制本身**（技能、ADR、流程卡）。不重复根文件内容。

## 技能

- `.agents/skills/` 由 DSH 自动发现（skill 工具按需加载），无需注册。
- 本仓技能**前缀 `noo-*`**：它们是心源胶囊技能；`dsh-*` 前缀留给面向 DSH 生态发布的插件本体，避免混淆（ADR [2026-09-05-skill-prefix-noo](notes/implemented/process/2026-09-05-skill-prefix-noo.md)）。
- **引入即适配**：技能必须路径/引用全部指向本仓真实文件（`verify-md-links.py` 把 skills/ 纳入校验），不适配不引入；不搬逐字节原样上游技能（frecency 11 技能全死链的教训）。格式由 `scripts/verify-skill-format.py` 机器强制。
- 用不上的技能不写（避免预铺空目录）。

## ADR（Agent Notes）

- 完整规则单一事实源在 [notes/README.md](notes/README.md)（何时写/路径/格式/证据严肃性/归档），此处不重复。
- 新建笔记即跑 `python3 scripts/verify-adr-format.py` 校验（违约即 FAIL）。

## Cookbook（踩坑记录）

- 踩坑单一事实源在 [docs/cookbook.md](../docs/cookbook.md)：每条带域标签（封闭集）+ 日期，格式由 `scripts/verify-cookbook.py` 机器强制。

## 出处声明（上游均为 MIT）

> 本仓许可为 AGPL-3.0（见根 [README](../README.md) §License）；上游 MIT 出处义务由 provenance 行承担，不受本仓许可影响。

- `.agents/notes` 骨架、`templates/`、流程卡与技能的方法论：蒸馏自 `dotnet-deepseek-harness-desktop`、`dsh-frecency`、`devops-template`（MIT），其上游血统为 `deepseek-ai/deepseek-harness`（MIT）。**提炼后搬迁，非逐字节搬运**；每件资产头部带 provenance 行标注源与差异。
- `scripts/verify-*.py` 门禁：源自 desktop 版（MIT），按本仓修复后使用（差异见各脚本头注释与 ADR [2026-09-05-capsule-01-migration](notes/implemented/process/2026-09-05-capsule-01-migration.md)）。
