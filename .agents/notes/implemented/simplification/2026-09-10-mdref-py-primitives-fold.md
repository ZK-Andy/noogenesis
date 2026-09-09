# Agent Note: mdref 收编 py 兼容小件（splitLines/pyStrip 副本折叠）

Status: implemented
Review: FULL/2026-09-10/R1=ok R2=ok R3=ok

> Provenance：本仓原创简化（2026-09-10，C 类随手候选批）。候选出处：HANDOFF-todos（C）「mdref 共享件副本折叠」（R1 评审 2026-09-08 发现）。
> Related：「另批立项」决定见 [2026-09-08-c2-lint-enforcement](../architecture/2026-09-08-c2-lint-enforcement.md)（该件 L59 记录「未采纳：mdref splitLines 四份副本折叠（跨件行为面，另批）」——本件即该另批的落地，非取代）；单源落点迁移见 [2026-09-10-pypara-fold-responsibility-split](2026-09-10-pypara-fold-responsibility-split.md)（相关非否定：本件方法与折叠结论不变）。

## Problem

`scripts/mdref.mts` 是链接/锚点原语库，但 py 兼容小件 `splitLines` 与 `pyStrip` 存在 3–4 份手搓副本散在四个 verify-* 门禁里：

| 文件 | 副本 | 与 mdref 既有实现（迁移前基线）的等价性 |
|---|---|---|
| verify-adr-format.mts | `splitlines`（手工扫描）+ `pyStrip` | 完全等价（差分探针 n=23 全同） |
| verify-cookbook.mts | `splitPyLines`（String.split 无尾部空行剔除） | **分叉**：尾换行多 `""` 元素；调用点（scan 逐行循环）跳过空行 → 无行为影响 |
| verify-gene-format.mts | `pySplitlines`（matchAll）+ `pyStrip` | 完全等价 |
| verify-handoff-structure.mts | `pySplitlines`（split+pop）+ `pyStrip` | 完全等价 |

- `splitLines`（迁移前基线：mdref 当时承载该件；现态单源 = pypara）与 adr/gene/handoff 三副本在 23 个边界用例（空串/`\r\n`/`\v`/`\f`/`\x1c-\x1e`/`\x85`/`\u2028\u2029`/结尾边界/非 ASCII）上输出逐项一致。
- `pyStrip` 三副本空白集逐字符一致（含 `\x85`、`\x1c-\x1f`、`\u00a0`、`\u1680`、`\u2000-\u200a`、`\u2028\u2029\u202f\u205f\u3000`）。
- cookbook 副本尾部空行分叉虽对当前调用点无行为影响，但保留分叉 = 判据漂移隐患（谁将来依赖尾行语义谁踩坑）。
- 每份副本各带 1 条 `no-control-regex` oxlint 豁免注释（共 7 条），真实语义注释淹没在重复实现里。

## Decision

1. **py 兼容小件共享单源化**（splitLines/pyStrip 折叠进共享 import 件，`no-control-regex` 豁免随之收敛）。**落点现为 `scripts/pypara.mts`**（原落点 mdref 已收窄回链接/锚点域）——落点迁移见 [pypara 归口批](2026-09-10-pypara-fold-responsibility-split.md)；本决定的方法（行为等价差分归口）不变。
2. **四件消费方删除本地 split/pyStrip 副本**，统一 `import { pyStrip, splitLines } from "./pypara.mts"`；调用点更名对齐（`splitlines`/`splitPyLines`/`pySplitlines` → `splitLines`）。
3. **行为零变化**：cookbook 的 `splitPyLines` 换成语义更严的 `splitLines`（剔尾部空行）——其调用点本就逐行处理、空行无害跳过，无行为影响。各消费方 `--self-test` 夹具原样保留，为判据漂移护栏。
4. **豁免注释收敛**：副本删除后 `no-control-regex` 豁免自 7 条减至 3 条；其中承载 splitLines/pyStrip 真实语义的 2 条随体落在 `pypara.mts`（mdref 不再持有），review-brief 1 条为独立 `isspace` 语义。

## Alternatives considered

- **维持各件本地副本**：落败——四份等价实现 + 一份分叉实现各带一条豁免注释，语义单源化收益（改一处、防漂移）明显高于删 34 行的成本；分叉副本是未来判据漂移的雷。
- **把 pyStrip 留在调用方、只折叠 splitLines**：落败——pyStrip 三份也完全一致且共用 `no-control-regex` 豁免面，半折叠留一半漂移面。
- **新开独立 primitives.mts 而非并入 mdref**：当时落败（mdref 已是门禁族共享 import 件，再开一件徒增 import 面）——该落点选择后由 [pypara 归口批](2026-09-10-pypara-fold-responsibility-split.md) 翻案：独立件胜出（域名单一 > 文件数少），本件方法与结论（副本折叠）不受影响。

## Consequences

- **采用面**：`scripts/pypara.mts`（splitLines/pyStrip 单源落点 + 头注）、`scripts/mdref.mts`（收窄回链接/锚点域）、`scripts/verify-adr-format.mts` / `verify-cookbook.mts` / `verify-gene-format.mts` / `verify-handoff-structure.mts`（副本删除 + import + 调用点更名）。
- **行为面**：四消费方输出逐字节不变（差分探针 n=23 + 各 self-test 夹具原样绿）；豁免注释 7→3。
- **共享件消费契约**：新增导出即新增共享面——共享件（mdref / pypara）头注均载约束「新增导出须同时更新消费方与夹具」。
- **判据漂移护栏**：各件 `--self-test` 夹具不动；折叠后若共享件（pypara）小件语义漂移，消费方夹具会拦。
