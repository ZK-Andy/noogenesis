# Agent Note: 批次 7 序 36 裁决——胶囊组合成 preset / profile：组合面宿主原生承载，本仓产出面判不立

Status: implemented

Related: 批次表 [行 36](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · 主设计 [§2.3 / §11.2](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · 归口来源 [批次 6 裁决 ADR](2026-09-14-batch6-composition-meta-verdict.md)（行 31 能力面归口本行） · 依赖面 [Capsule 原语](2026-09-13-capsule-primitive.md) / [开题轮 ADR](2026-09-14-batch5-opening-round.md)（序 25 渲染语义后置） · 组合消费面 [一行安装 ADR](2026-09-14-one-line-install.md) · 范围契约 [anti-overdesign](../../../../docs/method/anti-overdesign.md) · 宿主机制面 `@deepseek-ai/dsh-agent-presets`（本机实装代实读）

## Problem

批次表行 36 要求「胶囊组合成 preset / profile」（出处主设计 §2.3/§11.2），声明依赖序 1（Capsule 原语）与序 25（gene→skill 渲染语义）；行 31（P3 组合）已判不立并把同一能力面归口本行，本行给终态。开工前取证（2026-09-14，本机单仓实读 + 本机实装代宿主源码实读 + 本会话卷实读）：

- **输入面零实例**：`capsules/` 与 `mutations/` 两目录均不存在；`events/2026-09.jsonl` 8 条记录全为 `gene.*`（零 Capsule）。可组合的 Capsule 实例为零。
- **宿主组合面分两层，均原生在场**：profile = `dsh.profile.bundles` 按序叠加的 plugin-bundle patch 层（`dsh --help` 实读；写入面 = `dsh plugin --profile <name> add` 转发 pnpm 到 profile 目录；落点 `$DSH_HOME/profiles/`，本机实存 `dotnet-desktop` / `web` 两件，在会话工作区之外）；agent preset = `@deepseek-ai/dsh-agent-presets` 的每会话组合——一个 preset 目录（`agent.cordis.yml` + `preset.yml`）选定该会话的 tools / prompt 节 / skills，shipped 集为 `standard` / `minimal` / `ptc` / `cordis`，用户根 `<dshHome>/.agent-presets`；本会话卷头 `agentPreset: "ptc"`。
- **我方包已是可组合单元**：`package.json` 的 `dsh.bundle.patch` + `cordis.patch.yml` 单层，装上即成为 profile 的一层；组合入口与安装入口同一条宿主命令。
- **第三方包不参与 preset 发现**：发现面 = `dsh-agent-presets` 自带 shipped root + 部署配置 `roots` + 用户根；该包只提供 roster / 挂载服务，无插件侧注册 API，作者面是 copy-only 写用户根（会话工作区之外）。故本包 ship 预设目录也不会被自动发现。
- **产出形状判据未拍**：序 25（gene→skill 渲染语义）维持随贡献开放轮后置——「预设 / 流程」这种产出形状的渲染判据缺席。
- **内容面单件**：本仓方法论 = 单个内容胶囊（7 技能随库分发 + method/cookbook/流程卡/门禁），无「按任务类型分组的多个可组合单元」。

## Decision

### 1. 序 36 判不立（顺延）——组合面由宿主原生承载，本仓无独立增量

「一整套胶囊 = 一个 profile / preset」在宿主两层均已成立：profile 层把包按其 patch 层叠加，preset 层按会话组合 tools / prompt / skills；我方包以 `dsh.bundle.patch` 参与该组合，零新增机器面即有资格被组合。行 36 设计语义里真正缺席的是**输入侧与判据侧**——可组合单元单件、Capsule 实例为零、产出形状渲染语义（序 25）后置。三者都是真实前提，不是实现细节。

### 2. 三项候选实现全落既有判据之外

- **引擎产「组合描述件」**（读 N 个 Capsule 生成预设 / 流程文件）：零实例、无具名消费者，且与行 31 同面双家——行 31 Alternatives 已判（新顶层目录准入四问的消费一问不过）。
- **包内 ship 预设目录 + 消费文档**：宿主不对第三方包自动发现 preset root（发现面见 Problem），产物只能靠用户手动 copy 进 `<dshHome>/.agent-presets/`；为无具名消费者的场景预铺产物不属 [anti-overdesign](../../../../docs/method/anti-overdesign.md) 范围契约。
- **引擎 / 插件写 `$DSH_HOME/profiles/` 生成 profile**：落点在会话工作区之外，组合面是 CLI + pnpm 而非插件服务面，且跳过「谁消费」——先例同 A8 教训（宿主约束把设计上合理的面判不可实现）。

### 3. 重议触发沿用行 31 T1–T3（单源不变），本行不新立

- **T1**：`capsules/` 出现 ≥2 个真实实例，且出现「同一任务类型需成组注入（超出单基因 `select` 面）」的具名消费者。
- **T2**：序 25 渲染语义拍板——产出形状（预设 / 流程）先有渲染判据。
- **T3**：宿主给出插件侧 preset / profile 注册面（当前只有部署配置 `roots` + copy-only 用户根；行 31 措辞的「插件侧组合 / 挂载服务面」以本句为当前事实读数）。

触发条单源 = [批次 6 裁决 ADR](2026-09-14-batch6-composition-meta-verdict.md) Decision 1；本行只补 T3 的当前事实读数与 T1/T2 的现值复核（两项现值均未到达）。

### 4. 本件增量 = 宿主组合面的当前机制读数

本件记录 preset 层的现有机制（发现面、作者面、能力位）与「第三方包不参与 preset 发现」这一事实，供后续行 37（插件市场 / capability manifest 适配）与贡献开放轮复用；机制零变化。

## Alternatives considered

- **判「已交付、行 36 零动作」**：部分成立但落败——宿主组合面在场不假，但行 36 的设计语义（同一套方法论按任务类型组合成不同预设）在输入侧与判据侧均缺席；判已交付会把缺席前提记成已满足，重议触发随之失去载体。
- **引擎产组合描述件**：落败——零 Capsule 实例、无具名消费者，且与行 31 同面双家（先行判据 = 行 31 Alternatives；同序 5 C3「无具名消费者的记录件」与序 24「字段先于消费者即死字段」）。
- **包内 ship 预设目录 + 消费文档**：落败——宿主不对第三方包自动发现 preset root；产物只能靠用户 copy 到工作区外的用户根，而需求面（谁要哪个任务类型的预设）为零。
- **我方 bundle patch 追加一条 `dsh-agent-presets` row 配 `roots`**：落败——该服务已在宿主组合的 root realm 发布，第二条 row 撞服务名（该包 mount audit 明确拒收从 root realm 发布服务的 row）；且这是干预宿主包配置面，不是本包职责。
- **按域拆多个 npm 包（每包一个任务预设）**：落败——发布面 1→N（版本联动 / peer 依赖面 / `package-invariants` 闸扩面），为单机单用户零需求的场景造分发拓扑；先例 = 序 29 拒绝提前拆协议包。
- **引擎 / 插件写 `$DSH_HOME/profiles/`**：落败——落点在工作区外、组合面非插件服务面、跳过消费者（同 A8 宿主约束教训）。

## Consequences

- **批次表单源更新**：行 36 备注改 `done（指针 = 本件）`；「未交付」计数 14 → 13；游标 = 序 37（插件市场 / capability manifest 适配）。
- **机制零变化**：`engine/**`、`adapters/**`、`scripts/**`、`package.json`、`cordis.patch.yml` 均不动；本件 LIGHT 档（纯文档收口，路径触发集未命中）。
- **触发条与口径单源**：行 36 的重议触发 = 行 31 T1–T3（单源 = [批次 6 裁决 ADR](2026-09-14-batch6-composition-meta-verdict.md)，本件只补当前事实读数）；宿主 preset 层机制读数以本件为家；序 25 后置口径单源 = [开题轮 ADR](2026-09-14-batch5-opening-round.md)。
- **既有判裁零变化**：行 31–33 的终态、序 25 的后置口径、序 34/35 的交付面均维持；本件只补行 36 的终态。
