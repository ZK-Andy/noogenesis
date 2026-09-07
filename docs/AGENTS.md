# docs/ — 文档树

> 全局纪律见根 [AGENTS.md](../AGENTS.md)。方法论文档纪律单源：[doc-standards.md](method/doc-standards.md)（tier 表）；流程/踩坑单源：[cookbook.md](cookbook.md)。本件只写动本目录会踩的具体失败。

- **落位先查 tier 表**：新文档不知放哪层时查 [doc-standards](method/doc-standards.md) 的 tier 表，不凭感觉建文件；`docs/research/` 只放调研稿（非 durable 结论的家）。
- **单源**：同一事实只有一个家（rationale → ADR；procedure/踩坑 → cookbook；方法论 → method/；规则 → AGENTS.md + 链接）。发现两处讲同一事实 = 违规，迁一处留一行链接。
- **durable 文档写当前状态，不写变更历史**：「previously / now / no longer / renamed」是 slop。
- **词数预算由 manifest 机器强制**（`scripts/doc-budgets.manifest.json`）：新建常驻文档先入 manifest 再动笔；超限处理序 = 迁移 → 精简 → 才允许提额度。
- cookbook 条目带域标签（封闭集）+ 日期，格式由 `verify-cookbook.py` 强制；事故叙事不进 cookbook（归 `docs/postmortem/`，命名规则由 verify-postmortem-naming 强制）。
- 相对 Markdown 链接 + 机器可校验（verify-md-links 全树扫描）；禁裸文件名引用。
