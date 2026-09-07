# Agent Note: B3 钩子与安装面——lefthook 分域 job、pre-push TS 编排器、bash 退役

Status: implemented
Review: FULL/2026-09-08/R1=ok R2=ok R3=ok

Related: [2026-09-06-collab-rebuild-impl](../../proposed/architecture/2026-09-06-collab-rebuild-impl.md)（五批立项，本 ADR 为 B3 批实现轮）；[2026-09-08-b2-engine-adapter-ts](2026-09-08-b2-engine-adapter-ts.md)（dist 形态与 C6 归批口径）；蓝图对账单源 [framework-rebuild-blueprint](../../../../docs/research/framework-rebuild-blueprint.md) C2/C4/C6/C13 部分

## Problem

立项 ADR B3 行只定范围（lefthook 分域 job 直接调 `node dist/…`；postinstall 自动安装器；pre-push-selftest 四态 e2e TS 重建；setup-hooks.sh 退役），实现细节未立项。2026-09-08 实盘与探针（lefthook v2.1.12 源码 + 实推，记录于 journal）：

- 钩子现状：`.githooks/pre-commit`（bash 快检，10 步含条件性三步）+ `.githooks/pre-push`（bash 全跑 + 89 行含 tag/新分支 fail-closed 档位循环）；`scripts/setup-hooks.sh`（core.hooksPath 接线）；`scripts/pre-push-selftest.sh`（四态 e2e）。
- **lefthook v2 pre-push push-files 门控（实探钉死）**：pre-push job 默认以 `git diff HEAD @{push}` 的推送文件集门控——tag 推送与新分支首推文件集为空，**全部 job 被 skip**（跳过信息 "no matching push files"，源码 `build_command.go` push-files 分支）；上游无官方恒跑出口（[discussion #504](https://github.com/evilmartians/lefthook/discussions/504)）。这对 fail-closed 档位强制是硬冲突：tag/新分支恰是四态 e2e 的 A/C 态。
- **恒跑逃生口（实探打通）**：job 级 `files: <恒输出命令>` + run 串引用 `{files}` 模板 → replacedFiles 非空 → 提前返回 push-files 门控（源码 `build_command.go` L45-48）；files 输出必须是**真实存在的路径**（`echo .` 被过滤，`echo lefthook.yml` 可行）。`use_stdin: true`（上游 [#547](https://github.com/evilmartians/lefthook/pull/547) 修 #508）实测把 git 的 pre-push stdin ref 行原样转发给 job（110 字节实测）；`{1}`/`{2}` 模板 = hook 位置参数（remote 名/URL，源码 `replacer.AddGitArgs`），手工裸调（无 GitArgs）时 `{1}` 残留字面量。
- **postinstall 行为（实探钉死）**：lefthook npm 包自带 postinstall = `lefthook install -f`（try/catch 永不炸安装；`CI` 环境自动跳过）——立项拍板「lefthook 内建 postinstall 取代 setup-hooks.sh」零自研代码成立。`core.hooksPath` 已设时 `lefthook install` 拒装并打印补跑路径（`--reset-hooks-path`）；`-f` 会把 wrapper 强写进当前 hooksPath（迁移期一次性乱相，pull 后消失）。
- **wrapper fail-open 残余风险（实探）**：lefthook wrapper 在二进制不可寻时末行 `echo "Can't find lefthook in PATH"`（exit 0）→ 钩子静默旁路；仅 node_modules 缺失可达（npm install 后恒存在）。
- 本地 npm ≥12 install-scripts 守卫默认拦 lefthook 的 postinstall（`npm install-scripts approve lefthook` 一次性放行；CI node22 自带 npm10 无此守卫）。
- C6 基线（本机 n=1 探索性，2026-09-08）：现行 pre-push 串行等价集 ≈ 6.3s（py runner 3.86s + gene-format 0.05s + engine self-test 1.75s + adapter 0.68s；B1 钉值 3.6s 系同仓另测，机器负载差异在案）；TS runner（B1 DAG runner）默认并行 2.97s，py 串行 3.86s。
- 计时归属：ts-typecheck（tsc 全仓）占 py runner 串行大头；engine self-test 1.75s 为次大头。

## Decision

**pre-commit 走 lefthook 分域 job（py 命令同今日 bash，行为零变化）；pre-push 收敛为单编排器 job 跑 `scripts/pre-push.mts`（TS 面 wholesale：stdin tier 循环 TS 端口 + 并行门禁组 + dist 自测）；postinstall 安装器 = lefthook 内建（零自研）；bash 退役面 = `.githooks/` + `setup-hooks.sh` + `pre-push-selftest.sh`（TS 重建后）。**

1. **pre-commit（分域 job）**：`parallel: true`；十步同今日 bash——whitespace（`git diff --cached --check`）/ adr-format / md-links / cookbook / doc-budgets / skill-format / handoff-structure / gene-format / archived-notes / review-tier `--staged`（报告态，exit 0 实测）。命令保持 bash 版原样（py 权威面 + B0 起 TS 原生件照旧，行为零变化），**条件性三步由 lefthook glob 表达**（adr-format `glob: .agents/notes/**`；skill-format `.agents/skills/**`；archived-notes `[.agents/notes/**, scripts/archived-notes.freeze.json]`——隐藏目录匹配实测可行，非匹配 job 正确 skip）。lefthook 对 pre-commit 的 staged 门控（无暂存 → job skip）与 bash「仅暂存区」语义同构。
2. **pre-push（单编排器 job）**：
   ```yaml
   pre-push:
     jobs:
       - name: pre-push-gates
         use_stdin: true
         files: echo lefthook.yml   # 恒跑逃生口：绕过 v2 push-files 门控（e2e 钉死）
         run: node scripts/pre-push.mts --hook-remote {1} {files}
   ```
   单 job 而非四分域 job 的理由：files 逃生口是 per-job hack，四份复制放大脆弱面；并行收益由编排器内部实现（TS 自控语义与失败聚合一致）。
3. **`scripts/pre-push.mts`（编排器，scripts 族 source-run 形态）**：① argv 解析（`--hook-remote` 缺失/字面 `{1}` 残留 → 默认 `origin`，同 bash `${1:-origin}` 口径；尾随 `{files}` 占位参数忽略）；② stdin：TTY → tier 循环跳过并注明（同 bash `[ -t 0 ]` 分支），否则同步读全量 ref 行；③ **tier 循环 TS 端口**——逐 ref 语义与 bash 逐分支同构（fail-closed 方向与文案对齐，仅 tier enforce 调用面 `.py→.mts` 指向有意变更；lsha 全零跳过；tag 分支 rev-list 可达性先判 rc 再判空集；分支分支 rsha 全零/merge-base 失败拒；调 `node scripts/verify-review-tier.mts --enforce --since <merge-base>`）；④ **组结构**（change-scope 展示为串行信息面、不入组）+ `Promise.allSettled` 并行组，任一失败 exit 1：gates（`node scripts/gates.mts --run --skip review-tier,review-brief,change-scope`——B1 DAG runner 默认并行，本批为其实质消费面）、gene-format（`node scripts/verify-gene-format.mts`）、engine dist 自测（`node dist/engine/bin.js self-test`）、adapter dist 自测（`node dist/adapters/dsh/selftest.mjs`，缺 dist 即诊断失败「先 `npm run build`」= C4 诊断面）、review-tier（stdin 循环）；并行组子进程 stdin 以 `ignore` 隔离（防未来门禁读 stdin 与 tier 循环抢 ref 行造成 fail-open）。
4. **权威面口径（批次纪律落点）**：pre-commit 保持 py（快检零变化）；pre-push 切 TS 面为本批唯一权威面切换——py 权威由 **CI 双列维持至 B5**（hooks 不再是 gates 执行面的权威载体）；自证 = reconcile-b1 全量零 diff（B1 已实证）+ gates.mts `--self-test` + e2e 四态实推 + CI py 列照跑。TS runner 的 needs/after 边：十门禁两两仍无真实执行依赖，**不布边**（B1「边随真实依赖追加」在此兑现为「无依赖则无边」，伪造边禁令不变）。
5. **postinstall 安装器（C4）**：零自研——lefthook 内建 postinstall（`install -f`；CI 跳过；拒装时自带 `--reset-hooks-path` 补跑路径 = 「缺失诊断与补跑路径」）。本仓迁移一次：`git config --unset core.hooksPath` + `npx lefthook install`（cookbook 环境域记条目）。package.json 仅追加 lefthook devDependency（引擎零依赖纪律不触——P1 D1 约束 engine 运行时面，工具链豁免面 charter Decision 3 先例）。
6. **bash 退役（C13 部分）**：`.githooks/pre-commit` + `.githooks/pre-push` + `scripts/setup-hooks.sh`（lefthook 取代，无 TS 等价物）+ `scripts/pre-push-selftest.sh`（TS 重建后）同批删除；`scripts/change-scope.sh` 保留至 B5（gates 结构性例外 + CI 消费）。
7. **`scripts/pre-push-selftest.mts`（e2e TS 重建）**：四态语义同 bash 版（A 新分支首推拒 / A' `--no-verify` 过 / B 达远端 tag 过且断言「零 outgoing」子串钉死走 tag 分支 / C 携带未推 commit 的 tag 拒 / D tag 删除过）+ stdin 非 tty 守卫保留。实现面：临时裸远端 + 克隆 $ROOT + wrapper 拷贝与 `node_modules` symlink（wrapper 经 `node_modules/lefthook-<平台>/bin/lefthook` 相对寻路，symlink 指向根仓解析；`LEFTHOOK_BIN` 为显式替代）+ `cp` 工作树版 `lefthook.yml`/`scripts/pre-push.mts`（克隆验证工作树态，同 bash 版口径）+ `dist/` 同步（gates 面含 ts-typecheck，克隆缺工具链即假红）。不进 gates.json 白名单（测 hook 本体，非文档门——同 bash 版口径）。
8. **协议与资产零改动（C9）**：gates.json 条目集与门禁名不变；6 基因 + 事件轨 diff 零；engine/adapters 不触碰；engine/adapter self-test 权威面（js/mjs 源）与 TS 面（dist）在 CI 双列并存至 B5。
9. **评审档位触发集对账（R3 收口补）**：钩子面从 `.githooks/**` 切 `lefthook.yml` 后，verify-review-tier 的 FULL_TRIGGERS 死条目（`.githooks` parts 判定）同批替换为 `lefthook.yml` 文件名判定——否则日后改 lefthook.yml（含删恒跑逃生口这类 fail-closed 依赖）脱离机械三审触发；py 与 .mts 两件同改 + 夹具同改（2b 组），reconcile-b1 复跑零 diff。

## Alternatives considered

- **四分域 pre-push job（gates/gene/self-tests/tier 各一 job）**：落败——恒跑逃生口（files + `{files}` 引用）是 per-job hack，四份复制放大脆弱面；且 tier 之外的 job 同样需要逃生口（tag/新分支推送时 push-files 为空全 skip）；单编排器内部并行语义（聚合、fail-fast、诊断）TS 自控更窄。
- **pre-push 保持 py 权威（gates.py 串行 + job 级并行）**：落败——py runner 无并行模式，gates 串行 3.86s 占墙钟大头；C6 并行化意图（B1「边随 B3 钩子并行化」、蓝图调研 §2.2-6）在 TS runner；reconcile-b1 全量零 diff 已实证等价，py 权威由 CI 双列维持至 B5，hooks 切换面风险被 e2e 四态覆盖。
- **tier 循环留在 bash（lefthook job 内联 bash 片段）**：落败——89 行 stdin fail-closed 循环内联 yml 不可维护不可测；C13 精神 = bash 退役；TS 端口有 e2e 四态逐态钉死。
- **保留 `.githooks/` 自研 wrapper + 自写 postinstall**：落败——立项 ADR 已拍板 lefthook（postinstall/glob 分域/探针诊断自研 = 重蹈上游已踩平的坑）；双钩子框架并存徒增形态。
- **hook 级 `files:` 代替 job 级**：等价可行，落败——job 级把逃生口钉在唯一需要它的 job 上，未来若加 push-files 敏感 job 不会静默继承恒跑语义。

## Consequences

- **采用面（本批落地）**：`lefthook.yml`（min_version 2.0.0 + 两 hook）+ `scripts/pre-push.mts` + `scripts/pre-push-selftest.mts` + package.json lefthook devDependency（lock 同步）；删 `.githooks/`、`scripts/setup-hooks.sh`、`scripts/pre-push-selftest.sh`；README（en/zh）Run from source 步骤、skill `noo-pre-push-checks` 门禁脚本行、`scripts/AGENTS.md` 钩子面表述同步。**实测证据（C6 回填，n=1 探索性 2026-09-08 本机）**：新 pre-push 全钩子墙钟 **3.83s**（gates TS runner 并行 2.97s 与 dist 自测 1.75s/0.68s 重叠）vs 串行基线 **≈ 6.3s**（py runner 3.86s + gene-format 0.05s + engine self-test 1.75s + adapter 0.68s 同机复测；B1 钉值 3.6s 系同仓另测，机器负载差异在案）——**并行化后快于现行串行 ✓**；pre-commit 墙钟 1.06s（快检面，bash 版同量级）。
- **风险面**：① files 恒跑逃生口与 `use_stdin` 是 lefthook 实现细节（上游 #504/#547 锚点在案），min_version 2.0.0 钉住二进制代际；e2e 四态把「tag/新分支必跑」钉死为回归判据。② wrapper fail-open（二进制缺失 → exit 0 旁路）：node_modules 缺失才可达，记 cookbook；e2e 以 node_modules symlink 供 wrapper 相对寻路（`LEFTHOOK_BIN` 为显式替代）。③ `LEFTHOOK=0` 环境变量可整体旁路钩子（bash 版无此旁路）——与 `--no-verify` 同级的显式逃生口，push 面兜底仍在 CI tier enforce（`--enforce --since event.before`）。④ npm ≥12 install-scripts 守卫：新环境首次 `npm install` 后钩子未装，postinstall 警告给出 approve 路径（cookbook 环境域）。⑤ 既有 clone 迁移期一次性乱相：postinstall `-f` 把 wrapper 写进 `.githooks/`（未跟踪文件），pull 本批（删 `.githooks/`）后消失。
- **对账口径**：pre-commit 十步输出与 bash 版行为等价（同命令同参数，仅执行器换成 lefthook；条件步 skip 语义等价）；pre-push 编排器输出 = 各组原样子输出 + tier 循环文案与 bash 语义同构（仅 tier enforce 指向 `.py→.mts` 有意变更；e2e 断言「零 outgoing」子串）。C9 每批核：`git diff genes/ events/` 零 + engine/adapter self-test 双面绿。**C2 残余缺口处置（R3 收口补）**：蓝图 C2 字面「lefthook job 全部调 `node dist/…`」在 B5 后亦不可全绿——pre-commit 保持 py 命令、pre-push 的 scripts 族编排器按 B2 形态分野恒源跑；B5 对账时按 C2 判据精神（钩子链路零转译、无 tsx）重释并登记蓝图对账修订，不以字面全绿为切换前提。

- **验收**：e2e 四态全过（TS 版）+ 全量 gates 绿（py 权威面）+ ts-typecheck 零错 + C9 零 diff + C6 墙钟实测回填（快于串行基线）+ 蓝图对账 C2 部分/C4/C6 部分/C13 部分落账 + 真实 push 首推走新钩子（pre-push OK）+ FULL 三审采纳后转 implemented + journal 月卷「本批按蓝图判据」标注。**采纳时同变更改写两件 implemented 笔记的载体事实**（钩子易主）：2026-09-06-pre-push-tag-outgoing（采用面 `.githooks/pre-push` 循环 + `pre-push-selftest.sh` → lefthook 编排器 + e2e .mts）与 2026-09-05-review-mechanical-gate（pre-push 逐 ref 强制挂接描述）。
