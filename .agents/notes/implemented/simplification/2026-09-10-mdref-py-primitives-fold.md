# Agent Note: mdref 收编 py 兼容小件（splitLines/pyStrip 副本折叠）

Status: implemented
Review: FULL/2026-09-10/R1=ok R2=ok R3=ok

> Provenance：本仓原创简化（2026-09-10，C 类随手候选批）。候选出处：HANDOFF-todos（C）「mdref 共享件副本折叠」（R1 评审 2026-09-08 发现）。
> Related：「另批立项」决定见 [2026-09-08-c2-lint-enforcement](../architecture/2026-09-08-c2-lint-enforcement.md)（该件 L59 记录「未采纳：mdref splitLines 四份副本折叠（跨件行为面，另批）」——本件即该另批的落地，非取代）。

## Problem

`scripts/mdref.mts` 是链接/锚点原语库，但 py 兼容小件 `splitLines` 与 `pyStrip` 存在 3–4 份手搓副本散在四个 verify-* 门禁里：

| 文件 | 副本 | 与 mdref 等价性 |
|---|---|---|
| verify-adr-format.mts | `splitlines`（手工扫描）+ `pyStrip` | 完全等价（差分探针 n=23 全同） |
| verify-cookbook.mts | `splitPyLines`（String.split 无尾部空行剔除） | **分叉**：尾换行多 `""` 元素；调用点（scan 逐行循环）跳过空行 → 无行为影响 |
| verify-gene-format.mts | `pySplitlines`（matchAll）+ `pyStrip` | 完全等价 |
| verify-handoff-structure.mts | `pySplitlines`（split+pop）+ `pyStrip` | 完全等价 |

- `splitLines`（mdref 既有实现）与 adr/gene/handoff 三副本在 23 个边界用例（空串/`\r\n`/`\v`/`\f`/`\x1c-\x1e`/`\x85`/`\u2028\u2029`/结尾边界/非 ASCII）上输出逐项一致。
- `pyStrip` 三副本空白集逐字符一致（含 `\x85`、`\x1c-\x1f`、`\u00a0`、`\u1680`、`\u2000-\u200a`、`\u2028\u2029\u202f\u205f\u3000`）。
- cookbook 副本尾部空行分叉虽对当前调用点无行为影响，但保留分叉 = 判据漂移隐患（谁将来依赖尾行语义谁踩坑）。
- 每份副本各带 1 条 `no-control-regex` oxlint 豁免注释（共 7 条），真实语义注释淹没在重复实现里。

## Decision

1. **mdref.mts 增补 `pyStrip` 导出**（JSDoc 契约：Python `str.strip()` 空白集等价，非 JS trim 集），与既有 `splitLines` 同哲学——py 兼容小件共享单源化。mdref 头注同步声明「py 兼容小件（splitLines / pyStrip）的共享单源」。
2. **四件消费方删除本地 split/pyStrip 副本**，统一 `import { pyStrip, splitLines } from "./mdref.mts"`；调用点更名对齐（`splitlines`/`splitPyLines`/`pySplitlines` → `splitLines`）。
3. **行为零变化**：cookbook 的 `splitPyLines` 换成语义更严的 mdref `splitLines`（剔尾部空行）——其调用点本就逐行处理、空行无害跳过，无行为影响。各消费方 `--self-test` 夹具原样保留，为判据漂移护栏。
4. **豁免注释收敛**：副本删除后 `no-control-regex` 豁免自 7 条减至 3 条（mdref 内 2 条承载 splitLines/pyStrip 真实语义 + review-brief 1 条为独立 `isspace` 语义）。

## Alternatives considered

- **维持各件本地副本**：落败——四份等价实现 + 一份分叉实现各带一条豁免注释，语义单源化收益（改一处、防漂移）明显高于删 34 行的成本；分叉副本是未来判据漂移的雷。
- **把 pyStrip 留在调用方、只折叠 splitLines**：落败——pyStrip 三份也完全一致且共用 `no-control-regex` 豁免面，半折叠留一半漂移面。
- **新开独立 primitives.mts 而非并入 mdref**：落败——mdref 已是门禁族共享 import 件（4 消费者），再开一件徒增 import 面；mdref 头注已按「py 兼容小件共享单源」扩展定位。

## Consequences

- **采用面**：`scripts/mdref.mts`（+pyStrip 导出 + 头注）、`scripts/verify-adr-format.mts` / `verify-cookbook.mts` / `verify-gene-format.mts` / `verify-handoff-structure.mts`（副本删除 + import + 调用点更名）。
- **行为面**：四消费方输出逐字节不变（差分探针 n=23 + 各 self-test 夹具原样绿）；豁免注释 7→3。
- **mdref 消费契约**：新增导出即新增共享面——头注加约束「新增导出须同时更新消费方与夹具」。
- **判据漂移护栏**：各件 `--self-test` 夹具不动；折叠后若 mdref 小件语义漂移，消费方夹具会拦。
