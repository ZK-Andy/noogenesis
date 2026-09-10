# Agent Note: FULL 触发判定的精度修复——产品源码入路径面 + 自诺判定同源

Status: implemented
Review: FULL/2026-09-11/R1=ok R2=ok R3=ok

Related: 判据单源 [review.md](../../../../docs/method/review.md) §1；闸件 [verify-review-tier](../../../../scripts/verify-review-tier.mts)；触发本件的实例 [技能触点提醒触发面扩面](../architecture/2026-09-11-skill-guard-trigger-faces.md)（机械档读 LIGHT 而语义判据判 FULL）；立闸门槛 [发现机械化](2026-09-11-review-finding-mechanization.md) Decision 1（判据稳定即立、须先实测噪声）；载体事实 [2026-09-05-review-mechanical-gate](2026-09-05-review-mechanical-gate.md)（其 Decision 1 的触发集手抄副本改指针）。

## Problem

同一函件里两处判定精度不足，方向都在 fail-closed 一侧（只会多判 FULL），但都会把「不该重审的批次」或「被误读的文档」判进 FULL：

- **产品源码不在路径面**：本仓产品源码 = `engine/**`（引擎 + 门禁白名单 `engine/gates.json`）与 `adapters/**`（随包发布的插件本体），`FULL_TRIGGERS` 不含二者；`review.md` §1 的措辞（「`src/**`/`tests/**` 之外的契约口径」）自源仓继承，本仓无 `src/`、`tests/` 目录。**实测实例**：技能触点提醒触发面扩面批（commit `b8fd262`）改 `config` schema 并新增可观察行为（advice 行），机械档读 LIGHT——push 前 `--enforce` 无需任何评审证据即放行；定档实际靠人按语义判据（§1「改跨边界契约：配置 schema」+「增删改可观察副作用」）判 FULL，无人守住时该类变更无证据即可 push（旧脚本对 `b8fd262^..d862440` 实判 LIGHT，可复现）。
- **自诺判定是整文件子串搜索**：`adrCommitsFull`（proposed ADR 自诺强制 FULL）判「正文含 proposed 状态词面」+「含三重审核词面」即命中——**引用**这两个词面的任意 ADR 都被判 FULL，围栏代码块里列 0 的引文同样命中。**复现**：把该判定还原为整文件子串搜索，夹具 6b/6c（implemented ADR 正文/围栏引文提及两词面 + LIGHT 变更）即变红——即一份讨论该机制的文档被读成「承诺三审的提案」。
- **历史面**（n=296 提交单仓全史实测，2026-09-11 测得；**搭车口径 = 改前的路径触发集**）：触产品源码 64（21.6%），其中 38 已由改前触发集搭车命中（同批触 `scripts/**`、`docs/method/**`、AGENTS.md 等）；**仅产品源码 = 26（8.8%）**，这 26 中 20 触实质产品文件（bug fix / 特性 / 评审收口），6 为纯文档或夹具面（`adapters/dsh/README.md`、`*/selftest.*`、随批 ADR）。相邻洞两处：`engine/gates.json` 单触在改前触发集下同样读 LIGHT（历史 9 笔均搭车，故未暴露）；`cordis.patch.yml`（在 `package.json` 的 `files` 白名单内的装载补丁面）3 笔历史提交全部同触 `adapters/**`、独立漏网 0 笔——判据稳定、增量发射 0，故一并纳入。

## Decision

1. **`FULL_TRIGGERS` 增三条 `behavior-surface`**：`parts[0] === "engine"`、`parts[0] === "adapters"`（顶层目录——既有条目的 `parts.includes` 面同名段任意深度，本两条更窄，方向是精确化而非放松）与 `name === "cordis.patch.yml"`（装载补丁面，与 `lefthook.yml` 同形）。
2. **`review.md` §1 口径按本仓改写**：行为契约面一条即本仓产品源码 `engine/**` + `adapters/**`（含门禁白名单 `engine/gates.json`），删去源仓遗留、本仓并不存在的 `src/**`/`tests/**` 措辞；同节「门禁判据本身」条的 `.githooks/**` 死指针同步为现行钩子面 `lefthook.yml`（B3 起）。
3. **自诺判定与证据判定同源**：新增 `adrHeadStatus`（ADR 头部 15 行窗口、围栏代码块内的行不算、取状态词），`adrCommitsFull` 与 `evidenceInChange` 共用它——同一文件的状态只有一处判定，不再出现「一处判提案、一处当 implemented 证据」。
4. **夹具同步**：`engine/**`、`adapters/**`、`cordis.patch.yml` 各一条 FULL 判级夹具 + 一条精度夹具（`docs/research/engine/x.md` 一类深层同名段路径不触发，可区分 `parts[0]` 与 `parts.includes` 两形态）+ 一条围栏引文夹具（implemented ADR 的代码块引 `Status: proposed` + LIGHT 变更不判 FULL）。
5. **既有取舍不动**：语义判据仍人工；evidence 契约（Review 行形态、搭车防线、fail-closed 方向）与本件的 `--enforce` 语义不变。

## Alternatives considered

- **只修产品源码路径面，自诺 FP 另立一批**：落败——同一函数、同一决定对象（什么进 FULL 档），且 FP 由本件自身暴露；拆两批要付两次评审成本，还留下「写文档讨论机制就会被判 FULL」的已知误判。
- **只加 `engine/**`**（引擎是产品本体，适配层只是宿主胶水）：落败——适配层就是随包分发的插件本体（`files` 白名单、工具注册、在环拦回、技能 provider 都在其内），漏它等于留着同一类逃逸面。
- **排除 `*/README.md` 与 `*/selftest.*` 以收窄触发集**：落败——适配层 README 是契约单源、`selftest.mts` 是行为契约的夹具面（断言即契约），排除二者反向弱化保护；为 6/296 的过度触发引入文件级例外不划算。
- **把语义判据（async/生命周期/副作用）也机械化**：落败——语义判断机器给不出必报失败（HERO 判据）；路径近似是本仓可机械的那一部分。
- **`adrCommitsFull` 整件删除**（自诺路线整体不要）：落败——它是「ADR 自己承诺的 tier 优先」这一条独立决定，删除会让显式自诺失效；本件只修它的判定精度。
- **把 `package.json` / `manifest.json` 一并纳入**：落败——发版流（`chore(release)` bump + lock 同提交）会被强制 FULL，而发布面不变量已有 `verify-package-invariants` 机器面；`manifest.json` 是 `gen-manifest` 生成物。

## Consequences

- **过度触发上界**（实测，改前口径）：产品源码面 6/296 提交（2.0%），形态 = 纯文档/夹具面；处置走既有出口——搭同批 ADR，或加一枚最小 process 笔记。
- **发版流不受影响**：历史 `chore(release)` 提交触产品源码 = 0——它们只动根 README / `package.json` / lock；`adapters/dsh/README.md` 虽在 `adapters/**` 内，不在发布提交面。
- **词面判定的固有边界**：状态取自头部窗口且围栏内不算（正文别处的状态词面引文不再命中）；「三重审核」仍是全文词面搜索——讨论用词与承诺用词无法区分。判据现态由夹具钉住，语义面留评审。
- **口径同步义务**：本条与 `review.md` §1 同变更维护——该节明载「触发集与本节口径漂移即违约」；[2026-09-05 闸件 ADR](2026-09-05-review-mechanical-gate.md) 的触发集手抄副本改为指针（条目现态单源 = 脚本 `FULL_TRIGGERS`，§1 为语义面家，二者同变更维护）。
- **覆盖盘点**：机械档位的覆盖面现态单源 = 脚本 `FULL_TRIGGERS`（本条不手抄条目集——手抄副本正是本件修掉的漂移源）。
- **判级时刻**：只发生在三个 git 时刻（`--staged` / `--since` / 默认工作树）；已提交历史不重分类。
