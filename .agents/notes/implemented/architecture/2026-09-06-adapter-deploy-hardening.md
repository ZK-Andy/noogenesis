# Agent Note: M2 部署收口——包改名 noogenesis-dsh + 工具注册单参合同 + repoRoot 会话工作区回退

Status: implemented

## Problem

`noogenesis@0.1.0` npm 首发后的 desktop 实机新会话验证（2026-09-06）暴露三件，发布 gate「`dsh plugin add` 可装，且装上即转」未真正成立：

1. **三工具只上一个**：`adapters/dsh/tools.mjs` 以 `ctx.tools.register(t1, t2, t3)` 一次传三个定义；DSH 宿主合同是 `ctx.tools.register(definition: ToolDefinition)` 单参，多余实参被静默忽略——只有 `noo_select` 注册生效，`noo_propose` / `noo_evaluate` 缺席模型面（会话实况：函数清单仅 noo_select）。自测假 `defineTool` 未模仿单参合同（多实参照收），测试漏检。
2. **repoRoot 结构性锚定失败**：回退链 config → env → cwd 在 desktop 部署下全落空——profile 无 noogenesis 配置节、`NOGENESIS_REPO_ROOT` 未设、宿主进程 cwd 非目标仓。实调 `noo_select` 引擎 fail-closed（exit 2「不是 Git 仓库」）。插件装载时一次性解析 repoRoot 的设计，使"装完即用"在 desktop 形态下不可能达成。
3. **包名身份错位**：裸名 `noogenesis` 被宿主接线件占用，多宿主命名规则悬空——若 PI 届时改用带标识包名，则与 DSH 裸名不对称（用户拍板明言排除）。

合同面证据：DSH 工具执行面 `execute(args, exec)` 的 `ToolExecution` 携带 `agent?`；官方 bash 工具体以 `exec.agent?.session.header.cwd` 取会话工作区（`dsh-tool-bash` lib 源码，2026-09-06 实测）；事件 payload 携带 `{ agent }`（`dsh-continual-evolve` `auto.ts` 实证注）。

## Decision

**命名规则（用户拍板）：宿主件 = 裸名 + 宿主后缀；裸名本体留给框架引擎。**

- 本包改名 `noogenesis-dsh`（package.json `name` / cordis.patch.yml plugin row `name` 同步；plugin row `id` 与入口导出 `name` 保持 `noogenesis`）。
- PI 等后续宿主按同规则各发一包（如 `noogenesis-pi`）；多包同仓同 commit 同版本号发布，`files` 白名单只装各自 adapter。
- 裸名 `noogenesis` 保留给将来的框架引擎单独发包；已发布的 `noogenesis@0.1.0` npm deprecate 指路 `noogenesis-dsh`。

**工具注册：逐个 `ctx.tools.register(defineTool(...))` 三连。** selftest 假面收紧为单参合同（register 每次恰好收一个定义），防回归。

**repoRoot 回退链升级为四级，且逐次调用解析：**

```
config.repoRoot → NOGENESIS_REPO_ROOT → 会话工作区 → process.cwd()
```

- 会话工作区 = `exec.agent?.session?.header?.cwd`（工具体）/ `payload.agent?.session?.header?.cwd`（`agent/disposed` 面）——与官方 bash 工具同源同款。
- 逐次解析使多 agent 异仓同时 dispose 各归各仓；引擎对四级全落空仍 fail-closed（exit 2 语义不变）。
- system-prompt 命中节是同步 text provider 面、无 exec/agent 上下文，只能用前三级（config/env/cwd）——未显式锚定时引擎 exit 2 的 stdout 为空 → 命中节渲染 `""` 零 token，无害退化；动态命中节依赖显式 `config.repoRoot` / 环境变量，写进 README 部署前提。

## Alternatives considered

- **单包裸名多宿主**（M2 原结构暗示的 P4 赌注）：peer 依赖需 optional hack 防跨宿主自动安装、per-host 安装元数据键共存未实测、PI 装载机制零实测。落败：用户拍板「删除未验证问题优于对冲它」——每宿主一包使三个待验证项直接不存在。
- **scoped 包名 `@noogenesis/dsh`**：org 已占位可用，但 scoped 名未经 `dsh plugin add` 机制实测（首发实测走裸名），且裸名+后缀规则更直白。落败于用户拍板；org 保留他用。
- **手工部署配置补 repoRoot**（profile config 或环境变量）：违反发布 gate「装上即转」，把包内设计缺口外化为用户负担。降级为覆盖口，不作部署要求。
- **插件装载时解析一次会话 cwd**：装载时点无会话上下文可读，且解析结果会固化到全部会话——多会话异仓互相污染。落败：必须逐次调用解析。

## Consequences

- **采用面**：`adapters/dsh/tools.mjs`（单参注册 + repoRoot 解析器注入）、`engine-bridge.mjs`（`resolveRepoRoot` 增会话工作区参）、`index.mjs`（工具体与 disposal 面逐次解析）、`package.json` / `cordis.patch.yml` / `adapters/dsh/README.md` 改名与部署节改写、`selftest.mjs` 扩合同夹具、裸名 npm deprecate。引擎零改动。
- **迁移面**：desktop 侧先卸 `noogenesis` 再装 `noogenesis-dsh`（同发布会话完成）；裸名 0.1.0 deprecate 文案指路新包。
- **已验证**：adapter selftest 含新增夹具全绿（单参合同逐个注册、四级回退链、disposal 面会话 cwd 提取）；`dsh plugin add noogenesis-dsh` 实装 + 新会话三件事重验（安装成功 / 三工具在场 / 零配置命中基因）随发布收口。
- **运行边界**：命中节动态索引仍依赖显式锚定（同步面无会话上下文，结构性约束非缺陷）；多宿主包版本对账靠同 commit 发布纪律，无跨包依赖锁。
