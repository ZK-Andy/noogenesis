# Agent Note: switch whole-repo license to AGPL-3.0

Status: implemented

> Provenance：本仓原创（用户拍板 2026-09-05，同会话实施）。

## Problem

仓库原为 MIT（[capsule-01-migration ADR](2026-09-05-capsule-01-migration.md) 时期随 S1 落地；共享层设计稿亦写"引擎 + 基因库保持 MIT"）。MIT 允许任何人不回馈、闭源商用——与本项目"群体共同演化、贡献回馈公共基因池"（P2）的目标相悖：闭源者可以拿走方法论与引擎做成产品而不回馈演化。用户拍板放弃 MIT。

## Decision

**整仓统一 AGPL-3.0**（2026-09-05 拍板）：

- `LICENSE` 替换为 GNU AGPL-3.0 全文；README §License 与共享层设计稿许可证段同步改写。
- **provenance 行保留原样**：全仓各资产头部「蒸馏自 XXX（MIT）」标注的是上游来源血统，不受本仓许可影响——MIT 衍生品允许换许可，义务仅为保留其版权与许可声明，由 provenance 行承担。
- `.research-mirror/` 参考引擎镜像不入库（gitignored），不在许可覆盖面内；"GPL/AGPL 时代代码只取思想"的研究纪律不变。
- 许可覆盖整仓（代码 + 方法论文档 + 设计文档），不分层。

## Alternatives considered

- **Apache-2.0**：落败——宽松 + 专利授权对企业友好，但同样允许闭源使用，不满足防闭源商用的核心诉求。
- **代码/文档双许可（代码 AGPL + 方法论 CC BY-NC）**：落败——代码与方法论在本仓高度互嵌（流程卡/技能/门禁/文档一体），边界难切且双层维护成本高；整仓统一无此成本。
- **专有（保留所有权利）**：落败——阻断 P2 基因库的社区贡献路径，与"群体共同演化"北极星直接冲突。
- **维持 MIT**：落败——即 Problem 本身。

## Consequences

- 任何分发或网络服务形态的使用（含 SaaS）须遵守 AGPL-3.0：提供源码与修改说明；闭源商用被排除。
- 未来接 GEP 生态（GPL/source-available 代码）需单独评审兼容性——AGPLv3 §13 允许并入 GPLv3 代码（单向），反向不行；与既有"不链接 GPL 时代代码"纪律同向。
- MIT 蒸馏上游的出处义务由 provenance 行持续承担；新增蒸馏资产沿用同一纪律。
- README 已声明"独立项目——与 DeepSeek 无关联"，不受上游 deepseek-harness（MIT）许可传染。
