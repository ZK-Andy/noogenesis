# Agent Note: 协作层重建实现轮立项——批次方案、lefthook 钩子框架、0.2.0 切换断点

Status: proposed

Related: [2026-09-06-framework-rebuild-charter](../../implemented/architecture/2026-09-06-framework-rebuild-charter.md)（charter，本 ADR 为其协作层实现轮的立项拆解）

## Problem

charter（[2026-09-06-framework-rebuild-charter](../../implemented/architecture/2026-09-06-framework-rebuild-charter.md)，implemented）拍板协作层重建以蓝图 [framework-rebuild-blueprint](../../../../docs/research/framework-rebuild-blueprint.md) §10 C1–C15 为验收单源，但实现轮未立项：批次切分、钩子框架选型、切换断点版本未定。机器层实盘（2026-09-06）：

- **门禁协作层**：Python 13 件（verify-* ×10 + `gates.py` 发射器 + `gen-manifest.py` + `mdref.py`）+ bash 3 件（`change-scope.sh` / `pre-push-selftest.sh` / `setup-hooks.sh`）；gates.json 十条 cmd 全为 `python3`/`bash`。
- **引擎与适配层**：`engine/` 11 件 .js（CommonJS，1339 行）+ `adapters/dsh/` 9 件 .mjs（ESM）。
- **钩子与 CI**：`.githooks/` pre-commit/pre-push 两件 bash；CI 单 workflow（validate.yml）。
- **蓝图未定项三件**：`mdref.py` 归宿——实读已定：它是 `verify-md-links`/`verify-skill-format` 的共享链接原语库（import 消费，非独立工具），归宿 = 迁 TS 共享模块 `mdref.ts`，不淘汰；`setup-hooks.sh` 去向——拍板 = lefthook 内建 postinstall 取代（见 Decision）；`pre-push-selftest.sh` 四态 e2e——TS 重建为独立 e2e 件（tsx 开发态运行）。

## Proposal

**用户拍板（2026-09-06）：五批按序 B1→B5；钩子框架 = lefthook；切换批发版断点 = 0.2.0。B0 拍板（2026-09-08）：插入 B1 之前，新门禁直接 TS——批内拆解与拍板依据见 [2026-09-08-b0-framework-structure](2026-09-08-b0-framework-structure.md)。**

| 批 | 内容 | 蓝图对账 |
|---|---|---|
| **B0 框架结构面批（已拍板插入，2026-09-08）** | 四件框架结构件：子树 AGENTS.md 五件布点（C11）/ 教训层形态（postmortem 规则入门禁，C12）/ archived-notes 校验件（决策记忆层增量）/ 技能 references/ 形态规则（不实拆——noo-doc-standards 实测 198 词，无拆分需求）；新门禁直接 TS（修正原「Python 栈建」表述），最小 TS 切片（tsx + tsconfig 骨架）随本批拉前，DAG runner 仍归 B1 | C11 / C12 / §2 增量 / §3 形态 |
| B1 门禁族 TS 化 | verify-* ×10 + gates runner（TS + DAG：needs/after + 有界并行 + fail-fast + 图校验）+ `mdref.ts` + `gen-manifest`；新旧双跑对账（py 与 TS 逐件输出一致） | C1 部分 / C5 / C6 基线 / C15 评估 |
| B2 引擎+适配层 TS 化 | engine 11 件 + adapters 9 件 → TS；npm 管线 files→tsc dist | C1 / C3 / C9 / C10 |
| B3 钩子与安装面 | lefthook 分域 job 直接调 `node dist/…`（零转译）；postinstall 自动安装器；`pre-push-selftest` 四态 e2e TS 重建；`setup-hooks.sh` 退役 | C2 / C4 / C6 / C13 部分 |
| B4 挂载面接线 | A2–A6 + A8 接线（各带最小 smoke）；M1–M3 实现件（各带 HERO 判据答案）；候选门禁评估（文件名契约闸 / 上帝类预防闸） | C7 / C8 / C15 |
| B5 切换批 | gates.json cmd 重指（条目集与门禁名不变）、删 py/sh/旧 js 源、CI 面更新、发版 0.2.0（C11/C12 若 B0 未立则随本批） | C1 / C11 / C12 / C13 / C14 / C10 |

**框架结构面排序（2026-09-08 拍板）**：主线自查指认四件框架结构件原散排 B4/B5 顺带削弱「先框架」语义，用户拍板插入 B0（先于 B1），随批新门禁直接 TS；依赖挂载面的两件（流程层评审状态机化 / M1–M3 策略件）**不得先行**（A8/A6 接线先在才有落点）——该禁令不变。

**批次纪律**：每批触碰 `scripts/**` 门禁判据 = FULL 三审（tier 机械触发）；并存期（B1–B4）旧机器件保持权威执行面，TS 件以双跑对账自证，各批在事件轨标注「本批按蓝图判据」；B5 单批切换后旧机器件全量删除（charter 口径）。

**依赖面声明**：lefthook 以 devDependency 引入（npm 包，含 Go 二进制）——P1 骨架 D1「零第三方依赖」约束 engine 运行时面，不约束开发工具链（TS 统一已带 node_modules 工具链拍板，charter Decision 3）；engine 零依赖纪律不变。

## Alternatives considered

- **挂载面先行**（B4 提前）：落败——问题池根缺口（M1–M3）虽急，但缺 B1 门禁自测地基与 B2 引擎 TS 面，接线对账面弱；且守卫记录件落事件轨依赖 B2 的事件轨 TS 面。
- **引擎先行**（B2 提前）：落败——发布链路先行收益小（0.1.3 已可用），而门禁族件数最多、对账置信度最高，先清它为后续批提供最硬自测地基。
- **自研 .githooks 重写**（不用 lefthook）：落败——postinstall 自动装钩子、glob 分域 job、探针与缺失诊断全得自研，重蹈上游已踩平的坑；lefthook 是上游门禁层的已验证形态，蒸馏它不重造它。
- **0.1.x 续号**：落败——门禁实现全换属 breaking 变化，断点语义应显式；续号会让「rebuild cut」不可寻址。
- **单大批一次重建**：落败——违背 charter 分批 + 单批切换口径；批间对账是错误面收窄的手段，一次性大批把对账压力堆到切换点。

## Acceptance criteria

- 每批：FULL 三审采纳收口 + 蓝图对账表对应行转绿 + 事件轨「按蓝图判据」标注 + 门禁全绿。
- B5 后：C1–C15 全绿（C6 基线数值实测回填）；旧机器件（py/sh/旧 js 源）零残留；`noogenesis@0.2.0` 发版（tag 随钩子）。
- 每批核 C9：6 基因 + 事件轨文件 diff 为零；gates.json 条目集与门禁名至 B5 前不变。

## Risks

- 并存期长（五批）：双机器并存窗口内权威归属漂移——缓解：旧件保持权威 + 每批事件轨标注 + B5 一次收口。
- lefthook 引入第三方 devDependency：与 engine 零依赖纪律的边界须在实现 ADR 中保持显式（D1 约束 engine 运行时面，工具链面已由 TS 拍板豁免）。
- TS 对账工作量：py→TS 行为恒等逐件实证（含 self-test 夹具同迁），对账脚本为临时代码不入门禁，B5 删除。
- mdref.ts 迁移面：链接/锚点正则与 slugify 语义须逐条对齐（两消费方 self-test 同迁覆盖）。
