# Agent Note: 批次 7 序 34——一行安装收口：宿主首用初始化闭合安装链（零机器面）

Status: implemented

Review: LIGHT/2026-09-14/pending（语义评审进行中，收口时回填真实结论）

Related: 批次表 [2026-09-13-feature-completion-backlog](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · 主设计 [§12-P4](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 安装机制单源 [M2 适配层](2026-09-06-m2-adapter-wiring.md) / [部署收口](2026-09-06-adapter-deploy-hardening.md) · 包面声明 [package.json](../../../../package.json)（`dsh.bundle.patch`）· 豁免面 [cookbook 环境条](../../../../docs/cookbook.md) · 消费者面 [根 README 安装节](../../../../README.md)

## Problem

批次表行 34（P4 发布首件）要求「一行安装收口（npm 已具备，补 profile 一键）」。npm 面已交付（`noogenesis-dsh@0.2.6` 已发布，`dsh.bundle.patch` 在包清单在案）。开工前取证（2026-09-14，本机实装代宿主源码实读 + 临时 `DSH_HOME` 探针，全量）：

- **宿主 `dsh plugin` 已含「首用初始化」**：`runPlugin`（`lib/plugin-Ddi42qoW.js`）在 profile 无 `package.json` 时执行 `initProfile(dir, template?.bundles ?? DEFAULT_PROFILE_BUNDLES, …)` 并打印 `initialized profile <name> at <dir>`，随后在 profile 目录转发 pnpm，最后按**已装状态**对账 `dsh.profile.bundles`（声明 `dsh.bundle` 的依赖自动成为 bundle 层）。我方的 `dsh.bundle.patch` 声明因此自动入层，无需手改用户 patch——「profile 一键」的机制半边在宿主侧已在场。
- **profile 名即判据**：shipped 模板名（`acp` / `web` / `headless` / `sdk` / `sdk-minimal`）首用带对应 app bundles；其余名字只得 `DEFAULT_PROFILE_BUNDLES = ["@deepseek-ai/dsh-base"]`（无 app）。未初始化的名字 boot 直接报错（临时 `DSH_HOME` 探针复现）：`dsh: profile "<name>" does not exist; create it with 'dsh plugin --profile <name> add <package>'`。
- **专用 app profile 的非交互初始化**：`dsh --profile <name> --from-default-profile <template> --dump-config`（临时 `DSH_HOME` 实跑 exit 0；落 `package.json` + `cordis.patch.yml` + `pnpm-workspace.yaml`，`bundles` = `["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"]`）。
- **本地检出安装形态**：`anchorPathSpec` 把 `.` / `..`（含 `file:` / `link:` 形态）锚到**调用目录**（pnpm 的 cwd 是 profile 目录，故裸 `.` 会被宿主改写）——`dsh plugin --profile <dev> -- add .` 是宿主明示支持的从源安装。
- **消费者面缺口（本序的增量）**：根 README 安装节只给装命令，缺 boot 行、缺 profile 名判据（任意名 = 无 app），缺专用 profile 与本地检出两条路径。

## Decision

### 1. 零新机器面：不造安装包装器

宿主命令已闭合「初始化 profile + 装包 + 层对账」，包自带 `dsh.bundle.patch` 闭合「激活」。再加包装器只是重复宿主命令，却新增一条对外命令合同面、spawn 失败面、工作区外写面（`$DSH_HOME/profiles/`）与配套夹具——按范围契约属脚手架。本序交付 = 消费者安装面收口。

### 2. 消费者安装面 = 根 README 安装节（双向镜像），四条路径

1. **装**：`dsh plugin --profile <name> -- add noogenesis-dsh`——首用即初始化 profile；包自动成为 bundle 层。
2. **起**：`dsh --profile <name>`。
3. **专用 app profile**：先 `dsh --profile <name> --from-default-profile <template> --dump-config >/dev/null` 初始化（`<template>` ∈ shipped 模板名；`--dump-config` = 只初始化不 boot 的形态），再走 1 / 2。
4. **从源检出**：仓库根 `dsh plugin --profile <dev> -- add .`（相对路径规格锚调用目录）。

附注（同节）：以 shipped 模板名（如 `web`）为 profile 名时，首用初始化带上该模板的 app bundle。

### 3. 与既有单源的关系

- 安装机制（pnpm 装包 + bundle 层对账、不写用户 patch）单源仍在 [M2 ADR](2026-09-06-m2-adapter-wiring.md) 系；本件只收口消费者侧命令序列，不重述机制。
- `minimumReleaseAge` 豁免归 [cookbook](../../../../docs/cookbook.md) 环境条；本件不复制。

## Alternatives considered

- **新增 `noogenesis-setup` bin（包内脚本 spawn `dsh plugin …`）**：落败——宿主命令已完整（首用初始化 + 装 + 层对账 + 相对路径锚定），包装器零新能力，却新增命令合同面、spawn 失败面、工作区外写面与 self-test 成本。
- **包内另发一份 profile 模板目录让用户复制**：落败——宿主模板表是安装态内建映射（`PROFILE_TEMPLATES`），第三方包无法注入模板名；复制目录绕开宿主的层对账，必然漂移。
- **四条路径写进 `adapters/dsh/README.md` 而非根 README**：落败——adapter README 的家是适配层消费契约（命令 / bundle 行为 / 配置字段）；安装路径序列是最终用户面，其家是根 README，两处并存即双家。
- **装完自动改用户 patch 或自动 boot**：落败——宿主已把 patch 面收敛为「包声明 + 层对账」（机制勘误在案），改用户 patch 是被淘汰的形态；自动 boot 属用户环境动作。
- **判「已交付、零动作」**：落败——消费者面三条缺失（boot 行 / 名判据 / 专用与从源两路径）是具名缺口，README 现状会把自定义名用户导向无 app 的 profile。

## Consequences

- **变更面**：`README.md` + `README.zh.md` 安装节；本 ADR；批次表行 34 done + 「未交付」计数 16 → 15 + 游标 = 序 35；HANDOFF ⏭ / 当前状态 / 滚动窗；todos (A)；journal。
- **机制零变化**：`engine/**`、`adapters/**`、`scripts/**`、`package.json`、`cordis.patch.yml` 零改动——本件 LIGHT 档（路径触发集未命中，`adapters` 面不动）。
- **单源**：安装命令序列单源 = 根 README 安装节；宿主机制事实与取舍单源 = 本件 Problem / Decision；包面声明单源 = `package.json`。
- **重议触发**：宿主给出一等「初始化 profile」子命令（不再依赖 `--dump-config` 侧效），或出现第三方 profile 模板注册面——任一到达即重开本件、重排四条路径。
