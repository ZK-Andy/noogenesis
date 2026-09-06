# 发版流程（release-flow）

> Provenance：蒸馏自 dotnet-deepseek-harness-desktop + dsh-frecency（MIT，2026-09-05）；差异：仅保留骨架与跨仓有效规则，.NET/打包矩阵等平台特定节不搬（心源当前发布形态 = git tag + GitHub Release + 门禁全绿；插件面发布待主设计 P4）。
>
> tag 触发的全链路；踩坑沉淀于 [docs/cookbook.md](../../docs/cookbook.md)，本卡只放流程。

1. **版本基线**：确定胶囊/插件版本号，单一来源 bump + `chore(release)` 提交。
2. **打 tag**：annotated `vX.Y.Z` 推送 origin——触发 Release 流水线。
3. **门禁前置**：`pre-push` 门禁全绿（清单见根 AGENTS「质量门」；含评审档位 `--enforce`）；`release-preflight` 类总检（资产矩阵/体积/校验和，随发布形态建立后接入）。
4. **Release 核验**：标记 Latest、非 draft；正文为结构化输出（conventional commits 分节；**类型映射必须覆盖全部类型并带 self-test**——上游 v0.4.1 教训：漏一类正文就静默少一节）。
5. **实机验收转交**：只有真机/真实环境能验的项列清单给用户。
6. **收尾**：README 核对同步（版本、清单）；HANDOFF 记录版本号与 run 号；遗留项进待办区。

## 硬规则（跨仓有效）

- **宁跳版本号，不重打已发布的 tag**（desktop v0.3.4 三次重打被迫出 v0.3.5 的教训）。
- 发布涉及的面（门禁脚本/打包脚本）变更必须先走 feature-flow 全链路，不在发版会话顺手改。
