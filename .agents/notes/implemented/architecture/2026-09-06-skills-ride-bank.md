# Agent Note: 技能随库分发——胶囊机器面纯化，技能经基因库缓存进 DSH 技能面

Status: implemented

> Provenance：本仓原创（2026-09-06 用户逐题拍板六题 + 双路调研支撑；同会话实现轮落地）。调研证据：DSH 生态技能分发惯例（检索口径：2026-09-06 对本机 DSH 安装内全部 `@deepseek-ai/dsh-*` 包 grep `registerProvider`，仅 2 个自定义 SkillProvider 先例——`dsh-skill-filesystem` 分层 roots / `dsh-skill-badge` 硬编码单条【探索性 n=1 安装】；宿主合同 `ctx.skills.registerProvider` + `BUNDLED_SKILL_RANK=600`，装包不自动拾起技能）与 EvoMap/genesis 分发形态（gh CLI 六步配方，证据 SHA：`bit-cook/evolver@fa7a011`、`andipermana8/evolver@41f95e0`、`EMI-Group/genesis`——genesis 的「技能与代码同仓提交即分发、零中心服务」为本拍板的外部印证）。

Review: FULL/2026-09-06/R1=ok R2=ok R3=ok

中文（本仓正文中文单语）

## Problem

胶囊（npm 包 `noogenesis-dsh`）的分发面缺技能层：`package.json` `files` 只含适配层/引擎/接线，7 个 `noo-*` 技能只活在本仓 `.agents/skills`（DSH 对工作区仓的自动发现），外部装包只得机器（system-prompt 节 + noo_* 三工具 + solidify 触发 + 引擎 CLI），技能一件拿不到——换仓即失效（M2 ADR 自述）。归期链条悬空：M2 M4 拍「分发随 P2」、P2 D3 又把「gene→skill 渲染与技能分发」整体后置，两条后置均无触发条件，与护栏 ADR 点名的「无限顺延」风险同构。用户拍板（2026-09-06）：**优化轮之前先做「技能进胶囊 + 胶囊可正常运行」**，且胶囊必须可随时取出放入——据此否决静态快照路线（闭包/整仓烧进 npm files）。

## Decision

**胶囊保持纯机器面；技能作为内容随基因库（bank）走，经缓存进 DSH 技能面。** 六项拍板：

1. **接线形态**：新增 `adapters/dsh/skill-provider.mjs`（badge 式极简 provider，零宿主依赖），在 `apply()` 内经 `ctx.skills.registerProvider` 注册。`list` **动态**：每次 lookup 以 `options.cwd` 走四级回退链（复用 `resolveRepoRoot`）逐次解析 repoRoot，技能目录 = `<repoRoot>/.noogenesis/genes-cache/.agents/skills/`（引擎 pull 已整仓浅克隆，零引擎改动）；缓存缺席（ENOENT）→ 空数组静默降级，其余读错误 warn 留痕仍空面（与 geneBankUrl 的 warn 降级语义同构）。注册返回 `invalidate` 钩子（留持宿主 SkillProviderControl——宿主按 cwd/scope/revision 缓存 list 结果，revision 仅 invalidate/dispose bump）：pull 成功落地后由 `index.mjs` 调用，pull 前已被 list 过的 cwd 无需重启会话即重发现技能面。
2. **rank = 600**（bundled 标准位，常量本地定义不引 `dsh-skill` 依赖）：用户根（400/500）与项目根（100/200）同名技能均可遮蔽胶囊技能——零抢占；self-hosting 时本仓活副本（200）恒赢，现状不变。技能名 `noo-*` 前缀即名字空间。
3. **技能正文蒸馏改写（单源一次）**：7 技能改写为「通用方法论层 + 显式参照实现层」——本仓路径保留但降格为参照实现指针（缓存全仓镜像保证可解析），**实例专属输入处**（如 doc-budgets 的 manifest 是心源仓实例）注明参照实现口径，通用机器闸引用由每技能头部「宿主口径」行统一兜底。**不维护两份正文**：活副本 = 包外缓存副本 = 同一文件，逐字节搬运上游技能的死链教训与双源漂移教训同时规避。
4. **不烘焙种子技能**：装包后技能面随 pull 到位——pull 成功即 invalidate 刷新（空窗 = pull 时长）；pull 未成功前技能面为空（正常降级），README 明示（evolver 内置种子基因的静态模式不学——内容随库动态走是本拍板的反面）。
5. **frontmatter 极简解析**：目录式 `<name>/SKILL.md`，取 name/description/whenToUse 简单键值；CRLF 行尾入口归一化（换任何 CRLF 收录的库缓存不得整技能面静默清空）、引号成对才剥；description 缺失 warn 跳过（`dsh-skill-filesystem` 同款纪律）；name 过本地 kebab-case 校验（`isSkillName` 语义，不引依赖）。
6. **胶囊过滤只立设计约束**：provider 的 list 输入形状以「成员集」为前提（今天成员集恒为全量）；capsules/ 原语、按胶囊过滤、胶囊市场/Hub 全部后续轮（EvoMap Hub 的 credit 平台锁为反面依据，本仓分发保持 git/文件优先）。

版本随发版轮合并 `noogenesis-dsh@0.1.2`（技能面 + geneBankUrl 惰性 pull 进部署同发）；desktop 重装与新会话重验由用户手动执行。

## Alternatives considered

- **静态闭包/整仓快照进 npm `files`**：落败（用户拍板）——内容烧进包即冻结，更新靠发版，与「随时取出放入」矛盾；技能相对链接闭包还会把 AGENTS.md 等治理件拖进包，与宿主项目语义冲突。
- **生态惯例路线：patch 挂一行 `dsh-skill-filesystem` + `customSkillDirs` 指向缓存**（agent-presets 同款）：落败——`customSkillDirs` 是静态声明，覆盖不了 repoRoot 四级回退中的会话工作区/cwd 两级（部署 ADR 的逐次解析正确性要求）；且该配置走 rank 300，会静默抢占用户本地同名技能。
- **自定义 provider 但 rank 300**：落败——同上抢占面；600 是宿主为打包技能定义的标准位。
- **技能正文原样分发**：落败——外部用户读到「本仓」操作指令与跑不动的 manifest 参数（蒸馏守单源，见 Decision 3，不是维护两份）。
- **烘焙种子技能进包**：落败——静态快照教训；首跑空窗以文档明示 + pull 一次即解。
- **gene→skill 自动渲染（M2 M4 原归期路线）**：维持后置不取代——技能是手工策展资产，自动渲染与 #18「手动策展 > 自动沉淀」教训冲突；本 ADR 只补「技能随库分发」这一层，渲染语义仍随贡献开放轮。

## Consequences

- **收益**：外部装包 → pull 即得 7 技能 + 全部 method/cookbook 参照面；胶囊可随时装卸（删插件即弃用，缓存惰性残留同 npm 缓存语义）；npm 包零新增依赖、`files` 零改动；引擎零改动。
- **代价**：成为 DSH 生态第三家自定义 SkillProvider（有意偏离惯例，依据 = 逐次解析正确性，见 Alternatives）；技能首跑空窗；7 技能蒸馏改写的一次性内容成本；缓存目录残留在宿主仓（`.noogenesis/`，无害惰性）。
- **风险承接**：pull 失败/未拉 → 技能面为空，会话正常（降级纪律同 P2）；同名冲突由 rank 600 兜底（被遮蔽而非抢占）。
- **交付更正（2026-09-12 实机实证）**：本件的「外部装包 → pull 即得 7 技能」未成立——宿主未注册本 provider，自举仓之外的会话目录里只有该仓自有技能；证据、未证环与修复立项 = [proposed/bug-fix bank provider 注册失效](../../proposed/bug-fix/2026-09-12-bank-skill-provider-registration.md)。

## Testing

selftest 扩展夹具（零宿主依赖直测，修复批后 46 组全绿）：假 ctx 捕获 registerProvider；临时仓缓存内 2 个技能夹具（1 合规 + 1 缺 description 应 warn 跳过）；list 返回 rank 600 候选；get 返回全文 + resourceBase 指向技能目录；双仓 cwd 各归各仓（逐次解析）；缓存缺席（ENOENT）→ 空列表静默；skills 路径为文件（ENOTDIR）→ warn 留痕仍空面；CRLF SKILL.md parse 级 + list 级回归（不得整面静默清空）；invalidate 钩子触发宿主 control 失效；`registerBankSkills` 缺席宿主降级 `{ok:false}`；真实引擎 pull e2e（bank 带 `.agents/skills` → 缓存命中）。防火墙机器检查（import 面扫描）覆盖新模块零宿主依赖。

## Related

- 部分取代 M2 ADR [2026-09-06-m2-adapter-wiring](2026-09-06-m2-adapter-wiring.md) M4 的「M2 保持 repo-local」（技能分发提前收口）；gene→skill 渲染语义不取代，仍随贡献开放轮。
- 依赖 P2 拍板 [2026-09-06-p2-shared-consumer](2026-09-06-p2-shared-consumer.md)（本仓即库 + pull 缓存）；依赖部署收口 ADR [2026-09-06-adapter-deploy-hardening](2026-09-06-adapter-deploy-hardening.md) 的 repoRoot 逐次解析。
