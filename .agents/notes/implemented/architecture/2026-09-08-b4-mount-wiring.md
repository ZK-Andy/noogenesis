# Agent Note: B4 挂载面接线——A2–A6+A8 六点接线、M1–M3 首批挂载物、候选门禁评估

Status: implemented
Review: FULL/2026-09-08/R1=ok R2=ok R3=ok

Related: [2026-09-06-collab-rebuild-impl](../../proposed/architecture/2026-09-06-collab-rebuild-impl.md)（五批立项，本 ADR 为 B4 批实现轮）；[2026-09-06-m2-adapter-wiring](../../implemented/architecture/2026-09-06-m2-adapter-wiring.md)（防火墙规则 2 的原拍板单源，本 ADR Decision 2 部分修订其允许集）；[2026-09-08-b3-hooks-install](../../implemented/architecture/2026-09-08-b3-hooks-install.md)（前批，dist 自测面）；蓝图对账单源 [framework-rebuild-blueprint](../../../../docs/research/framework-rebuild-blueprint.md) §7 挂载面全清单 + C7/C8/C15；评审记录件升格判据 [review](../../../../docs/method/review.md) §5

## Problem

立项 ADR B4 行只定范围（A2–A6 + A8 接线各带最小 smoke；M1–M3 实现件各带 HERO 判据答案；文件名契约闸 / 上帝类预防闸两候选评估），实现细节未立项。2026-09-08 实盘（宿主 = 本机 DSH，`@deepseek-ai/dsh-*` 0.1.2-rc.1 源码实证）：

- **适配层现状**：仅 A1（system-prompt 双节）与 A7（`agent/created` + `agent/disposed`）接线；A2–A6 + A8 全部未接（蓝图 §7 现状栏口径一致）。
- **六点宿主合同实证**（安装面包面逐点读源）：
  - A2 `agent/pre-step`：`dispatch.waterfall`，payload `{agent, messages, turn, step, signal}`，listener 签名 `(payload, next)`；返回 `{kind:"reject"}` 权威拒绝一步（turn 以 `blocked` 收），`await next()` 得 `{kind:"enter", messages, startsRequestSeries?}` 后可追加 messages（宿主 agent-instructions / hooks-claude-code 两消费方同款实证）。
  - A3 `tools/pre-execute`：waterfall over `exec`，决策三态 `{kind:"allow"}`（默认）/ `{kind:"deny", reason}`（→ `Error: <reason>` isError 结果 = 阻断并回消息）/ `{kind:"ask", reason?}`（审批通道）；另有 `tools.guard()` 单调守卫 API（返回 string 即拒，无人可强放行他人所拒）。
  - A4 `tools/post-execute`：waterfall over `(exec, result)`，决策 `{kind:"accept"}`（可换 content/value）/ `{kind:"block", feedback, additionalContexts?}`（→ isError + 纠正消息 = 结果面拦回）。
  - A5 四类时刻映射实证（hooks-claude-code 源码）：SessionStart → `agent/session-start`（`agent.inject(message)` 非阻塞）；UserPromptSubmit → 折进 `agent/pre-step`（`messages.length>0` 门）；PreToolUse/PostToolUse → `tools/pre-execute` / `tools/post-execute`；Stop → `agent/turn-stopping`（serial，非阻塞位）。
  - A6 `agent/turn-stopping`：`dispatch.serial`，payload `{agent, turn, signal}`——排序位非阻断位。
  - A8 `session/event` + `session/flush`：插件级 `ctx.on("session/event", (session, event) => …)`（dsh-goal 同款）；持久化是插件关注点（「subscribe to `session/event`, drain on `session/flush`」，dsh-session 头注）；插件可 `session.append("<自定义 kind>", payload)` 落宿主事件面（dsh-command-feedback 的 `feedback/record` 先例）。
  - 消息形态：注入消息 = `createUserMessage({content:[{type:"text",text}], source})`（`@deepseek-ai/dsh-llm`），source = `{kind:"plugin", plugin:"noogenesis"}`——冻结 + id 由宿主工厂钉死。
- **A1 动态注入时序（M2 的 HERO 实证面）**：宿主 agent-instructions 在 `tools/result`（触碰观测）后投影、下一个 `agent/pre-step` 才入上下文——**首个触碰步是盲跑**（编辑先于子树规范入上下文一步执行）。
- **C15 实测数据（2026-09-08，源 .ts/.mts n=38）**：行数 p50=152 / p90=516 / max=1158（`scripts/verify-gene-format.mts`，自测整装件）；import 扇出 max 15（adapter selftest 整装件）；`git log --all --diff-filter=A` 全历史**零**构建产物/缓存文件入库记录；`.gitignore` 已封闭覆盖 `dist/`、`__pycache__/`、`*.pyc`、`.cache/`、`node_modules/`。

## Decision

**能力层 = 新件 `adapters/dsh/mount.mts`（零宿主依赖）：六点接线器 + hook-protocol 判定语义合并器；策略层 = M1/M2/M3 记录与建议件（首批全建议/记录档，零阻断）；C15 双候选均不过判据，不立（理由与数据在案，gates.json 不动）。**

1. **能力层六接线器（mount.mts）**：每挂载点一个注册面，策略件按注册序挂载；合并语义 = hook-protocol 判定语义蒸馏（蓝图 §7 边界：不建两方言桥，接线走原生事件）：

   | 挂载点 | 宿主事件 | 合并语义 |
   |---|---|---|
   | A2 一步前 | `agent/pre-step` | 逐 handler 顺序过；首个 `reject` 胜出；消息追加按注册序累积；无策略 = `next()` 透传 |
   | A3 工具前 | `tools/pre-execute` | 首个 `deny(reason)` 胜出；次 `ask`；无策略 = `next()` 透传 |
   | A4 工具后 | `tools/post-execute` | 首个 `block(feedback)` 胜出；`additionalContexts` 按注册序累积（下游前置） |
   | A5 hooks 桥 | `agent/session-start`（会话开始时刻） | 非阻塞：inject 上下文能力 + 异常 catch → warn 降级，绝不阻塞会话 |
   | A6 停止前 | `agent/turn-stopping` | 非阻塞：策略收集记录载荷，异常 catch → warn 降级 |
   | A8 会话事件轨 | 记录落点 = `session.append`（产出侧，自定义 kind）；drain = `session/disposed`（独立 cordis 事件——R2 实证：disposal 不走 `session/event` firehose，firehose 只投 `Session.append` 提交的封闭键集日志事件） | 每会话状态投影存储（WeakMap 按会话键隔离，GC 自清）；策略读写同一存储 |

   - **A5 归口**：四类时刻中 prompt 提交 / 工具前后 / 停止前已由 A2/A3/A4/A6 覆盖（上表映射实证），A5 自有新面 = 会话开始时刻（`agent/session-start`，非阻塞 inject）；`exit 2 阻断并回消息 / 上下文附加 / 非阻断降级 / 日志回合内`四判定语义分别落在 A3 deny、A4 block+additionalContexts、A5 catch 降级、记录落 session 面——语义单源在 mount.mts 合并器。
   - **策略件接口**：`(payload, carrier) => 决策 | void`，carrier = 宿主 payload 的最小结构面（本地窄类型，同 engine-bridge `AgentCarrier` 口径）；mount.mts 不 import 任何 `@deepseek-ai/*`（防火墙规则 2，selftest 机器扫描面随批扩到本件）。

2. **index.mts 接线胶水**：六点 `ctx.on(...)` 逐点注册（消费 mount.mts 合并器）；注入消息构造收口本文件（`createUserMessage`）。**新增 peerDependency `@deepseek-ai/dsh-llm`（^0.1.0-rc.8，与 dsh-tools 同代钉法——宿主实供 0.1.2-rc.1，peer 语义同 dsh-tools 先例不强制）**——注入消息的冻结/id/source 形态是宿主合同，手拼 = 对宿主私有形状二次钉死；防火墙允许集随之显式更新（`@deepseek-ai/*` 内 dsh-tools + dsh-llm 两件，仍收敛 index.mts 单文件 import；adapters/AGENTS.md 防火墙行同变更改写）。

3. **M1 技能使用守卫 = 纯记录件（蓝图降级路径采纳）**：A3 观测技能调用痕迹（`exec.name==="skill"` 且 `exec.args.name` 带 `noo-` 前缀，per-session 累积；勘误 2026-09-08：exec 参数面字段实为 `arguments`，本节 `exec.args.*` 表述作废——源读 createExecution 铸造 + hooks-claude-code 读面双证，修复 ADR [2026-09-08-mount-exec-arguments-field](../../proposed/bug-fix/2026-09-08-mount-exec-arguments-field.md)）；A6 在有新痕迹的 turn 投影 `session.append("noogenesis/skill-usage", {turn, names})` 增量记录。**HERO 答案**：检测的具体失败 = 会话推进了技能适用型工作（评审/文档写作）却零 `noo-*` 调用痕迹；真出现后下一步不同的事 = 痕迹面使「用了没有」逐会话可寻址，session-close 与下轮开场可据实提示技能目录摘要，而非凭自觉声称「技能用过了」。「该不该用」（会话类型判定）不可机器判定——prose 关键词分类 = 硬造不可判定信号（蓝图 M1 降级判据原文），不建；阻断升格 = 另案过判据（蓝图同款禁令）。

4. **M2 规范事前接入落点 = 建议档两件 + 记录一件**：
   - A2 会话开场（每会话首个 pre-step，`mapShown` 单门去重——turn/step 双门在首步被拒时永久丢地图，R2 修正）：会话工作区仓根处布点表五子树件（`engine/`、`adapters/`、`scripts/`、`docs/`、`.agents/notes/` 的 `AGENTS.md`）存在即追加一条**子树规则地图**消息（子树 → 件路径指针行，不逐行展开承载约束文本——读入动作落在 agent 侧，≤7 行；零子树件 = 零注入零 token）。多 agent 异仓各按各自 repoRoot 解析（四级回退链复用）；**subagent 跳过**（session header `origin === "subagent"`——窄任务子代理拿全仓地图是纯噪音）。
   - A3 记录：`edit`/`write`（`exec.args.file_path`，闭集工具名单；勘误 2026-09-08：字段实为 `exec.arguments.file_path`，勘误指针同上）命中布点子树 → 逐 turn 聚合投影 `session.append("noogenesis/subtree-touch", {turn, touches: [{subtree, path}]})` 归因记录；触摸状态滚动窗口封顶 50（`TOUCH_STATE_CAP`，投影游标随平移同步——R2 修正面）。
   - **HERO 答案**：检测的具体失败 = 写码会话在子树规范未入上下文时开始产出（宿主 A1 动态注入时序实证在 `tools/result` 之后——首触步盲跑，蓝图 §1「缺的是布点不是机制」的时序残余缺口）；真出现后下一步不同的事 = 开场先见子树规则地图，动工前先读对应件，而非首个触碰步盲跑、事后一步才补送。「须读入后才推进」的拦截式（A3 deny-once）= 升格候选不落地——A1 补送已盖主失败面，拦截只收窄单步窗口，先建议档积累数据另案过判据（档位纪律：守卫默认建议档）。

5. **M3 评审实质执行记录件 = 纯记录件**：A4 观测评审机器面运行痕迹（工具结果文本含闭集标记 `verify-review-brief` / `verify-review-tier` / `gates --run`，per-session 累计计数）；A6 投影 `session.append("noogenesis/review-surface", {turn, briefRuns, tierRuns, gateRuns})` 累计记录。**HERO 答案**：检测的具体失败 = 评审声称完成但三路无记录 / 简报未发射（收口推进而评审机器面零运行的假完成不可寻址）；真出现后下一步不同的事 = 记录件让「这轮收口却零评审机器面运行」在会话轨迹可查，session-close 对账有据可补，而非把假完成状态带进下一批。**声称完成的 prose 检测（assistant 文本分类）不建**——同 M1 禁令；**阻断档（停止被拦一次并回消息）= §5 判据另案**（蓝图：状态投影只做记录件不升阻断闸）。适配层不 spawn 门禁脚本（防火墙规则 1：只能 spawn 引擎）——痕迹观测与 fs 读是合法面，代跑评审门禁不是。

6. **C15 候选门禁评估（双不立，数据与理由在案）**：
   - **文件名契约闸（禁构建产物/缓存入库）不立**：HERO 判据 = 检测的具体失败（构建产物入库）全历史零发生（`--diff-filter=A` 实测），且 `.gitignore` 封闭面 + CI checkout + 评审兜底三层已盖；立闸 = 防已覆盖面（speculative，HERO-O「为守卫再造守卫」谱系）。触发条件在案：若未来真实发生产物入库（.gitignore 缺口被绕过），同理由翻案再立。
   - **上帝类预防闸（单文件行数/依赖扇出上限）不立**：实测分布（n=38：p50=152 / p90=516 / max=1158；扇出 max=15）无自然拐点、现状零失控件——蓝图自订「engine 现状健康属预防非治病，过 HERO 判据再立」；为 speculative 膨胀立闸 = HERO-O。阈值数据回填本 ADR 作未来触发依据：真实失控件出现（改写困难 / 评审反复抓同一文件）时以「max 现值 × 1.5」为候选阈值再过判据。
   - C9 兑现：gates.json 条目集与门禁名 B4 批不动（两候选均不立）。

7. **纪律面（全批）**：
   - **档位纪律**：六个挂载点全部建议/记录档，零阻断路径；A3/A4 的 deny/block 能力由能力层提供但 M1/M2/M3 首批不使用（升格另案）。
   - **降级纪律**：六点接线全部异常 catch → 降级（记录/建议缺席或下游透传，warn 留痕），绝不阻塞会话——A2/A3/A4 的合并段同盖（R3 收口补：合并异常 → next()/downstream 透传）。
   - **事件面归属**：挂载记录走宿主 session 事件面（`noogenesis/` 前缀自定义 kind，格式随宿主——蓝图 §8 三段归属）；`events/*.jsonl` 基因事件轨与 `genes/` 零 diff（C9）；记录 kind 不进事件轨封闭集。
   - **协议零改动（C9）**：gates.json 条目集与门禁名不变；engine/ 不触碰；engine/adapter self-test 双面绿。

## Alternatives considered

- **A5 独立建 hooks.json 桥（claude-code 方言兼容层）**：落败——蓝图 §7 边界明裁「两方言桥不建，蒸馏 hook-protocol 判定语义，接线走本仓适配层原生事件」；本仓无既有 hooks.json 资产需要兼容。
- **M1/M3 首批带阻断档**：落败——蓝图档位纪律（守卫默认建议档，升格逐件过 HERO）+ §5「状态投影只做记录件不升阻断闸」；M3 阻断候选显式另案。
- **M2 拦截式（edit 前 deny-once「须读入后才推进」）**：延后不落——A1 宿主动态注入在 `tools/result` 后一步补送已盖主失败面，拦截只收窄首触步单步窗口；先建议档积累归因记录，升格另案过判据。
- **挂载记录写 `events/*.jsonl` 基因事件轨**：落败——事件轨 kind 封闭集只收 gene 事件（C9 零 diff 承诺），会话投影落宿主 session 事件面（蓝图 §8 三段归属）；混写 = 双语义污染单文件。
- **手拼消息对象绕开 dsh-llm 依赖**：落败——`createMessage` 的冻结 + uuid id 形态是宿主合同，手拼 = 对宿主私有形状二次钉死，宿主演进即静默腐坏；peer dep 单点收敛 index.mts 更窄（防火墙允许集扩一件在 Decision 2 显式拍板）。
- **M3 适配层代跑评审门禁核对记录**：落败——防火墙规则 1 只许 spawn 引擎；门禁代跑属 CI/钩子面，适配层越权。痕迹观测（读工具结果文本）即已满足记录件判据。

## Consequences

- **验收**：- **C7**：六接线器全挂且各带最小 smoke（selftest 假 ctx 冒烟：注册面、合并语义逐条、降级路径）。
- **C8**：M1/M2/M3 的 HERO 判据答案在本文 Decision 3–5 在案（检测的失败 + 下一步不同的事），降级/升格边界显式。
- **C15**：两候选评估落档（HERO 判据 + 实测数据），不过者理由在案（Decision 6）。
- **C9**：`git diff genes/ events/` 零；gates.json 条目集与门禁名不变；engine self-test 与 adapter self-test（`node dist/adapters/dsh/selftest.mjs`）绿。
- **防火墙自测**：`selftest.mjs` import 面机器扫描扩到 mount.mts（零 `@deepseek-ai/*`）；index.mts 允许集 = dsh-tools + dsh-llm 两件。
- FULL 三审采纳收口后本 ADR 转 implemented；journal 月卷「本批按蓝图判据」标注。
- **风险面**：
- **session.append 自定义 kind 的宿主兼容面**：`feedback/record` 先例支持自定义 kind，但持久化插件对未知 kind 的容忍度未经实机验证——本批 smoke 为脱宿主冒烟，实机验证随下一次桌面重验（todos B 类惯例）；失败面 = 记录缺席（降级纪律兜底），无阻断风险。（实机验证 2026-09-08 ✅：`noogenesis/review-surface` 以一等事件类型落宿主 session 持久层、turn 级增量与对照探针精确对账——journal 2026-09 卷重验批在案；同批实锤 M1/M2 A3 观测面 `exec.args` 字段误读缺陷，修复 ADR [2026-09-08-mount-exec-arguments-field](../../proposed/bug-fix/2026-09-08-mount-exec-arguments-field.md)。）
- **peer dep 扩一件（dsh-llm）**：防火墙允许集从一件扩两件——已显式拍板（Decision 2）并同变更改写 adapters/AGENTS.md；收敛规则（只 index.mts import）不变。
- **A2 开场地图噪音面**：布点件在场的仓每会话首步多一条 ≤10 行消息；零布点仓（多数下游仓）零注入——噪音面收敛在 self-hosting 仓与本仓形态仓。
- **WeakMap 会话键生命周期**：会话对象复用/恢复语义下投影状态可能跨「名义同会话」残留——记录件语义只增计数不授权，最坏面 = 记录偏大，无决策面依赖；显式清态 = `session/disposed`（R2 修正后为独立 cordis 事件，WeakMap GC 仍兜底）。
- **M2 开场地图残余边界（评审收口在案）**：触发 = 每会话首个 pre-step（单门）；若该步恰被其他策略拒绝，地图随步作废（advice 档不可投递）——发生面 = 另一插件显式 reject 首步，宿主默认 fallback 永不 reject；记录件不受影响。
