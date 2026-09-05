# Agent Note: P1 发动机骨架拍板（语言·合同面·序列化）

Status: proposed

> Provenance：本仓原创设计（2026-09-05 立项讨论轮）。码级底座为 [2026-09-05-evomap-evox-engine-anatomy](2026-09-05-evomap-evox-engine-anatomy.md)（四接口实战印证/记忆图参数/canary 闸）；本 ADR 承接其 Proposal 条目 4，逐题拍板并记录取舍。讨论过程见 journal 2026-09 卷。

## Problem

发动机骨架的四个拍板题（语言与依赖姿态 / 信号入口 / propose 形态 / 评估与不变量边界）此前无一家之言：设计稿 §5/§12 给了原语与生命周期，但落地选型（语言、序列化、信号从哪来、propose 是否触 LLM、"严格改进"如何机器判定）全部悬空。逐题拍板，结论落本 ADR，架构定稿后供实现轮引用。

## Proposal

### D1（2026-09-05，已拍板）：引擎语言 = Node.js；P1 零第三方依赖；Gene 序列化 = JSON

- **选型**：Node.js（标准库 only），初版不引任何 npm 依赖；`js-yaml` 例外权保留至 M2 插件化时再议。
- **Gene 序列化**：JSON（`JSON.parse` 标准库，真零依赖）；YAML 的策展书写舒适性不做 P1 诉求——首批基因是手工翻译的一次性工作，机器校验为主。
- **合同面**：CLI 四命令（select/propose/evaluate/solidify）为唯一合同面；未来可换内核不改接口（含用其他语言重写内核，接口不变）。
- **依据**（讨论轮实测，journal 2026-09 卷）：
  1. 引擎消耗画像 = 子进程编排（跑 9 门禁/git）+ 文件 I/O + 字符串匹配 + 小算术，墙钟瓶颈全在外部进程——性能是伪命题，Rust/C# 的优势打在非瓶颈上；
  2. LLM 不在引擎内（引擎编译提示词、跑验证闸，生成在宿主侧），token 消耗与引擎语言无关；
  3. 参考实现 evolver（MIT 时代快照）为 Node.js——机制对照零翻译；
  4. DSH 全链 Node.js（实测 `@deepseek-ai/dsh` package.json：ESM + cordis 内核），M2 适配层可从"spawn CLI"升级为同栈进程内复用；
  5. P4 分发面走 npm（`noogenesis` 裸名 + org 已占位）。
- **被否选项**：Rust（单二进制分发被 npm+CI 取代；编译期保证输给 P1 协议 churn 期的迭代速度）；C#（类型系统收益未打中真实约束，.NET 装机面窄）；Python（与门禁同栈，但 M2 反正要 Node，参考代码又是 JS——省下的运行时加了回来）。

<!-- D2（信号入口）/ D3（propose 形态）/ D4（评估与不变量边界）占位：拍板一题填一题。 -->


## Alternatives considered

- **P1 直接全依赖引入（如 commander + js-yaml 一步到位）**：暂不做——P1 是"裸仓自洽"的证明轮，零依赖是能力声明而非教条；待 CLI 参数面复杂到手写解析开始出 bug，或基因格式迁 YAML 时，随 M2 一并放开。
- **语言问题挂起、先写 schema**：落败——schema 的序列化格式与校验器形态直接受语言约束（零依赖决定 JSON），先拍语言才能让 ②6（落盘协议）一题收敛。

## Acceptance criteria

- D2–D4 拍板后本 ADR 补齐三题，进入 FULL 三审；证据行落本 ADR 头部，`verify-review-tier --enforce` 转绿。
- 实现轮的 engine 骨架若引入任何第三方依赖，须先修订本 ADR D1（或其例外条款）——依赖姿态是门禁级约束。

## Risks

- 零依赖姿态与 JSON 基因格式绑定——若 P2 基因库（§9）生态迁 YAML，需在 M2 引入 `js-yaml` 并写迁移器；风险已知且后置。
- Node 单运行时假设——若未来引擎要进无 Node 环境（边缘/容器最小镜像），CLI 合同面保证可换 Go/Rust 内核而不动接口。
