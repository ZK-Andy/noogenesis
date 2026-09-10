# Agent Note: FULL 触发判定的精度修复——产品源码入路径面 + 自诺判定锚定 Status 行

Status: implemented
Review: FULL/2026-09-11/pending

Related: 判据单源 [review.md](../../../../docs/method/review.md) §1；闸件 [verify-review-tier](../../../../scripts/verify-review-tier.mts)；触发本件的实例 [技能触点提醒触发面扩面](../architecture/2026-09-11-skill-guard-trigger-faces.md)（机械档读 LIGHT 而语义判据判 FULL）；立闸门槛 [发现机械化](2026-09-11-review-finding-mechanization.md) Decision 1（判据稳定即立、须先实测噪声）；载体事实 [2026-09-05-review-mechanical-gate](2026-09-05-review-mechanical-gate.md)（其 Decision 1 的触发集手抄副本改指针）。

## Problem

同一函数里两处判定精度不足，方向都在 fail-closed 一侧（只会多判 FULL），但都会把「不该重审的批次」或「被误读的文档」判进 FULL：

- **产品源码不在路径面**：本仓产品源码 = `engine/**`（引擎 + 门禁白名单 `engine/gates.json`）与 `adapters/**`（随包发布的插件本体），`FULL_TRIGGERS` 不含二者；`review.md` §1 的措辞（「`src/**`/`tests/**` 之外的契约口径」）自源仓继承，本仓无 `src/`、`tests/` 目录。**实测实例**：技能触点提醒触发面扩面批（2026-09-11，commit `b8fd262`）改 `config` schema 并新增可观察行为（advice 行），机械档读 LIGHT——push 前 `--enforce` 无需任何评审证据即放行；定档实际靠人按语义判据（§1「改跨边界契约：配置 schema」+「增删改可观察副作用」）判 FULL，无人守住时该类变更无证据即可 push。
- **自诺判定是整文件子串搜索**：`adrCommitsFull`（proposed ADR 自诺强制 FULL）判「正文含 proposed 状态词面」+「含三重审核词面」即命中——**引用**这两个词面的任意 ADR 都会被判 FULL。**实测实例**：本件 ADR（Status 为 implemented）在 Alternatives 里复述该机制，本批 `verify-review-tier` 输出的三条 trigger 之一即 `adr-promises-full`；即一份讨论该机制的文档被读成「承诺三审的提案」。
- **历史面**（n=296 提交单仓全史实测，2026-09-11 测得）：触产品源码 64（21.6%），其中 38 已由现触发集搭车命中（同批触 `scripts/**`、`docs/method/**`、AGENTS.md 等）；**仅产品源码 = 26（8.8%）**，这 26 中 20 触实质产品文件（bug fix / 特性 / 评审收口），6 为纯文档或夹具面（`adapters/dsh/README.md`、`*/selftest.*`、随批 ADR）。相邻洞：`engine/gates.json` 单触在现触发集下同样读 LIGHT（历史 9 笔均搭车，故未暴露）。

## Decision

1. **`FULL_TRIGGERS` 增两条 `behavior-surface`**：`parts[0] === "engine"`、`parts[0] === "adapters"`——顶层目录判据（非任意深度同名段），与既有路径面同粒度（`scripts/**` 同为整目录）。
2. **`review.md` §1 行为契约面口径按本仓改写**：本条即本仓产品源码 `engine/**` + `adapters/**`（本仓即引擎与插件本体，其变更即行为契约面），并删去源仓遗留的 `src/**`/`tests/**` 措辞（本仓无此二目录）。
3. **自诺判定锚定 Status 行**：`adrCommitsFull` 的 proposed 判定改为行首锚定，不再对整文件做子串搜索；「三重审核」词面判定保持（承诺句可落在正文任意处）。
4. **夹具同步**：`engine/**` 与 `adapters/**` 各一条 FULL 判级夹具 + 一条精度夹具（`docs/research/` 下含同名段的路径不触发）+ 一条 implemented ADR 正文提及两词面不判 FULL 的夹具。
5. **既有取舍不动**：语义判据仍人工；evidence 契约（Review 行形态、搭车防线、fail-closed 方向）与本件的 `--enforce` 语义不变。

## Alternatives considered

- **只修产品源码路径面，自诺 FP 另立一批**：落败——同一函数、同一决定对象（什么进 FULL 档），且 FP 由本件自身实例暴露；拆两批要付两次评审成本，还留下「写文档讨论机制就会被判 FULL」的已知误判。
- **只加 `engine/**`**（引擎是产品本体，适配层只是宿主胶水）：落败——适配层就是随包分发的插件本体（`files` 白名单、工具注册、在环拦回、技能 provider 都在其内），漏它等于留着同一类逃逸面。
- **排除 `*/README.md` 与 `*/selftest.*` 以收窄触发集**：落败——适配层 README 是契约单源、`selftest.mts` 是行为契约的夹具面（断言即契约），排除二者反向弱化保护；为 6/296 的过度触发引入文件级例外不划算。
- **把语义判据（async/生命周期/副作用）也机械化**：落败——语义判断机器给不出必报失败（HERO 判据）；路径近似是本仓可机械的那一部分。
- **`adrCommitsFull` 整件删除**（自诺路线整体不要）：落败——它是「ADR 自己承诺的 tier 优先」这一条独立决定，删除会让显式自诺失效；本件只修它的判定精度。
- **把 `package.json` / `manifest.json` 一并纳入**：落败——发版流（`chore(release)` bump + lock 同提交）会被强制 FULL，而发布面不变量已有 `verify-package-invariants` 机器面；`manifest.json` 是 `gen-manifest` 生成物。

## Consequences

- **过度触发上界**（实测）：产品源码面 6/296 提交（2.0%），形态 = 纯文档/夹具面；处置走既有出口——搭同批 ADR，或加一枚最小 process 笔记。
- **发版流不受影响**：历史 `chore(release)` 提交触产品源码 = 0（bump/lock/README 不在两条路径内）；CI 的 `verify-review-tier --since event.before --enforce` 语义不变。
- **词面判定的固有边界**：自诺判定的 proposed 判定已锚定行首，但「三重审核」仍是词面搜索——讨论用词与承诺用词无法区分；判据现态由夹具钉住，语义面留评审。
- **口径同步义务**：本条与 `review.md` §1 同变更维护——该节明载「触发集与本节口径漂移即违约」；2026-09-05 闸件 ADR 的触发集手抄副本改为指针（同一事实不再两处维护）。
- **覆盖盘点**：机械档位的覆盖面现态单源 = 脚本 `FULL_TRIGGERS`（本条不手抄条目集——手抄副本正是本件修掉的漂移源）。
