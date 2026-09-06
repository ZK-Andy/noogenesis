# Agent Note: 根 README 产品优先双语化

Status: implemented

> Provenance：结构与方法论蒸馏自 deepseek-ai/deepseek-harness（MIT）ADR `2026-07-22-product-first-root-readme` 及其根 README / README.zh.md 布局（2026-09-06，用户拍板完整双语）；提炼后适配，非逐字节搬运。

## Problem

根 README 为单语文件，其「当前状态」是约 600 词的单段（超密长段），混装定位、运行层、npm 包、git 前置条件、pull 机制、技能分发多种形态；无双语切换行、无快速上手路径（怎么装、怎么跑）、无贡献入口。读者面含双语（dsh 生态插件面向中英双受众）。

## Decision

- 结构对齐上游产品优先纪律：根 README = 短的产品与贡献者入口——双语切换行（`English | 中文`，互指 README.md / README.zh.md）→ 一至两段定位 → Status（胶囊 self-hosting + 两个运行层 + git 前置条件）→ Install（npm 装法）→ Run from source（clone + 接钩子 + 跑门禁 + 引擎自检）→ Structure → Gates → Documentation → Contributing → License。
- `README.md` 转英文主文件，`README.zh.md` 中文镜像；两文件保持相同技术结构（上游纪律），双语切换行互相指认。
- 原单段「当前状态」拆为定位段 + 两个运行层条目 + 前置条件段——每个事实子句保留，超密段落形态废除；细节（设计文档、方法论、cookbook、ADR 家、评审契约）以链接提供，不在入口页复制。
- 原文重复的「（ADR 同见 …）」归一为 Status 首段一次指向；「技能随库分发」「pull 触发点随会话工作区」并入运行层与安装两节的对应事实位。

## Alternatives considered

- **只重排不双语**：落败——用户已拍板完整双语；dsh 生态插件面向双语读者面，单语入口挡住一半受众。
- **README 投影为文档站首页**：落败——本仓无文档站；README 即入口，结构树与门禁清单是 agent 与贡献者的第一触点，保留为入口后细节节。
- **营销化长页（徽章/截图/长教程）**：落败——上游 product-first ADR 已否；富媒体内容随命令与源码约定漂移，根 README 保持紧凑并链接到可运行入口。

## Consequences

- **双语镜像成为维护义务**：事实变更（版本、命令、包名、章节事实）时两文件同变更同步，对齐上游「README 仍须同步更新」纪律。
- **README 未入 `scripts/doc-budgets.manifest.json` 预算清单**：本批不新增预算条目；若未来超重，按根 AGENTS「字数预算」超限处理序评估是否入 manifest（留待需要时另立 ADR）。
- `verify-md-links.py` 覆盖两文件的相对链接与互指切换行。
