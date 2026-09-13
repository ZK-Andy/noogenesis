# Agent Note: P1 D2 禁区重拍 + Detect 逐源裁决（一）`session/event`——自动 Detect 默认关，本源判不立（批次 3 序 11）

Status: implemented
Review: LIGHT/2026-09-13/语义评审（范围化子代理 R2：2 Blocker + 5 Suggestion 全采纳——引错设计稿节 §4.2→§11.1、批次表行 12–14「同上」继承 done 两处为 Blocker；余五条收口指针可查性 / 零实例证据强度 / 残留表述）

Related: 批次表 [行 11 与「需显式重拍的决策面」](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · [P1 骨架 D2](2026-09-05-p1-engine-skeleton.md) · [M2 适配层](2026-09-06-m2-adapter-wiring.md)（信号入口边界）· 主设计 [§6 生命周期 / §11.1 生命周期钩子](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 蓝图 [§7 挂载面表 / §9 不做清单](../../../../docs/research/framework-rebuild-blueprint.md) · [A8 撤除批](2026-09-08-a8-session-record-projection-removal.md) · [B4 挂载面 ADR](2026-09-08-b4-mount-wiring.md)（M1 HERO 答案）· 宿主包读面 `@deepseek-ai/dsh-session@0.1.5-rc.2`

## Problem

批次表行 11 要求逐源裁决 Detect 信号源 `session/event`（出处 = 主设计 §6 生命周期把该事件列为 Detect 插点位；判据面 = P1 骨架 D2 的「Detect 不进引擎」）。该行带封条：批次 3 开工前须先立「P1 骨架 D2 禁区 + M2『Detect 显式不做』」的独立重拍件，故本件同时承载重拍与首源裁决。

现行判据的缺口：D2（2026-09-05）把禁区写成**时间条件**——引擎自动扫描固定面「在 M2 之前禁止实现」，解除与否留待 M2；M2（2026-09-06）落地时另拍「Detect 信号源全表不做」「信号只来自显式声明（配置 / 模型调工具），Detect 禁区不解除」，即整批不做。时间条件到期后，站立判据只剩整批不做；逐源解除既无判据面也无时刻。

取证（2026-09-13，宿主 `0.1.5-rc.2` 包读面）：

- `session/event` = 会话日志的 **post-commit 只读广播**（`ctx.on("session/event", (session, event) => …)`），载荷 = 刚 append 的 `SessionEvent`：`turn/start`、`turn/end`、`step/start`、`step/end`、`user/message`、`assistant/message`、`assistant/attempt`、`tool/call`、`tool/result`、`request/header`、`session/end-seed` 等，compaction 以 surface `replace` 落同一条流。listener 抛错被宿主捕获、不影响已提交的 append；派发按 scope 过滤（agent 作用域只收该 agent 上下文内进入的会话）。
- **读面开、写面封**：A8 撤除批封的是本插件向会话日志**写**自定义事件（宿主 `Session.append` 无 `ignorable` 写入口 + 读路径对未标 `ignorable` 的下游插件事件 fail-closed）；**订阅**该流不在其封条内，属宿主明文合同。
- 本包现态：零 `session/event` 订阅；已接的信号相邻面 = A2（`agent/pre-step`，含本步入队消息，人类 prompt 在其中）、A3（`tools/pre-execute`，exec `arguments`）、A4（`tools/post-execute`，工具结果）。
- 主设计 §11.1 给 Session 钩子面的语义 = 轨迹信号 / 压缩边界 / 固化落盘；据此四个候选失败面逐面过 HERO 两问（检测到什么具体失败 → 真出现后下一步做什么不同）：
  1. **轨迹信号**（会话自然语言轨迹 → gene 信号键）：把 assistant/user 文本分类成信号 = B4 挂载面 ADR 的 M1 HERO 答案已判「prose 关键词分类 = 硬造不可判定信号」；`select` 合同面是字面信号短语精确匹配（D2 归一化口径），派生器没有可判的映射面。
  2. **压缩边界**（surface 折叠后重注基座）：A1 常驻基座按 system-prompt 有序节渲染，A2 开场地图经 pre-step 瀑布的 messages 面进入本步（user/message 面）——「折叠后失守」实例 **n=0**【探索性：扫描面 = `journal/2026-09` 卷 + 本树 ADR 的「折叠/压缩 + 地图」词面（唯一命中为 A2 首步被拒丢图，已由单门化修毕，非折叠面）】；重注的触发条件（何时算失守）本身无判据，为未观测面加 listener 即防过度设计所禁的投机建设。
  3. **循环重复**（turn/step 计数 + `tool/call` 名序列）：即 repeat-tool-reminder 形态，蓝图 §7 已裁「首批不含，逐件评估再挂」、§9 不做清单在案；本仓无长挂调用场景。
  4. **固化落盘**（`session/flush` / `session/end-seed` 触发 solidify）：同一失败面（会话结束盘点入档候选）已由 `agent/disposed` 单次终态边界承接（[M2 ADR](2026-09-06-m2-adapter-wiring.md)「M2 接线点」第 3 条；flush 可在会话中途多次发生，M2 Alternatives 已否该触发点）。
- 机器可判角落（工具名 / 写入路径 / 命令 / 失败位）已在 A3/A4 的 exec 面——更近、更窄、已在场；`session/event` 是更宽的**第二**宿主面，不带来独有信号。

## Decision

1. **D2 禁区重拍（站立规则，取代 D2 的时间条件与 M2 的整批不做）**：引擎信号入口维持「显式喂入」为唯一合同面；自动 Detect **默认关**。解除作业 = 逐源过 HERO 两问并落独立裁决件，未过者维持关；批次 3 四源（`session/event` / `agent/error` / `agent/turn-stopping` / `tool/result`）逐条裁决，指针 = 批次表行 11–14（本件 = 行 11）。跨源公共成本在案：任一自动 Detect 都新增宿主监听面 + 每事件回调，调用频次抬升即 M3 重议信号（M2 Consequences 运行边界）。
2. **`session/event` 判不立**：不订阅该流、不建自动信号派生器——HERO 第一问无可命名答案（见 Problem 四候选面），第二问随之无行动面。
3. **行 11 的 HERO 两问答案**：检测的具体失败 = 未命名（四候选分别落在已裁决面：prose 分类不建 / 零观察实例 / 蓝图 §9 不做清单 / 已由 `agent/disposed` 承接）；真出现后下一步不同的事 = 无（判不立即无行动面）。
4. **重议触发**（满足任一即重开本源并重写本件指针）：
   - **T1**：出现具名失败实例——某卷实证「会话事件流里有机器可读的失败信号，A2/A3/A4 三面接不住，且代价 ≥ 一次返工」。
   - **T2**：`select` 合同面扩出**非自然语言**的信号键（事件类型 / 工具名 / 路径类别进信号词汇表），派生器有判据可用。
   - **T3**：宿主给出订阅侧的稳定窄面（当前只有全事件流；出现按类型或按 agent 的订阅面时成本面重估）。
5. **封条关系**：本件即批次 3 的 D2 重拍件；行 12–14 在其站立规则下直接开工，行 15（情境按需注入）其后在同一规则下判不立（[裁决 ADR](2026-09-13-situational-injection-verdict.md)）。

## Alternatives considered

- **判接（订阅 `session/event`，从事件流派生信号喂 select）**：落败——HERO 第一问无具名答案；派生器只剩 prose 分类（B4 已判不可判）与复算 A3/A4 已覆盖的 exec 面两条路，且每事件回调抬高调用频次（M3 信号），代价与收益不成比例。
- **判「与 A8 同条受宿主约束不可实现」**：落败——A8 封的是写路径，订阅在读面合同内可接；把可接面记成不可实现会把重议触发错绑到宿主写入口上，冻结错误的判据。
- **只把批次表行 11 标 done、不落重拍件**：落败——封条纪律要求 D2 时间条件与 M2 整批不做由独立重拍件取代；只改表会让后续三源继续在「整批不做」与「条件到期」两个空判据间摇摆。
- **本件同时裁决四源**：落败——批次表「一件一交」；四源失败面各异，合并会让单件范围与评审面失去可判定边界。

## Consequences

- 批次表行 11 标 done（指针 = 本件）；「未交付」计数 36 → 35；行 12–14 的站立规则 = 本件 Decision 1。
- 机制零变化：`adapters/**`、`engine/**`、`cordis.patch.yml`、`package.json` 均不动；本件 LIGHT 档（纯文档收口，路径触发集未命中）。宿主依赖面零新增（不订阅即不需要 `dsh-session` 的 type-only 面）。
- [P1 骨架](2026-09-05-p1-engine-skeleton.md) D2 现值与 [M2 适配层](2026-09-06-m2-adapter-wiring.md) 三处未做句同步：自动扫描固定面的站立规则 = 默认关 + 逐源门槛，本件为单源。
- 连带 M3 重议：自动 Detect 的调用频次面随本件维持关而零变化；重开本源（T1–T3 任一）时按 M2 Consequences 同步评 M3。
- 复算口径 = 宿主包读面（`@deepseek-ai/dsh-session` 的 `Events` 声明与 `Session.append` 合同）+ 本仓订阅面（`adapters/dsh/index.mts` 的 `ctx.on` 注册点；`grep -rn "session/event" adapters/ engine/` 零命中）。
