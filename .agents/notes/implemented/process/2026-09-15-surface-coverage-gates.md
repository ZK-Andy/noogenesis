# Agent Note: 覆盖面静默绿治理批——自检入口与宿主 README 两侧上闸

Status: implemented
Review: FULL/2026-09-15/pending

> Related：立闸门槛单源 = [机械化 ADR](2026-09-11-review-finding-mechanization.md) Decision 1；销账口径 = [销账 ADR](2026-09-12-evolution-pool-candidate-disposal.md)；出处 = [演化轮池](../../../../HANDOFF-evolution-pool.md) 候选「CI self-test 抽查清单 ↔ `scripts/verify-*.mts`」+「新增宿主目录 ↔ 发布面清单」；落地件 = [verify-self-test-surface](../../../../scripts/verify-self-test-surface.mts) + [verify-package-invariants](../../../../scripts/verify-package-invariants.mts)；同批修复件 = [doc-budgets 缺 manifest fail-closed](../bug-fix/2026-09-15-doc-budgets-missing-manifest.md)。

## Problem

两类「声明面 ↔ 实际面」脱节都在本仓真实发生过，且门禁自己不报警：

- **自检入口漏登 CI**（批次 1 序 3 同族收口 R2 Blocker，[上闸件](2026-09-13-host-service-reads-gate.md)）：新闸 `verify-host-service-reads.mts` 是 CI「self-test 抽查」步里唯一缺席的 verify-* 件（该步行注释自称「清单与 scripts/*.mts 一一对应」），而 pre-push 只跑 `gates.mts --run` 平跑、不跑任何 `--self-test`——该件的夹具在任何消费者里都不执行。形态可枚举：validate.yml 该步 run 块的 `node scripts/<file>.mts` 集，与盘面 `scripts/*.mts` 中带自检入口的件集，应互为全集。
- **宿主目录漏登发布面**（批次 7 序 35 R2 Blocker 2，[Hermes 桥 ADR](../architecture/2026-09-14-hermes-hook-bridge.md)）：新增 `adapters/hermes/` 后 `package.json` 的 `files` 与 `REQUIRED_FILES_ENTRIES` 都没跟上，而包内 README 正指向该目录的 `README.md` / `hooks.example.yml`——文件在仓库可见、在 npm 包里缺席，发布面门禁（`verify-package-invariants`）不报警。形态可枚举：盘面每个 `adapters/<host>/README.md` 必须被 `files` 覆盖。

两类都不看语义、只看形状，符合立闸门槛（判据稳定 + 噪声实测）。

## Decision

**1. 自检入口面立闸** `scripts/verify-self-test-surface.mts`，白名单条目 `self-test-surface`——pre-push / CI 随平面清单跑，engine evaluate 白名单同步可见。判据两侧互为全集：

- 声明侧（validate.yml「self-test 抽查」步骤 run 块）：每条 `node scripts/<file>.mts` 指向的件必须实存且支持 `--self-test`；
- 实态侧（`scripts/*.mts`）：支持 `--self-test` 的件必须都在声明侧清单里。

自检支持判定 = 注释剥离后源码仍含 `--self-test` 字面量（字符串保留，故派发用的 `process.argv[2] === "--self-test"` 计入；纯注释提及不计——共享件 `mdref` / `pypara` / `srctree` 靠此排除）。无自检入口的 `scripts` 件（`change-scope` / `pre-push` / `pre-push-selftest`）自然不入集。步骤名或 run 块结构认不出 → fail-closed exit 2（判不了即拒跑）。

**2. 宿主发布面并入既有闸**：`verify-package-invariants.mts` 增判据 2c——盘面 `adapters/<host>/README.md` 必须被 `files` 覆盖。宿主清单从盘面推导，不手抄；随之把两个适配层 README 从 `REQUIRED_FILES_ENTRIES` 摘除（单源），该常量只留非适配层契约件。

**3. 覆盖面 fail-closed 与夹具**：新闸自检 = 7 组（合规 / 漏登 / 点名不存在的件 / 点名无自检入口的件 / 纯注释提及不入集 / 缺 workflow / 步骤结构认不出）；`verify-package-invariants` 夹具 18 → 20（摘除既有宿主 README、盘面新增宿主两形态）。两件都随 CI「self-test 抽查」清单消费。

**4. 噪声实测**：两闸对当前树实跑 exit 0（`self-test-surface` = 22 条 CI 声明 ↔ 22 件盘面自检入口；`package-invariants` = 20 夹具通过），两类检查在真实树上零假阳性。

**5. 销账**：本批处理掉池件两条候选（自检入口面、宿主发布面），按 [销账 ADR](2026-09-12-evolution-pool-candidate-disposal.md) 从「候选」节删除。

## Alternatives considered

- **pre-push 直接跑全部 `--self-test`**（登记问题从根上消失）：落败——钩子只做快检查、CI 拥有穷尽矩阵（根 AGENTS「Git 纪律」）；把全量夹具搬进每次 push 违背该边界。
- **在 `scripts/AGENTS.md` 写一条「新闸须同步登记 CI」纪律**：落败——该纪律的实质（清单与盘面一一对应）一直在注释里自述，仍然漏登；无机器面的纪律正是本批要治的形态。
- **自检入口面也并进 `verify-package-invariants`**：落败——判据域不同（CI 声明面 vs npm 发布面），并件让两类判据互相绑定且诊断含混；新闸可独立 fail-closed 与独立夹具。
- **宿主 README 面单开新闸**：落败——发布面已由 `verify-package-invariants` 拥有（`main` / `exports` / `files` 覆盖 / dist 关键件都在该件），单开第二个发布面闸是重复维护面。
- **手抄宿主清单常量**：落败——新增宿主即双源漂移，正是原缺陷；盘面推导即单源。
- **不立闸、继续靠评审语义面**：落败——自检漏登已由评审抓过一次且当时只补了一行；判据稳定、真树零噪声，符合立闸门槛（门槛是「噪声过关」，不是「findings 数量」）。

## Consequences

- **采用面**：[engine/gates.json](../../../../engine/gates.json)（条目 `self-test-surface`；条目集单源 = `scripts/gates.mts --list`）、[scripts/verify-self-test-surface.mts](../../../../scripts/verify-self-test-surface.mts)（新件）、[scripts/verify-package-invariants.mts](../../../../scripts/verify-package-invariants.mts)（判据 2c）、[.github/workflows/validate.yml](../../../../.github/workflows/validate.yml)（self-test 抽查清单）、[scripts/verify-doc-budgets.mts](../../../../scripts/verify-doc-budgets.mts)（同批修复件）。
- **成本护栏**：每加一条门禁 = 多一个维护面；本件的约束是判据只认形状 + 盘面推导 + 结构性 fail-closed（三处都在闸件头注里写成合同）。
- **判据外的规避形（如实记）**：自检支持靠「注释剥离后含 `--self-test` 字面量」启发式——若某非闸件把该 token 写进代码字符串会误入集（当前无此形态，触发 = 真出现该形态）；宿主 README 面只锚 README，适配层其他发布件（如 `hooks.example.yml`）仍靠 `REQUIRED_FILES_ENTRIES` 手抄，新增宿主的非 README 件漏登不在判据内（触发 = 出现第二个非 README 宿主件漏登）。
- **未覆盖**：清单内容是否**正确**（该跑的自检是否真的跑得动）仍归各件自检与 CI 实跑；本闸只判「声明面与盘面互为全集」。
- **评审收口（2026-09-15，FULL 三审）**：待收口。
