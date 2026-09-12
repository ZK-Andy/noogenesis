# 发版流程（release-flow）

> Provenance：蒸馏自 dotnet-deepseek-harness-desktop + dsh-frecency（MIT，2026-09-05）；差异：仅保留骨架与跨仓有效规则，.NET/打包矩阵等平台特定节不搬。发布形态（2026-09-09 对齐 DSH 上游）：tag 前缀 `dsh-v` + 双语 Release 正文由 `scripts/release/` 生成，见 [ADR 2026-09-09-release-shape-alignment](../notes/implemented/process/2026-09-09-release-shape-alignment.md)；插件面发布待主设计 P4。
>
> tag 触发的全链路；踩坑沉淀于 [docs/cookbook.md](../../docs/cookbook.md)，本卡只放流程。

1. **版本基线**：确定胶囊/插件版本号，单一来源 bump——`node scripts/release/bump.mts <版本> --msg <主题>` 自动改 package.json + 同步 lock + 生成 `chore(release)` 提交（不建 tag、不发布）。
2. **打 tag**：annotated **`dsh-vX.Y.Z`** 推送 origin——触发 Release 流水线（历史 `v0.x` tag 照旧不动，不重写历史）。
3. **门禁前置**：`pre-push` 门禁全绿（清单见根 AGENTS「质量门」；含评审档位 `--enforce`）；`release-preflight` 类总检（资产矩阵/体积/校验和，随发布形态建立后接入）。
4. **Release 正文生成**：`node scripts/release/release-note.mts <前一tag> <版本> > RELEASE_BODY.md`——双语分节（新增功能/体验优化/问题修复/其他变更 × New Features/Improvements/Bug Fixes/Chores；首节标题带锚点 `<h3 id>`、后续节 `###`，对齐上游形态）+ 每条 `@提交者`（git author→login 映射）+ `Full Changelog` 尾行（remote 推导）；**末节按提交日归并成每日一条**（`**<日期>（N 笔）**：<说明>；…`，条目零丢弃，机制与取舍单源 = [聚合 ADR](../notes/implemented/process/2026-09-12-release-note-daily-aggregation.md)）；**英文节逐字镜像 commit 标题（本仓标题为中文），发布前须人工润色翻译（脚本输出带提示行）**；复制进 GitHub Release（标记 Latest、非 draft）。
   - **类型映射纪律（传承上游 v0.4.1 教训）**：release-note 的类型→分节映射（feat/perf|refactor/fix/其余）必须覆盖全部 conventional commit 类型并带自检——未知类型落末节（Chores/其他变更）不静默丢条目；若新增类型未映射即改判据，须同步脚本注释与 self-test。
5. **实机验收转交**：只有真机/真实环境能验的项列清单给用户。
6. **收尾**：README 核对同步（版本、清单）；HANDOFF 记录版本号与 run 号；遗留项进待办区。

## 硬规则（跨仓有效）

- **宁跳版本号，不重打已发布的 tag**（desktop v0.3.4 三次重打被迫出 v0.3.5 的教训）。
- 发布涉及的面（门禁脚本/打包脚本）变更必须先走 feature-flow 全链路，不在发版会话顺手改。
