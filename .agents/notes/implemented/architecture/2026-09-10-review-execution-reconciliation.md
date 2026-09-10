# Agent Note: 评审实质执行拍板——session-close 评审机器面对账先行，触点提醒缓议

Status: implemented
Review: FULL/2026-09-10/R1=ok R2=ok R3=ok

批注：③（session-close 步骤 2 扩评审机器面对账）随本批落卡，实现与评审同批收口——R1 0B/2S（池条目指针级化、候选编号去字母）、R2 0B/2S（同编号条 + 跨会话证据出口补卡）、R3 1B/1S（B4「另案」悬空引用补结案指针、本件补 Related 行 + 裸别名链接）全采纳，修复随本批落。

Related: [2026-09-08-b4-mount-wiring](2026-09-08-b4-mount-wiring.md)（M3 记录件 Decision 5 与「阻断档另案」预留——本件 Decision 3 正式结案，B4 侧已补结案指针）；[2026-09-10-m1-guard-anti-overdesign](2026-09-10-m1-guard-anti-overdesign.md)（三件套先例：session-close 步骤 2 载体、advice 档位与阻断判不立论证同型）；[2026-09-08-a8-session-record-projection-removal](2026-09-08-a8-session-record-projection-removal.md)（证据面 = 宿主日志 `tool/result` 既定口径）；优化轮 §2.1「评审实质执行在自觉区」条（问题池行动区，[capsule-01-optimization-round](../../../../docs/research/capsule-01-optimization-round.md)）。

## Problem

评审契约（[review.md](../../../../docs/method/review.md) §3）要求每路评审发射前实跑 `verify-review-brief`，但 git 边界之前的动作序列零机器挂载点——发射评审与声称收口全靠主会话自觉，两个已实锤的失败面：

- **发射前零机器事件**：简报闸机械可判定但无触发点，靠自觉想起跑。
- **Review 证据行 = 自我声称**：pre-push/CI 的 review-tier `--enforce` 只验 implemented ADR 头部 `Review: FULL/...` 行存在，「声称 FULL 收口但三路没跑」机器验不了。实际发生：2026-09-08 c1 编码规范批首跑 R1/R2 并行后被取消，批未过 FULL、ADR 未翻转，靠当时显式发现才未带病推进——假完成状态一旦推进，下一批就在错误地基上开工。

三路是否真审/真读属语义面，机器盖不住，维持 AI 兜底清单 + 评审代理职责，本议题不设防（用户拍板确认）。[B4](2026-09-08-b4-mount-wiring.md) 曾为同型问题落纯记录件（M3：A4 观测评审机器面闭集标记 + A6 投影），随 [A8 撤除批](2026-09-08-a8-session-record-projection-removal.md)整体退役——证据面回归宿主日志 `tool/result` 事件文本（闭集标记 `verify-review-brief` / `verify-review-tier` / `gates --run`，B4 既定口径），投影路线不可复用。

## Decision

**用户拍板（2026-09-10 讨论轮，按推荐案采纳）：**

1. **③ 对账扩展立即落（零代码）**：[session-close](../../../workflows/session-close.md) 步骤 2 由「仅 grep 技能调用痕迹」扩展为同面增 grep 评审机器面闭集标记，对照本会话 ADR Review 行与收口条目——「声称 FULL 收口但评审无机器面痕迹」的假完成在收尾暴露，须补跑或显式降档（判据与跨会话出口的操作面单源在流程卡）。把假完成从「不可见」提到「收尾必暴露」。
2. **② 收口触点提醒缓议（观察触发）**：tool-pre/钩子桥在 `git commit`/`git push` 时刻判「FULL 档 × 本会话评审机器面零标记 → 一行 advice（不阻断）」的方案**先不建**；触发 = ③对账步抓到真实漏网信号（对账暴露假完成）再立项。接线候选两案在案备用：engine 代理命令（分类复用 verify-review-tier 保持单源，adapter spawn 引擎过防火墙规则 1）；钩子桥停止前触发。不分类宽触发（adapter 重实现 FULL_TRIGGERS，双源违约）判死，不列候选。
3. **②档位预拍板 = advice**：阻断判不立——评审跨会话发生，标记活在评审会话宿主日志里，push 会话不可见，阻断对合法 push 系统性误报；advice 档误报成本近零。此为 [B4](2026-09-08-b4-mount-wiring.md) 预留「阻断档另案」的结案记录。
4. **F3（三路实质质量）不设机器防**：语义面兜底维持（根 AGENTS 评审检查项 + 评审代理职责），不做 prose 检测类假强制。

## Alternatives considered

- **②立即建**（engine 代理命令接 tool-pre advice）：落败——③已覆盖收尾暴露面，②的增量是「当下时刻」提醒；在无实证漏网信号前先付 engine 面新增成本，防 speculative（HERO-O 同型判据，[C15 两候选先例](2026-09-08-b4-mount-wiring.md)）。
- **②升阻断档**：落败——跨会话证据不可见 → 系统性误报拦合法 push（Proposal 3）。
- **记录件/投影复活**：落败——A8 撤除批已定宿主无 ignorable 写入口，投影不可复用；标记在 `tool/result` 文本持久在案，无需新记录面。
- **①评审路标行**（A2 开场地图加映射行）：落败——review.md 契约家已在、评审检查项已常驻根 AGENTS，重写一行即复述；与 [M1 ①](2026-09-10-m1-guard-anti-overdesign.md)不同（技能彼时缺「任务型→技能名」映射，评审不缺）。
- **什么都不建**：落败——c1 漏审实证失败真实发生（非 speculative），代价是带病 FULL 批推进；③一行流程卡改动即可把暴露面从「事后翻 journal」提前到「收尾必对账」。

## Consequences

- session-close 步骤 2 扩展在卡（本批实现）；对账步首跑留痕随本批会话收尾兑现。
- ②观察期无时限、信号驱动：③对账步一旦暴露真实漏网，凭本 ADR 接线候选直接立项，无需重新讨论。
- 防火墙规则 1 边界维持：适配层不 spawn 门禁脚本；②若立走 engine 代理候选。
- 同根问题「规范事前接入」余项（lint 配置泛化、A3 阻断档升格触发）不受本拍板影响，形态可复用②若立的接线面。
