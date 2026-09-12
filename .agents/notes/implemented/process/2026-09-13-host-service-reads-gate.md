# Agent Note: 适配层宿主服务读取面上闸——白名单外直读未声明服务即拒

Status: implemented
Review: FULL/2026-09-13/R1=ok R2=ok R3=ok

> Related：立闸门槛单源 = [机械化 ADR](2026-09-11-review-finding-mechanization.md) Decision 1；同批修复件 = [可选宿主服务读取面走 ctx.get](../bug-fix/2026-09-13-adapter-service-read-lazy-get.md)；出处 = [演化轮池](../../../../HANDOFF-evolution-pool.md) 候选「adapters 里直读未声明宿主服务可静态判」；落地件 = [verify-host-service-reads](../../../../scripts/verify-host-service-reads.mts)；纪律指针 = [adapters/AGENTS.md](../../../../adapters/AGENTS.md)。

## Problem

同一类缺陷三次复发，每次都由评审 agent 抓出、机器面不拦：

- `ctx.skills` 直读（[修复件](../bug-fix/2026-09-12-bank-skill-provider-registration.md)）；
- `ctx.tokenMeter` 直读两处（[护栏建设轮](../architecture/2026-09-13-guardrail-construction-round.md) R1/R2 Blocker）；
- `ctx.userQuestions` 直读（[修复件](../bug-fix/2026-09-13-adapter-service-read-lazy-get.md)）。

形态在本层可枚举：对 `ctx` 的读取，白名单 = `inject` 声明 ∪ cordis `Context` 混入/代理面（`ctx.get` / `ctx.on` / `ctx.logger` / `ctx.emit` …）。判据不看语义、只看形状——正合 [机械化门槛](2026-09-11-review-finding-mechanization.md) Decision 1（判据稳定 + 先实测噪声）。

噪声实测【探索性 · n=1 次本机实跑】：闸实现后在修复前的树上（`cef2ff3`，装脚本入独立 worktree）实跑 = 16 件适配层源码中 1 处命中（`adapters/dsh/index.mts:78` 的 `ctx.userQuestions`，真阳性）+ 假阳性 0；修复后同树 = 0 命中、exit 0。两类误报源（注释里的 `ctx.tokenMeter`、字符串与模板串文本）在 AST 判据下天然不计。

## Decision

1. **立闸** `scripts/verify-host-service-reads.mts`，白名单条目 `host-service-reads`（登记 [`engine/gates.json`](../../../../engine/gates.json)）——pre-push / CI 随平面清单跑，engine evaluate 白名单同步可见。
2. **判据**：`adapters/**` 的 .ts/.mts 中对 `ctx` 的读取 ∈ ①`inject` 声明（各件 `export const inject = […]` 的字符串面并集，从源码解析、不手抄）∪ ②cordis `Context` 的混入/代理面（闸件 `CTX_SURFACE` 常量：名单来自 devDependency `@deepseek-ai/cordis` 的 Context 声明（lib/types 的 context / events / reflect / registry / fiber）与运行时转发面 `src/reflect.ts` 的 `ctx.mixin(...)` 调用——如 `fiber` → `runtime` / `effect`；宿主升代后按新声明复核）。读取面用 TypeScript AST（devDependency 既有，`verify-export-docs` 同款解析器）。
3. **判据边界**（闸件头注如实记）：只认标识符 `ctx`（改名或换载体不在判据内）；读法只判三种——属性读取 `ctx.x`、字面量元素访问 `ctx["x"]`、字面量键解构 `const { x } = ctx`（含重命名）；**不判**计算属性键（`ctx[expr]`、计算键解构）、rest 元素与嵌套解构；类型面的服务声明不判；注释 / 字符串 / 模板串文本天然不计，模板串插值内照判；`ctx.get("<name>")` 的服务名字符串不受约束（无 inject 要求即合法读法）。
4. **覆盖面 fail-closed**：源根 `adapters/` 缺失或零源码件 → exit 2（覆盖面不得静默归零）；`--self-test` = 20 判据夹具 + 1 声明解析夹具 + 4 源树/覆盖面夹具（`judgeTree` 直跑真树，含非源码件过滤与两条 fail-closed 档），违约样例必拒、合规样例必放行；夹具随 CI「self-test 抽查」清单消费（[`validate.yml`](../../../../.github/workflows/validate.yml)）。
5. **本件只登记这批的第四件机械化**：机械化 ADR 保留其三类清单的历史表述并加本件指针，不重抄条数；后续机械化件的家 = 各自批次 ADR。
6. **共享扫描原语单源**：源码扩展名过滤与递归列举落 `scripts/srctree.mts`，本闸与 [verify-export-docs](../../../../scripts/verify-export-docs.mts) 同消费（`scripts/AGENTS.md` 共享件纪律；域根与判据语义仍留各闸）。

## Alternatives considered

- **并入 oxlint 规则集**（[`.oxlintrc.json`](../../../../.oxlintrc.json)）：落败——白名单是通用规则集，`ctx` 白名单是本仓语义而非通用规则；仓内自定义判据的既有形态是 `scripts/verify-*.mts` + `gates.json` 条目。
- **并入 `adapters/dsh/selftest.mts` 的静态扫描**：落败——selftest 是 dist 面（需 `npm run build`）且不在 `gates.json` 白名单，engine evaluate 与 pre-push/CI 的单源消费面盖不到；把静态判据塞进 import 面扫描件会让两类判据互相绑定。
- **文本去注释启发式扫描**：落败——AST 判据零启发式成本即免疫注释/字符串误报；手写去注释器是自造解析器。
- **手抄白名单（`tools` / `systemPrompt` 字面量）**：落败——`inject` 声明一改即双源漂移；从源码解析声明面即单源。
- **不立闸、继续靠评审语义面**：落败——三次复发说明这类形态不会因为评审抓过就消失；判据稳定且实测零噪声，符合立闸门槛（门槛是「噪声过关」，不是「findings 数量」）。

## Consequences

- **采用面**：`engine/gates.json`（条目 `host-service-reads`；条目集单源 = `scripts/gates.mts --list`）、`scripts/verify-host-service-reads.mts`（新件）、`.github/workflows/validate.yml`（self-test 抽查清单）、`scripts/srctree.mts`（共享扫描件；`scripts/verify-export-docs.mts` 改消费它）、[adapters/AGENTS.md](../../../../adapters/AGENTS.md) 规则条目（挂闸指针）、[机械化 ADR](2026-09-11-review-finding-mechanization.md) Consequences 指针。
- **成本护栏**：每加一条门禁 = 多一个维护面；本件的约束是判据只认形状、白名单从源码解析、覆盖面显式 fail-closed（三处都在闸件头注里写成合同）。
- **判据外的规避形（如实记）**：计算属性键 `ctx[expr]`、rest 元素与嵌套解构不在判据内（可读但非常见形态）；`ctx` 之外的上下文命名同样不判（本层无此形态，触发 = 真实出现第二命名或计算键读取的漏网）。
- **未覆盖**：语义面仍留评审——服务是否**应当**经 `ctx.get` 取（把该进 `inject` 声明的服务写成懒取用）不在判据内。
- **评审收口（2026-09-13，FULL 三审）**：R1（简化路）0B/3S、R2（代码路）1B/3S、R3（ADR 路）0B/5S，**共 12 条：全采纳 10、部分采纳 2**（部分采纳 = R1-S2「两个 ref 判据可折一」只抽共享助手、不合并语义；R3-S3 采纳其判据定义细化、拒绝其字数前提——池件段位预算不在已声明判据内，仍是池件「待定」节条目）。修复落 `be80257` 与收口提交：共享扫描件 `scripts/srctree.mts`、`CTX_SURFACE` 补 `runtime`（运行时转发面）与判据边界两种读法、`judgeTree` 覆盖面夹具、CI self-test 登记（R2 Blocker）、本件去掉无闸覆盖的门禁条数。
