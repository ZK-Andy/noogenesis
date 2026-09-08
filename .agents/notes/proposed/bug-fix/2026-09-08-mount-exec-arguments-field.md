# Agent Note: mount 策略件 exec 载荷字段名修复（args → arguments）

Status: proposed
Review: 待评审

> Provenance：本仓原创修复（2026-09-08，B4 挂载面实机重验批发现）。出处：HANDOFF-todos（B）修复轮条目 + journal 2026-09 卷「B4 挂载面实机重验批」。
> Related：[2026-09-08-b4-mount-wiring](../../implemented/architecture/2026-09-08-b4-mount-wiring.md)（本批修其交付件的宿主合同误读，决定面不变；其 Risks 首条「持久化容忍度」的实证结果随本批事实同步）。

## Problem

B4 实机重验（0.2.0 实装会话真机三路探针，journal 在案）：M1 `skill-usage` / M2 `subtree-touch` 两轮探针零投影，同停止位 M3 `review-surface` 投影精确（turn 级增量与对照探针逐一对账）。根因（源读 + 行为差分双证）：

- **宿主 exec 载荷字段是 `arguments`**：`@deepseek-ai/dsh-tools` `createExecution` 以 `{...base, arguments: deepFreeze(detached)}` 铸造执行对象；`.args` 于 dsh-tools 全库零命中；官方消费方 `dsh-hooks-claude-code` 同面读 `tool_input: exec.arguments`（lib/index.js 372/380 行）。
- B4 策略件读的是 `exec.args?.name`（M1）与 `exec.args?.file_path`（M2）——恒 `undefined`，A3 观测静默零记录；M3 走 `result.content` 不经 exec 参数面，故唯一幸存。
- **selftest 假 exec 夹具带 `args`**（M1/M2 夹具 + 接线假 ctx 共 11 处）复刻了同一错误假设——夹具与被测件共享同一个错，脱宿主冒烟全绿。机制教训：**假夹具的字段名不是独立证词，是假设的回声；夹具形状须与宿主读源逐字对账**（B2「双跑对账零 diff」思想在宿主合同面上的缺口）。

## Proposal

- `adapters/dsh/mount.mts`：`ToolExecLike` 载荷窄面字段 `args?` → `arguments?`（注释钉宿主铸造形态与官方消费方先例）。
- `adapters/dsh/mount-policies.mts`：两处观测读面 `exec.args?.name`（M1）/ `exec.args?.file_path`（M2）→ `exec.arguments?.*`。
- `adapters/dsh/selftest.mts`：M1/M2 假 exec 夹具与接线假 ctx 共 11 处 `args:` → `arguments:`（与宿主铸造形态同字段名；策略件或 glue 若回归 `.args` 读面，夹具即红 = 回归钉）。
- 其余面零改动：A2/A5/A6/A8 接线与合并语义不动（真机已证通）；`exec.arguments` 是 deepFreeze 冻结对象——策略件只读不写，冻结无影响；M2 的 `resolveRepoRoot(config, sessionWorkspaceOf(exec))` 链不动（`exec.agent.session.header.cwd` 与 A2 pre-step payload 同源，真机地图注入已证该链解析正确）。
- 0.2.1 发版（bump + tag `v0.2.1` + npm publish）随收口；M1/M2 真机恢复确认随 0.2.1 重装批（新 todos（B）条）。

## Alternatives considered

- **防御性双读（`exec.arguments ?? exec.args`）**：落败——宿主合同单源是 `arguments`（createExecution 铸造 + 官方消费方读面双证），双读把已证伪的形状永久化 = 对不存在消费者的投机兼容（HERO-E：防御这里不会发生的输入）。
- **selftest 机器断言宿主形状（import dsh-tools 镜像断言）**：落败——防火墙规则 2 要求本模块零宿主依赖、selftest 可脱离 DSH 直测；形状证据以本 ADR 源读证据行承载，机器级确认留给 0.2.1 真机重验批（B 类惯例）。
- **改走 A4（post-execute）观测写面痕迹**：落败——写面痕迹的语义含「被 deny 的调用也是痕迹」，须在执行**前**观测；post 只见已执行调用，语义收窄且破坏 B4 ADR 已拍板的 A3/A4 职责分工。

## Acceptance criteria

- `npm run build` 后 `node dist/adapters/dsh/selftest.mjs` 72 组全绿（夹具 `arguments` 形态）；tsc 零错；gates 全绿。
- dsh-tools 源读证据行在案（createExecution 铸造形态 + `.args` 零命中 + hooks-claude-code 读面）。
- B4 ADR Risks 首条事实同步（持久化容忍度 2026-09-08 真机 ✅）。

## Risks

- 宿主字段再演进（`arguments` 更名）会再次静默失明——本 ADR 证据行是首查点；机器级防回归不可建（防火墙规则 2），残余风险显式在案。
- 0.2.1 真机恢复确认依赖用户重装批；确认前 M1/M2 投影仍缺席（记录件缺缺席不阻塞会话，降级纪律兜底）。
