# Agent Note: 适配层宿主服务读取面上闸——白名单外直读未声明服务即拒

Status: implemented
Review: FULL/2026-09-13/pending（三重审核进行中，收口时回填真实结论）

> Related：立闸门槛单源 = [机械化 ADR](2026-09-11-review-finding-mechanization.md) Decision 1；同批修复件 = [可选宿主服务读取面走 ctx.get](../bug-fix/2026-09-13-adapter-service-read-lazy-get.md)；出处 = [演化轮池](../../../../HANDOFF-evolution-pool.md) 候选「adapters 里直读未声明宿主服务可静态判」；落地件 = [verify-host-service-reads](../../../../scripts/verify-host-service-reads.mts)；纪律指针 = [adapters/AGENTS.md](../../../../adapters/AGENTS.md)。

## Problem

同一类缺陷三次复发，每次都由评审 agent 抓出、机器面不拦：

- `ctx.skills` 直读（[修复件](../bug-fix/2026-09-12-bank-skill-provider-registration.md)）；
- `ctx.tokenMeter` 直读两处（[护栏建设轮](../architecture/2026-09-13-guardrail-construction-round.md) R1/R2 Blocker）；
- `ctx.userQuestions` 直读（[修复件](../bug-fix/2026-09-13-adapter-service-read-lazy-get.md)）。

形态在本层可枚举：`ctx.<name>` 属性读取，白名单 = `inject` 声明 ∪ cordis mixin（`get` / `on` / `inject` / `logger` / `provide`）。判据不看语义、只看形状——正合 [机械化门槛](2026-09-11-review-finding-mechanization.md) Decision 1（判据稳定 + 先实测噪声）。

噪声实测【探索性 · n=1 次本机实跑】：闸实现后在修复前的树上（`cef2ff3`，装脚本入独立 worktree）实跑 = 16 件适配层源码中 1 处命中（`adapters/dsh/index.mts:78` 的 `ctx.userQuestions`，真阳性）+ 假阳性 0；修复后同树 = 0 命中、exit 0。两类误报源（注释里的 `ctx.tokenMeter`、字符串与模板串文本）在 AST 判据下天然不计。

## Decision

1. **立闸** `scripts/verify-host-service-reads.mts`，白名单条目 `host-service-reads`（登记 [`engine/gates.json`](../../../../engine/gates.json)）——pre-push / CI 随平面清单跑，engine evaluate 白名单同步可见。
2. **判据**：`adapters/**` 的 .ts/.mts 中 `ctx.<name>` 属性读取 ∈ ①`inject` 声明（各件 `export const inject = […]` 的字符串面并集，从源码解析、不手抄）∪ ②cordis mixin（mixin 名单单源 = 闸件 `MIXIN_NAMES` 常量）。读取面用 TypeScript AST（devDependency 既有，`verify-export-docs` 同款解析器）。
3. **判据边界**（闸件头注如实记）：只认标识符 `ctx` 的属性读取（改名或换载体不在判据内）；类型面的服务声明不判；注释 / 字符串 / 模板串文本天然不计，模板串插值内照判；`ctx.get("<name>")` 的服务名字符串不受约束（无 inject 要求即合法读法）。
4. **覆盖面 fail-closed**：源根 `adapters/` 缺失或零源码件 → exit 2（覆盖面不得静默归零）；14 判据夹具 + 1 声明解析夹具入 `--self-test`，违约样例必拒、合规样例必放行。
5. **本件只登记这批的第四件机械化**：机械化 ADR 保留其三类清单的历史表述并加本件指针，不重抄条数；后续机械化件的家 = 各自批次 ADR。

## Alternatives considered

- **并入 oxlint 规则集**（[`.oxlintrc.json`](../../../../.oxlintrc.json)）：落败——白名单是通用规则集，`ctx` 白名单是本仓语义而非通用规则；仓内自定义判据的既有形态是 `scripts/verify-*.mts` + `gates.json` 条目。
- **并入 `adapters/dsh/selftest.mts` 的静态扫描**：落败——selftest 是 dist 面（需 `npm run build`）且不在 `gates.json` 白名单，engine evaluate 与 pre-push/CI 的单源消费面盖不到；把静态判据塞进 import 面扫描件会让两类判据互相绑定。
- **文本去注释启发式扫描**：落败——AST 判据零启发式成本即免疫注释/字符串误报；手写去注释器是自造解析器。
- **手抄白名单（`tools` / `systemPrompt` 字面量）**：落败——`inject` 声明一改即双源漂移；从源码解析声明面即单源。
- **不立闸、继续靠评审语义面**：落败——三次复发说明这类形态不会因为评审抓过就消失；判据稳定且实测零噪声，符合立闸门槛（门槛是「噪声过关」，不是「findings 数量」）。

## Consequences

- **采用面**：`engine/gates.json`（18 → 19 条）、`scripts/verify-host-service-reads.mts`（新件）、[adapters/AGENTS.md](../../../../adapters/AGENTS.md) 规则条目（挂闸指针）、[机械化 ADR](2026-09-11-review-finding-mechanization.md) Consequences 指针。
- **成本护栏**：每加一条门禁 = 多一个维护面；本件的约束是判据只认形状、白名单从源码解析、覆盖面显式 fail-closed（三处都在闸件头注里写成合同）。
- **未覆盖（如实记）**：语义面仍留评审——服务是否**应当**经 `ctx.get` 取（把该进 `inject` 声明的服务写成懒取用）不在判据内；`ctx` 之外的上下文命名同样不在判据内（本层无此形态，触发 = 真实出现第二命名）。
