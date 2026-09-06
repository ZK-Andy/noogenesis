# Agent Note: pre-push tag 首推误拦修复

Status: implemented
Review: FULL/2026-09-06/R1=ok R2=ok R3=ok

> Provenance：本仓原创修复（2026-09-06，C 类随手候选批）。候选出处：HANDOFF-todos（C 类）2026-09-06 条目；豁免先例留痕：journal 2026-09 卷 v0.1.0/v0.1.2/v0.1.3 三次 `--no-verify`。
> Related：per-ref 档位循环机制的既定家 = [2026-09-05-review-mechanical-gate](../process/2026-09-05-review-mechanical-gate.md)（本批加 tag 分支 = 扩展非取代）。

## Problem

`.githooks/pre-push` 的评审档位循环只区分「新分支首推 / 既有分支 / 删除行」三态。tag 首推落入分支形态：`remote_sha` 全零命中「新分支首推无法定 base」分支被拦，但 tag 推送常无 outgoing（目标 commit 已在远端），档位强制本无对象——v0.1.0/v0.1.2/v0.1.3 三次发版 tag 均被误拦，只能按「main 批 tier `--enforce` 已绿」前提 `--no-verify` 豁免留痕。豁免先例持续累积：每次发版都要手工重申前提，hook 的 fail-closed 面从保护退化为仪式。

## Decision

- 评审档位循环加 tag 分支：`local_ref` 以 `refs/tags/` 开头时，`git rev-parse <local_sha>^{commit}` 解析目标 commit（轻量/附注 tag 同口径）；可达性 = `git rev-list <tgt> --not --remotes=<remote>/` 空集测试（被任一 tracking ref 包含 ⇔ 零行，R1 评审收敛：单命令替代逐 ref `merge-base --is-ancestor` 循环）——先判 rc 再判空集，rc≠0（坏对象/远端名不存在）与非空输出同落不可达；零行 = 零 outgoing，跳过档位强制（打印理由）；否则 = tag 携带未推 commit，无法定 base，保持 fail-closed（报错文案与分支首推同口径：先实跑 `verify-review-tier.py --since <base> --enforce` 让证据随变更）。
- 目标 commit 解析失败（悬空对象等）同样 fail-closed。
- `<remote>` 取 pre-push 参数 `$1`（缺省 `origin`），只查该远端的 tracking refs；URL 直推形态（`git push <url> <tag>`，$1=URL）tracking 集恒空 → 可达 tag 也被拦，属保守误伤（钩子头注注明，用远端名推送即可避免）。
- 分支三态逻辑零改动；删除行（local 全零）仍跳过。
- 证据：`scripts/pre-push-selftest.sh` e2e 四态（新分支首推拒 / tag 达远端过 / tag 携带未推 commit 拒 / tag 删除跳过），临时 bare 远端 + 克隆实跑；脚本强制 stdin 非 tty（hook 档位段在 tty 下整体跳过，tty 运行会使四态断言失真），B 态断言用「零 outgoing」唯一子串钉死通过来自 tag 分支。

## Alternatives considered

- **tag 一律跳过档位强制**：落败——tag 可打在本地未推 commit 上，一律跳过 = 零拦截旁路，重演 R1/R2 评审否掉的「退化工作树态」旁路。
- **`git ls-remote` 实时查远端**：落败——pre-push 内加网络调用，离线推送被卡死；本地 `refs/remotes` 已由同批分支推送更新。【推断 · 未证】罕见竞态：本地 tracking ref 落后且 tag 先于分支推送——此时 fail-closed，重跑分支推送即恢复，代价可接受。
- **按 tag 名前缀特判（如 `v*`）**：落败——tag 语义由 ref 形态决定，与命名无关；前缀特判是形状耦合。

## Consequences

- **采用面**：`.githooks/pre-push` 评审档位循环 + 头注释；新增 `scripts/pre-push-selftest.sh`（独立证据脚本，不进 `engine/gates.json` 白名单——它测 hook 本体，非文档门）。
- **行为面**：tag 目标 commit 已达远端 → 推送不再被档位强制拦截（三次发版豁免前提消失）；其余输入形态行为不变。release-flow 的 tag 推送步骤解除手工豁免前提。
- **HANDOFF-todos（C 类）「pre-push 钩子 tag 缺口」条目随本批收口。**
