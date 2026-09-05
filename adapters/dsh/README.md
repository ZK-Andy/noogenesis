# adapters/dsh — DSH 适配层

M2 适配层拍板与耦合防火墙的单一事实源：[ADR 2026-09-06-m2-adapter-wiring](../../.agents/notes/implemented/architecture/2026-09-06-m2-adapter-wiring.md)；部署收口（包改名 / 工具注册单参合同 / repoRoot 四级回退链）：[ADR 2026-09-06-adapter-deploy-hardening](../../.agents/notes/implemented/architecture/2026-09-06-adapter-deploy-hardening.md)；P2 只读共享消费（geneBankUrl / 惰性 pull / 缓存合并扫描）：[ADR 2026-09-06-p2-shared-consumer](../../.agents/notes/implemented/architecture/2026-09-06-p2-shared-consumer.md)；技能随库分发（动态 provider / rank 600 / 蒸馏正文）：[ADR 2026-09-06-skills-ride-bank](../../.agents/notes/implemented/architecture/2026-09-06-skills-ride-bank.md)。本目录是插件包里**唯一**允许携带 DSH 特有面的层。

## 消费契约（安装面）

- 安装：`dsh plugin --profile <name> add noogenesis-dsh`（bundle patch 插入 plugin row `{id: noogenesis, name: noogenesis-dsh}`）。宿主件包名规则 = 裸名 + 宿主后缀；裸名 `noogenesis` 保留给框架引擎。
- 装载契约：ESM 入口 `index.mjs` 导出 `name` / `inject` / `apply`；Config 手工校验，违约 fail-closed 抛错。`inject = ["tools", "systemPrompt"]`——**不含 userQuestions**（提问是可选能力，disposal 时懒取用；cordis 对缺席的注入服务会推迟整个插件装载，声明注入会让降级不可达）。
- 运行时依赖收敛：仅 `@deepseek-ai/dsh-tools`（defineTool，经依赖注入进 tools.mjs）；引擎零第三方依赖不受影响。
- **装上即转**：零配置安装即在三工具与 solidify 面生效——repoRoot 逐次调用解析（四级回退链，见下）；唯一例外是 system-prompt 命中节（同步面无会话上下文），动态索引需显式锚定（见 `repoRoot` 行）。
- **技能面**：插件注册 `noogenesis-bank` 技能 provider（rank 600），技能从 `<repoRoot>/.noogenesis/genes-cache/.agents/skills/` 读取——即 `geneBankUrl` 拉下来的库缓存；未配置库或未 pull 过 → 技能面为空（正常降级，非错误）。self-hosting 仓的 `.agents/skills` 活副本（rank 200）恒遮蔽缓存副本。

## 配置（profile patch 插件 row 的 `config` 字段，全部可选）

| 字段 | 类型 / 默认 | 语义 |
|---|---|---|
| `repoRoot` | string / 回退 `NOGENESIS_REPO_ROOT` → **会话工作区** → cwd | 目标仓根（引擎与 genes/ 所在）。工具体与 solidify 面逐次解析（多 agent 异仓各归各仓）；system-prompt 命中节是同步面、无会话上下文，只能用 config/env/cwd 三级——要动态命中节就在部署时显式锚定 |
| `sectionOrder` | 正整数 / 120 | system-prompt 基座节 order；命中节 = +1 |
| `injectSignals` | string[] / `[]` | 常驻命中节的显式信号；空 → 命中节零 token |
| `stagingDir` | string / `genes-staging` | 待入档候选目录（相对 repoRoot） |
| `askOnDispose` | bool / true | 会话结束发现候选时提问人工确认；提问面缺席、ask 抛错或超时（兜底 300s）→ 降级为只提醒 |
| `actor` | string / `noogenesis` | solidify `--actor` 名 |
| `maxIndexGenes` | 正整数 / 12 | 命中节行数封顶 |
| `geneBankUrl` | string / 缺省（离线） | P2 只读消费：基因库 git URL；在场 → 装载时惰性 `pull` 一次进 `<repoRoot>/.noogenesis/genes-cache/`（每实例至多一次，刷新 = 重跑 pull 或重启），缓存并入 select/propose 扫描根（同名 ref 本仓优先） |

## 语义与失败模式

- **三工具只读**：`noo_select` / `noo_propose` / `noo_evaluate` 不写盘不提交；引擎退出码映射：0=结果文本、1=闸红（红是有效结论，以 `RED (exit 1)` 文本返回；**exit 1 + 空 stdout = 引擎内部故障**（非 EngineError 走 `throw e` 崩溃退出码同为 1 且无报告），按 fail-closed 抛错不放行）、2=fail-closed（抛错，重试无益）。
- **写路径唯一**：solidify 只在 `agent/disposed` 触发体里经人工确认执行；确认缺席/拒绝/超时 → 只输出带精确命令的提醒；in-flight 去重逐仓隔离（同仓近同时 dispose 不重复弹问/重复入档，异仓互不阻塞）；solidify 红档候选不入档（引擎语义），失败清单以 warn 汇报。
- **system-prompt 双节**：基座节固定极小；命中节空渲染 → 宿主丢弃 → 零 token（`injectSignals` 为空时直接短路，不 spawn 引擎）。引擎 stdout 进宿主 prompt 前对 `{{` 做零宽中性化——宿主 interpolate 对未知 `{{name}}` 抛错且 renderPrompt 每模型步无包裹调用，模板语法基因 summary 不得原样透传。信号只来自 `injectSignals` 显式声明与模型显式调 `noo_select`——Detect 禁区（骨架 D2）不在本层解除。
- **基因库拉取是便利面**（P2）：`geneBankUrl` 在场时装载时惰性 pull 一次，失败仅 warn 降级离线（缓存缺席 = select/propose 与无 P2 完全一致）；pull 是只读消费，写路径（solidify）恒以本仓 `genes/` 为对象，缓存基因不可入档。
- **技能随库分发是内容面**：技能 provider 与 pull 共享同一缓存——装包后首次成功 pull 才见技能面（首跑空窗，文档明示）；provider 的 list 输入形状以「成员集」为前提，按胶囊过滤随 capsules/ 原语立项落地（本版恒为全量，不立配置面）。

## 自测

```sh
node adapters/dsh/selftest.mjs   # 零宿主依赖；含防火墙机器检查（本目录 import 面 + engine 零第三方依赖）
```
