# Agent Note: M2 适配层立项拍板（插件壳 + 最小接线 + spawn 单合同）

Status: proposed

> Provenance：本仓原创（2026-09-06 M2 适配层立项讨论轮，用户逐题拍板）。前置：P1 引擎已落地（骨架 D1–D4 / schema S1–S3 / 实现轮 D1–D6，见 [2026-09-05-p1-engine-skeleton](../../implemented/architecture/2026-09-05-p1-engine-skeleton.md) · [2026-09-05-gene-event-schema](../../implemented/architecture/2026-09-05-gene-event-schema.md) · [2026-09-05-p1-engine-implementation](../../implemented/architecture/2026-09-05-p1-engine-implementation.md)）；插件安装机制与技能发现根为 2026-09-06 源码实测（`dsh-continual-evolve@0.6.0` + DSH `dsh-skill-filesystem`）。

## Problem

P1 演化发动机（`engine/` 四命令 CLI）已落地并闭环，但它是裸仓自洽件：本仓尚不是 DSH 插件包（缺 `package.json` / `cordis.patch.yml` / lib 入口），引擎与会话生命周期零接线——DSH 侧会话拿不到基因（select/propose 无消费面），演化产出（solidify）也没有会话边界触发点。noo-* 7 技能只靠本仓 `.agents/skills` 被自动发现，换仓即失效。engine README 明列一项 M2 归口 open：hooks/CI 改引 `gates.json` 为唯一命令清单。没有这一层，"胶囊 = DSH 插件/skill 包"（设计稿 §2.3/§4.2）只停在文档。

机制事实（2026-09-06 源码实测，作为拍板依据）：

- **插件安装机制**：npm 包带 `dsh.bundle.patch` 指向 `cordis.patch.yml`，patch 用 `insert` 把一行 plugin row `{id, name}` 插进用户 profile；插件本体 ESM，导出 `name` / `inject` / `Config`，由 cordis 装载后取得 `tools` / `commands` / `systemPrompt` / `ctx.skills` 等服务面（`dsh-continual-evolve@0.6.0` 为完整参照）。
- **技能发现根**：`<project>/.agents/skills`、`<project>/.dsh/skills`、`<dshHome>/skills` 等；插件侧可经 `ctx.skills.registerProvider` 注册打包技能（DSH 有 packaged provider 标准 precedence rank）——"装插件即得技能"是宿主原生能力，但非 M2 必需。
- **引擎合同**：CLI 四命令 = 唯一合同面（骨架 D1），退出码三档（0 成功 / 1 红 / 2 fail-closed，实现轮 D6）；引擎 CommonJS、零第三方依赖；solidify 直接写 git commit；在目标仓 `genes/` 上操作。

## Proposal

M2 适配层 = 把 P1 引擎接进 DSH 会话生命周期。四题拍板 + 两项范围：

**M1 插件形态 = 最小插件壳**。`package.json` 裸名 `noogenesis`（npm 占位包 0.0.0 随首发替换，repository 字段已预填 `github.com/openorbit/noogenesis`，宿主名有变须同改）+ ESM lib 入口 + `cordis.patch.yml`（plugin row `id: noogenesis`）。技能不进包（见 M4）。目录布局与模块分叉（2026-09-06 讨论补拍板）：

```
Noogenesis/                  ← npm 包根（真包首发时替换占位 0.0.0）
├─ engine/                   ← 原样不动，harness 无关（零依赖 CJS）
├─ adapters/dsh/             ← DSH 适配层（lib 入口 / 工具面 / system-prompt 节 / solidify 触发）
├─ cordis.patch.yml          ← plugin row insert
└─ package.json              ← dsh.bundle.patch + files 白名单（engine 源码 + adapters/dsh 构建物）
```

- 目录名 `adapters/dsh/` 为 P4 多 harness 留位（届时每宿主一个薄目录 `adapters/<host>/`，互不渗透）。
- **ESM/CJS 分叉**：根 `package.json` 不设 `"type"`（默认 commonjs），适配层用显式 `.mjs` 写 ESM——引擎零改动、零构建链（无 tsc）。退路：若 DSH 装载器要求包级 `"type": "module"`（参照件 dsh-continual-evolve 形态），则 `engine/*.js` 机械改名 `.cjs`（行为零变），随实现轮验证。

**M2 接线点 = 最小四件**（首轮不做 Detect 信号源全表）：

1. **system-prompt 有序节**：常驻基座一行索引 + select 命中基因的注入落点；空命中则零 token（宿主有序节原生语义）。
2. **`defineTool` 三件**：`noo_select` / `noo_propose` / `noo_evaluate`——模型面只读路径。
3. **solidify 触发**：挂 `session/flush` 或 `agent/disposed`，**默认人工确认**、不自动写（对齐设计稿 §7 护栏与"dsh-continual-evolve 跨会话编辑需人批准"先例）。
4. **`/noo` 人面命令**：后补，不进首轮。

Detect 信号源（`agent/error` / `turn-stopping` 等设计稿 §6 全表）留后续轮——P1 骨架 D2 的"引擎自动扫描"禁区，解除须单独拍板。

**M3 调用方式 = spawn CLI 单合同**。插件每次调用 `node <engine>/bin.js <命令>`：保住骨架 D1"CLI 唯一合同面"与实现轮 D6 退出码三档（插件侧把 1 映射为闸红、2 映射为 fail-closed 不重试）；引擎保持 CommonJS 零依赖，不转 ESM。

**耦合防火墙（三条硬规则，随 M1/M3 生效）**：

1. **依赖方向单向，只过合同面**：适配层只允许 spawn `node <包根>/engine/bin.js <命令>`，**禁止 import 引擎模块**；引擎不 import 任何宿主层代码。合同 = stdout JSON + 退出码三档——适配层是 CLI 合同面的第一个进程外消费者，零共享代码、零共享 schema 解析。
2. **宿主依赖收敛在适配层**：`@deepseek-ai/cordis` 等 dsh-* peerDependencies 只进适配层依赖清单；`engine/` 内不出现任何第三方 import（评审把关，实现轮可落自测兜底）。
3. **运行仓锚定**：引擎 cwd 锁"仓根"，适配层 spawn 时显式把 cwd 指到目标项目仓根（装在 DSH 侧的插件 ≠ 运行仓），落夹具防"引擎改了开发仓而非目标仓"。

**M4 技能分发 = M2 保持 repo-local，分发随 P2**。noo-* 留本仓 `.agents/skills`；跨仓分发走 P2 基因库的 gene→skill 渲染语义，不在 M2 提前背。

**范围附带**：hooks/CI 改引 `gates.json` 为唯一命令清单（engine README open 项，随 M2 收口）。

**发布 gate**：`dsh plugin add noogenesis` 可装，且装上即转——空 `genes/` 项目优雅退化（select 无命中 → system-prompt 节零 token；四命令可跑但产出空/红）。

**分层边界（防重辩）**：插件包只是 DSH 适配层——DSH 特有面收敛在插件内，引擎（P1 骨架 D1 零 DSH 依赖）、技能（纯 markdown）、基因库（P2 git+CI）均 harness 无关。**多 harness 适配是设计稿 §12 P4 的事**（借 superpowers 分发范式），M2 不背；届时其他宿主各写一个薄适配器，引擎与资产零改动。本 ADR 全部拍板均为 DSH 域内。

## Alternatives considered

- **纯技能包（无代码接线）**：落败——"装上即转"的接线闸永不过，M2 的存在理由（引擎↔会话接线）直接落空。
- **接线全量一步到位（设计稿 §6 全表）**：落败——Detect 信号源（agent/error、turn-stopping、goal/change…）每一处都是行为面决策，P1 骨架 D2 仍列禁区；一次性全挂等于把 D2 禁区整批解除，违保守护栏纪律。
- **只读先行（不做 solidify 触发）**：落败——写路径不接则演化闭环在 DSH 侧断裂，solidify 只能靠人在 CLI 手跑，"装上即转"名不副实；人工确认默认已兜住写风险。
- **进程内 import**：落败——引擎是 CJS、插件生态是 ESM，需互操作或引擎转 ESM（churn）；JS API + CLI 双合同是漂移温床，违 D1。
- **混合（只读进程内 / 写路径 spawn）**：落败——最快但双合同，且 select/propose 是人/agent 量级调用频次而非热循环，子进程开销可承受，换不来值得背的漂移面。
- **插件包内带 skills/ + registerProvider**：落败（非否定，是归期）——宿主确有此原生能力，但 gene→skill 渲染是 P2 基因库的设计语义，M2 搬技能是提前背 P2 的活。
- **materialize 到 `<dshHome>/skills`**（dsh-continual-evolve 先例路径）：落败——写宿主全局目录，侵入性大于打包注册，且同样属 P2 归期。

## Acceptance criteria

- `dsh plugin add noogenesis` 在全新 profile 可装（patch insert 生效），装载后不崩。
- 空 `genes/` 项目：select 无命中 → system-prompt 节零 token；四命令经插件面可跑，退出码三档语义在插件侧正确映射。
- 本仓（6 基因在档）：system-prompt 节注入命中基因摘要；`noo_select`/`noo_propose`/`noo_evaluate` 工具可用；solidify 触发点默认人工确认后才落写。
- hooks/CI 命令清单以 `gates.json` 为唯一来源，`scripts/` 内重复清单消除。
- npm 真包首发时替换占位包 0.0.0，repository 字段与宿主名一致。

## Risks

- spawn 每调用一子进程：调用频次若随接线面扩大（Detect 轮）抬升，需重估——届时是重开 M3 拍板的信号，不是默默改进程内。
- 引擎 cwd = 目标仓（`genes/` per-repo），插件安装位置（DSH 侧 node_modules）与运行仓不同源，路径解析需显式锚定目标仓根，防"引擎改了开发仓而非目标仓"。
- DSH 插件面（cordis / dsh-* 包）仍在 rc 期，peerDependencies 版本锚定需随 DSH 发版对齐；`dsh-continual-evolve` 的版本先例（`^0.1.0-rc.6`）表明锚定策略本身有漂移风险。
- npm 占位包首发替换涉及账号 openorbit 与 repository 字段一致性，操作面在 npm 注册表，出错需回滚（占位包不可下架只可 deprecate）。
