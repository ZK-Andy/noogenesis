# Agent Note: M2 适配层立项拍板（插件壳 + 最小接线 + spawn 单合同）

Status: implemented
Review: FULL/2026-09-06/R1=ok R2=ok R3=ok

> Provenance：本仓原创（2026-09-06 M2 适配层立项讨论轮，用户逐题拍板；同会话实现轮落地）。前置：P1 引擎已落地（骨架 D1–D4 / schema S1–S3 / 实现轮 D1–D6，见 [2026-09-05-p1-engine-skeleton](2026-09-05-p1-engine-skeleton.md) · [2026-09-05-gene-event-schema](2026-09-05-gene-event-schema.md) · [2026-09-05-p1-engine-implementation](2026-09-05-p1-engine-implementation.md)）；插件安装机制与技能发现根为 2026-09-06 源码实测（`dsh-continual-evolve@0.6.0` + DSH `dsh-skill-filesystem` / `cordis-plugin-loader`）。

## Problem

P1 演化发动机（`engine/` 四命令 CLI）已落地并闭环，但它是裸仓自洽件：本仓尚不是 DSH 插件包（缺 `package.json` / `cordis.patch.yml` / lib 入口），引擎与会话生命周期零接线——DSH 侧会话拿不到基因（select/propose 无消费面），演化产出（solidify）也没有会话边界触发点。noo-* 7 技能只靠本仓 `.agents/skills` 被自动发现，换仓即失效。engine README 明列一项 M2 归口 open：hooks/CI 改引 `gates.json` 为唯一命令清单。没有这一层，"胶囊 = DSH 插件/skill 包"（设计稿 §2.3/§4.2）只停在文档。

机制事实（2026-09-06 源码实测，作为拍板依据）：

- **插件安装机制**：npm 包带 `dsh.bundle.patch` 指向 `cordis.patch.yml`，patch 用 `insert` 把一行 plugin row `{id, name}` 插进用户 profile；cordis-plugin-loader 按行内 `name` import 包并装载导出面（`name` / `inject` / `Config` / `apply`），取得 `tools` / `commands` / `systemPrompt` / `userQuestions` 等服务面（`dsh-continual-evolve@0.6.0` 为完整参照）。
- **技能发现根**：`<project>/.agents/skills`、`<project>/.dsh/skills`、`<dshHome>/skills` 等；插件侧可经 `ctx.skills.registerProvider` 注册打包技能（DSH 有 packaged provider 标准 precedence rank）——"装插件即得技能"是宿主原生能力，但非 M2 必需。
- **引擎合同**：CLI 四命令 = 唯一合同面（骨架 D1），退出码三档（0 成功 / 1 红 / 2 fail-closed，实现轮 D6）；引擎 CommonJS、零第三方依赖；solidify 直接写 git commit；在目标仓 `genes/` 上操作。

## Decision

M2 适配层 = 把 P1 引擎接进 DSH 会话生命周期。四题拍板 + 两项范围：

**M1 插件形态 = 最小插件壳**。`package.json` 包名 `noogenesis-dsh`（宿主件 = 裸名 + 宿主后缀；命名规则与改名拍板见 [2026-09-06-adapter-deploy-hardening](2026-09-06-adapter-deploy-hardening.md)，裸名 `noogenesis` 保留给框架引擎）+ ESM lib 入口 + `cordis.patch.yml`（plugin row `id: noogenesis`）。技能不进包（见 M4）。目录布局与模块分叉（2026-09-06 讨论补拍板）：

```
Noogenesis/                  ← npm 包根（真包首发时替换占位 0.0.0）
├─ engine/                   ← 原样不动，harness 无关（零依赖 CJS）
├─ adapters/dsh/             ← DSH 适配层（index 入口 / bridge / section / tools / solidify-trigger / config + selftest）
├─ cordis.patch.yml          ← plugin row insert
└─ package.json              ← dsh.bundle.patch + files 白名单（engine 源码 + adapters/dsh）
```

- 目录名 `adapters/dsh/` 为 P4 多 harness 留位（届时每宿主一个薄目录 `adapters/<host>/`，互不渗透）。
- **ESM/CJS 分叉**：根 `package.json` 的 `"type"` 钉 `commonjs`（引擎 `.js` 保持 CJS 零改动），适配层用显式 `.mjs` 写 ESM——零构建链（无 tsc）。退路（若 DSH 装载器要求包级 ESM）= `engine/*.js` 机械改名 `.cjs`，行为零变。
- **Config 校验**：手工校验（`config.mjs`，类型违约 fail-closed 抛错），不引 schemastery——宿主运行时依赖收敛为 `@deepseek-ai/dsh-tools`（defineTool，经依赖注入进 tools.mjs）+ `@deepseek-ai/dsh-llm`（createUserMessage，注入消息构造——允许集扩第二件随 [2026-09-08-b4-mount-wiring](2026-09-08-b4-mount-wiring.md)）。

**M2 接线点 = 最小四件**（Detect 信号源全表不做）：

1. **system-prompt 双节**：基座节（固定极小，陈述工具面 + 写路径纪律）+ 命中节（`injectSignals` 显式声明的信号喂引擎 select，命中基因逐行注入、行数封顶、单行截断）；空命中渲染 `""` → 宿主 prompt 渲染器丢弃 → 零 token（`injectSignals` 为空时短路，不 spawn 引擎）。引擎 stdout 进宿主 prompt 前对 `{{` 做零宽中性化——宿主 interpolate 对未知 `{{name}}` 抛错且 renderPrompt 每模型步无包裹调用（R2-B1），模板语法的基因 summary 不得原样透传。信号只来自显式声明（配置 / 模型调工具），Detect 禁区（骨架 D2）不解除。
2. **`defineTool` 三件**：`noo_select` / `noo_propose` / `noo_evaluate`——模型面只读路径。退出码映射：0=结果文本；1=闸红（红是有效评测结论，以 `RED (exit 1)` 文本返回，不抛错）——但 **exit 1 + 空 stdout = 引擎内部故障**（非 EngineError 走 `throw e`，崩溃退出码同为 1 且无报告），按 fail-closed 抛错不放行；2=fail-closed（抛错，重试无益）。
3. **solidify 触发**：挂 `agent/disposed`（in-flight 去重逐仓隔离——同仓近同时 dispose 不重复弹问/重复入档，异仓互不阻塞；逐仓口径见 [2026-09-06-adapter-deploy-hardening](2026-09-06-adapter-deploy-hardening.md)）。发现 staging 目录（默认 `genes-staging/`，相对目标仓根）下的 `<id>.json` 候选 → 提问人工确认（`userQuestions` **不在 inject 声明**，disposal 时懒取用——cordis 对缺席注入服务会推迟整个插件装载，声明注入会让降级不可达；ask 兜底超时 300s，超时/缺席/拒绝 → 只输出带精确命令的提醒）；批准才逐候选实跑 solidify。绝不自动写。
4. **`/noo` 人面命令**：后补，不在本层。

**M3 调用方式 = spawn CLI 单合同**。适配层每次调用 `node <包根>/engine/bin.js <命令>`（结构化参数数组直传、最小 env 透传 PATH/HOME/LANG）；异步面（工具执行）120s 超时 kill，同步面（system-prompt 命中节，宿主 text provider 是同步面）60s 超时 kill——两侧都有强制界，超时按 FAIL_CLOSED 映射。

**耦合防火墙（三条硬规则，机器检查落位）**：

1. **依赖方向单向，只过合同面**：适配层只允许 spawn `node <包根>/engine/bin.js <命令>`，禁止 import 引擎模块；引擎不 import 任何宿主层代码。合同 = stdout 文本 + 退出码三档——适配层是 CLI 合同面的第一个进程外消费者，零共享代码、零共享 schema 解析。机器检查：adapter selftest 扫描 `adapters/dsh/*.mjs`（index.mjs 除外）无 `@deepseek-ai/*` import、扫描 `engine/*.js` 零第三方 require。
2. **宿主依赖收敛在适配层**：peerDependencies = `@deepseek-ai/dsh-tools` + `@deepseek-ai/dsh-llm`（允许集封底，扩集须同变更拍板——第二件随 [2026-09-08-b4-mount-wiring](2026-09-08-b4-mount-wiring.md) Proposal 2），且只在 `index.mjs` import；其余模块零宿主依赖、可脱离 DSH 自测。
3. **运行仓锚定**：`resolveRepoRoot` 回退链 = config `repoRoot` → `NOGENESIS_REPO_ROOT` → 会话工作区 → `process.cwd()`（四级链与逐次解析口径以 [2026-09-06-adapter-deploy-hardening](2026-09-06-adapter-deploy-hardening.md) 为准）；spawn cwd 显式指向目标仓根（装在 DSH 侧的插件 ≠ 运行仓）。selftest 以"process.cwd 停在别处仍命中夹具仓基因"实证锚定。

**M4 技能分发 = M2 保持 repo-local，分发随 P2**。noo-* 留本仓 `.agents/skills`；跨仓分发走 P2 基因库的 gene→skill 渲染语义，不在 M2 提前背。（2026-09-06 更新：技能**随库分发**已提前收口——技能经基因库缓存进 DSH 技能面，见 [2026-09-06-skills-ride-bank](2026-09-06-skills-ride-bank.md)；gene→skill 渲染语义不在其取代面，仍随贡献开放轮。）

**范围附带：gates.json 单源收口**。`scripts/gates.py` 为 hooks/CI 的门禁清单唯一发射器（清单 = engine/gates.json）。槽位替换与 engine/gates.js instantiate **形似而非同口径**（勿照抄互通）：本脚本替换任意 `{{key}}`（含 cmd）且缺值 fail-closed；engine 侧只认 outgoing_base/head 双键、缺键静默留字面量（无害的前提是引擎 deriveSlots 保证两键齐全）——今日两侧行为等价纯因白名单只有这两键且都在 args。结构性例外（tier 的 per-ref/事件条件形态、change-scope 的缺省推导、review-brief 仅本地预发射、gene-format 为白名单外独立件——它消费引擎产物，进白名单会让 solidify 入档中途复算自身）逐一记录在 gates.py 头注；`--list` 信息面缺槽位占位、`--run` 恒 fail-closed 的两态例外见 [2026-09-06-doc-single-sourcing](../process/2026-09-06-doc-single-sourcing.md)。

**发布 gate**：`dsh plugin add noogenesis-dsh` 可装，且装上即转——空 `genes/` 项目优雅退化（select 无命中 → system-prompt 命中节零 token；四命令可跑但产出空/红）。

**分层边界（防重辩）**：插件包只是 DSH 适配层——DSH 特有面收敛在适配层内，引擎（P1 骨架 D1 零 DSH 依赖）、技能（纯 markdown）、基因库（P2 git+CI）均 harness 无关。**多 harness 适配是设计稿 §12 P4 的事**（借 superpowers 分发范式），M2 不背；届时其他宿主各写一个薄适配器，引擎与资产零改动。本 ADR 全部拍板均为 DSH 域内。

## Alternatives considered

- **纯技能包（无代码接线）**：落败——"装上即转"的接线闸永不过，M2 的存在理由（引擎↔会话接线）直接落空。
- **接线全量一步到位（设计稿 §6 全表）**：落败——Detect 信号源（agent/error、turn-stopping、goal/change…）每一处都是行为面决策，P1 骨架 D2 仍列禁区；一次性全挂等于把 D2 禁区整批解除，违保守护栏纪律。
- **只读先行（不做 solidify 触发）**：落败——写路径不接则演化闭环在 DSH 侧断裂，solidify 只能靠人在 CLI 手跑，"装上即转"名不副实；人工确认默认已兜住写风险。
- **进程内 import**：落败——引擎是 CJS、插件生态是 ESM，需互操作或引擎转 ESM（churn）；JS API + CLI 双合同是漂移温床，违 D1。
- **混合（只读进程内 / 写路径 spawn）**：落败——最快但双合同，且 select/propose 是人/agent 量级调用频次而非热循环，子进程开销可承受，换不来值得背的漂移面。
- **插件包内带 skills/ + registerProvider**：落败（非否定，是归期）——宿主确有此原生能力，但 gene→skill 渲染是 P2 基因库的设计语义，M2 搬技能是提前背 P2 的活。
- **materialize 到 `<dshHome>/skills`**（dsh-continual-evolve 先例路径）：落败——写宿主全局目录，侵入性大于打包注册，且同样属 P2 归期。
- **schemastery Config schema**（参照件路径）：落败——多一个宿主运行时依赖；配置面 7 字段手工校验足够且 selftest 可直测。
- **目录名 `plugin/` 单层**：落败——`adapters/dsh/` 为 P4 多 harness 留位（每宿主一薄目录），避免届时改名 churn。
- **solidify 触发点挂 `session/flush`**：落败——flush 是压缩边界，可在会话中途发生且不保证对齐会话结束，弹问时机突兀且可能多次打扰；`agent/disposed` 是宿主保证的单次终态边界，与"会话结束盘点待入档候选"语义精确对齐。
- **userQuestions 声明式注入（进 `inject` 清单，参照件写法）**：落败（R2-S2 实测证）——cordis 对缺席的注入服务把插件置 INACTIVE 推迟装载，声明注入反而使「提问面缺席 → 只提醒」降级不可达；改为 disposal 时对 `ctx.userQuestions` 懒取用，缺席/抛错/超时都走降级。

## Consequences

- **采用面**：`package.json`（noogenesis-dsh，AGPL-3.0-only，`type: commonjs`，files 白名单，`dsh.bundle.patch`）、`cordis.patch.yml`（plugin row insert）、`adapters/dsh/` 八件（index / engine-bridge / section / tools / solidify-trigger / config / selftest / README）、`scripts/gates.py`、`.githooks/pre-push` 与 `.github/workflows/validate.yml` 改引单源、engine README（open 项收口 + 消费方补 adapters/dsh）。引擎本体零改动。
- **已验证**（2026-09-06）：adapter selftest 夹具全绿（bridge 合同实跑 / cwd 锚定 / section 空渲染 + `{{` 中性化 / 工具退出码映射含 exit1-空报告故障分型 / solidify 全路径含 ask 兜底超时 / 配置 fail-closed / 防火墙机器检查 / 包结构契约）；`gates.py --self-test` 3 组全绿；gates.py 单源发射实跑七门禁全绿；engine self-test 全绿。
- **评审收口（2026-09-06，FULL 三审）**：R1（简化路）0B/4S、R2（代码路）1B/8S、R3（ADR 路）3B/4S **全部采纳**——B1（命中节 `{{` 未转义，宿主 interpolate 每模型步抛错，会话级破坏）+ R1 头注/README 单源、BASE_SECTION 措辞断言删除、提醒命令自 buildSolidifyArgs 派生、sync spawn 加 60s 界、空 injectSignals 短路、noo_select required、userQuestions 懒取用、disposal in-flight 去重 + ask 兜底超时、gates.py 头注补 gene-format 例外归口；R3 收「同口径」措辞残留面（gates.py 函数注 + 本 ADR Decision）、P1 两 ADR open 项单源更新、Alternatives 补 session/flush 与声明式注入两条落败、README 待首发措辞。
- **发布 gate 已过（2026-09-06 npm 首发）**：`noogenesis@0.1.0` 为 npm latest（repository 对齐宿主仓 `ZK-Andy/noogenesis`，占位包 0.0.0 保留不 deprecate）；desktop profile 实装验证——profile manifest `dsh.profile.bundles` 含 noogenesis、组合树含 plugin row 层（`dsh plugin add` 实机制 = pnpm 装包 + manifest 层栈对账，不写用户 cordis.patch.yml，包自带 patch 以 bundle 层身份在启动时合成）、安装位引擎空仓 select exit 0 `(no genes matched)`（空 `genes/` 优雅退化）+ 真仓多信号并集命中；会话级装载（工具注册 + 基座节）由新会话确认。安装环境事实：pnpm `minimumReleaseAge` 供应链闸拦新发布包（add 触发 lockfile 全集重验会连坐已装的 too-young 条目），单命令豁免 `--config.minimumReleaseAge=0`，详见 cookbook [环境] 条目。
- **运行边界**：spawn 每调用一子进程——调用频次若随接线面扩大（Detect 轮）抬升，是重开 M3 拍板的信号，不是默默改进程内；DSH 插件面仍在 rc 期，peerDependencies 版本锚定（`^0.1.0-rc.6`）随 DSH 发版对齐；npm 占位包首发替换涉及账号 openorbit 与 repository 字段一致性（占位包不可下架只可 deprecate）；solidify 提问发生在 agent disposal 时，无应答方环境（headless → NO_PROVIDER）或 ask 超时（兜底 300s）都降级为只提醒——降级路径有 warn 留痕，迟到回答被丢弃但提醒文案带可手跑的精确命令。
