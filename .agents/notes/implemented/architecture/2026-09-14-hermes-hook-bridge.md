# Agent Note: 批次 7 序 35——第二宿主 Hermes：写码在环拦回 hook 桥（多 harness 第一刀）

Status: implemented

Review: FULL/2026-09-14/R1=ok R2=ok R3=ok

Related: 批次表 [2026-09-13-feature-completion-backlog](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · 主设计 [§12-P4 / §11.2](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 蓝图 [§7 A4 / §9 不做清单](../../../../docs/research/framework-rebuild-blueprint.md) · DSH 侧 A4 [lint 在环 ADR](2026-09-08-lint-in-loop-feedback.md) + [升格批](2026-09-09-lint-block-and-staged-hook.md)（本刀同判据 = lint 半）+ [注释面扩面](2026-09-10-export-docs-inloop.md)（export-docs 半，本刀不接） · 防火墙 [adapters/AGENTS](../../../../adapters/AGENTS.md) · 消费契约 [adapters/hermes/README](../../../../adapters/hermes/README.md)

## Problem

批次表行 35 要求「多 harness 适配（现单宿主 DSH）」。开工前取证（2026-09-14，本机实装 Hermes 的 CLI + 本地源码/文档 + 临时 `HERMES_HOME` 探针）：

- **第二宿主在场**：`hermes` CLI（`~/.hermes/hermes-agent` 源码 + `website/docs/user-guide/features/*.md`）。四个 hook 系统；其中 **shell hooks** = `~/.hermes/config.yaml` 的 `hooks:` 块 + 子进程 stdin/stdout JSON 协议（`split_command_line`〔POSIX 分支即 `shlex.split`〕，`shell=False`，命令语言任意），可在 `pre_tool_call` 阻断、在 `pre_llm_call` 注入上下文；`hermes hooks test <event> [--payload-file]` 可离线发射、打印 wire shape。
- **可携带面已原生成立（零适配成本）**：Hermes 原生读 `AGENTS.md` 链（git 根 + 逐级子目录、带 provenance header、渐进发现）——胶囊的规则层直接生效；`.agents/skills` 是 Hermes 的项目技能路径之一（`hermes skills trust` 后加载；本机 `hermes skills list` 实测本仓未 trust，故 `noo-*` 未出现）。
- **缺口 = 运行时强制面**：DSH 侧的 A4「写码在环拦回」在 Hermes 无对应接线；机器可判违规仍会落进 git 边界。
- **语言约束**：Hermes 原生 plugin hooks 是 **Python only**；蓝图 C1 = 机器层全栈 TS（`engine` / `adapters` / `scripts` 无 `.py`/`.sh` 残留）。故 adapter 只能走 shell hook（命令任意）→ 入口必须是 `node dist/adapters/hermes/hook.mjs`。
- **既有排除面核对**：用户全局 `AGENTS.md`/`CLAUDE.md` 副本（蓝图 §9 不做清单——本刀不写全局指令文件）、claude-code/codex shell-hook 兼容层（蓝图 §7 取舍——本刀只发 Hermes 原生 shape，不做上游方言桥）、技能分发机制建设（蓝图 §3——本刀不自建分发：`.agents/skills` 是宿主原生路径，信任一步归用户）。

## Decision

1. **第二宿主 = Hermes；第一刀 = 写码在环拦回 hook 桥**（`pre_tool_call` + `write_file`）。
2. **判据面零新增（v1 = lint 半判据）**：跑仓根 oxlint（`--config .oxlintrc.json --deny-warnings -f json`）——与 DSH 侧 A4 的 lint 半同参数、同 5s 超时、同 10 行截断 + `…(+N more)` 溢出记号；命中即回 `{"action":"block","message":…}`（Hermes wire shape）。判据单源仍是 `.oxlintrc.json`。**export-docs 半判据本刀不接**：`scripts/verify-export-docs.mts` 的文件目标模式按域归属判（`SOURCE_ROOTS = ["adapters/dsh","scripts"]`），在环候选落仓外临时目录一律 skip/exit 0——接了是死路（评审 R1-B1 / R2-B1 实证），故不接、改为具名后置（见 Consequences 未覆盖面）。
3. **接线面 = `adapters/hermes/`**：`hook.mts`（入口：stdin 载荷 → 判据 → stdout 响应）、`judge.mts`（判据本体，零宿主依赖）、`selftest.mts`（进程级 e2e）、`hooks.example.yml`（用户侧配置样例）、`README.md`（消费契约）。构建面 = [tsconfig.build.json](../../../../tsconfig.build.json) include 增 `adapters/hermes/**/*.mts`；CI 增 `node dist/adapters/hermes/selftest.mjs`。
4. **降级纪律同 DSH，差异写明**：任何不确定面（非 `write_file` / 非 `pre_tool_call` / 目标出仓 / 非 `.ts`,`.mts` / 缺 oxlint 或判据件 / spawn 异常 / 超时 / 坏 JSON）一律 fail-open——进程 exit 0、零输出。不引入 DSH 的「同文件连续拦回降级」门：`pre_tool_call` 在写入前判、无重试计数面（模型可改内容或改路径，不会死锁）。
5. **验证分两层**：判据与源码面 = 自测 25 断言（真 oxlint 覆盖违约 / 干净 / 越界 / 事件外 / 坏 JSON 全边界 + `adapters/hermes/` 源码面防火墙静态断言：零 `.py`/`.sh`、零宿主依赖 import、相对 import 不出目录）；宿主接线面 = `HERMES_HOME=<tmp> hermes hooks test pre_tool_call` 实测（hook 被发射、exit 0、响应形状被 Hermes 解成 wire shape）。真会话写码载荷（真 `write_file`）留 (B) 真机复验。

## Alternatives considered

- **Hermes 原生 plugin（`ctx.register_hook`）**：落败——Python only，撞 C1 全栈 TS；且新增插件装载与信任面。
- **走 `pre_llm_call` 注入上下文（A2 类比）**：落败——Hermes 原生读 `AGENTS.md` 链，规则面已覆盖，注入只增常驻 token。
- **写全局指令文件副本（`~/.hermes/AGENTS.md` 等）**：落败——蓝图 §9 已判不做（宿主兼容面非本仓职责）。
- **做上游 hook 方言兼容层（Claude Code / Cursor shape）**：落败——§9 已判不做；本刀只发 Hermes 原生 shape（其 `parsed` 面即 Hermes-canonical）。
- **入口用 bash 脚本（`.sh`）+ 判据另置**：落败——`.sh` 撞 C1（adapters 无 `.sh` 残留）；入口必须 node。
- **抽 host-neutral 公共判据模块供两宿主共用**：落败（本刀）——adapters 互不渗透，且抽层要动 DSH 接线面（更宽 diff）；触发 = 出现第三宿主需要同一判据时再抽。
- **判不立/后置（第二宿主前提为零）**：落败——第二宿主在场、接口可离线验证，「多 harness」有可交付面。

## Consequences

- **变更面**：新增 `adapters/hermes/{judge,hook,selftest}.mts` + `hooks.example.yml` + `README.md`；`tsconfig.build.json` include；`.github/workflows/validate.yml` 自测步；`adapters/AGENTS.md` 一条；根 README 双语 Install 增 Hermes 小节；`package.json` files 白名单 + `scripts/verify-package-invariants.mts` 必需件表各增两件（`adapters/hermes/README.md`、`hooks.example.yml`）；批次表行 35 done + 「未交付」计数 15 → 14 + 游标 = 序 36；HANDOFF ⏭ / 当前状态 / 滚动窗；todos (A) + (B) 真机复验条；journal。
- **档位**：FULL（`adapters/**` 行为契约面 + `.github/workflows/**` 门禁面）→ R1/R2/R3 三重审核。
- **单源**：adapter 消费契约 = `adapters/hermes/README.md`；本刀判据单源 = `/.oxlintrc.json`（export-docs 半与 `scripts/verify-export-docs.mts` 的域表本刀不接，列未覆盖面）；Hermes 侧协议单源 = 宿主文档 `hooks.md`。
- **C1 与防火墙**：`adapters/hermes/` 零宿主依赖、零 `.py`/`.sh`；不 import 引擎模块、不 import Hermes 面（v1 只 spawn `node_modules/oxlint/bin/oxlint`）。
- **未覆盖面（具名触发）**：**export-docs 半判据**（触发 = 判据件开出「给定内容 + 逻辑域」入口，或宿主给出可阻断的写后事件面）；**`SOURCE_ROOTS` 不含 `adapters/hermes`**（新目录导出契约注释面零机器覆盖，本批三件恰好自带 JSDoc 故门禁不说话；触发 = 该目录首件导出面违规实例出现，或判据件域表扩展轮）；`patch` 工具（载荷形状未取证；触发 = 真机 `patch` 命中）；`pre_llm_call` 上下文注入（触发 = 出现 `AGENTS.md` 链覆盖不到的常驻知识面）；Hermes 原生插件面（触发 = C1 放开 Python 或宿主给出 JS/TS plugin API）；`hermes skills trust` 用户侧一步（触发 = 宿主给出项目技能自动信任面）。
