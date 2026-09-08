# Agent Note: A8 会话记录投影撤除——宿主无下游插件 ignorable 写入口

Status: implemented

Related: [2026-09-08-b4-mount-wiring](2026-09-08-b4-mount-wiring.md)（撤其 Decision 3/4 后半/5 与 A6 投影位、A8 落点；A2 地图与 A3/A4/A5 能力层保留）；[2026-09-08-mount-exec-arguments-field](../bug-fix/2026-09-08-mount-exec-arguments-field.md)（字段名修复仍有效，其验证所依赖的投影面退役）；上游读面契约单源：dsh-session `known-event-types` 头注 + `.agents/notes/implemented/architecture/2026-08-30-retain-ignorable-external-session-events.md`（DSH 仓）

## Problem

0.2.1 实装会话（2026-09-08）在装机宿主上历史加载失败：gateway observe 路径抛 `session "…" contains event type "noogenesis/review-surface" (seq 621) unknown to this harness and not marked ignorable; refusing to interpret the log`。报错文案归因 "likely written by a newer harness" 是误诊——写入与读取是同一套装机版，事件来自本插件。

机制（装机版 `@deepseek-ai/dsh-*` 源码逐点读证）：

- **读路径 fail-closed**：持久化读面（`dsh-session-persistence` `validateStoredEvents`）对词汇表外事件要求信封带 `ignorable: true`，否则拒解释**整份**日志（设计动机：漏读一个必需事件会错构会话；缺省 = 必需）。装机 `KNOWN_SESSION_EVENT_TYPES` 是**仓内生成**的封闭集合，`noogenesis/*` 天然在其外。
- **写路径无标记通道**：装机 `Session.append(type, data, opts?)` 信封内部固定组装 `{type, seq, time, data, …surfaceMetadata}`，**没有 ignorable 参数位**（非 surface 类型不收 opts；事件 append 即 deepFreeze）——下游插件没有任何运行时通道给自己的事件盖 ignorable 标记。`ignorable` 的既有写点只有 seed/load 导入边界。
- **B4 两条依据证伪**：(1) "`feedback/record` 先例支持自定义 kind"——`feedback/record` 是词汇表内类型，data 形状即 `{ text: string }`，无 kind 槽位；`tool/code-dispatch-start` 先例是**仓内包**（dsh-tools）在构建期合入生成词汇表，下游插件装载 dist 运行时没有同款合入通道。(2) "持久化容忍度实机验证 ✅"——重验只覆盖了**写路径落盘**（`append` 运行时不校验词汇表，写必成功），读路径 observe 未被任何探针覆盖。
- **波及面**：含 `noogenesis/*` 投影事件的全部会话在该宿主上历史不可加载；每 turn 至多三条污染（skill-usage / subtree-touch / review-surface）。

## Decision

**撤除 A8 记录投影面（A6 停止前记录位 + A8 `session.append` 落点）；随投影失去消费者的观测状态同批退役；A2 开场地图与 A2–A5 能力层保留。**

1. **mount-policies.mts**：`createSkillUsagePolicy`（M1）与 `createReviewSurfacePolicy`（M3）整件删除；M2 撤 toolPre 触摸归因与 turnStopping 投影（触摸窗口、投影游标、cap 逻辑随件退役），**A2 开场地图保留**（`mapShown` 单门语义不变）；`MountPolicySet` 撤 `turnStopping` 与 `dropSessionState`（残留状态仅余 WeakMap 键控的 mapShown 布尔，GC 自清兜底，`session/disposed` drain 面随之撤除）。
2. **mount.mts**：`MountRecord` / `TurnStoppingPayload` / `TurnStoppingPolicy` / `runTurnStopping` 删除；`AgentRef` 撤 `session.append` 面（preStep 的 `session.header.origin` 窄面保留）。能力层合并器（A2–A5 的 reject/deny/ask/block/context/inject 语义单源）**原样保留**——升格候选落地的接线与判定语义不因本批收窄。
3. **index.mts**：`appendRecord` 胶水、`agent/turn-stopping` 与 `session/disposed` 两个 listener 删除；A2/A3/A4/A5 四点接线保留（A3/A4/A5 首批零策略能力位，策略件出现时增挂不触宿主接线面——B4 已拍板原则）。
4. **selftest.mts**：M1/M2 触摸/滚窗游标/M3 断言与 A6+A8 接线冒烟随件删除；A2 地图语义（每会话一次/subagent 跳过/零布点仓零注入）、能力层合并语义、防火墙机器检查保留；六点接线条目改四点。
5. **证据存活面**：M3 检测基座不依赖投影件——评审机器面标记（`verify-review-brief` / `verify-review-tier` / `gates --run`）在 `tool/result` 事件文本中持久在案，session-close 对账 grep 该面即得。投影件本只是预聚合便利层；证据语义回归「读宿主日志」。
6. **上游补能力后可复投影**：宿主给 `Session.append` 提供 ignorable 透传，或建立下游插件事件合入/注册机制时，另案恢复投影（本 ADR Problem 节记录了完整机制链，投影件形状见 B4 ADR Decision 3–5 原文）。

## Alternatives considered

- **append 时盖 `ignorable: true`**：落败——装机 `Session.append` 无该参数位，下游插件运行时不可实现（本 ADR Problem 节源读证据）；这同时是上游能力缺口，已按上游通道另报。
- **换写词汇表内类型承载（如 `feedback/record` `{text}`）**：落败——schema 滥用 + 语义污染（feedback 统计与 otel 消费面会误读），且格式迁移面按类型校验载荷形状，越界载荷在格式边缘不可过。
- **保留投影、等上游修复**：落败——等待期内每个含投影的会话历史持续不可加载，可用性损失大于预聚合记录件的收益。
- **投影改写仓内状态文件**：落败——破坏「会话轨迹可查」的 A8 设计本意（记录与产生它的会话解耦），且插件越权写 `.noogenesis/`（该域归引擎写路径）。

## Consequences

- **行为面**：插件不再向宿主 session 写任何自定义事件类型；新会话历史在装机宿主可正常 observe。A2 开场地图、三工具、solidify、pull、技能面在正常新会话路径（新 session 对象）不变；会话对象复用/恢复语义下开场地图不再随 drain 清态重放（drain 面已撤，WeakMap GC 自清兜底——最坏差异 = 同名义会话少一次地图重投，场景标注见 B4 ADR Risks「WeakMap 会话键生命周期」条）。
- **保留面**：mount 能力层 A2–A5 合并器不变；`ToolExecLike.arguments` 字段名修复仍有效（A3/A4 升格时的宿主合同单源）；M2 拦截升格候选判据不受影响（其观测面恢复成本 = 一次 diff）。
- **存量日志**：已含 `noogenesis/*` 事件的既有会话日志在本机仍不可 observe——修复须改写持久日志（给信封补 ignorable 标记），属危险操作，本批不执行、另案拍板。
- **对账面**：B4 重验批「持久化容忍度 ✅」结论以勘误撤回（B4 ADR Erratum 在案）；0.2.1 重装重验 todos 条目的清账判据（skill-usage/subtree-touch 投影落盘）作废改写。
- **发布面**：随本批 bump 版本号；publish/tag 走 release-flow 另步。
