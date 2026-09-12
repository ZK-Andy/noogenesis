# Agent Note: bank 技能 provider 注册时序缺陷——`noo-*` 技能面在自举仓之外未交付

Status: implemented

> Provenance：本仓原创（2026-09-12 实机普查取证 + 真 cordis 注入语义探针 + 同会话修复批；FULL 三审）。

Review: pending

中文（本仓正文中文单语）

## Problem

**现象（实机普查 + 定向复现，2026-09-12）**：

- 会话技能目录普查：desktop 仓（`/mnt/work/dotnet-deepseek-harness-desktop`）**199/199** 会话、dsh-frecency **11/11** 会话的 `<available_skills>` 中 `noo-*` 计数 = 0；Noogenesis 自举仓 262/262 为 7。
- 定向实例（session `030e02dd`，cwd = desktop 仓根）：目录 = 该仓自有的 6 件 `dsh-*`；agent step 1 自载正确技能，step 44/47 因**本插件注入的提醒**去载 `noo-archive-agent-notes` / `noo-doc-standards` → `Error: skill … is unknown or no longer available`，退回它已载的 `dsh-*`。
- 缓存与 provider 代码都不构成原因：`<desktop 仓>/.noogenesis/genes-cache` 自 2026-09-06 在位、2026-09-11 刷新；用装包 `noogenesis-dsh@0.2.4` 的 `createBankSkillProvider().list({cwd: desktop 仓根})` 实跑返回全部 7 件。

**机制（探针实测）**：装载期 `apply()` 里一次性读 `ctx.skills`——该服务此时点尚未到场时，cordis 代理抛 `cannot get property "skills" without inject`，被注册件的 catch 吞成一条 warn 后**永不重试**（探针 A2）；服务若已在场则同一读取成功（探针 A）。病因是**时序**：注册点早于 skills 服务就位，且注册路径没有重试。

**二次缺陷（用户可见错误的直接来源）**：提醒面（A2「任务型技能」行 + `config.skillGuards` 缺省表）只判「仓里有没有技能文件」，不判这些名字是否进了宿主 catalog；外仓里被点名的技能必然载不到。

**验收空过**：`skills-ride-bank` 的重验在自举仓做（0.1.3「技能面 7 件在位 + rank 600 遮蔽口径」），那 7 件来自工作区文件系统 provider、不是 bank——判据无法区分来源，故缺陷在 6 天、199 个会话里未被发现；该件 selftest 用假 ctx（`skills` 恒在场），结构性盖不住宿主注册时序。

## Decision

1. **注册合同 = 可重试注入**：`registerBankSkills` 走 `ctx.inject(["skills"], callback)`（cordis 动态注入子 fiber）——skills 服务装载前已在场则回调同步执行并注册，晚到则到场时补注册（探针 B）。**不**把 `skills` 加进插件 `inject` 声明：全局声明让整个插件等到服务到场才 `apply`，服务永不到场则插件完全不装载（探针 C/C2），与适配层既有的 userQuestions 教训同型。`ctx.inject` / skills 服务 / `registerProvider` 三态缺席或抛错各自 warn 留痕降级，绝不阻塞装载。返回值 `{ isRegistered, invalidate }`：`isRegistered` = provider 已交给宿主（第 2 条的可达性门消费），`invalidate` 语义不变。
2. **提醒面只点名可达技能**：可达集 = 两条交付通道的目录实况并集——活副本 `<repoRoot>/.agents/skills`（宿主文件系统 provider，与随库注册无关）+ 随库缓存 `<repoRoot>/.noogenesis/genes-cache/.agents/skills`（**仅在 provider 注册成功后计入**）。A2 路标行按可达集渲染（任务→技能映射表结构化，不可达技能剔除，零可达不发行）；A3 触点提醒命中后按可达集过滤（不可达条目静默，且不消耗该技能的提醒预算）；命中后才求值可达集——零命中零 fs 访问。诊断留痕：缓存里有技能而 provider 未注册 = 交付未发生，每会话一条 warn。
3. **验收判据换血**：夹具改为「来源可区分 + 注册时序可判」——(a) 注册件三态 + 晚到/在场两路（`ctx.inject` 收到的 deps、回调前 `isRegistered()` 为假、回调后为真、`invalidate` 生效）；(b) 可达性门逐条（缓存未注册仓静默 + 诊断 warn；注册后同名技能开始被点名；部分可达只点名在场件；不可达命中不消耗预算）；(c) 来源区分（缓存单通道仓里 provider 只服务缓存件、candidate 带 `noogenesis-bank` 与 rank 600，活副本是另一 provider）；(d) index 接线冒烟走完整路径（假 ctx 捕获 `ctx.inject(["skills"], …)`，注册前提醒静默、注册后投递，证明 `isRegistered` 真的透传进策略件）。
4. **交付口径回填**：`skills-ride-bank` 的交付更正句与 `adapters/dsh/README.md` 技能面/配置表/挂载面三处按现态改写。

## Alternatives considered

- **甲 只改提醒面（不修 provider）**：落败——外仓从此不再误导，但「技能随库分发」这条已拍板能力仍未交付，README / HANDOFF 的对外声明继续为假。
- **乙 `inject` 声明补 `"skills"`（立项首选）**：落败——探针 C/C2 实测：服务不到场则 `apply` 根本不跑，system-prompt 节、三工具、四挂载点一起死；适配层 AGENTS.md 已把同款教训写在 userQuestions 条目上。
- **丙 用 `dsh-skill-filesystem` 的 `customSkillDirs` 指向缓存取代自定义 provider**：维持落败（静态声明覆盖不了会话工作区 / cwd 两级 + rank 300 抢占面），本次现象不构成翻案证据。
- **丁 把 7 技能烧进 npm `files`**：维持落败（内容冻结 + 闭包把治理件拖进包）。
- **戊 提醒面只判「有没有任何技能面」而不按名对齐**：落败——缓存只有 3 件时仍会点名缺失的 4 件，正是本次要消除的误导。
- **己 注册不设诊断留痕（静默等待服务到场）**：落败——「静默缺席 6 天 / 199 会话」正是本缺陷未被发现的成因结构。

## Consequences

- 注册不再依赖装载顺序：宿主提供 skills 服务即在位（含晚到补注册）；宿主无 `ctx.inject` 或 skills 服务时留 warn 后降级（技能面缺席，其余面照常）。
- 提醒面在两条交付通道之外零点名。残余边界：本插件看不到宿主用户级技能目录，显式 `skillGuards` 条目若指向那类技能则不发行（宁可不说，也不指一个载不到的技能）。
- **真机验收未闭环**：判据 = 外仓（其 `.noogenesis/genes-cache` 有技能）新会话的 `<available_skills>` 出现 `noo-*`，且提醒不再指向载不到的技能（todos (B) 条）。
- provider 仍依赖 `<repoRoot>/.noogenesis/genes-cache` 存在（pull 未跑 = 空面，设计内降级）；`capsules/` 过滤面仍后置（`skills-ride-bank` Decision 6 不变）。

## Evidence

**注册时序探针（真 cordis 4.0.2，仓内 devDependency；5 场景各 1 次，确定性机制演示）**：

| 场景 | 结果 |
|---|---|
| A 未声明 inject、skills 装载前在场 | 读到服务（未声明不构成读取禁令） |
| A2 未声明 inject、skills 缺席于 apply | `throw: cannot get property "skills" without inject` |
| B `ctx.inject(["skills"], cb)` + 之后 provide | 回调晚到触发（`registered-after-provide`） |
| C 全局 `inject` 含 skills、缺席 | `apply` 未运行 |
| C2 全局 `inject` 含 skills、服务永不提供 | `apply` 永不运行 |

**夹具（`node dist/adapters/dsh/selftest.mjs`）**：94 组全绿；本批组 = 注册件三态 + 晚到补注册、来源区分、可达性门逐条、A2 路标行两通道、index 接线可达性门。防火墙机器检查（值 import 仅 `index.mts`）仍绿——未新增宿主依赖。

**门禁**：`gates.mts --run` 全绿——adr-format / doc-budgets / md-links / cookbook / skill-format / archived-notes / postmortem-naming / handoff-structure / manifest / lint / secrets / command-surface / export-docs / package-invariants / ts-typecheck（review-tier / review-brief / change-scope 三件结构性例外按各自契约跑）。

## Related

- 被更正件 [2026-09-06-skills-ride-bank](../architecture/2026-09-06-skills-ride-bank.md)（provider 形态 / rank 600 / 蒸馏正文 / invalidate 语义全部沿用，本件只改注册时序与提醒面判据）。
- 槽位来源：演化轮池候选（[HANDOFF-evolution-pool](../../../../HANDOFF-evolution-pool.md)），用户点名开轮；销账随本批收尾。
