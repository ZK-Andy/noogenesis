# adapters/dsh — DSH 适配层

M2 适配层拍板与耦合防火墙的单一事实源：[ADR 2026-09-06-m2-adapter-wiring](../../.agents/notes/implemented/architecture/2026-09-06-m2-adapter-wiring.md)；部署收口（包改名 / 工具注册单参合同 / repoRoot 四级回退链）：[ADR 2026-09-06-adapter-deploy-hardening](../../.agents/notes/implemented/architecture/2026-09-06-adapter-deploy-hardening.md)；P2 只读共享消费（geneBankUrl / 惰性 pull / 缓存合并扫描）：[ADR 2026-09-06-p2-shared-consumer](../../.agents/notes/implemented/architecture/2026-09-06-p2-shared-consumer.md)；pull 触发点随会话工作区 + geneBankUrl 缺省官方库：[ADR 2026-09-06-bank-pull-session-trigger](../../.agents/notes/implemented/bug-fix/2026-09-06-bank-pull-session-trigger.md)；技能随库分发（动态 provider / rank 600 / 蒸馏正文）：[ADR 2026-09-06-skills-ride-bank](../../.agents/notes/implemented/architecture/2026-09-06-skills-ride-bank.md)；注册时序与技能可达性门：[ADR 2026-09-12-bank-skill-provider-registration](../../.agents/notes/implemented/bug-fix/2026-09-12-bank-skill-provider-registration.md)。本目录是插件包里**唯一**允许携带 DSH 特有面的层。

## 消费契约（安装面）

- 安装：`dsh plugin --profile <name> add noogenesis-dsh`（bundle patch 插入 plugin row `{id: noogenesis, name: noogenesis-dsh}`）。宿主件包名规则 = 裸名 + 宿主后缀；裸名 `noogenesis` 保留给框架引擎。
- 装载契约：ESM 入口 `index.mjs` 导出 `name` / `inject` / `apply`；Config 手工校验，违约 fail-closed 抛错。`inject = ["tools", "systemPrompt"]`——**不含 userQuestions 与 skills**（两者都是可缺席能力，cordis 对缺席的注入服务会推迟整个插件装载，声明注入会让降级不可达：提问面 disposal 时懒取用，skills 走 `ctx.inject(["skills"], …)` 可重试注册，[ADR](../../.agents/notes/implemented/bug-fix/2026-09-12-bank-skill-provider-registration.md) Decision 1）。
- 运行时依赖收敛：`@deepseek-ai/dsh-tools`（defineTool，经依赖注入进 tools.mts）+ `@deepseek-ai/dsh-llm`（createUserMessage，注入消息构造，B4 ADR Proposal 2）；两者只许 index.mts import（dist 发射 index.mjs）。引擎零第三方依赖不受影响。
- **装上即转**：零配置安装即在三工具与 solidify 面生效——repoRoot 逐次调用解析（四级回退链，见下）；唯一例外是 system-prompt 命中节（同步面无会话上下文），动态索引需显式锚定（见 `repoRoot` 行）。
- **前置条件**：目标仓 = git 仓且宿主机 git CLI 在场——引擎命令第一步 `git rev-parse` 锚定仓根，solidify/pull 直接调用 git 子进程；git 缺失或非 git 仓 → 引擎 fail-closed 退出 2（诊断分流：git 缺失指名 git，非 git 仓报 not inside a git repository）。
- **技能面**：插件注册 `noogenesis-bank` 技能 provider（rank 600），技能从 `<repoRoot>/.noogenesis/genes-cache/.agents/skills/` 读取——即 `geneBankUrl` 拉下来的库缓存；未 pull 过 → 技能面为空（正常降级，非错误）；pull 成功落地即触发宿主技能缓存失效刷新（`control.invalidate`），pull 前已被 list 过的会话无需重启即见技能面。self-hosting 仓的 `.agents/skills` 活副本（rank 200）恒遮蔽缓存副本。**注册走 `ctx.inject(["skills"], …)`**：skills 服务装载前已在场即注册、晚到则到场补注册（一次性读服务在缺席时会被 cordis 拒绝且永久缺席）；`ctx.inject`/skills 服务/`registerProvider` 任一缺席 → warn 留痕降级，不阻塞其余装载面。
- **技能可达性是提醒面判据**：可达集 = 活副本目录 + 缓存目录（**缓存只在 provider 注册成功后计入**）。技能面缺席的仓里，A2 路标行与 A3 触点提醒一律不点名（不把 agent 引向载不到的技能）；缓存有技能而 provider 未注册 = 交付未发生，每会话一条 warn 留痕。

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
| `geneBankUrl` | string / 官方库 `https://github.com/ZK-Andy/noogenesis.git`；`false` 显式禁用 | P2 只读消费：基因库 git URL；pull 进 `<repoRoot>/.noogenesis/genes-cache/`（每实例每仓至多一次，刷新 = 重跑 pull 或重启），缓存并入 select/propose 扫描根（同名 ref 本仓优先）。触发点：repoRoot 显式可知（config/env）→ 装载时；否则首个 `agent/created` 以会话工作区锚定（缺席跳过，绝不落 cwd 兜底） |
| `skillGuards` | `{ kind: "path" \| "suffix" \| "command"; pattern: string; skill: string }[]` / 缺省 4 条：`docs` → noo-doc-standards、`.md` → noo-prose-standard、`.agents/notes` → noo-archive-agent-notes、`git`〔可带全局选项前缀〕`push` → noo-pre-push-checks；显式数组整体替换缺省表 | 触点提醒映射表（M1 守卫②；三类匹配面与缺省条目单源 = [触发面扩面 ADR](../../.agents/notes/implemented/architecture/2026-09-11-skill-guard-trigger-faces.md)）：`path` = 写码目标的 POSIX 相对目录前缀；`suffix` = 目标路径后缀（扩展名）；`command` = bash 命令文本正则。写码目标两条通道 = `write`/`edit` 的 `file_path` + bash 命令里的 `>`/`>>`/`tee`（含 `-a`/`--append`）目标（双引号包、单引号包或裸 token；按会话 cwd 解析、出仓即弃；`$VAR`/`~` 未展开式不算），脚本体内的写不可见；命令面是文本正则，字面量命中（如 `echo 'git push'`）同样提醒；缺省 push 条目容忍 `git` 全局选项前缀（`-c <k=v>` / `-C <dir>` / `--git-dir[=<dir>]` 等），`push` 作为其它子命令参数的调用不命中；该条正则字面量（可复制回 `skillGuards`）与匹配面单源 = [修复件 ADR](../../.agents/notes/implemented/bug-fix/2026-09-12-skill-guard-push-pattern-reachability.md) Decision 1）。命中而本会话未载对口技能 → 经 `agent.inject` 建议行（一次列全命中项，不阻断），每会话每技能至多一行；命中条目的 `skill` 还须在可达集里才发行（不可达条目静默且不消耗该技能的提醒预算，判据单源 = [注册时序 ADR](../../.agents/notes/implemented/bug-fix/2026-09-12-bank-skill-provider-registration.md) Decision 2） |

## 语义与失败模式

- **模型面字符串语言口径**：模型可见字符串（基座节 / 命中节 / 子树规则地图 / 技能路标行与触点提醒 advice / 在环拦回与降级 warn / 技能守卫降级 warn / 工具 description）统一英文；注释与 durable 文档用中文。口径面 = 本层自有措辞；**数据面 carve-out**——信号短语、基因 summary、基因注入文本跟随内容自身语言，不在口径内。口径单源 = 本行（拍板 ADR [2026-09-10-standards-audit-simplification-candidates](../../.agents/notes/implemented/simplification/2026-09-10-standards-audit-simplification-candidates.md)）。

- **挂载面（B4 + M1 守卫批 + 注释面扩面批；A6/A8 记录投影不挂）**：四挂载点接线——`agent/pre-step`（A2，会话首个 pre-step 的子树规则地图建议消息，含技能路标行——任务型→技能名映射，只点名可达技能，零可达不发行）、`tools/pre-execute`（A3，技能触点提醒——写码目标（写码工具 `file_path` / bash 重定向与 `tee` 目标）或 bash 命令文本命中 `skillGuards` 条目而本会话未载对口技能 → `agent.inject` 建议行一次列全，**advice 非阻断档**，每会话每技能至多一条，可达性门同上；deny/ask 能力位仍零策略）、`tools/post-execute`（A4，写码在环两判据——`lint-feedback.mts` 跑仓根 oxlint、`export-docs-feedback.mts` 跑仓内判据件 `scripts/verify-export-docs.mts <file>`（**A4 唯一执行仓内脚本的面**：固定文件名 + 参数数组直传 + cwd 仓根 + timeout 5s + 只读），机器可判违规 **block 拦回**写码工具结果，须修正才能继续；同文件连续拦回达上限降级 `context`、干净写码复位，降级面绝不变成写码阻断）、`agent/session-start`（A5，非阻塞 inject 能力位，零策略）。插件**不向宿主 session 写任何自定义事件类型**（A6 记录投影 + A8 `session.append` 自定义 kind `noogenesis/*` 不挂——宿主读路径对词汇表外且未标 `ignorable` 的事件类型 fail-closed 拒解释整份日志，而装机 `Session.append` 无 ignorable 写入口；拍板单源 = [ADR 2026-09-08-a8-session-record-projection-removal](../../.agents/notes/implemented/architecture/2026-09-08-a8-session-record-projection-removal.md)）。阻断面唯一 = A4 block 拦回（升格批 ADR 拍板；注释面扩面批 [2026-09-10-export-docs-inloop](../../.agents/notes/implemented/architecture/2026-09-10-export-docs-inloop.md)）；其余全部异常 catch → warn 降级，绝不阻塞会话。拍板单源 = [ADR 2026-09-08-b4-mount-wiring](../../.agents/notes/implemented/architecture/2026-09-08-b4-mount-wiring.md) + [轨道 A ADR](../../.agents/notes/implemented/architecture/2026-09-08-lint-in-loop-feedback.md) + [M1 立项 ADR](../../.agents/notes/implemented/architecture/2026-09-10-m1-guard-anti-overdesign.md) + 撤除 ADR。
- **三工具只读**：`noo_select` / `noo_propose` / `noo_evaluate` 不写盘不提交；引擎退出码映射：0=结果文本、1=闸红（红是有效结论，以 `RED (exit 1)` 文本返回；**exit 1 + 空 stdout = 引擎内部故障**（非 EngineError 走 `throw e` 崩溃退出码同为 1 且无报告），按 fail-closed 抛错不放行）、2=fail-closed（抛错，重试无益）。
- **写路径唯一**：solidify 只在 `agent/disposed` 触发体里经人工确认执行；确认缺席/拒绝/超时 → 只输出带精确命令的提醒；in-flight 去重逐仓隔离（同仓近同时 dispose 不重复弹问/重复入档，异仓互不阻塞）；solidify 红档候选不入档（引擎语义），失败清单以 warn 汇报。
- **system-prompt 双节**：基座节固定极小；命中节空渲染 → 宿主丢弃 → 零 token（`injectSignals` 为空时直接短路，不 spawn 引擎）。引擎 stdout 进宿主 prompt 前对 `{{` 做零宽中性化——宿主 interpolate 对未知 `{{name}}` 抛错且 renderPrompt 每模型步无包裹调用，模板语法基因 summary 不得原样透传。信号只来自 `injectSignals` 显式声明与模型显式调 `noo_select`——Detect 禁区（骨架 D2）不在本层解除。select stdout 的观测建议档行（`advice:`，融合轮第一期）与首行 `signals:` 同列被过滤，**不进常驻节**（建议按需经 `noo_select` 输出读；判据单源 = [实现 ADR](../../.agents/notes/implemented/architecture/2026-09-11-memory-line-phase1-observation-face.md)）。
- **基因库拉取是便利面**（P2）：`geneBankUrl` 缺省官方库、`false` 显式禁用；触发点两级（显式锚定 → 装载时；否则首个 `agent/created` 会话工作区锚定，缺席跳过不落 cwd 兜底），每实例每仓至多一次，失败仅 warn 降级离线（缓存缺席 = select/propose 与无 P2 完全一致）；pull 是只读消费，写路径（solidify）恒以本仓 `genes/` 为对象，缓存基因不可入档。HMR 重载晚于已有 agent 时不补发触发（已知边界，手动 `engine pull` 可补）。
- **技能随库分发是内容面**：技能 provider 与 pull 共享同一缓存（空窗语义以「技能面」条为家；注册时序与可达性门 = [ADR 2026-09-12-bank-skill-provider-registration](../../.agents/notes/implemented/bug-fix/2026-09-12-bank-skill-provider-registration.md)）；provider 的 list 输入形状以「成员集」为前提，按胶囊过滤随 capsules/ 原语立项落地（本版恒为全量，不立配置面）。

## 自测

```sh
node dist/adapters/dsh/selftest.mjs   # 零宿主依赖（npm run build 后）；含防火墙机器检查（本目录 import 面 + engine 零第三方依赖）
```
