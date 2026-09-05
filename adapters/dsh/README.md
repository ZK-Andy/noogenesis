# adapters/dsh — DSH 适配层

M2 适配层拍板与耦合防火墙的单一事实源：[ADR 2026-09-06-m2-adapter-wiring](../../.agents/notes/implemented/architecture/2026-09-06-m2-adapter-wiring.md)。本目录是插件包里**唯一**允许携带 DSH 特有面的层。

## 消费契约（安装面）

- 安装：`dsh plugin --profile <name> add noogenesis`（bundle patch 插入 plugin row `{id: noogenesis, name: noogenesis}`）。
- 装载契约：ESM 入口 `index.mjs` 导出 `name` / `inject` / `apply`；Config 手工校验，违约 fail-closed 抛错。
- 运行时依赖收敛：仅 `@deepseek-ai/dsh-tools`（defineTool，经依赖注入进 tools.mjs）；引擎零第三方依赖不受影响。

## 配置（profile patch 插件 row 的 `config` 字段，全部可选）

| 字段 | 类型 / 默认 | 语义 |
|---|---|---|
| `repoRoot` | string / 回退 `NOGENESIS_REPO_ROOT` → cwd | 目标仓根（引擎与 genes/ 所在）。**装在 DSH 侧的插件 ≠ 运行仓**，部署时必须显式锚定 |
| `sectionOrder` | 正整数 / 120 | system-prompt 基座节 order；命中节 = +1 |
| `injectSignals` | string[] / `[]` | 常驻命中节的显式信号；空 → 命中节零 token |
| `stagingDir` | string / `genes-staging` | 待入档候选目录（相对 repoRoot） |
| `askOnDispose` | bool / true | 会话结束发现候选时提问人工确认；false 或提问面缺席 → 只提醒 |
| `actor` | string / `noogenesis` | solidify `--actor` 名 |
| `maxIndexGenes` | 正整数 / 12 | 命中节行数封顶 |

## 语义与失败模式

- **三工具只读**：`noo_select` / `noo_propose` / `noo_evaluate` 不写盘不提交；引擎退出码映射：0=结果文本、1=闸红（红是有效结论，以文本返回）、2=fail-closed（抛错，重试无益）。
- **写路径唯一**：solidify 只在 `agent/disposed` 触发体里经人工确认执行；确认缺席/拒绝 → 只输出带精确命令的提醒。solidify 红档候选不入档（引擎语义），失败清单以 warn 汇报。
- **system-prompt 双节**：基座节固定极小；命中节空渲染 → 宿主丢弃 → 零 token。信号只来自 `injectSignals` 显式声明与模型显式调 `noo_select`——Detect 禁区（骨架 D2）不在本层解除。

## 自测

```sh
node adapters/dsh/selftest.mjs   # 零宿主依赖；含防火墙机器检查（本目录 import 面 + engine 零第三方依赖）
```
