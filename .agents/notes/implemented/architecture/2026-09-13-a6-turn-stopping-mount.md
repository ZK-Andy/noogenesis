# Agent Note: A6 停止前能力位接线——`agent/turn-stopping` 挂载点与停止前策略面裁决（批次 2 序 7）

Status: implemented
Review: FULL/2026-09-13/R1=ok R2=ok R3=ok

批注：R1 1B/2S、R2 2B/3S、R3 4B/3S——采纳 13 拒绝 2。R2 B1（宿主源码自证 `agent.inject` 在停止前同为 `next-step` 入队）把 A6 从「advice + steer 双通道」收为 `steer` 单通道；R1 S2 / R2 B2（本层全可选字段使形状断言零证伪力）补 `agent` / `agent.steer` 键存在性断言；R1 B1 / R2 S1 拆开合并与投递的 try/catch，R2 S2 给 A6 独立告警预算；R3 四条现值同步（批次表行 7 / A8 ADR / 评审实质执行 ADR / 根双语 README 计数）随本批落地。拒绝：R1 S1（三合并器折叠——A6 收为单决策种后与 A2/A4 不再同型，折叠需逐点映射器）、R2 S3（账面按收口提交惯例更新，非缺陷）。

Related: 批次表 [2026-09-13-feature-completion-backlog](2026-09-13-feature-completion-backlog.md) · 前批 [2026-09-08-b4-mount-wiring](2026-09-08-b4-mount-wiring.md)（A2–A5 能力层与「A5 归口」；本件补 A6 腿） · [2026-09-08-a8-session-record-projection-removal](2026-09-08-a8-session-record-projection-removal.md)（记录投影面不可复用；本件接线时同步其现值） · [2026-09-10-review-execution-reconciliation](2026-09-10-review-execution-reconciliation.md)（停止前触点提醒的预拍板与触发；本件订正其停止前候选的档位口径） · 蓝图 [§7/§10](../../../../docs/research/framework-rebuild-blueprint.md) · 主设计 [§11.1](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 适配层防火墙 [adapters/AGENTS.md](../../../../adapters/AGENTS.md)

## Problem

蓝图 §10 C7 的验收判据是「§7 A2–A6 + A8 全部接线且各带最小 smoke；**接线 ≠ 策略**」。B4 批接了 A2–A5 四点，A6 停止前挂载点（`agent/turn-stopping`）至今零接线：它在 B4 Decision 1 表内的原定内容 = 「策略收集记录载荷」，随 A8 撤除批的记录投影面整体退役（宿主 `Session.append` 无 `ignorable` 写入口，下游插件自定义事件类型令会话历史读路径 fail-closed）——该挂载点遂无内容、接线一并搁置，C7 的 A6 腿未兑现。

宿主合同实证（本机 `@deepseek-ai/dsh-*` 0.1.5-rc.2 源码读面：`dsh-agent-loop` 回合循环 + `dsh-agent` 类型面）：

- `agent/turn-stopping`：`dispatch.serial`，payload `{agent, turn, signal}`，listener 签名 `(payload) => Promise<void> | void`——**无 `next`、不接决策返回值**；时刻 = 回合即将关闭（模型无待响应、无新 steering），在边界提交前 await。
- **停止前没有「只投上下文、不续跑」的通道**：回合循环在 await 完 `agent/turn-stopping` 之后重读收口判据 `inbox.nextStep.length === 0` 才 `break`，而两条投递面都写 `next-step` 队列——`agent.steer(message)` = `send(message, "next-step", true)`，`agent.inject(message)` = `send(message, "next-step", false)`。差别只在唤醒（steer 唤醒 idle driver、可开新回合；inject 不唤醒），**两者都会让本回合再跑一步模型步**。故本挂载点的投递面一律是续跑档：任何策略在此点投消息 = 额外模型步与 token 成本。
- 上游同款桥（hooks-claude-code）在 Stop 时刻只用 `agent.steer` 表达阻断、不投上下文——与本条实证同向。
- 契约守约面：payload 键与 `agent.steer` 合同由 `tsc` 类型断言件（`host-api-contract.mts`）守约——键存在性与 payload 形状相容两组互补；该面字段全可选，单靠形状相容对宿主改名/删键零证伪力。

停止前策略面三条候选各有既定裁决或未到触发条（Decision 2），故本项交付能力位、不挂策略。

## Decision

1. **A6 能力位接线（零策略，单通道）**：
   - `mount.mts` 增 `TurnStoppingPayload`（窄面：`agent`〔含可选 `steer` 能力位〕/ `turn` / `signal`）、`TurnStoppingPolicyDecision`（单决策种 `steer` = 强制续跑一步的模型可见消息）、`mergeTurnStopping`（首个 `steer` 胜出并停止扫描；单决策种，无建议行累积；零策略 = 空决策）。
   - `mount-policies.mts` 汇总面增 `turnStopping: []`（策略件出现即增挂）。
   - `index.mts` 增一个 `ctx.on("agent/turn-stopping", …)` listener：合并与投递各自 try/catch（合并异常不得连带丢掉续跑投递）；`steer` 经 `agent.steer` 投递；能力位缺席或投递异常 → A6 独立的每会话一次 warn 降级，回合关闭结果不被改变。
   - `host-api-contract.mts` 增事件键 + `agent` / `agent.steer` 键存在性 + payload 形状相容断言；`selftest.mts` 增合并语义断言 + 零策略冒烟（经假 ctx 捕获 listener）+ 汇总面空集断言。
2. **策略面逐件裁决（本批零挂载）**：
   - **记录投影**（B4 原定）：判不立——A8 撤除批已封（宿主无 `ignorable` 写入口，读路径不容忍下游事件）；重议触发 = 宿主提供写入口或读路径容忍。
   - **评审收口触点提醒**（预拍板 advice 档）：维持缓议——触发 = session-close 步骤 2 对账抓到真实漏网；接线候选两案（engine 代理 / 本挂载点）见评审实质执行 ADR Decision 2。其中「钩子桥停止前触发」一案在本点的真实语义是**续跑类**（Problem 节），启用须按续跑档过 HERO，不得沿用 advice 档记账。
   - **停止前 lint / 门禁扫描**：维持不做——前判在案（git 边界已覆盖推送面；触发 = 出现「不推送就交付」的实际会话）。
3. **档位与降级纪律**：本点唯一档位 = 续跑档（`steer`）——停止前不存在非阻断面，「守卫默认建议档」在此不可达，故任何挂载物都要显式认下额外模型步的成本，逐件过 HERO 并配套防死锁面（`createBlockGate` 先例）；零策略面下不启用。

## Alternatives considered

- **零策略不接线（判不立收口）**：落败——C7 明写「A2–A6 + A8 全部接线且各带最小 smoke；接线 ≠ 策略」，能力位缺口是验收判据缺口，不是策略缺口。
- **保留 `agent.inject` 作「非阻断建议」通道**：落败——停止前 inject 同为 `next-step` 入队（Problem 节），与 steer 一样再跑一步；按非阻断档记账 = 口径与机器语义相反，首个策略增挂即产生文档未预期的额外模型步与成本。
- **只留 inject（去掉 steer）**：落败——两者在本点同为续跑，inject 少一层唤醒能力（idle driver 不醒、消息滞留到下一次唤醒），单通道取语义更直白且能唤醒 driver 的 `steer`。
- **本批挂首个策略（停止前扫门禁 / 提示未修正违规）**：落败——三条候选各有既定裁决或未到触发条（Decision 2），无新证据即挂 = 造不可判信号（防过度设计）；本点只有续跑档，代价更需实证。
- **复用 A5 会话开始位投递代替停止前位**：落败——会话开始与回合边界是两个时刻，A5 只覆盖前者，开始位无法表达「回合已到关闭边界」。
- **记录写进 `events/*.jsonl` 基因事件轨**：落败——事件轨 kind 封闭集只收基因事件（B4 同款裁决），混写 = 双语义污染单文件。

## Consequences

- C7 的 A6 腿兑现；A8 腿维持受宿主约束（重议触发 = 批次表「受宿主约束不可实现」节）。
- 零行为变化：零策略 = 零续跑；能力位缺席与投递异常走 A6 独立的每会话一次 warn 降级，回合关闭结果不被改变。
- 机器面：`gates.json` 条目集与门禁名不变；adapter self-test 断言面随本批扩（合并语义逐条 + 接线冒烟 + 类型契约两组互补断言）。
- 接线与策略分工在案：能力位提供唯一续跑通道，策略启用须另案过 HERO——序 8（M3 记录件，蓝图 M3 行点名 `A6 + A4 + A8`）为同批已排序消费者；序 9（M1 升格档）接点在 A2/A3，不在本点。
- 残余边界：零策略下唯一投递分支（steer 投递）与两条降级分支不可达，仅由合并语义单测与假 ctx 冒烟钉住；策略增挂时补投递面夹具。
