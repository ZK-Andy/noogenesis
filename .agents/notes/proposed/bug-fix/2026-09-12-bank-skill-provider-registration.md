# Agent Note: bank 技能 provider 在宿主未注册——`noo-*` 技能面在自举仓之外未交付

Status: proposed

Related: 被更正的实现件 [2026-09-06-skills-ride-bank](../../implemented/architecture/2026-09-06-skills-ride-bank.md)（决定不变，交付现实更正）；机制件 [skill-provider.mts](../../../../adapters/dsh/skill-provider.mts) / [index.mts](../../../../adapters/dsh/index.mts)；提醒面 [mount-policies.mts](../../../../adapters/dsh/mount-policies.mts) 与 [config.mts](../../../../adapters/dsh/config.mts)；攒账入口 [HANDOFF-evolution-pool](../../../../HANDOFF-evolution-pool.md)（演化轮池）；取证留痕 [journal 2026-09 卷](../../../../journal/2026-09.md)。

## Problem

**现象（实机普查 + 定向复现，2026-09-12）**：

- 会话技能目录普查：desktop 仓（`/mnt/work/dotnet-deepseek-harness-desktop`）**199/199** 会话、dsh-frecency **11/11** 会话的 `<available_skills>` 中 `noo-*` 计数 = 0；Noogenesis 自举仓 262/262 为 7。
- 定向实例（session `030e02dd`，cwd = desktop 仓根）：目录 = 该仓自有的 6 件 `dsh-*`；agent step 1 自载正确技能，step 44/47 因**本插件注入的提醒**去载 `noo-archive-agent-notes` / `noo-doc-standards` → `Error: skill … is unknown or no longer available`，退回它已载的 `dsh-*`。
- 缓存与代码都不构成原因：`<desktop 仓>/.noogenesis/genes-cache` 自 2026-09-06 在位、2026-09-11 刷新；用装包 `noogenesis-dsh@0.2.4` 的 `createBankSkillProvider().list({cwd: desktop 仓根})` 实跑返回全部 7 件，`cwd` 缺席/无关目录才返回空（ENOENT 静默）。

**机制【部分推断 · 未证】**：本插件 `export const inject = ["tools", "systemPrompt"]` 不含 `skills`，而 `registerBankSkills` 在 `apply()` 时**一次性同步读** `ctx.skills`，缺席即 warn 一次并**永不重试**；宿主自家 provider（`dsh-skill-filesystem`）声明 `inject = ["skills"]`。未证的一环 = Cordis 未声明服务在该时点是否恒不可见：沙箱下 `dsh --profile … --dump-config` 需写 `~/.dsh/profiles/**`，被 EROFS 拒绝，未取得直证。**证实/证伪判据**：scratch profile + 临时工作区放 `<tmp>/.noogenesis/genes-cache/.agents/skills/marker-bank-skill/SKILL.md`，headless 跑一句——目录出现 marker = provider 正常（病灶在 cwd/时序），不出现 = 注册未发生。

**二次缺陷（用户可见错误的直接来源）**：提醒面（A2「任务型技能」行 + `config.skillGuards` 默认值）是静态文本，在任何加载本插件的仓都点名 `noo-*`；外仓里这些名字必然不存在，agent 被指引去载不存在的技能（本次实证多耗 2 步）。

**验收空过**：[skills-ride-bank](../../implemented/architecture/2026-09-06-skills-ride-bank.md) 的重验在自举仓做（0.1.3「技能面 7 件在位 + rank 600 遮蔽口径」），那 7 件来自工作区文件系统 provider、不是 bank——判据无法区分来源，故 provider 失效在 6 天、199 个会话里未被发现；该件的 selftest 用假 ctx（`skills` 恒在场），结构性盖不住宿主注册时序。

## Proposal

三件同批（缺一即留缺口），本件即立项记录，实现走异步演化轮：

1. **注册合同**：`inject` 补 `"skills"`（与宿主 provider 同形）；注册改走 `ctx.effect` 或可重试路径，使服务晚到也能补注册；失败仍 warn 留痕，但不再静默永久缺席。
2. **提醒面目录感知**：A2 行与 `skillGuards` 提醒只对**该会话目录中实际存在**的技能点名；外仓不提 `noo-*`（同族 = 待办（C）`git -c … push` 提醒结构不可达条）。
3. **验收判据换血**：新增能区分来源的实证（外仓 scratch + marker 技能必须出现在目录里），并回填被更正件的交付口径；修复批走 FULL（`adapters/**` 属路径触发面）。

## Alternatives considered

- **甲 只改提醒面（不修 provider）**：落败——外仓从此不再误导，但「技能随库分发」这条已拍板能力仍未交付，README / HANDOFF 的对外声明继续为假。
- **乙 用 `dsh-skill-filesystem` 的 `customSkillDirs` 指向缓存取代自定义 provider**：已在被更正件的 Alternatives 判落败（静态声明覆盖不了会话工作区 / cwd 两级 + rank 300 抢占面），本次现象不构成翻案证据。
- **丙 把 7 技能烧进 npm `files`**：已在同件 Alternatives 判落败（内容冻结 + 闭包把治理件拖进包）。
- **丁 只补实证夹具、修复待定**：落败——判据在未修复时会持续红，等于把批次完成判据外包给下一轮。

## Consequences

- 未修前：自举仓之外 `noo-*` 不可用（现状）；提醒面修正后至少不再误导，README / HANDOFF 按更正口径写。
- 修复后仍留的缺口：provider 依赖 `<repoRoot>/.noogenesis/genes-cache` 存在（pull 未跑 = 空面，属设计内降级）；`capsules/` 过滤面仍后置（被更正件 Decision 6 不变）。
- 攒账与开轮：本件入 [HANDOFF-evolution-pool](../../../../HANDOFF-evolution-pool.md)（演化轮池，`feature-flow` §4.6 findings 去向）——攒到可拍板或用户点名即开轮，演进动作不随其他变更批次执行。
