# Agent Note: bank-pull 触发点随会话工作区 + geneBankUrl 包内缺省官方库

Status: proposed

> Provenance：本仓原创（2026-09-06 新会话重验轮发现桌面部署缺陷；用户两题拍板均采纳推荐项）。上游拍板：P2 只读消费 [2026-09-06-p2-shared-consumer](../../implemented/architecture/2026-09-06-p2-shared-consumer.md)（D5/D6/D7）、repoRoot 四级链 [2026-09-06-adapter-deploy-hardening](../../implemented/architecture/2026-09-06-adapter-deploy-hardening.md)、技能随库分发 [2026-09-06-skills-ride-bank](../../implemented/architecture/2026-09-06-skills-ride-bank.md)（invalidate 钩子）。

## Problem

P2 D7 拍板「`geneBankUrl` 在场时**插件装载**触发一次 pull」。但装载期 repoRoot 四级链（config → env → 会话工作区 → cwd）前三面在桌面默认部署下全部缺席：config 无值、无 env、**会话尚未创建**——兜底落到宿主进程 `process.cwd()`（GUI 启动的 dsh 子进程 cwd，与用户仓无关）。证据：`adapters/dsh/index.mjs` 装载期 `resolveRepoRoot(cfg)`（无会话参数）+ `engine-bridge.mjs` 链尾兜底。

后果：配了 `geneBankUrl` 的桌面部署，pull 落进 `<宿主cwd>/.noogenesis/genes-cache` 错位目录；而技能面与缓存扫描逐次按**真仓** cwd 查 genes-cache——永远空面，且零报错（纯静默失效）。这与 0.1.1 的 repoRoot 缺口同类，且 M2 部署收口已有既有拍板：「装完即部署是包内义务，手工补 repoRoot 配置不算达成」。

伴生缺口：`geneBankUrl` 无包内缺省，默认安装（files 白名单 + patch 行无 config）下共享消费面完全不激活，用户必须在宿主 patch 层手配一次 URL——部署摩擦与上述义务拍板同源。

## Proposal

两题用户已拍板（2026-09-06，均采纳推荐项）：

**D1 · 触发点 = 装载期 repoRoot 显式可知则装载触发；否则首个 `agent/created`（会话工作区可知时）触发。**

- 装载期：repoRoot 显式可知（`config.repoRoot` 或 `NOGENESIS_REPO_ROOT`）→ 保留装载触发，显式配置部署行为与 0.1.2 完全一致。显式可知的判定收敛 engine-bridge 新单源（`explicitRepoRootOf`：config → env → undefined，**无 cwd 兜底**）。
- 会话期：`agent/created` listener（payload 与 solidify 用的 `agent/disposed` 同形状，`scopeTarget(agent, agent)`）；`sessionWorkspaceOf(payload)` 缺席 → **跳过，绝不退到 cwd 兜底**——错位落地的根因就是装载期 cwd 兜底，会话期不得重演。在场 → `resolveRepoRoot(cfg, sessionCwd)` 触发 pull。时序前提：session header（含 cwd）在 `prepare` 时已定、先于 agent `register`/announce（dsh-session/dsh-agent 源码实证）。
- 每实例每仓至多一次闸不变：`createInFlightGate` 实例跨两路径共享，拉完不释放；失败 warn 降级离线（不变）；成功 → `invalidate()` 刷新技能面（不变）。
- 调度语义抽为可直测单元：bank-pull.mjs 新增 `createBankPullScheduler`（装载路径 / 会话路径 / 跳过语义 / `onPulled` 回调），index.mjs 只接线。

**D2 · `geneBankUrl` 包内缺省官方库，可覆盖可禁用。**

- `validateConfig`：`undefined` → 缺省 `DEFAULT_GENE_BANK_URL`（`https://github.com/ZK-Andy/noogenesis.git`，常量单源导出）；`false` → 显式禁用（pull 面短路，零 clone 尝试）；非空 string → 自定义库；空串/其他类型照旧抛。
- 默认安装即激活：pull → 缓存基因 + 技能面即刻可用。无网环境用 `false` 禁用（禁用面免一次必然失败的 clone 尝试；不禁用也只是 warn 降级，本就不阻塞会话）。

实现步骤：`config.mjs`（缺省 + 禁用面 + 常量）/ `engine-bridge.mjs`（`explicitRepoRootOf`）/ `bank-pull.mjs`（`createBankPullScheduler`）/ `index.mjs`（agent/created 接线）/ `selftest.mjs`（新夹具组）/ `adapters/dsh/README.md`（配置表 + 触发面）/ P2 ADR D7 行加指针。版本随 `noogenesis-dsh@0.1.3` 发版轮，修复走发包不走本地手修。

<!-- 按需添加自由格式的专属小节：包拓扑、wire 契约、schema 等 -->
## Alternatives considered

- **仅首次工具调用懒触发**：落败——首次 `noo_*` 调用要吃一次 clone 延迟，技能面 invalidate 晚到；`agent/created` 早于任何工具调用，时序更优。
- **仅显式 repoRoot 时装载触发、否则跳过**：落败——桌面默认部署下 pull 永不触发，「装完即部署」缺口只是从静默错位变成静默不激活，义务拍板仍未兑现。
- **`session/created` 事件代替**：落败——payload 形状是 session 本体而非 `{agent}` 载体，`sessionWorkspaceOf` 复用面断裂；`agent/created` 与 `agent/disposed`（solidify 同款）同形状，零新解析面。
- **geneBankUrl 继续由用户 patch 层显式配置**：落败——默认安装下功能零激活，部署摩擦在「手工补配置不算达成」的既有拍板面前不成立；官方库 URL 是本包的既定事实（D1 本仓即库），缺省进包不损失任何选择权（覆盖/禁用面齐全）。

## Acceptance criteria

- 桌面默认安装（零 patch config）重启后：genes-cache 落在会话工作区仓内、cache remote = 官方库、技能面 rank 600 在场（被本仓同名活副本遮蔽时以遮蔽关系为准）、缓存基因并入 select 扫描。
- 显式 config/env 部署行为与 0.1.2 完全一致（装载触发）。
- 无会话工作区的 `agent/created` 不触发 pull（不落 cwd 兜底）——回归夹具在案。
- `geneBankUrl: false` → 零 pull 尝试；空串/非 string 非 false 照旧抛。

## Risks

- HMR 重载场景（插件晚于已有 agent 装载）不补发 `agent/created` → 该会话 pull 缺席，直至新 agent 或重启；已知边界，手动 `engine pull` 可补（记录不修——为罕见路径加重连面不值）。
- 无网环境的默认安装每次装载一次失败 warn（噪音面）；`false` 禁用面兜底。
- 每仓一 clone：多仓会话各自拉同一库（磁盘重复）——P2 D5 仓内缓存的既有语义，不在本拍板面。
