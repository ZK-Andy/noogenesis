# Agent Note: `dsh-invariants` 接入裁决——本包零自有运行时不变量，判不接（批次 2 序 10）

Status: implemented
Review: LIGHT/2026-09-13/语义评审（范围化子代理 R2：0 Blocker + 0 Suggestion——宿主三陈述/组合面三读数/零自有不变量穷尽性/封条引述/链接与计数五项定向检查独立复核全真）

Related: 批次表 [行 10](2026-09-13-feature-completion-backlog.md)（「已判不做」节）· 蓝图 [§9 不做清单](../../../../docs/research/framework-rebuild-blueprint.md) · 主设计 [§7.3 / §11.2](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · token 面兑现 [护栏建设轮 ADR](2026-09-13-guardrail-construction-round.md) · 契约兑现 [轨道 B ADR](2026-09-08-coding-enforcement-track-b.md) · 会话事件面封条 [A8 撤除批](2026-09-08-a8-session-record-projection-removal.md) · 宿主包读面 `@deepseek-ai/dsh-invariants@0.1.5-rc.2`

## Problem

批次表序 10 要求「`dsh-invariants` 接入（机械不变量）」（出处 = 主设计 §7.3/§11.2：该表把「不变量」列为宿主服务扩展面，§7.3 称它「原生提供机械不变量 → 别变臃肿 / 别违反契约可机器强制」）。取证（2026-09-13，宿主 `0.1.5-rc.2` 包读面）：

- `@deepseek-ai/dsh-invariants` = **注册表服务**（`ctx.invariants`）：包自有运行时不变量由该包的 `./invariant` 伴生入口（一个普通插件）调 `ctx.invariants.register("<完整 npm 包名>", installer)` 注册；违规抛 `InvariantError`（`code: "INVARIANT"` + 包名归因）。
- 伴生件只断言**其包拥有的**事件流或可变数据关系；宿主 README 明写「确认方法、插件名、注入或固定纯函数结果是类型、加载或单元测试关注点，**绝不是运行时不变量**」。
- 注册表**不是默认在场**：`dsh-sdk-minimal` 的 patch 挂它 + 宿主四个核心伴生件；`dsh-base` 刻意省略运行时诊断。本仓装机组合（`~/.dsh/profiles/web` 的 bundles = `dsh-base` + `dsh-web-app` + …）未挂注册表。
- 本插件现状：零 `./invariant` 伴生入口、零 `ctx.invariants` 消费、**A8 撤除批后不向宿主会话写任何自定义事件**。
- 蓝图 §9 不做清单已排除「invariant 伴生件族 / guard 自挂守卫」（理由 = HERO-O 典型形态「为守卫再造守卫」）；批次表「已判不做」节重复该条。

本插件拥有的关系逐面核：会话级挂载态（A2 开场图一次、A3 每技能一次、A4 拦回计数、A5/A6 零策略、token 基线 read-once）全在**进程内存态**；bank/genes-cache 是文件态、由 `pull` 与 manifest 自管；引擎面是进程退出码 + stdout 合同。**没有**「宿主可观察的持久事件流 ↔ 可变快照」关系——而那正是注册表设计要检查的形态。

## Decision

1. **判不接**：不写 `./invariant` 伴生入口，也不在 `cordis.patch.yml` 挂注册表。
   - **无本包自有的运行时不变量可写**。剩余候选只剩「per-session 去重是否成立」一类，其观测面在本包进程态；要让它对宿主可见，只能重新引入自定义会话事件写入——正是 [A8 撤除批](2026-09-08-a8-session-record-projection-removal.md)封掉的面（宿主无 `ignorable` 写入口 + 读路径 fail-closed）。
   - HERO 两问：检测的具体失败 = 去重态失效导致的重复注入（观测到的唯一实例 = 插件态复位后 advice 重发行，代价 = 一行冗余 advice，零返工）；真出现后下一步不同的事 = 改实现，不是加运行时守卫。以此立伴生件即「为守卫再造守卫」。
2. **设计稿靠它承载的两条不变量已由更便宜的面兑现**，不借注册表重复：「别变臃肿」= 常驻注入字面预算（装载期 fail-closed）+ token 基线读数（观察面，[护栏建设轮 ADR](2026-09-13-guardrail-construction-round.md)）；「别违反契约」= tsc 宿主合同断言（`adapters/dsh/host-api-contract.mts`）+ `package-invariants` / `host-service-reads` / `gates.json` 矩阵（[轨道 B ADR](2026-09-08-coding-enforcement-track-b.md)）。
3. **封条在案**：本项落蓝图 §9「invariant 伴生件族」不做清单；将来要做须按批次表「已判不做」纪律**逐条重拍**。
4. **重议触发**（满足任一即重开本项）：
   - **T1**：本插件重新产生宿主可观察的**持久**关系（例 = 重开会话事件轨写入，或托管跨会话状态文件），且该关系有非重复的机器判据。
   - **T2**：出现「宿主注册表能捕获、而本仓门禁漏掉的真实运行时违约」实例 ≥1（附会话卷与证据行）。
   - **T3**：分发的组合面改为自带注册表（例 = 胶囊分发携带自己的 profile），届时伴生件有无对象再议。

## Alternatives considered

- **出伴生件（`./invariant` + `register`）**：落败——落蓝图 §9 封条；且可写的只剩「服务/方法/注入是否存在」类断言，正是宿主 README 明确排除的那类（HERO-O 形态）。
- **在 `cordis.patch.yml` 挂注册表**：落败——注册表是组合面选择，不是插件面；`dsh-base` 刻意不带运行时诊断，本插件也不消费该服务，挂载只增组合面与启动成本。
- **把「per-session 去重」做成宿主可观察的运行时不变量**：落败——需要重新引入自定义会话事件（A8 已封），且其失败代价（一行冗余 advice / 一次重复注入）与新建伴生件、导出面、缺席降级路径的成本不成比例。
- **只立行动区待办一条**：落败——升格/接入类决策需具名触发与时刻，待办条没有触发时刻（触发面扩面批与前两序同款裁决）。
- **不立 ADR、只把行 10 标 done**：落败——本项撞蓝图 §9 封条，须独立裁决件记录「为何不接」，否则后续会话会把同一取证再走一遍。

## Consequences

- 批次表行 10 标 done（指针 = 本件）；「未交付」计数 37 → 36；**批次 2（序 6–10）全部收口**，游标进批次 3（须先立 P1 D2 禁区重拍 ADR）。
- 机制零变化：`cordis.patch.yml`、`package.json`（`exports` / `files`）、`adapters/**` 均不动；本件 LIGHT 档（纯文档收口）。
- 无新增宿主依赖面：注册表在组合里在场与否都不改变本插件行为（既不出伴生件也不消费 `ctx.invariants`）。
- 复算口径 = 宿主包读面（`@deepseek-ai/dsh-invariants` 的 README/types + 各 bundle 的 `cordis.patch.yml` 挂载行 + `~/.dsh/profiles/<name>/package.json` 的 bundles 列表）。
