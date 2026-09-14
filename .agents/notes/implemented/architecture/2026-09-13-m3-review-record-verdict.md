# Agent Note: M3 评审实质执行记录件重拍——原形态立宿主约束面判不可实现，③ 对账即同一失败面的记录件（批次 2 序 8）

Status: implemented
Review: LIGHT/2026-09-13/语义评审（范围化子代理 R2：0 Blocker + 2 Suggestion 全采纳收口——③ 实跑计数改留痕口径、② 档位括注与停止前续跑档拆开）

Related: 批次表 [2026-09-13-feature-completion-backlog](2026-09-13-feature-completion-backlog.md)（行 8）· 前置拍板 [2026-09-10-review-execution-reconciliation](2026-09-10-review-execution-reconciliation.md)（F3 不设防 + ② 缓议 + ③ 落卡，本件维持其档位与触发）· [2026-09-13-a6-turn-stopping-mount](2026-09-13-a6-turn-stopping-mount.md)（停止前候选只有续跑档）· 宿主约束件 [2026-09-08-a8-session-record-projection-removal](2026-09-08-a8-session-record-projection-removal.md) · 蓝图 [§7 M3 / §8](../../../../docs/research/framework-rebuild-blueprint.md) · 问题池 [§2.1](../../../../docs/research/capsule-01-optimization-round.md) · 对账步 [session-close](../../../workflows/session-close.md) §2

## Problem

批次表序 8 的落点是蓝图 §7 M3 行：**评审实质执行记录件**——检测「声称完成但三路无记录 / 简报未发射」，记录落事件轨（语言无关面，§8），阻断档为升格候选。该行带着两条封条（F3 三路实质不设防 = 用户拍板；② 收口触点提醒 = 缓议），故须独立重拍才可开工。

重拍先取证：M3 原形态在本仓还剩哪个面可落。

- **「记录落事件轨」不可达**：事件轨的会话事件面即 A8。A8 已封——宿主 `Session.append` 无 `ignorable` 写入口，读路径对未标 `ignorable` 的下游插件事件 fail-closed，记录投影路线随 [A8 撤除批](2026-09-08-a8-session-record-projection-removal.md)整体退役。该条件在宿主侧，不随本仓决策改变。
- **同一失败面已有零代码记录面**：③（[评审实质执行 ADR](2026-09-10-review-execution-reconciliation.md) Decision 1）由 [session-close](../../../workflows/session-close.md) §2 兑现——对账步 grep 宿主日志 `tool/result` 文本里的闭集标记（`verify-review-brief` / `verify-review-tier` / `gates --run`），对照本会话 ADR `Review:` 行；跨会话评审有显式出口（标记活在评审会话日志，凭 Review 行日期与本批收口条目在案视同有证据）。2026-09-10 首跑以来的会话收尾对账均留痕（journal 2026-09 卷）：有评审面的批次全数「有痕」，无评审面的批次明示「本轮无 FULL 评审面」，捕获过「该载未载」的技能面缺口，零次「声称 FULL 收口而评审无机器面痕迹」。
- **升格候选的触发未满足**：② 收口触点提醒（advice 档）与停止前候选（续跑档）的触发同为「③ 对账抓到真实漏网」——上述实跑中该信号未出现。

## Decision

1. **M3 原形态（记录落事件轨）判不可实现**，不折算成替代机器件。重议触发 = 批次表「受宿主约束不可实现」节（宿主提供 `ignorable` 写入口，或读路径容忍下游插件事件），与 A8 同条。
2. **同一失败面的现态记录面 = 三处既有面，不新立记录件**：
   - ADR 头部 `Review:` 行 = 形式证据（`verify-review-tier --enforce` 在 push/CI 强制）；
   - 宿主日志 `tool/result` 闭集标记 = 事实证据（③ 对账读取）；
   - `journal/` 收尾留痕 = 跨会话证据出口。
   标记面已存在且已入对账步；再立一份记录件即双源，且与 Review 行同写者、零独立证伪力（序 5 判据同型：通道封闭集外的自报读数不入通道）。
3. **② 与阻断候选维持各自既有档位、触发与接线候选指针**：② = advice 档缓议（接线候选 = engine 代理命令；经停止前挂载点投递的「钩子桥」一案在该点是续跑档，不属 advice 面）；停止前候选按 [A6 能力位 ADR](2026-09-13-a6-turn-stopping-mount.md) 订正为续跑档（该点无 advice 面）。本件不改其触发，也不因序 8 收口而启用。
4. **F3 维持不设防**：三路是否真审/真读属语义面，机器盖不住；兜底 = 根 [AGENTS.md](../../../../AGENTS.md)「评审检查项」+ 评审代理职责（用户 2026-09-10 拍板确认，本件维持）。
5. **序 8 收口**：批次表行 8 标 done，指针 = 本件。HERO 两问答案：检测的具体失败 = FULL 档「声称收口而三路无记录」；真出现后下一步不同的事 = 收尾补跑该路评审或显式降档（已由 ③ 兑现）。

## Alternatives considered

- **本批建 ② 收口触点提醒（engine 代理命令，git commit/push 时刻一行 advice）**：落败——③ 已覆盖暴露面，② 的增量只在「当下时刻提醒」；其触发条（对账抓到真实漏网）未满足前先付 engine 面新增成本，即防过度设计所禁的投机建设（与 C15 两候选判不立同型）。
- **本批建停止前阻断档（蓝图 §7 M3 明列的升格候选）**：落败——跨会话评审的标记活在评审会话宿主日志，push 会话不可见，阻断会对合法回合/推送系统性误报；且该点唯一通道是续跑档（额外模型步与 token 成本），代价须实证支撑。
- **复活记录投影**：落败——宿主约束未变（A8 撤除批判据在案），无新写入口。
- **把评审简报入 git 充作记录件**：落败——简报是一次性调度工件（journal-in-git 边界在案）；且其证据力与 `Review:` 行同源（同一写者），不构成独立证伪。
- **按序 6 惯例只改批次表、不立重拍件**：落败——序 8 撞的是两条用户拍板封条（F3 不设防 + ② 缓议），封条纪律要求独立重拍件；只改表会让后续会话重走同一对账。
- **维持行 8 pending**：落败——其原始落点已被 A8 撤除批证伪、失败面已被 ③ 承接，悬浮行会被反复读作可开工项。

## Consequences

- 批次表行 8 标 done；「未交付」计数 39 → 38。
- 不新增机器面：`gates.json` 条目集、门禁名、命令面与退出码不变。
- ② 与停止前候选的状态、触发与接线候选指针单源不变——[评审实质执行 ADR](2026-09-10-review-execution-reconciliation.md) Decision 2 + [A6 能力位 ADR](2026-09-13-a6-turn-stopping-mount.md) Decision 2；触发满足时凭那两件直接立项，无须重新讨论档位。
- F3 语义兜底维持；本件为 LIGHT 档（纯文档收口，无行为契约面与门禁判据变更，路径触发集未命中）。
