# 代码规范（code-standards）

> Provenance：自建（2026-09-08，立项 ADR [2026-09-08-coding-standards](../../.agents/notes/implemented/architecture/2026-09-08-coding-standards.md)）；基准 = 蒸馏社区权威 TS 规范（Google TS Style Guide / oxlint 推荐规则集）为本仓子集 + 本仓专属例外；方法与纪律对齐 [standard-authoring](standard-authoring.md)。
> 档位标注 `[M]` / `[W]` / `[I]` / `[R]`，定义与机制单源见 [standard-authoring](standard-authoring.md) §1；机器强制面集中 §6。

## 1. 强制力度分档

档位定义与机制单源 = [standard-authoring](standard-authoring.md) §1（机器拦 / 工具警告 / IDE 提示 / 留评审）。本文件每条规则标注档位并写明**为什么停在这档**——停档理由本身是可复审的决定；能升档就升档，路径集中 §6。

## 2. 注释规范（主要内容）

> 本节是注释判据与写法的家（自 [noo-prose-standard](../../.agents/skills/noo-prose-standard/SKILL.md)「按位置」节收编，该技能代码注释条目改指此处）；散文铁律（每事实一个家/写当前状态/禁变更史）见 [doc-standards](doc-standards.md) §2，注释是代码里的散文，同样适用。

### 2.1 公共 API 契约注释 `[M]`（存在性）/ `[R]`（内容）

停档理由：导出函数/类的注释**存在性**机器可判（`export-docs` 闸）；注释是否说清契约是语义面，机器不可判。

- 机器面：`adapters/dsh/` + `scripts/` 的**导出函数/类声明**必须有紧邻 `/** */` 块（[verify-export-docs.mts](../../scripts/verify-export-docs.mts)）；两种导出形态（声明修饰符 / 文件尾 `export { }`）都认，重载组一份注释即可；类型/接口/常量不判——契约常由类型自身承载，强制注释产 slop。
- **`engine/` 不在闸内**：其导出是引擎内部接缝（适配层只 spawn CLI、不 import），公共契约 = CLI（[engine/README.md](../../engine/README.md)）；内部注释沿用 `//` 块（engine 约定）。
- **契约** = 调用方/被调方/实现者所依赖的义务、不变量、前置/后置条件、兼容承诺（prose-standard 定义）。
- **必须注释**（代码/类型本身说不出的契约）：返回区别、抛出/拒绝、副作用、所有权、时序、取消、持久性——调用方可见即算公共。
- **判别式**：删掉这段注释，调用方能否安全使用而不踩坑？能 → 不必注释；不能 → 必须注释。
- **不写**：签名已表达的（参数名自明的不用重复）、内部实现细节对调用方无意义者。
- 实例（本仓）：`engine/bin.ts` 头注声明 CLI 合同面（五命令 + 退出码三档）——退出码语义是调用方契约，必须写。

### 2.2 内部注释 `[R]`（升档见 §6）

停档理由：局部复杂度需语义判断，机器不可判。

- **只注释**：非局部结构（跨文件状态、调用时序）与明显复杂的局部结构——不变量、竞态顺序、所有权、安全边界、意外失败行为。
- **禁止注释**：控制流叙述（`// 循环遍历每个基因`）、代码复述（`// 加 1`）、显而易见处（`// 检查是否为空`）。
- **判别式**：注释说的事，代码 + 类型 5 秒内能否看出？能 → 删注释（噪声）；不能 → 保留。

### 2.3 注释不写什么（slop 治理）`[M]`（TODO/FIXME/XXX 词面）/ `[R]`（其余）

停档理由：`TODO`/`FIXME`/`XXX` 词面由 `no-warning-comments`（`location: anywhere`）机器拦；变更史/叙事与「答辩腔」的语境判定需人。

承接 [doc-standards](doc-standards.md) §3 slop 清单 + [noo-trim-cot-leakage](../../.agents/skills/noo-trim-cot-leakage/SKILL.md)，注释**禁止**：
- 变更史/叙事（`previously` / `now` / `renamed` / PR 号 / 提交哈希叙事）——只进 commit/ADR；
- 推理过程转写（决策复盘、多步推导）——需要留痕进 ADR，不在代码里写小说；
- 实现状态标注与待办：`TODO` / `FIXME` / `XXX` 机器拦（任意位置）；`future:` / `implemented!` 一类状态词留评审（无机器判据，需显式登记才拦）；跨会话遗留进 [HANDOFF-todos](../../HANDOFF-todos.md)；
- 满屏强调/答辩腔/给评审看的解释（prose 同款纪律）。

### 2.4 格式约定 `[R]`

停档理由：白名单无注释形态/语言类判据（oxlint 无此规则；为它上 jsPlugin 不成比例），逐条按字面人工可判，留评审。
- 头注 = 每文件首个注释块：一句话职责 + 关键契约/纪律指针 + 归属 ADR（如有）；`//` 与 `/** */` 两形态并存（仓内现状），不长篇叙事。
- 声明级契约注释：`adapters/dsh/` + `scripts/` 用 `/** */`（JSDoc 面，与 2.1 闸口径一致）；`engine/` 沿用 `//` 块（内部接缝约定）。
- 行内说明用 `//`。
- 中文单语（与正文一致）；代码标识符/术语保留英文。
- 注释与代码同行不尾随（尾随注释留给真须强调的例外），上方独立行优先。
- 判别式：逐条按字面可判——头注三要素缺一、尾随注释、中英混杂即违反。

## 3. 命名与结构 `[R]`（判别式；机械可判子集已由 lint 接管）

停档理由：命名意图与职责边界需语义判断，机器不可判。机械可判子集 = 未用变量（`no-unused-vars`，`_` 前缀豁免）与 `as const`（`typescript/prefer-as-const`），已由 [lint 白名单](../../.oxlintrc.json) 强制。

- **命名揭示意图而非类型**：`signals`（是什么）优于 `arr`（是什么类型）；布尔用 `is`/`has`/`can` 前缀；动词开头 = 函数，名词 = 数据。判别式：读名不知其意 = 改名，不是加注释。
- **一个函数一个职责**：能说出「它做什么」一句话；说不出的拆。判别式：函数名含 `and` = 拆。
- **文件组织**：一个文件一个主题模块；公共符号集中在文件顶部导出；内部 helper 放下方或独立件（scripts 门禁族显式 `.mts` 扩展 import 纪律见 [scripts/AGENTS.md](../../scripts/AGENTS.md)）。
- **闭集常量**：魔法数字/字符串必须命名常量；封闭集用 `as const` 数组（实例：`adapters/dsh/mount-policies.mts` 的 `SUBTREE_AGENTS`）；需收窄为联合类型时以 `typeof SUBTREE_AGENTS[number]` 派生（本仓暂无消费实例，不作硬性要求）。

## 4. 工程纪律（链接，不重抄）

> 本仓专属硬约束已有家，此处只放链接（每事实一个家，防双写漂移）。

| 纪律 | 家 |
|---|---|
| 引擎零第三方依赖 / CLI 合同面 / 退出码三档 / gates.json 白名单 / 入档原子性 | [engine/AGENTS.md](../../engine/AGENTS.md) + [engine/README.md](../../engine/README.md) |
| 适配层单向依赖 / 防火墙允许集 / 宿主依赖收敛 index.mts / 接线自测 | [adapters/AGENTS.md](../../adapters/AGENTS.md) + [adapters/dsh/README.md](../../adapters/dsh/README.md) |
| 门禁 `--self-test` 夹具纪律 / gates.json 登记 / TS 单轨 import 形态 | [scripts/AGENTS.md](../../scripts/AGENTS.md) |
| 宿主合同形状（`exec.arguments` 非 `exec.args` 教训） | [bug-fix ADR 2026-09-08-mount-exec-arguments-field](../../.agents/notes/implemented/bug-fix/2026-09-08-mount-exec-arguments-field.md) |
| TS 两族 import 形态分野（源跑 .mts vs dist 跑 .ts） | [B2 ADR](../../.agents/notes/implemented/architecture/2026-09-08-b2-engine-adapter-ts.md) |

## 5. 评审清单兜底

本节「留评审」档条目（2.1–2.4、3）已列入根 [AGENTS.md](../../AGENTS.md)「评审检查项」第 4 条（兜底清单单源在根 AGENTS，机制见 [review.md](review.md) §5）；评审代理按其核对本节判别式在 diff 面是否被违反。升档路径见 §6。

## 6. 机器强制面

> 判据单源 = [.oxlintrc.json](../../.oxlintrc.json)（lint 显式白名单，逐条规则写明理由）+ [verify-export-docs.mts](../../scripts/verify-export-docs.mts)（导出面注释存在性）；挂载单源 = `engine/gates.json` 的 `lint` / `export-docs` 两条（pre-commit/pre-push/CI 消费同一清单）。立项与取舍见 [c2 ADR](../../.agents/notes/implemented/architecture/2026-09-08-c2-lint-enforcement.md)。

- **已升档**：2.1 存在性 `[M]`（export-docs）；2.3 词面 `[M]`（`no-warning-comments`）；§3 未用变量 / `as const` `[M]`（`no-unused-vars` / `typescript/prefer-as-const`）。
- **仍留评审**：2.1 内容质量、2.2 内部注释、2.4 格式约定、§3 命名意图与职责边界——语义判断，机器不可判（理由见各条停档理由），兜底在根 [AGENTS.md](../../AGENTS.md)「评审检查项」第 4 条。
- **未纳入（有触发条件再立）**：type-aware 规则（`oxlint-tsgolint`）与 `no-explicit-any` / `no-non-null-assertion`——本仓当前无对应失败类，改造量属重构批次；触发 = 真实 async 失守或类型逃逸缺陷出现。
