# Agent Note: 情境按需注入（命中节动态信号）裁决——同一失败面已由 A2/A3 显式信号承接，判不立（批次 3 序 15）

Status: implemented
Review: LIGHT/2026-09-13/语义评审（范围化子代理 R2：2 Blocker + 5 Suggestion 全采纳——批次表封条行残留 + profile 数口径矛盾；grep 漏 `*.yml`、A2/A5 归属、`noo_select` 口径、与四源关系措辞、两件先前 ADR 的前向现值句）

Related: 站立规则 [Detect 逐源裁决（一）](2026-09-13-detect-source-verdict-session-event.md)（自动 Detect 默认关 + 逐源门槛）· 四源收口 [(四) `tool/result`](2026-09-13-detect-source-verdict-tool-result.md) · 批次表 [行 15](2026-09-13-feature-completion-backlog.md) · [M2 适配层 ADR](2026-09-06-m2-adapter-wiring.md)（system-prompt 双节 = 命中节与 `injectSignals` 的家）· [B4 挂载面 ADR](2026-09-08-b4-mount-wiring.md)（A2 子树规则地图 + HERO 答案 + A1 注入时序实证）· [M1 立项 ADR](2026-09-10-m1-guard-anti-overdesign.md)（A3 技能触点提醒）· [护栏建设轮 ADR](2026-09-13-guardrail-construction-round.md)（常驻注入字面预算）· [P1 骨架 D2](2026-09-05-p1-engine-skeleton.md) · 主设计 [§8.3 DSH 注入点 / §6 生命周期](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 蓝图 [§7 挂载面表](../../../../docs/research/framework-rebuild-blueprint.md)

## Problem

批次表行 15 要求实现「情境按需注入（命中节动态信号，替代静态 `injectSignals`）」，出处 = 主设计 §8.3「情境知识：按相关性检索出的 gene 经 `agent/session-start` / `agent/pre-step` / 工具边界注入成控制信号（短、带 AVOID，不是长文档）」。该行带站立规则（[序 11 Decision 1](2026-09-13-detect-source-verdict-session-event.md)：自动 Detect 默认关 + 逐件过 HERO 两问），故先裁判据再谈实现。

现态取证（2026-09-13，本仓源码 + 本机 profile 面）：

- **常驻命中节**（现形态）：`index.mts:174–184` 注册 system-prompt `text` provider `tool:noogenesis:hits` → `section.mts` 的 `createHitsSection`；信号 = `config.injectSignals`（`config.mts:149/166`，缺省 `[]`），命中内容 = 引擎 `select` 的命中行。provider **每模型步运行**；空信号**短路零 spawn**（`section.mts:150–151`，注释在案：select 空键必 exit 2，纯浪费一子进程/每次 prompt 组装）。
- **消费面 = 零**：本机 `$DSH_HOME/profiles` 两个 profile 中仅 `dotnet-desktop` 装载本插件（`web` 的 `dsh.profile.bundles` 不含 `noogenesis-dsh`），且它、`web` 与 `~/.dsh/settings.yaml` 均未声明 `injectSignals`（`grep -rn injectSignals ~/.dsh --include=*.json --include=*.yml --include=*.yaml` 零命中，除 `storages/session_projcache/` 会话转录）→ 现网命中节恒渲染 `""`、零 token、零引擎调用。
- **信号合同 = 字面短语精确匹配**（`engine/select.ts:9–14` 归一化后集合比较）；本仓 6 基因的 `signals` 全为自然语言短语（`文档放哪` / `字数超限` / `git 对账` / `新增基因` …）。
- **设计 §8.3 点名的三个注入时刻已在场**：会话开始 / 一步前 = A2 子树规则地图 + 技能路标（走每会话首个 `agent/pre-step`；[B4 ADR](2026-09-08-b4-mount-wiring.md) Decision 4，含 HERO 答案。`agent/session-start` 是 A5 零策略能力位，该时刻零注入）；工具边界 = A3 技能触点提醒（[M1 立项 ADR](2026-09-10-m1-guard-anti-overdesign.md)）与 A4 block / context。A3 的信号面 = **显式机器可判字面面**（写码工具 `file_path` / bash 重定向与 `tee` 目标 / `command` 正则，`config.skillGuards`）；A2 的面 = 子树 `AGENTS.md` 存在性 + `SKILL_ROSTER` 可达集（`mount-policies.mts`）。
- **模型显式入口**：`noo_select` 可用且在用（本仓会话卷实扫，路径 `~/.dsh/sessions/--mnt-work-Noogenesis--/<session>/session.v3.jsonl.zstd`，口径 = `tool/call` 的 `name`）：`noo_select` 调用 11 次（11 卷各 1 次）【探索性：单机单仓、截至 2026-09-13】。

HERO 两问逐派生面过（检测到什么具体失败 → 真出现后下一步做什么不同）：

1. **从任务文本派生**（prompt / assistant 轨迹 → 信号键）：prose 分类，[B4 ADR](2026-09-08-b4-mount-wiring.md) 的 M1 HERO 答案与[序 11](2026-09-13-detect-source-verdict-session-event.md) 已两次判「硬造不可判定信号」。
2. **从工具 exec 面派生**（工具名 / 路径 / 命令 → 信号）：这些字面面**已在消费**——A3 技能触点提醒以同一批字面面在**同一时刻**投递；再接一条 gene 信号即同信号双通道注入，且需把路径 / 命令硬映射到自然语言基因信号（如 `docs/` → `文档放哪`），映射表无判据来源 = 硬造信号。
3. **从会话事件流派生**：[序 11](2026-09-13-detect-source-verdict-session-event.md) 已判 `session/event` 判不立；`tool/result` 面由[序 14](2026-09-13-detect-source-verdict-tool-result.md) 判已由 A4 消费。
4. **从工作区 / 子树派生**（cwd → 仓属基因）：机器可读但**每会话恒定**，与静态 `injectSignals` 的差别只在配置位置；现网无任一 profile 声明信号 → 无具名失败实例。
- **第二问（真出现后下一步不同的事）**：无——设计 §8.3 的「按需注入」已由 A2/A3 以建议档承接（子树规则地图 + 技能触点提醒），gene 内容另有模型显式入口 `noo_select`，两者都改变下一步且已在场。

## Decision

1. **判不立**：不把动态信号接入常驻命中节；`injectSignals` 的显式声明合同不变（缺省 `[]`）。常驻命中节维持「显式信号 → 命中行」单一路径。
2. **行 15 的 HERO 两问答案**：检测的具体失败 = 未命名（四派生面分别落 prose 不可判 / A3 同刻同面双通道 + 硬造映射 / 序 11 已裁 / 静态等价且零实例）；真出现后下一步不同的事 = 无（同一失败面已由 A2/A3 建议档与 `noo_select` 显式入口承接）。
3. **与行 11–14 的关系在案**：本项不是 Detect 源而是注入面机制；其派生面或落在已裁四源上（`session/event`；工具 exec 面 = `tool/result` 近邻且由 A3 消费），或落在 B4 M1 已判不可判的 prose 面与静态等价面（cwd 派生）上——站立规则同样适用，四源收口不因本项改变。
4. **重议触发**（满足任一即重开本项并重写本件指针）：
   - **T1**：出现具名实例——某卷实证「会话任务面需要某 gene，A2/A3 建议档与 `noo_select` 显式入口都接不住，且代价 ≥ 一次返工」（附会话卷）。
   - **T2**：出现**按字面面注入 gene** 的实际配置需求实例（要表达「某路径 / 某命令 → 某 gene 信号」，而现有 A3 技能提醒接不住）——届时按**配置声明形态**（非自动 Detect）在 A3 建议档重估，并复用 `skillGuards` 的条目形状。
   - **T3**：宿主给出**非驻留**的按需注入契约（如 `agent/pre-step` 的 `additionalContexts` 成为 gene 行的直通通道），使「每模型步 spawn `select`」的成本面消失——届时在 A2/A3 面重估，不回常驻命中节。
5. **成本面在案**：现网 `injectSignals` 零声明 → 本项判不立零成本变化；若判接，常驻命中节从「每模型步短路零 spawn」变为「每模型步一个 `select` 子进程」，且命中内容随步变化——该恒常代价独属本项（护栏的字面预算判据按 `maxIndexGenes` 上界，不受影响）。

## Alternatives considered

- **判接（常驻命中节改动态信号）**：落败——四条派生面全落已裁面或不可判面；现网零消费面，收益无实例支撑；且每模型步 spawn 子进程 = 恒常代价。
- **判接但只做配置声明形态（`skillGuards` 式字面 → 基因信号映射，A3 建议档投递）**：落败——与 A3 技能触点提醒同刻同面双通道注入；且「哪些路径 → 哪些基因」无判据单源，现编映射表即硬造信号；触发条 T2 保留该形态作为重议入口。
- **判「受 D2 禁区约束不可实现」**：落败——注入通道（A2 pre-step / A3 tools-pre / A4 context）都在场可接，判据是**动作面与判据面缺席**而非不可实现；两者重议触发不同。
- **把设计稿 §8.3 改写成指向 A2/A3**：落败——设计稿是调研档案不是待同步目标；口径单源已在 [M2 ADR](2026-09-06-m2-adapter-wiring.md)（命中节 = 常驻显式信号）与 [B4 ADR](2026-09-08-b4-mount-wiring.md)（按需注入 = A2/A3 建议档），无须再改一份档案制造第二处表述。
- **与行 14 合并裁**：落败——批次表「一件一交」；本源是注入面机制、行 14 是 Detect 源，失败面与证据面不同。

## Consequences

- 批次表行 15 标 done（指针 = 本件）；「未交付」计数 32 → 31；批次 3 余行 16（Hypothesize，依赖序 18）与 17（观测面自动接线）。
- 机制零变化：`adapters/**`、`engine/**`、`cordis.patch.yml`、`package.json` 均不动；本件 LIGHT 档（纯文档收口，路径触发集未命中）。宿主依赖面零新增。
- 复算口径 = `section.mts` 的 `createHitsSection` 短路行与 `HitsSectionDeps.injectSignals` + `index.mts` 命中节 provider 注册点 + `config.mts` 的 `injectSignals` 缺省与校验 + `engine/select.ts` 的字面归一化匹配 + 本仓 `genes/*/*.json` 的 `signals` 采样 + `grep -rn injectSignals ~/.dsh`（除会话转录零命中）。
