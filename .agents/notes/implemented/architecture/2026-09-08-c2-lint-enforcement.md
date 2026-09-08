# Agent Note: C2 编码规范机器强制——oxlint 显式白名单 + 导出面契约注释闸

Status: implemented
Review: FULL/2026-09-08/R1=ok R2=ok R3=ok

## Problem

- c1（[2026-09-08-coding-standards](2026-09-08-coding-standards.md)）把编码规范成文单源，但规范仍是「自觉面」：门禁清单零 lint/format，仅 `ts-typecheck` 兜类型层；c1 §6 明列 c2 义务 = oxlint 接入 + 公共 API 注释机器强制 + 能升则升。
- 形态未定，且类目全开不可行（n=1 全仓跑 39 文件，2026-09-08；【探索性】）：correctness+suspicious+perf 全类目报 80 条，其中 `unicorn/no-array-sort` 35 + `consistent-function-scoping` 14 属风格偏好；同轮抓出 9 条真实死代码（未用 import/变量）——失败类与口味混杂，需显式白名单分离。
- 导出面注释无判据：68 个导出声明中 56 带 JSDoc、缺 12（其中函数/类 5），回归无拦。
- c1 的 `TODO(<owner>):` 格式约定与仓库实际纪律冲突：跨会话遗留的唯一落点是 [HANDOFF-todos](../../../../HANDOFF-todos.md)，代码内不应留待办。
- 下列单轮数字同为 n=1 全仓扫快照（2026-09-08，【探索性】；设置 = oxlint 1.82.0 + 本仓白名单 / TS 编译器 API 统计），非多次测量。

## Decision

### D1 显式白名单，不类目全开

- devDependency `oxlint` 精确钉版 `1.82.0`（规则集稳定性；`^` 会让 CI 随 minor 漂移）。companion `oxlint-tsgolint`（type-aware）不引（见 Alternatives）。
- 仓库根 `.oxlintrc.json` = 判据单源：`categories.correctness: "off"` + 显式规则清单，**逐条写明理由**；`options.reportUnusedDisableDirectives: "error"`（失效的 disable 注释 = 判据漂移，当错处理）。忽略面不重复声明（`.gitignore` 已覆盖，oxlint 默认尊重）、`env.builtin` 不写（schema 默认值且无消费规则）——R1 评审收口。
- 启用面 = 明确错误类 + 代码卫生 + 注释词面 + TS 可判定面（清单见该文件）。不启用并记录理由：`no-array-sort` / `consistent-function-scoping`（风格偏好）、`no-await-in-loop`（顺序 CLI 有意）、`no-non-null-assertion`（base 131 / HEAD 132 处，`noUncheckedIndexedAccess` 下的本仓 idiom）、`no-explicit-any`（31 处 JSON 边界，迁移 `unknown` 另案）。
- `no-control-regex` 启用 + 7 处逐行 `oxlint-disable-next-line` 带理由（py 边界集校验器有意匹配控制字符）；`no-duplicate-imports` 配 `allowSeparateTypeImports`（值/类型分行 import 是本仓形态，B2 起）。

### D2 门禁挂载与自证

- `scripts/verify-lint.mts`：定位 `node_modules/oxlint/bin/oxlint` 与 `.oxlintrc.json`（缺任一 fail-closed exit 2），固定 `--config` + `--deny-warnings` 调用；`--self-test` 夹具证明干净必绿、`no-var` 违规必红。
- `engine/gates.json` 加 `lint` 条目 → pre-push/CI 经 `gates.mts --run` 自动覆盖；`lefthook.yml` pre-commit 加同闸（全仓 80ms 级，快检零负担）。
- 与 `ts-typecheck` 的差别：tsc 判据是第三方语义（无夹具先例），lint 判据是本仓配置数据——配置腐烂是真实失败模式，故配夹具。

### D3 导出面契约注释闸

- `scripts/verify-export-docs.mts`：TS 编译器 API 解析 `adapters/dsh/` + `scripts/`，**导出函数/类声明**必须紧邻 JSDoc（`ts.getJSDocCommentsAndTags`）；两种导出形态（声明修饰符 / 文件尾 `export { }`）都认，重载组一份注释即可，任一根缺失 fail-closed。类型/接口/常量不判——契约常由类型自身承载，强制注释产 slop（2.1 判别式）。`engine/` 不入闸：其导出是引擎内部接缝（适配层只 spawn CLI、不 import），公共契约 = CLI（engine/README.md），内部注释沿用 `//` 块——R1 评审 Blocker 收口。
- 清账：导出面契约注释 4 处到位（`validateConfig` / `apply` / `registerNooTools` 新增；`runEngineSync` 既有 JSDoc 从常量上移到函数使归属成立）；`verify-adr-format.mts` 的 `splitlines` 导出无消费方 → 去导出（死面）。
- `no-warning-comments` 承接 2.3：代码内禁 `TODO` / `FIXME` / `XXX`（`location: anywhere`——默认 `start` 漏 `/** TODO */` 与行中词面，R2 评审实证），待办进 HANDOFF-todos（替代 c1 的 `TODO(<owner>):` 约定）。

### D4 真实缺陷清账（本批）

- 19 处可修缺陷全修：9 未用符号、4 多余转义、3 变量遮蔽、1 丢 `cause`、1 可 `const`、1 重复 import 合并；7 处控制字符正则逐行豁免带理由。改后 `lint` 零违规、`tsc` 零错、engine/adapter self-test 全过。

### D5 标准与接线同步

- [code-standards](../../../../docs/method/code-standards.md)：2.1 存在性升 `[M]` / 内容留 `[R]`；2.3 词面升 `[M]`；§3 机械子集（未用变量 / `as const`）升 `[M]`；2.4 诚实留 `[R]`（白名单无注释形态判据，不为它上 jsPlugin）；§6 改为「机器强制面」现状节。
- `scripts/AGENTS.md` 加 lint / export-docs 条目；根 [AGENTS.md](../../../../AGENTS.md)「评审检查项」第 4 条同步机器面扩大；CI self-test 列表加两件。

## Alternatives considered

- **类目全开（`-D all`）**：落败——80 条里 ~49 条风格偏好，把口味当失败类；白名单逐条留理由才是可复审形态。
- **type-aware（`oxlint-tsgolint`）**：落败——引 Go 二进制 + 全仓类型感知开销，而本仓 async 面小、无 floating-promise 失败证据（HERO-O：不为想象失败面投资）；触发 = 真实 async 失守出现。
- **`eslint-plugin-jsdoc` jsPlugin（`jsdoc/require-jsdoc`）**：落败——~15 传递依赖换一条规则，与零依赖纪律不成比例；自研件用已在场的 typescript，且能精确限定「导出函数/类」。
- **只接 oxlint、不做导出面闸**：落败——c1 §6 明列 2.1 升档义务；56/68 已合规说明约定已成、缺口可机器闭合。
- **直接 `gates.json` 跑 oxlint（不写 wrapper）**：落败——判据是仓内配置数据，无夹具则配置腐烂静默通过；tsc 先例不适用（第三方语义）。
- **强制头注单一形态**：落败——仓内 `//`（engine 十件）与 `/** */`（其余三十一件）两形态并存，机器无判据；改为 §2.4 承认两形态并存、按角色区分（头注两种皆可；声明级契约注释 `adapters/dsh/` + `scripts/` 用 `/** */`、`engine/` 沿用 `//`）。

## Consequences

- 编码规范从「成文自觉」转「成文 + 机器拦」：`lint` / `export-docs` 入 `engine/gates.json` 单源（门禁清单 13 → 15 条），pre-commit/pre-push/CI 三面同判据；机器面即刻产出（首轮 19 条可修缺陷 + 1 死导出 + 4 处契约注释缺口）。
- 新 devDependency 1 个（oxlint，精确钉版）；engine 运行时零依赖纪律不破——工具链在 scripts/ 面（B1 先例），发布包 `files` 白名单不含 scripts/。
- 档位诚实化：2.4 未升档并写明理由，2.1 只升存在性；内容质量仍靠评审（根 AGENTS 兜底第 4 条）。
- 后续触发式条目：type-aware、`no-explicit-any` → `unknown` 迁移——有失败类证据再立项。
- 评审收口（2026-09-08 FULL 三审）：R1 抓出 engine 尾部导出零覆盖（范围收窄 + 判据补两导出形态）；R2 抓出 §2.4 头注口径自相矛盾（改两形态并存）与 `no-warning-comments` 默认 `start` 漏检（改 `anywhere`）；并采纳 lint 配置去重、typescript 插件面夹具、导出面重载/缺根 fail-closed、`apply` 注释去控制流叙述等建议。未采纳：mdref `splitLines` 四份副本折叠（跨件行为面，另批）。
