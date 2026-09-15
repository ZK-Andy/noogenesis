# Agent Note: 插件日志落盘通道——ctx.logger 在装机形态零观察面，读数与降级留痕落 <DSH_HOME>/logs/noogenesis.log

Status: implemented

## Problem

护栏建议行（[护栏建设轮 ADR](../../implemented/architecture/2026-09-13-guardrail-construction-round.md) 决定 1）自报的口径是「写一行 diagnostics 留痕」，复验判据（[HANDOFF-todos](../../../../HANDOFF-todos.md) B 类第 1 条）写「宿主日志里每会话自第二步起恰一行 `noogenesis token baseline reading: …`」。0.2.7 装机后按该判据复验（2026-09-16，本机 dotnet-desktop profile，0.2.7 装机 + 重启后新会话）实测：**该行没有任何观察面**。

四条实测读数（可复跑）：

1. 该行经 `ctx.logger("noogenesis").info(…)` 发行（`adapters/dsh/index.mts`）。
2. cordis `LoggerService` 只把消息派给已注册的 exporter（`cordis` 4.0.2 `lib/index.js` 的 `LoggerService` 构造与 `Logger._method`：遍历 `service.exporters`，无匹配 exporter 即丢弃）。本 profile 全量检索（4 个检索面：`@deepseek-ai/*` 已装包树的 `exporter(` 命中、profile 各包、`dsh-base` bundle patch 行、profile 用户 patch 行——`grep -rn 'exporter(' <dsh 树> --include='*.js'` 除 cordis 自身零命中，两处 patch 均无 logger 行，`@deepseek-ai/cordis-plugin-logger-console` 未装）只有 cordis 自带的 1 个 exporter = 内存环（`bufferSize = 1000`，进程退出即丢）。
3. 桌面壳不转发 dsh 子进程日志：`HarnessRuntimeHost.Attempt.cs` 的 `ErrorDataReceived` 只把 stderr 收进**内存尾**，`RuntimeSupervisor.cs` 仅在子进程退出/失败时把 `TakeLast(8)` 写进 `host.log`；`HostLog.cs` 的唯一写者是壳自身——实测 `host.log`（472461 字节 / 5718 行）的标签封闭集（`grep -o '\[[a-z-]*\]' ~/.dsh/logs/host.log | sort -u`）= `[bootstrap]/[cli-shim]/[health]/[host]/[nav]/[supervisor]/[tray]/[update]` 八个，`noogenesis` 命中 1 次且为外链导航行【探索性 · 单机单份日志】。
4. 同环境独立先例：`dsh-frecency/src/log.ts` 头注——桌面 `host.log` 只承载壳自身通道、插件级 `logger.info` 被滤掉，故该插件自建 `~/.dsh/logs/dsh-frecency.log`。

影响面不止读数行：同一路径上**全部** `logger.info/warn` 都不可见——A3/A6 的 `warnOnce`、bank pull 失败、技能 provider 诊断、五挂载点各自的降级 warn（`index.mts`：`grep -o '\.warn(' … | wc -l` = 15、`\.info(` = 2，base 与 HEAD 同值）。装机形态下「降级留痕」整体零读者，事后排障只能查会话卷，而会话卷不承载插件日志。

现象与机制分离：「该行不可观测」是上述四条实测的直接读数；「桌面壳为何不转发子进程 stdout」未取壳侧设计意图，本件只按实现读数陈述。

## Decision

本件拍板并同批落地（落地读数见末节）。

**决定 1：适配层加文件落盘通道**。落点 = 新件 `adapters/dsh/log-sink.mts`（零宿主依赖、可脱离 DSH 自测），路径 = `<DSH_HOME>/logs/noogenesis.log`（取值与归一化对齐宿主 `resolveDshHome`：`DSH_HOME` 缺席或空白回退 `~/.dsh`；`~` / `~/` / `~\` 前缀按 OS home 展开；结果绝对化——相对值不归一会让落点随宿主进程 cwd 漂移，恰是本件要修的观察面失效）。每条 `info/warn` 追加一行 `[<ISO8601>] <message>`，**消息原文不改写**；同一条随后**原样转交**宿主 `ctx.logger`——不夺宿主通道，宿主将来接上 exporter 时两边都收。

**决定 2：best-effort，三个动作各自吞错**。建目录、追加、宿主发行任一步失败都静默：本通道是插件侧最后观察面，抛错会把「留痕失败」变成「一步失败」，与五挂载点「降级不阻断」纪律相反。**显式接受**该通道自身故障不可见。

**决定 3：观察行带会话身份**——读数行 `noogenesis token baseline reading: session=<id> surfaceTokens=<n> (…)`，两条降级 warn 行 `noogenesis token baseline unavailable: session=<id> (…)` 与 `noogenesis token baseline shape mismatch: session=<id> (surfaceTokens=<typeof>)`。理由 = 决定 1 的复验判据要能从单文件复算两半（「每会话恰一行」与「`measure` 抛错时该会话恰一条 warn」；`session=` 字段直接 `sort | uniq -c`），否则只能靠时间戳猜会话边界。`<id>` 取 `session.id`，非字符串写 `?`（宿主形状守卫，与既有形状闸同款纪律）。

**决定 4：不引入轮转与行数上限**。本插件每会话行数为 O(1)（1 条读数 + 少数降级 warn），一个发版周期内文件以 KB 计；出现真实增长形态再立（触发条见 Consequences）。

**边界**：零新增依赖（`node:fs` / `node:os` / `node:path`）；防火墙不变（值 import 允许集仍 `dsh-tools` + `dsh-llm`，本件零宿主依赖）；不进 `inject` 声明；不替代 `ctx.logger`。自测注入 writer 不触真实文件系统，`apply` 冒烟用临时 `DSH_HOME`。

## Alternatives considered

- **注册 cordis exporter（`ctx.logger.exporter({ levels, export })`）**：落败——把「收得到哪些消息」押在宿主 logger 服务的更宽 API 面上（本层最小合同只声明 `logger(name)`），exporter 是进程全局（须按 name 过滤才不越界），自测要模拟 cordis 服务语义；收益（少一层包装）小于契约面扩大。
- **写进 session 卷**：落败——A8 已封（`Session.append` 无 `ignorable` 写入口，宿主读路径对词汇表外事件类型 fail-closed；[撤除 ADR](../../implemented/architecture/2026-09-08-a8-session-record-projection-removal.md)）。
- **只改判据口径，承认不可观测**：落败——不解决降级留痕整体零读者，等于把哑件留在仓里。
- **要求部署方在 profile patch 里挂 console logger**：落败——把本包的可观测性押在用户环境配置上，包自身仍不可自证（且只是把行打到桌面形态不可见的 stdout）。
- **撤掉读数行，回到纯字面预算判据**：落败——护栏 ADR 决定 1 的观察面意图仍在（要真实读数判注入面实际多大），且本通道同时服务全部降级 warn，撤行不解除问题。

## Consequences

- **正面**：装机形态首次有插件侧持久留痕；两条待复验的 B 类判据（[HANDOFF-todos](../../../../HANDOFF-todos.md) B 第 1/2 条）判据面从「宿主日志」改为该文件；A3/A6 与各挂载点降级 warn 全部可事后查。
- **负面（显式接受）**：① 通道自身故障（无写权限 / 磁盘满 / 目录不可建）静默；② 单文件无上界——触发条 = 出现可持续增长形态（如每工具调用一行）；③ 消息含路径与子进程输出摘要（bank pull 的 stdout 摘要），凭据面与 `host.log` 同级，且 `verify-secrets` 的扫描面是仓内 `.noogenesis/`、不含本文件（不入仓）。
- **依赖与环境**：写权限 = 宿主进程权限（桌面形态 = 用户 home）；`dsh-frecency` 已在同一路径 `~/.dsh/logs/` 实证可写。
- **未覆盖**：无 exporter 的宿主形态下本通道照写（这恰是它存在的理由）；读数行的「随会话增长」这半条判据仍待装机复验——本件只恢复可观测性，不改读数语义。

## 落账（2026-09-16）

- **交付件**：新件 `adapters/dsh/log-sink.mts`（`resolveLogFile` / `createLogSink` / `LogTarget` / `LogWriter`）；`index.mts` 的 `logger` 改为 `createLogSink({ target: ctx.logger("noogenesis") })` 并透传全部既有消费面（`askFactory` 改为收 logger 形参，不再自取 `ctx.logger`）；`token-baseline.mts` 的读数行与两条降级 warn 行加 `session=<id>`。
- **判据面**：`selftest.mts` 加 6 组（逐行时间戳与消息原文 / 两个失败面各自吞错 / `DSH_HOME` 三态路径解析 / `DSH_HOME` 归一化（`~` 展开与绝对化）/ 缺省 writer 真写文件 / `apply` 冒烟经临时 `DSH_HOME` 断言装载行与 A4 两条降级 warn 均落盘）；读数行与降级 warn 行的 `session=` 形状断言加在既有读数组内。
- **读数**：`npm run build`（tsc）exit 0；`node dist/adapters/dsh/selftest.mjs` 全绿（124 组）；`verify-export-docs.mts` 49 件源码全过；`oxlint` 0 warning / 0 error。
- **评审处置（FULL 三审 R1/R2，2026-09-16）**：采纳四条——`resolveLogFile` 归一化对齐宿主 `resolveDshHome`（R2-S1）、两条降级 warn 行补 `session=<id>`（R2-S3）、新增行缩进归位（R1-S1 ∩ R2-S2）、README 与护栏 ADR 的 Problem 证据重述收成指针（R1-S3）；拒绝一条——把 `log-sink.mts` 的注入旋钮（`file` / `append` / `resolveLogFile` 形参）压到消费者下限（R1-S2；其自陈反驳成立：hermetic 自测手段，删掉要改成进程级 env 改写，`append` 另由本件边界句显式辩护）。
- **接线边界**：不进 `inject`、不新增宿主服务读取面、不改 `gates.json`、零新增依赖；宿主 `ctx.logger` 仍收到同一条消息（宿主将来接 exporter 时两边都收）。
- **随之同步**：`adapters/dsh/README.md`「语义与失败模式」增落盘条并改读数行口径；护栏建设轮 ADR 的读数口径句同步 `session=` 与落盘通道；`HANDOFF-todos` 两条 B 类复验判据的观察面由「宿主日志」改为本文件（触发 = 下次发版装机后）。
