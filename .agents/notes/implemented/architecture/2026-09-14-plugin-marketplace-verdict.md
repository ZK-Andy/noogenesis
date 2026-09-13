# Agent Note: 批次 7 序 37 裁决——插件市场 / capability manifest 适配：适用角色已声明，市场面无宿主服务面

Status: implemented

Related: 批次表 [行 37](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · 主设计 [§11.2 / §12-P4](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 共享层稿 [§集成面](../../../../docs/research/dsh-collective-evolution-shared-layer.md) · 前序分发件 [一行安装 ADR](2026-09-14-one-line-install.md) · 组合裁决 [序 36 ADR](2026-09-14-capsule-composition-verdict.md) · 发布面闸 [code-standards / package-invariants](../../../../docs/method/code-standards.md) · 宿主声明类型 `@deepseek-ai/dsh-package-manifest`（本机实装代实读）

## Problem

批次表行 37（批次 7 尾件）要求「插件市场 / capability manifest 适配」（出处主设计 §11.2/§12-P4，语义 = 分发与权限隔离的适配层）。开工前取证（2026-09-14，本机单仓实读 + 实装代宿主源码实读）：

- **宿主的「capability manifest」= `package.json` 的 `dsh` 键**：类型单源 = `@deepseek-ai/dsh-package-manifest` 的 `DshManifest`——角色六个：`bundle`（配置层）/ `profile`（profile 目录）/ `client`（client 模块）/ `configTrees`（实验镜像打包）/ `sessionFormatMigration`（会话格式迁移，仅扫 `packages/session/**`）/ `moduleFallback`（launcher 生成，非作者面）。
- **本包只适用 `bundle` 角色**：`dsh.bundle.patch = ./cordis.patch.yml`；无 client UI 模块、无镜像配置目录、非 profile 目录、非会话格式迁移件。该角色已由 `verify-package-invariants` 判据 4（patch 指向实存件）与判据 2（`files` 覆盖）把关。
- **「插件市场」在宿主侧无服务面**：`dsh --help` 的命令只有 `web` 与 `plugin`（后者把余参转发 pnpm）；`dsh-package-manifest`（声明）/ `dsh-host-plugin-inventory`（Loader 只读清点）/ `dsh-plugin-package-inventory-deepseek`（请求元数据）三件覆盖声明、清点与诊断，无市场 / 目录 / 注册面；宿主源码树 grep `marketplace` 只命中 OpenRouter 归因与 Claude Code 环境变量两处无关面。
- **分发通道 = 宿主 CLI + npm/pnpm 三形态**（宿主 publish 指南）：npm 与 tarball 用预构建产物；git 安装取源码，**要求作者侧 `prepare` 构建**（指南明写「一个包没有 `dsh.bundle` 声明仍可装为普通依赖；git 安装不跑 build 脚本」）。
- **本包发布面现状**：`main`/`exports` 指向 `dist/**`，`dist/` 被 gitignore（B2 口径 = git 面只收 TS 源），`scripts` 无 `prepare` —— **git 安装通道今日装得上、载不起**（入口 `dist/adapters/dsh/index.mjs` 缺席）。
- **消费者面**：无外部消费者（单机自托管；序 21/22 贡献开放轮为零，序 36 裁决在案）。

## Decision

### 1. 序 37 判不立（顺延）——manifest 半边已交付，市场半边无面可适配

- **capability manifest 半边**：唯一适用角色 `bundle` 已声明并有发布面闸；其余五个角色对本包不成立（无 client 模块 / 无 configTrees / 非 profile 目录 / 非迁移件 / 末项非作者面）。报「待适配」就是为不存在的角色造字段（同序 24「字段先于消费者即死字段」判据）。
- **插件市场半边**：宿主无市场 / 目录 / 注册服务面；分发是宿主 CLI + npm/pnpm 通道，用户安装面已在序 34 交付（四条路径）。造市场描述件 / 目录同步器 = 无消费者的脚手架。
- **plugin inventory 半边**：`dsh-host-plugin-inventory` 是宿主对 Loader 的只读投影，包侧零参与——装上即在清单里，无需适配。

### 2. 具名缺口：git 安装通道的作者侧 `prepare`

今日 `dsh plugin --profile <dev> -- add github:ZK-Andy/noogenesis` 会装成普通依赖但载不起（git 面零 `dist/`、无 `prepare`）。修法 = 加 `prepare`（`tsc -p tsconfig.build.json` + copy `engine/gates.json`）并同步 CI 的重复构建步。**无消费者，不本批做**——它改构建 / 发布链路并牵连 CI，属独立批（触发 T1）。

### 3. 本件增量 = 宿主分发面的机制读数

本件记录 manifest 六角色表、宿主无市场服务面、三分发通道的作者侧义务与「git 通道今日不可用」这一事实，供贡献开放轮与后续分发批复用；机制零变化。

### 4. 重议触发

- **T1**：出现 git / tarball / 市场通道的真实安装需求（用户点名或外部消费者）→ 开「git 安装通道收口」批（`prepare` + CI 构建步 + README 通道行）。
- **T2**：宿主给出插件市场 / 目录 / capability manifest 服务面（注册、检索或权限声明）→ 按新面另立 ADR。
- **T3**：序 21/22 贡献开放轮落地（外部消费者出现）→ 随该轮重估分发通道与清单角色。

## Alternatives considered

- **现在加 `prepare` 打通 git 通道**：落败——无消费者；且它改构建 / 发布链路并牵连 CI 重复构建步（本批为纯文档收口，该面属独立批，触发 T1）。
- **造「市场描述件」（`marketplace.json` / 目录元数据）**：落败——宿主无市场服务面读它，消费者为零（字段先于消费者）。
- **声明 `client` / `configTrees` 等角色以「齐全」**：落败——本包无 client UI 模块、无镜像配置目录，声明即死字段，且会让 `verify-package-invariants` 的 `files` 覆盖判据追一批不存在的发布件。
- **补 `keywords` 提升 npm 搜索发现性**：落败——唯一消费者（registry 检索排序）无真实检索需求，发现性不构成本序的具名失败。
- **判「已交付、零动作」**：半对——manifest 半边确已交付，但「插件市场适配」在宿主无面、git 通道具名缺口在案；判已交付会掩盖 T1 缺口。

## Consequences

- **批次表单源更新**：行 37 备注改 `done（指针 = 本件）`；「未交付」计数 13 → 12；游标 = 批次 8 序 38（项目初始化域）。
- **机制零变化**：`engine/**`、`adapters/**`、`scripts/**`、`package.json`、`cordis.patch.yml` 均不动；本件 LIGHT 档（纯文档收口，路径触发集未命中）。
- **单源**：宿主分发面机制读数与 git 通道缺口触发条以本件为家；安装机制结论单源 = [M2 适配层 ADR](2026-09-06-m2-adapter-wiring.md) 系；用户安装路径单源 = 根 README 安装节（[一行安装 ADR](2026-09-14-one-line-install.md)）。
- **批次 7 收口**：P4 分发三行（34–36 已落 + 37 本件）全落终态；下一批 = 批次 8（内容域，序 38–42）。
