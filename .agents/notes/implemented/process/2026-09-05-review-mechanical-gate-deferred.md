# Agent Note: 评审机械闸延后至胶囊 v0.2

Status: implemented

## Problem

desktop 的评审机械闸（`verify-review-tier.py` 17KB + `verify-review-brief.py` 21KB）是其最高密度资产，但二者与 desktop 真实评审面强耦合：FULL 档路径模式（组合根/门禁判据文件/.githooks/行为契约面 docs）、证据 ADR 同 change set 检查、简报目录 `.review-briefs/` 布局——全部对着 desktop 的评审对象写就。心源空仓状态下没有真实评审面，此刻照搬只会产出注定返工的路径模式。

## Decision

v0 阶段：评审契约以流程卡（feature-flow 评审节）+ `docs/method/review.md` 承载——机械定档暂由主会话按"AI 兜底清单"人工判定（判据从 desktop `review-scope-narrowing` ADR 提炼，写进 review.md），简报结构模板化但暂不机器校验。胶囊 v0.2：待本仓积累 ≥1 个真实 FULL 档评审案例后，按本仓评审面重写两个机械闸（届时含"中断即未审计/简报自证"防逃逸机制）。任务已入 HANDOFF-todos。

## Alternatives considered

- **现在就搬两个脚本并按 desktop 路径模式配置**：路径模式全错，机械闸反而制造"假绿灯"（desktop 教训：verify-governance 的关键词 grep 长期红着没人发现）。落败。
- **v0 完全不做评审（只靠门禁）**：机器门禁盖不住语义面（async 生命周期/ADR 口径/契约漂移），desktop 的"AI 兜底清单"机制本身是体系主链路。落败。

## Consequences

收益：避免空仓返工；评审契约先流程化、积累真实案例后再机械化，符合 desktop"门禁是被教训喂大的"进化律。代价：v0 阶段档位判定存在人工裁量缝隙（缓解：review.md 给出封闭判据清单，且"模棱两可宁可重审"条款一并搬入）。
