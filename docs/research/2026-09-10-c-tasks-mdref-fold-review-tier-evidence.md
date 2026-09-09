# 2026-09-10 C 类随手候选批：mdref 共享件折叠 + review-tier 证据继承修复

> 状态：实现计划（非决策文档；结论落两枚 ADR）。触发 = HANDOFF-todos（C）两条：L44 mdref 共享件副本折叠、L45 verify-review-tier 证据继承弱点。
> 本批为 `scripts/**` 门禁判据改动 = FULL 触发路径 → 需 FULL 三重审核 + 证据。

## 任务 A：mdref 共享件副本折叠

### 现状盘点（实证）

| 文件 | 本地副本 | 与 mdref.splitLines 等价性（差分探针 n=23 边界用例） |
|---|---|---|
| scripts/mdref.mts | `splitLines`（原语库，已有 3 个 import 消费者） | 基准 |
| verify-adr-format.mts | `splitlines`（手工扫描）+ `pyStrip`（PY_STRIP_RE） | 完全等价 |
| verify-cookbook.mts | `splitPyLines`（String.split 无尾部空行剔除） | **分叉**：尾换行多 `""` 元素；调用点（scan 逐行循环）跳过空行 → 无行为影响 |
| verify-gene-format.mts | `pySplitlines`（matchAll）+ `pyStrip`（PY_SPACE） | 完全等价 |
| verify-handoff-structure.mts | `pySplitlines`（split+pop）+ `pyStrip`（PY_WS） | 完全等价 |

- `pyStrip` 三份副本空白集逐字符一致（含 `\x85`、`\x1c-\x1f`、`\u00a0`、`\u1680`、`\u2000-\u200a`、`\u2028\u2029\u202f\u205f\u3000`）→ 可安全归口。
- 现有 mdref 消费者：verify-review-brief / verify-review-tier / verify-skill-format / verify-md-links（4 个已 import splitLines / checkRelativeLinks）。

### 动作

1. `scripts/mdref.mts`：增补 `pyStrip` 导出（JSDoc 契约：Python `str.strip()` 空白集等价），与 splitLines 同哲学（py 兼容小件单源化）。
2. 四件消费方删除本地 split/pyStrip 副本，改 `import { pyStrip, splitLines } from "./mdref.mts"`。
3. 调用点改名：adr `splitlines(`→`splitLines(`；cookbook `splitPyLines(`→`splitLines(`；gene `pySplitlines(`→`splitLines(`；handoff `pySplitlines(`→`splitLines(`。
4. 收益：删 4 处实现 + 7 条 `no-control-regex` 豁免 → 归口后剩 3 条（mdref 内 2 条承载 splitLines/pyStrip 真实语义 + review-brief 1 条为独立 isspace 语义；实装逐文件清点）。
5. 判据面：所有夹具照旧（行为等价），新增 splitLines/pyStrip 边界夹具已在差分探针实证。

## 任务 B：verify-review-tier 证据继承弱点

### 现状

`evidenceInChange`（L217-239）：变更集内**任一** implemented ADR 头部带合法 Review 行即放行。`--since` 范围 = base..HEAD 全部提交——若本批同时触碰了**上一批已评审的 ADR**（改动它的 Consequence 或伴随提交），旧 ADR 的 Review 行就会给本批全新 FULL 变更搭车（HANDOFF-todos L45 实证：c2 ADR 未加证据行时 `--enforce` 已过）。

### 修法（实装口径，2026-09-10 定稿）

- 证据须由本变更集**引入**（diff 内为新增行 / ADR 整文件新增）——旧已评审 ADR 的历史 Review 行不算本批证据，关闭搭车洞。
- 三种模式各自 diff：stagedOnly→`--cached`、since→`<base>..HEAD`、默认→`HEAD`（覆盖 staged+unstaged）；未跟踪 ADR（默认模式）整文件视为引入。
- **范围 = 累积 diff，非单 commit**：`--since` 用 `<base>..HEAD` 累积视图——本仓真实批次序里证据行常由**收口 commit** 补加（先例 `d4b8aa2` 翻转无证据 → `1b6c25b` 补 Review 行），单 commit 粒度会误伤真实批次序；范围内任一 commit 补加即算（ADR Decision 3 + fixture 13 钉死）。
- 新增夹具：范围内历史已评审 ADR + 本批新 FULL 变更（仅触碰旧 ADR 不加 Review 行）→ 必须拦；范围内跨两 commit 补 Review 行 → 放行。fixtures 12→14。

## 验证

1. 差分探针（n=23 边界用例）证明 split 归口等价——已完成。
2. 全门禁 self-test + tsc typecheck + oxlint。
3. `scripts/change-scope.mts` 收窄检查 + 全门禁绿。
4. FULL 三审（R1 简化 / R2 代码 / R3 ADR）+ 简报 + 裁决收口。