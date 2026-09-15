# Agent Note: 宿主 peer 集二次升代至 0.1.6-alpha.1——契约断言复跑 + `agent/session-start` 并入 `agent/created` 的接线迁移

Status: implemented

Review: FULL/2026-09-16/pending（三重审核进行中，收口时回填真实结论）

Related: 前批 [2026-09-13-host-peer-generation-upgrade](2026-09-13-host-peer-generation-upgrade.md)（同代机制、探针与 ERESOLVE 单源；本件只换代 + 消费面迁移） · 接线单源 [2026-09-08-b4-mount-wiring](2026-09-08-b4-mount-wiring.md)（A5 归口） · 消费契约 [adapters/dsh/README.md](../../../../adapters/dsh/README.md) · 防火墙 [adapters/AGENTS.md](../../../../adapters/AGENTS.md)

## Problem

宿主实跑代 = `0.1.6-alpha.1`（`~/.dsh/logs/host.log` 的 `[host] dsh 版本` 行自 2026-09-15 17:44 起；本机 profile 树的 `dsh-tools` / `dsh-llm` / `dsh-token-meter` 同代）。本仓 peer 区间 `^0.1.5-rc.2` 与类型契约 devDep（`dsh-token-meter@0.1.5-rc.2`）停在前一代，`semver.satisfies('0.1.6-alpha.1','^0.1.5-rc.2')` = false（`includePrerelease` 变体同为 false）——「断言面与运行面同源」不成立，消费者侧 peer 不满足：前批 Consequences 自诺账的形态。

升代后 `tsc --noEmit` 立刻红一条（`host-api-contract.mts` 的 `_AgentSessionStart`）：宿主把 `agent/session-start` 并入 `agent/created`。两代原始 d.ts 对照（`npm pack @deepseek-ai/dsh-agent@0.1.5-rc.2` 取旧代原件，逐行读）：

| 事件 | `0.1.5-rc.2` | `0.1.6-alpha.1` |
|---|---|---|
| `agent/created` | `{agent}`；注释「composition-only；`agent/session-start` 是第一个 startup-driving 扩展点」 | `{agent, source: SessionStartSource, signal?}`；「entered agent ready for per-agent initialization」 |
| `agent/session-start` | `{agent, source: SessionStartSource}` | 不存在（安装树全树零命中） |

即：旧代拆两个时刻（创建 / 会话开始），新代合并为一个，`source`（`'startup' | 'resume' | 'clear' | 'compact'`）随创建事件下发。其余断言面（`agent/pre-step` / `agent/turn-stopping` / `tools/pre-execute` / `tools/post-execute` / 决策判别式 / tokenMeter 面 / 两组形状相容）在新代逐条仍绿——漂移面恰为这一处。

## Decision

1. **目标代 = 宿主实跑代 `0.1.6-alpha.1`**：根 `peerDependencies` 两件同对齐 `^0.1.6-alpha.1`；`@deepseek-ai/dsh-token-meter` 精确 devDependency `0.1.6-alpha.1`（type-only 契约面，值允许集不变）；`package-lock.json` 同提交。
2. **A5 会话开始时点迁到 `agent/created`**：删 `agent/session-start` listener，其 inject 能力位（零策略）与该事件的命令面幂等补注册、基因库拉取合为**一个** listener——「每挂载点恰一个 `ctx.on`」纪律不变；两件事都非阻塞，旧代「创建 → 会话开始」的先后序在本层零消费，合并无可观察差异。`host-api-contract.mts` 删 `_AgentSessionStart`（`agent/created` 键断言原本在场），断言键集 7 → 6。
3. **升级路径 = 世代整体替换**：单件跨代装必 ERESOLVE（[cookbook](../../../../docs/cookbook.md)「环境」条）——做法 = 从 `package-lock.json` 摘掉全部 `@deepseek-ai/*` 条目 + 删 `node_modules/@deepseek-ai`，再 `npm install --cache=<可写目录>` 重新解析。
4. **失效指针同批收口**：取消真机复验留下的 [`adapters/hermes/README.md`](../../../../adapters/hermes/README.md) 末句；B4 接线 ADR 与情境注入裁决 ADR 的 A5 事件名现值一并改指。

## Alternatives considered

- **维持 `^0.1.5-rc.2` 不动**：落败——区间不含实跑代；断言面继续钉旧代 d.ts，`agent/session-start` 消失这类重构在编译期不可见（本层该事件零策略，运行期也不会有动静）。
- **放宽 peer 为 `>=0.1.5-rc.2 <0.2.0`**：落败——按 semver 预发布规则它仍不含 `0.1.6-alpha.1`；真要跨代得写 `||` 分支，等于把断言面钉在无人运行的世代区间（前批判同型）。
- **保留 `agent/session-start` listener 兼听两代**：落败——兼容层；peer 已换代，旧代不在支持面。
- **A5 改挂 `session/created`（`dsh-session`）**：落败——A5 的动作是 `agent.inject`，session 事件不携 agent 能力位，用它要多一层 session → agent 查表。
- **同一事件上留两个 listener**（一个管拉取/注册、一个管 A5）：落败——违反「每挂载点恰一个 `ctx.on`」，自测 wire-once 断言直接钉住。
- **改旧笔记而不新立**：落败——前批 `Review:` 行是那一批的评审证据，折入会让两批证据混在一条记录里。

## Consequences

- **正面**：断言面与运行面重新同源；宿主事件面重构在 `tsc` 面即红（本次实证：升代后立刻报 `_AgentSessionStart`）；consumer 侧 peer 满足；`agent/created` 单点承载三件事，接线面比「两事件两 listener」更小。
- **负面（自诺账延续）**：`dsh-token-meter` 仍精确钉法——下次升代必须带它同代，否则断言面钉旧代而 peer 面已前移；alpha 代 API 漂移由 `tsc` 契约断言 + 运行期形状闸两通道兜（后者保留）。
- **行为面**：A5 零策略（`mounts.sessionStart` 恒空集），迁移零可观察行为变化；新代 `agent/created` 是 serial 且「listener 抛错即创建失败」，本层该 listener 全程非阻塞、异常内部消化（`mergeSessionStart` 已被 try/catch 包住）——降级纪律不变。
- **影响面清账（四类）**：合同面 = 根 `peerDependencies` 区间 + devDep 版本（跨边界契约 → FULL）；机器面 = `host-api-contract.mts` 断言键集 + `selftest.mts` 接线夹具事件表；数据面 = 无（lock 是派生面）；散文面 = `adapters/dsh/README.md` 挂载面行 + `mount.mts` 类型注 + B4 / 情境注入两 ADR 现值 + `adapters/hermes/README.md` 失效指针。
- **未覆盖**：其余宿主包（`dsh-hooks-claude-code` / `dsh-hooks-codex` 等）的事件面不在断言集（本层零消费）；新代新增事件（`agent/status` / `agent/inbox/*` / `agent/assistant-stream`）不接——触发 = 出现具名消费者。

## 落地读数（2026-09-16）

- 世代替换：23 件 `@deepseek-ai/dsh-*` 全 `0.1.6-alpha.1`（`node_modules/@deepseek-ai/*/package.json` 逐件读）；lock 内 `0.1.5-rc` 零命中；`npm ls --depth=0` 顶层两 peer + tokenMeter 俱在。
- 判据面：`tsc --noEmit` exit 0；`npm run build` exit 0；`node dist/adapters/dsh/selftest.mjs` 124 组全绿；`node dist/adapters/hermes/selftest.mjs` 25 断言全绿。
- 在环判据当轮实证：删旧 listener 的中间态被 A4 lint 在环判据拦回（`evolveCommand` 未用），同轮修正——[升格批](2026-09-09-lint-block-and-staged-hook.md) 的 `feedback` 替换回执语义按设计生效。
