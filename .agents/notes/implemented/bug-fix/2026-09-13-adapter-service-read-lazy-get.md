# Agent Note: 可选宿主服务读取面统一走 `ctx.get`——直读属性在插件 runtime fiber 上缺席即抛

Status: implemented
Review: FULL/2026-09-13/R1=ok R2=ok R3=ok

> Related：同族先例 = [bank 技能 provider 修复件](2026-09-12-bank-skill-provider-registration.md)（`ctx.skills` 直读）、[护栏建设轮](../architecture/2026-09-13-guardrail-construction-round.md) 决定 1（`ctx.tokenMeter` 直读，探针实测 fiber 语义）；机制判据 = [适配层宿主服务读取面闸](../process/2026-09-13-host-service-reads-gate.md)；出处 = [演化轮池](../../../../HANDOFF-evolution-pool.md) 候选（护栏轮余项收尾批 R1/R2 Blocker 同族面）；装载契约家 = [M2 适配层 ADR](../architecture/2026-09-06-m2-adapter-wiring.md)。

## Problem

`adapters/dsh/index.mts` 的提问面（solidify 人工确认）在 disposal 时直读属性 `ctx.userQuestions`，而该服务按 M2 拍板**不进**插件 `inject` 声明（`inject = ["tools", "systemPrompt"]`），读法取懒取用的本意正是避开注入面推迟装载。

cordis runtime fiber 对未 inject 的服务直读属性即抛（`cannot get property "userQuestions" without inject`）；该读点在 `try` 之外，于是：`askFactory` 的 async 闭包 reject → `runSolidifyTrigger` 的 `Promise.race` 整体 reject → `index.mts` 的 `.catch` 打一条 `noogenesis solidify trigger failed` warn，**`notice` 不发射**。文档承诺的「提问面缺席 → 只提醒」降级在缺席宿主里不可达：降级路径从「提醒 + 可选提问」退化成一条 warn（可运行的精确命令也一并丢失）。

同族已复发两次并各有实测取证：`ctx.skills` 直读（[修复件](2026-09-12-bank-skill-provider-registration.md)）、`ctx.tokenMeter` 直读两处（[护栏建设轮](../architecture/2026-09-13-guardrail-construction-round.md) 勘误,探针结论 = 插件 runtime fiber 缺席即抛 / `ctx.get` 返 `undefined`）。`ctx.get(<name>)` 是本层既有的合法读法（`token-baseline.mts` 起）。

证据强度：读点形态 = 【实测】静态判据在修复前树上实跑命中该行（n=1，见上闸 ADR 的噪声实测）；降级不可达的机制 = 【实测】selftest 假件复刻 fiber 语义（`userQuestions` 属性 = 抛错 getter，`ctx.get` 返 stub）——旧读法在该假件下 ask 从不被调用、只留失败 warn。

## Decision

1. **可选宿主服务一律经 `ctx.get(<name>)` 取用**：提问面改 `ctx.get("userQuestions") as UserQuestionsLike | undefined`（窄结构面类型，不引宿主类型）。类型面的 `ctx.userQuestions` 属性声明随之删除——不在类型上保留直读入口。
2. **上闸兜住同类**：`scripts/verify-host-service-reads.mts`（白名单外 `ctx.<name>` 读取即拒；判据与门槛 = [上闸 ADR](../process/2026-09-13-host-service-reads-gate.md)）。
3. **降级语义按文档兑现**：服务缺席 → `askFactory` 返 `null` → `notice` 正常发射（不抛、不再问）；服务在场 → 照常提问。selftest 用抛错 getter 假件把两条腿都钉住（在场出提醒 + 缺席零 warn 只提醒）。
4. **规则落纪律面**：[adapters/AGENTS.md](../../../../adapters/AGENTS.md) 的 userQuestions 条目改写成「可选宿主服务经 `ctx.get` 取用：不直读属性，也不进 `inject` 声明」并挂闸指针；`adapters/dsh/README.md` 与 `index.mts` 头注按现态改写。

## Alternatives considered

- **保留直读、只把读点挪进 `try`**：落败——把「缺席」降级换成「抛错」降级，仍以异常当控制流，且提问面缺席时多出一条 warn；`ctx.get` 是既有的无 inject 要求读法，无需异常路径。
- **把 `userQuestions` 加进 `inject` 声明**：[M2 ADR](../architecture/2026-09-06-m2-adapter-wiring.md) 已实测落败——cordis 把缺席注入服务的插件置 INACTIVE、推迟整个装载，降级更不可达。
- **非空断言 / 默认空实现**（`ctx.get("userQuestions") ?? { ask: async () => null }`）：落败——把「服务缺席」伪装成「永远在场」，将来 ask 形态变更会把缺陷推到宿主边界之外；`undefined` 判定是显式的降级条件。
- **只在文档写明「直读会抛」**：落败——同族已复发三次（skills / tokenMeter ×2 / userQuestions），纪律面挡不住形态相同的下一处；静态判据零噪声（见上闸 ADR）。

## Consequences

- **行为面**：提问面缺席的宿主里 disposal 现在真的走「只提醒」（`notice` 带可手跑的精确命令）；旧行为是一条失败 warn。
- **采用面**：`adapters/dsh/index.mts`（读面 / 类型面 / 头注）、`adapters/dsh/selftest.mts`（问答面两条腿夹具）、`adapters/AGENTS.md`、`adapters/dsh/README.md`、[M2 ADR](../architecture/2026-09-06-m2-adapter-wiring.md) Alternatives 的读法事实同步。
- **判据边界**：静态闸只认标识符 `ctx` 的属性读取；服务名经字符串传参（`ctx.get("…")`）不受约束——无 inject 要求即合法读法，不是缺口。
- **真机面**：提问面缺席的宿主不可按需构造（在装 profile 均带提问面），故行为证据 = selftest 假件（fiber 语义复刻）+ 闸的修复前实测；装机面随下次发版一并复验（[HANDOFF-todos](../../../../HANDOFF-todos.md) 的读数建议行 (B) 条同批次装机）。
- **评审收口（2026-09-13，FULL 三审）**：R1 0B/3S、R2 1B/3S、R3 0B/5S——本件无随批修改（两路定向检查对本件的断言面与夹具区分力判「无发现」）；三路计数与采纳明细单源 = [上闸 ADR](../process/2026-09-13-host-service-reads-gate.md) 的评审收口条。
- **勘误通道**：若 cordis 变更 fiber 语义（未 inject 服务直读不再抛），本件的机制前提失效——按 [notes/README](../../README.md) Erratum 通道处理，闸的白名单面不受影响。
