# Agent Note: A6 停止前能力位接线——`agent/turn-stopping` 挂载点与停止前策略面裁决（批次 2 序 7）

Status: proposed

Related: 批次表 [2026-09-13-feature-completion-backlog](2026-09-13-feature-completion-backlog.md) · 前批 [2026-09-08-b4-mount-wiring](../../implemented/architecture/2026-09-08-b4-mount-wiring.md)（A2–A5 能力层与「A5 归口」；本件补 A6 腿） · [2026-09-08-a8-session-record-projection-removal](../../implemented/architecture/2026-09-08-a8-session-record-projection-removal.md)（记录投影面不可复用） · [2026-09-10-review-execution-reconciliation](../../implemented/architecture/2026-09-10-review-execution-reconciliation.md)（停止前触点提醒的预拍板与触发） · 蓝图 [§7/§10](../../../../docs/research/framework-rebuild-blueprint.md) · 主设计 [§11.1](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 适配层防火墙 [adapters/AGENTS.md](../../../../adapters/AGENTS.md)

## Problem

蓝图 §10 C7 的验收判据是「§7 A2–A6 + A8 全部接线且各带最小 smoke；**接线 ≠ 策略**」。B4 批接了 A2–A5 四点，A6 停止前挂载点（`agent/turn-stopping`）至今零接线：它在 B4 Decision 1 表内的原定内容 = 「策略收集记录载荷」，随 A8 撤除批的记录投影面整体退役（宿主 `Session.append` 无 `ignorable` 写入口，下游插件自定义事件类型令会话历史读路径 fail-closed）——该挂载点遂无内容、接线一并搁置，C7 的 A6 腿未兑现。

宿主合同实证（本机 `@deepseek-ai/dsh-*` 0.1.5-rc.2 源码读面）：

- `agent/turn-stopping`：`dispatch.serial`，payload `{agent, turn, signal}`，listener 签名 `(payload) => Promise<void> | void`——**无 `next`、不接决策返回值**；时刻 = 回合即将关闭（模型无待响应、无新 steering），在边界提交前 await。
- 投递面（`Agent` 接口）：`agent.steer(message)` = 提交 steering，机器重读 inbox、新 steering 再跑一步（**强制续跑**）；`agent.inject(message)` = 为下一 pre-step 排队模型可见上下文、不唤醒 driver（空闲 driver 留待 follow-up / steering 唤醒）。上游同款桥（hooks-claude-code）在 Stop 时刻用 `agent.steer` 表达阻断。
- 契约守约面：payload 键与 `Agent.steer` / `Agent.inject` 合同由 `tsc` 类型断言件（`host-api-contract.mts`）守约，宿主漂移即编译红。

停止前策略面三条候选各有既定裁决或未到触发条（Proposal 2），故本项交付能力位、不挂策略。

## Proposal

1. **A6 能力位接线（零策略）**：
   - `mount.mts` 增 `TurnStoppingPayload`（窄面：`agent`〔含可选 `inject` / `steer` 能力位〕/ `turn` / `signal`）、`TurnStoppingPolicyDecision`（`advice` = 建议行经 `agent.inject`；`steer` = 强制续跑消息经 `agent.steer`）、`mergeTurnStopping`（建议行按注册序累积；首个 `steer` 胜出并停止扫描，与 A3 `deny` 同型；胜出时已累积的建议行随行返回，不早退丢弃——A3 同款纪律）。
   - `mount-policies.mts` 汇总面增 `turnStopping: []`（策略件出现即增挂）。
   - `index.mts` 增一个 `ctx.on("agent/turn-stopping", …)` listener：合并 → 建议行经 `agent.inject`、`steer` 经 `agent.steer`；能力位缺席或投递异常 → warn 降级（每会话至多一条），**绝不改变回合关闭结果**。
   - `host-api-contract.mts` 增事件键与 payload 形状相容断言；`selftest.mts` 增合并语义断言 + 零策略冒烟（经假 ctx 捕获 listener）+ 汇总面空集断言。
2. **策略面逐件裁决（本批零挂载）**：
   - **记录投影**（B4 原定）：判不立——A8 撤除批已封（宿主无 `ignorable` 写入口，读路径不容忍下游事件）；重议触发 = 宿主提供写入口或读路径容忍。
   - **评审收口触点提醒**（advice 预拍板在案）：维持缓议——触发 = session-close 步骤 2 对账抓到真实漏网；接线候选两案（engine 代理 / 本挂载点）见评审实质执行 ADR Decision 2。
   - **停止前 lint / 门禁扫描**：维持不做——前判在案（git 边界已覆盖推送面；触发 = 出现「不推送就交付」的实际会话）。
3. **档位与降级纪律**：能力位提供 advice / steer 两通道；`steer` 属阻断档，任何策略启用前逐件过 HERO，并须配套防死锁面（`createBlockGate` 先例）——零策略面下不启用强制续跑。

## Alternatives considered

- **零策略不接线（判不立收口）**：落败——C7 明写「A2–A6 + A8 全部接线且各带最小 smoke；接线 ≠ 策略」，能力位缺口是验收判据缺口，不是策略缺口。
- **只接 advice 通道（不提供 `steer`）**：落败——停止前时刻的宿主独有机器面就是 `steer`（`inject` 在停止前只能排队到下一次唤醒）；各挂载点能力层按宿主决策面接全（A2 `reject`、A3 `deny` / `ask` 均零策略在场先例），砍掉唯一阻断通道 = 接线残废，未来策略要阻断就得再改接线面。
- **本批挂首个策略（停止前扫门禁 / 提示未修正违规）**：落败——三条候选各有既定裁决或未到触发条（Proposal 2），无新证据即挂 = 造不可判信号（防过度设计）。
- **复用 A5 会话开始位注入代替停止前位**：落败——会话开始与回合边界是两个时刻，A5 只覆盖前者，开始位无法表达「回合已到关闭边界」。
- **记录写进 `events/*.jsonl` 基因事件轨**：落败——事件轨 kind 封闭集只收基因事件（B4 同款裁决），混写 = 双语义污染单文件。

## Consequences

- C7 的 A6 腿兑现；A8 腿维持受宿主约束（重议触发 = 批次表「受宿主约束不可实现」节）。
- 零行为变化：零策略 = 零注入、零续跑；能力位缺席与投递异常走 warn 降级（每会话至多一条），回合关闭不受影响。
- 机器面：`gates.json` 条目集与门禁名不变；adapter self-test 断言面随本批扩（合并语义逐条 + 接线冒烟）。
- 接线与策略分工在案：能力位提供通道，策略启用（含 `steer` 升格）须另案过 HERO——序 8（M3 记录件）/ 序 9（M1 升格档）为同批已排序消费者。
- 残余边界：零策略下 advice / steer 两条投递分支不可达，仅由合并语义单测与假 ctx 冒烟钉住；策略增挂时补投递面夹具。
