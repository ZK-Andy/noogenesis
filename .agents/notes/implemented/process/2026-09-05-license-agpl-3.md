# Agent Note: switch whole-repo license to AGPL-3.0

Status: implemented

Review: FULL/2026-09-05/R1=ok R2=ok R3=ok

> Provenance：本仓原创（用户拍板 2026-09-05，同会话实施）。

## Problem

仓库原为 MIT（[capsule-01-migration ADR](2026-09-05-capsule-01-migration.md) 时期随 S1 落地；共享层设计稿亦写"引擎 + 基因库保持 MIT"）。MIT 允许任意人取用且不回馈——与本项目"群体共同演化、贡献回馈公共基因池"（P2）的目标相悖：取用者可将方法论与引擎做成不回馈演化的产品。用户拍板放弃 MIT。（注意：AGPL 同样不禁商用；排除的是不履行开源义务的分发与网络服务形态。）

## Decision

**整仓统一 AGPL-3.0**（2026-09-05 拍板）：

- `LICENSE` 替换为 GNU AGPL-3.0 全文；README §License、共享层设计稿许可证段、`.agents/AGENTS.md` 出处声明节同步改写。
- **上游 MIT 出处义务**：上游版权声明与 MIT 许可文本集中于根 [THIRD-PARTY-NOTICES.md](../../../../THIRD-PARTY-NOTICES.md)（实质复制面 = `scripts/verify-*.py` verbatim 移植及血统承接的骨架资产）；各资产头部 provenance 行只承担逐件血统标注（源 + 差异），不承担许可文本义务。
- `.research-mirror/` 参考引擎镜像不入库（gitignored），不在许可覆盖面内；"GPL/AGPL 时代代码只取思想"的研究纪律不变。
- 许可覆盖整仓（代码 + 方法论文档 + 设计文档），不分层。

## Alternatives considered

- **Apache-2.0**：落败——宽松 + 专利授权对企业友好，但同样允许闭源使用，不满足防闭源商用的核心诉求。
- **代码/文档双许可（代码 AGPL + 方法论 CC BY-NC）**：落败——代码与方法论在本仓高度互嵌（流程卡/技能/门禁/文档一体），边界难切且双层维护成本高；整仓统一无此成本。
- **专有（保留所有权利）**：落败——阻断 P2 基因库的社区贡献路径，与"群体共同演化"北极星直接冲突。
- **维持 MIT**：落败——即 Problem 本身。

## Consequences

- 任何分发或网络服务形态的使用（含 SaaS）须遵守 AGPL-3.0：提供源码与修改说明；商用本身不被排除（闭源、不分发、非网络服务的内部使用不受限），排除的是不履行源码提供义务的对外形态。
- **npm 分发面承接**：已发布的占位包（`noogenesis@0.0.0`、`@noogenesis/genesis@0.0.0`）与后续首发包以 AGPL-3.0 发布（占位包 license 字段已标 `AGPL-3.0-only`），上游出处按本 Decision 的 THIRD-PARTY-NOTICES 承接；npm 分发是 AGPL 义务最易被触发的形态，首发包发布时逐项对账。
- 未来接 GEP 生态（GPL/source-available 代码）需单独评审兼容性——AGPLv3 §13 允许并入 GPLv3 代码（单向），反向不行；与既有"不链接 GPL 时代代码"纪律同向。
- MIT 蒸馏上游的版权与许可文本义务由根 THIRD-PARTY-NOTICES.md 承担，新增蒸馏资产沿用同一纪律（provenance 行标注血统，NOTICES 集中许可文本）。
- README 已声明"独立项目——与 DeepSeek 无关联"，不受上游 deepseek-harness（MIT）许可传染。
