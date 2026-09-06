# 心源胶囊 01「AI 协作编码方法论」搬迁计划

> 日期：2026-09-05
> 状态：**已实施**（2026-09-05 评审定稿拍板后执行完毕；commits `dd32053`→`fe1a43d`，验收记录见 journal/2026-09.md 与 HANDOFF 滚动窗）
> 定位：Noogenesis 第一个胶囊（= 设计文档 §10"AI 协作编码框架"的 v0 种群）。**提炼后搬迁，不照搬**；本仓同时是这套方法论的第一个宿主（self-hosting：用心源的体系开发心源）。
> 输入：四路深度盘点（devops-template / dotnet-deepseek-harness-desktop / dsh-frecency / work 区）+ 逐文件亲读交叉印证。

---

## 0. 一句话

把四个来源项目里**被实战验证的协作纪律**蒸馏为心源的胶囊 01：常驻基座（双层 AGENTS）+ 流程卡（6 张）+ ADR 生命周期 + 门禁第一梯队（7 个零依赖脚本）+ cookbook 原子踩坑 + HANDOFF 家庭；**明确不搬**已被实证否定或平台绑定的部分；每条搬运决策留痕（ADR + 出处标注），每个已知缺陷在本仓以修复形式重生。

## 1. 目标与非目标

**目标**
- 建立心源自己的协作体系骨架，使本仓成为"自我宿主的 sandbox"——体系管自己，体系即第一个被演化对象。
- 搬运的每一件资产满足：机器可校验（有门禁）、有出处（provenance 头）、预算封顶（字数/token）、单源（每事实一个家）。
- 为后续 gene/capsule 协议化（P1）备好"高质量基因池"：每条纪律天然就是一条 proto-gene。

**非目标（本次不做）**
- 不做 Gene/Capsule YAML Schema 协议化（P1 的事；本计划只把内容搬对、搬净）。
- 不接共享层/基因库（P2）。
- 不复刻 dsh-continual-evolve 的自动沉淀机制（见 §6 负面清单；融合仅在新架构定稿后，与设计文档 §13.5 一致）。
- 不搬业务/平台特定实现（.NET/C# 规范、GitHub 治理件、打包流水线）。

## 2. 蒸馏原则（"提炼后搬迁"的六条纪律）

1. **元规则与实例分离**：搬"纪律本身"，不搬它的某个语言/平台实例。例：不搬 C# 编码规范，搬"规范文档必须声明强制力度（门禁拦/IDE 提示/留评审）"这个元规则。
2. **教训即资产**：每条门禁背后"真实逃逸/事故→固化为机器闸"的因果链，用 ADR 记录并随资产入库（desktop 的门禁进化律是全库最高密度资产，值得原样继承这套记录方式）。
3. **失败面不丢弃**：负面结论（自动沉淀零收益、软契约被刷穿、双源漂移……）蒸馏成 cookbook 踩坑原子（症状/根因/规避/来源），而不是静默扔掉——对齐设计文档"AVOID 保留失败面"。
4. **修缺陷，不复刻缺陷**：四源盘点暴露的每个已知 bug/设计债（引用链断裂、卷名跨月失效、超密长段……）在搬迁时顺手修掉，并在出处头标注"相对源的差异"。
5. **预算先行**：常驻基座 ≤800 词、协作层 ≤300 词、每张流程卡单卡封顶；先立预算 manifest 再搬内容，防止把臃肿搬进来（设计文档 §7 的 token 基线不变量，在 P0 以字数预算为代理）。
6. **单源不留双份**：结论只落 durable 四家（ADR/cookbook/README/AGENTS），HANDOFF 只留指针；禁止四源里出现过的"双源镜像互抄"。

## 3. 来源盘点结论（四路简表）

| 来源 | 定位 | 最值钱的东西 | 最大问题 |
|---|---|---|---|
| devops-template | 上游 DSH 体系的二次蒸馏模板 | "纪律的文本形态"：ADR 生命周期、CoT 泄漏八类分类学、最小证据原则、one-home-per-fact、预算门禁——全部零平台绑定 | "文档讲的体系 > 仓库装的骨架"：23 条借鉴清单只落地 3 个脚本 |
| desktop 项目 | 最成熟的实战体系 | 门禁进化律、机器化边界判定、评审简报协议（定档→简报→自证→有界并行→确定性报告）、HANDOFF 三层拆分治理、证据严肃性三件套 | .NET/C# 强绑定；评审档案/简报/journal 全 gitignore（过程资产不落库）；feature-flow 超密长段 |
| dsh-frecency | 小仓版最小可用集 | 六件套骨架（挂载面+流程卡+ADR+技能+门禁+HANDOFF）证明"最小可信集"够用；4 个零依赖门禁成熟 | 11 个原样技能引用链全断；门禁阈值与现实脱节；journal 换机即丢 |
| work 区 | 自演化引擎+长期工作台 | dsh-continual-evolve 的治理四件套与两段式评估（活证据库）；#18 负结果（自动沉淀零收益、手工策展紧凑资产才有价值）；OBSERVATION 观察生命周期协议 | 62KB 追加式 HANDOFF（流水账+战略混杂+双源漂移）；常开自动门禁被实证否定 |

**三条跨源共同教训**（搬迁设计的总纲）：
1. **紧凑手工策展资产 > 自动长文档沉淀**（desktop 流程卡/verify 实证 + work #18 + EvoMap 98% 零复用三重印证）→ 胶囊 01 只搬手工策展资产。
2. **能机器强制的绝不留自觉；机器盖不住的显式列清单交评审兜底**（desktop 门禁哲学）→ 门禁第一梯队 + 评审"AI 兜底"清单一起搬。
3. **"先长后立，不强行嫁接"**（desktop `.plan/ai-collaboration-method.md` 理念）→ 骨架一次立好，内容按需生长，不预设空的章节。

## 4. 目标体系骨架（搬迁后的本仓布局）

```
Noogenesis/
├── AGENTS.md                        # 常驻基座 ≤800 词：协作模式/流程卡索引/文档纪律/Git 纪律/质量门
├── .agents/
│   ├── AGENTS.md                    # 协作层专属 ≤300 词：技能/ADR/cookbook 规则 + MIT 出处声明
│   ├── skills/                      # 自研技能 7 个（适配后，见 §5）
│   ├── workflows/                   # 流程卡 6 张（见 §5）
│   └── notes/                       # ADR：proposed/implemented/rejected/archived + README
├── docs/
│   ├── method/                      # 方法论正文（被演化的内容域，as-needed 懒加载层）
│   │   ├── ai-collaboration-method.md   # 理念四骨 + 形制骨架（自 desktop .plan/ 回收入库）
│   │   ├── doc-standards.md             # 文档纪律元规则（tier/预算/slop 清单/CoT 泄漏治理索引）
│   │   ├── review.md                    # 评审体系（三重审核契约 + AI 兜底清单模板）
│   │   └── standard-authoring.md        # 规范写作元规则（强制力度分档/R 编号模式）
│   ├── cookbook.md                  # 踩坑单一事实源（原子条目：症状/根因/规避/来源）
│   └── research/                    # 现有 3 份设计/研究文档移入此处（设计文档自述落档处）
├── templates/                       # adr-proposed / adr-implemented / agents-hierarchy（typo 修复）
├── scripts/                         # verify-* 门禁第一梯队 7 个 + change-scope.sh + setup-hooks.sh
├── .githooks/                       # pre-commit（快检）/ pre-push（门禁全跑）
├── .github/workflows/validate.yml   # CI 复跑同一套门禁（P2 共享层验证闸的雏形）
├── HANDOFF.md                       # 交接入口：稳定区 + 摘要滚动窗（有界）
├── HANDOFF-todos.md                 # 行动区（[ ]≤16 条，机器强制）
└── journal/                         # 会话叙事月卷——**入 git**（与 desktop 相反的拍板，见 §7-3）
```

要点：
- **docs/ 与 .agents/ 的分工**=常驻 vs 懒加载：AGENTS 只放常驻元规则 + 链接；docs/method/ 是按需检索的情境知识层——这正是设计文档 §8 as-needed 模型的第一批实例。
- 现根目录 3 份设计文档移入 `docs/research/`（含 `JIT-Agent_Research_Report_20260831.md`，它已是主设计的输入素材）。
- `journal/` 入 git 是对 desktop 取舍的**有意反转**：心源"过程即资产"（会话轨迹是未来演化原料），丢失叙事就是丢失基因；durable 结论仍只落四家，journal 只承载过程。

## 5. 搬迁映射总表

处置记法：**搬** = 原样小改；**炼** = 提炼重写；**弃** = 不搬（理由见 §6）。

### 5.1 常驻基座

| 资产 | 源 | 处置 | 说明 |
|---|---|---|---|
| 根 AGENTS.md 结构 | desktop 96 行版（优于 frecency 42 行版） | 炼 | 保留骨架：协作模式→流程卡索引→文档纪律→Git 纪律→质量门→字数预算表；删除 .NET/C#/Ryn/IPC 等项目特定节；评审兜底清单改为通用模板指向 docs/method/review.md |
| .agents/AGENTS.md | desktop + frecency | 炼 | 只写协作层专属；MIT 出处声明保留（上游 deepseek-harness 血统） |
| 字数预算 manifest | desktop（含 `_justify_bump` 提额理由机制） | 搬 | 先立 manifest 再填内容；AGENTS.md ≤800 / .agents/AGENTS.md ≤300 / cookbook ≤2700 / method 文档各定上限 |

### 5.2 流程卡（6 张）

| 卡 | 源 | 处置 | 修复点 |
|---|---|---|---|
| session-modes | desktop | 搬 | 原样（69 词，许可矩阵是极简表达范本）；工具面表述中性化 |
| session-open / session-close | desktop | 搬 | close 的"结论只落 durable 四家 + README 强制核对"保留；README 双语核对节改为单语核对 |
| feature-flow | desktop | **炼** | 8 步主链路与评审契约全保留；**必须重排**——源版步骤 5 一段 321 词塞十余个子契约，拆为小节+表格；.NET 命令（dotnet test）换成本仓等价物 |
| release-flow | desktop + frecency | 炼 | 只搬骨架（tag→门禁→结构化 release notes→核验清单）；打包矩阵等平台特定节不搬 |
| github-research | desktop | 搬 | gh 六步配方 + 输出截断纪律，通用 |

### 5.3 ADR 系统

| 资产 | 源 | 处置 | 修复点 |
|---|---|---|---|
| notes/README.md 规则 | desktop | 搬 | 含**证据严肃性三件套**（推断标【推断·未证】/n<3 标【探索性】/Erratum 撤回通道）——科研级纪律，全库罕见亮点 |
| adr-proposed / adr-implemented 模板 | devops-template + desktop | 搬 | 双语链接行删除（单语起步）；`agnents-hierarchy.md` typo 修复为 agents-hierarchy |
| verify-adr-format.py | desktop（含 --self-test） | 搬 | 已被 desktop 修复史校准，优于 devops-template 版 |
| 首批 ADR | 本计划 | 新写 | 迁移决策本身落 ADR（如"journal 入 git"、"评审机械闸延后"），每条含 Alternatives |

### 5.4 门禁（第一梯队 7 个，全部零依赖 Python/bash）

| 脚本 | 源 | 处置 | 修复点 |
|---|---|---|---|
| verify-adr-format.py | desktop | 搬 | 无 |
| verify-doc-budgets.py | desktop（53 行版） | 搬 | 无；manifest 随 S1 立 |
| verify-md-links.py | desktop | 搬 | **skills/ 从默认排除改为纳入**——上游死链债不在本仓复刻 |
| verify-handoff-structure.py | desktop（300 行） | 搬+修 | 修跨月卷名 bug（journal 卷按月推导，不写死 `2026-09`）；阈值按本仓现实校准，**避免"阈值形同虚设"（frecency 教训）** |
| verify-cookbook.py | desktop | 搬 | 阶段标签封闭集按本仓内容域重定（脚本/打包/调试/环境/上游/产品 → 本仓等价域） |
| verify-skill-format.py | desktop | 搬 | 无 |
| change-scope.sh + setup-hooks.sh | desktop | 搬+修 | change-scope 三条 path 输出命令 `quotePath=off`（非 ASCII 原样；[bug-fix ADR](.agents/notes/implemented/bug-fix/2026-09-05-change-scope-quotepath.md)） |
| verify-review-tier.py / verify-review-brief.py（17KB/21KB） | desktop | **延后（v0.2）** | 机器定档的 FULL 路径模式与 desktop 评审面强耦合，需按本仓评审面重写；先以流程卡 + 评审清单承载契约，机械化后补（见 §10-1） |

### 5.5 技能（自研 7 个）

| 技能 | 处置 | 说明 |
|---|---|---|
| dsh-code-review | 炼 | 保留"语义评审补机器盲区 + 定向源点映射（Sources of truth, read don't re-summarize）"模式；上游 DSH 死引用替换为本仓等价物 |
| dsh-find-simplifications | 炼 | 候选判据（无消费者/双表示/手工重造）保留；上游子系统清单删 |
| dsh-prose-standard | 搬（小改） | 通用方法论，路径重映射 |
| dsh-trim-cot-leakage | 搬（小改） | "HEAD 读者可验证性"唯一判定 + 八类分类学，路径重映射 |
| dsh-pre-push-checks | 炼 | 最小证据原则保留，命令换成本仓门禁 |
| dsh-doc-standards | 炼 | 结构审计流程保留，门禁命令换肤 |
| dsh-archive-agent-notes | 搬（小改） | "rejected 仅当能防重蹈覆辙才保留"是稀缺洞见，保留 |
| translate-docs / doc-site-sync / merging-stacked-prs / record-browser-gif / search-routing | 弃 | 见 §6 |

### 5.6 docs / cookbook / HANDOFF

| 资产 | 源 | 处置 | 说明 |
|---|---|---|---|
| ai-collaboration-method.md（理念四骨+先长后立） | desktop `.plan/`（git 外，易失） | **回收入库** | 全库最佳蒸馏原料，作者自己已在提炼；补 provenance 头 |
| doc-standards / review / standard-authoring | desktop docs + devops-template 方法论提炼.md | 炼 | 搬元规则与 slop 清单；tier taxonomy 按本仓 4 层精简（根 AGENTS/协作层/docs/生成式） |
| cookbook.md 首批原子 | desktop cookbook 通用条目 + work HANDOFF Gotchas + dsh-continual-evolve FAQ 通用项 + OBSERVATION TOP5 | 炼 | 每条 = 症状/根因/规避/来源四段（对齐设计文档 §8.2 原子胶囊）；OBSERVATION 5 条结论（#18 负结果、两段式评估、守卫对称性、duration-leak、形态路由）蒸馏为首批判席 |
| HANDOFF.md + HANDOFF-todos.md | desktop 结构 | 炼+新写 | 结构照搬（稳定区+滚动窗≤24×260 字+行动区+必备节）；**62KB 旧 HANDOFF 不搬**，其 durable 结论（Gotchas/位置表条目）选择性落 cookbook/新 HANDOFF |
| journal/ 月卷制 | desktop .plan/journal | 炼 | 结构沿用，**入 git**（反转拍板） |
| 3 份现有设计文档 | 本仓根 | 搬 | 移入 docs/research/（设计文档 §4 自述落档处即此） |

### 5.7 work 区参照物（不搬，只对标）

dsh-continual-evolve 整仓留在原地（冻结 v0.6.0）；其治理四件套（版本/快照/回滚/审计）与两段式评估协议（执行者不见 rubric→独立评分者→失败格≠零分→冻结基线）记入 ADR 作为 P1 演化引擎的设计对标；research/ 五份文档结论已被主设计吸收，不重复搬运。

## 6. 负面清单（明确不搬 + 理由）

| 不搬 | 理由 |
|---|---|
| 自动沉淀全家（autoReview / fate / wrapup 常开门禁） | work #18 实证：自动蒸馏零可追溯收益、token 成本倒挂；收益全在手工策展紧凑资产。**这条本身要写成 cookbook 原子**，防未来复发 |
| penguin 式纯提示词软契约 | 两次实证否定（penguin 自身零硬校验 + Behind EvoMap 84% 空洞测试） |
| 一切自报/积分/自评验证 | EvoMap 败因，主设计 §4 分水岭 |
| GitHub 硬绑定三件套（stacked-PRs / doc-site-sync / issue 状态机） | devops-template 去 GitHub 化指南自判缓刑 |
| translate-docs 双语镜像 + search-routing | 单语起步 + 工具面绑定；"手动调用边界"frontmatter 技巧记入 cookbook 索引即可 |
| record-browser-gif | 与方法论无关的工具技能，稀释胶囊密度 |
| 62KB 追加式 HANDOFF / 双源镜像互抄 / 逐字节原样技能搬运 | 三个来源各自最重的教训 |
| C#/Ryn/IPC 等一切项目特定规范 | 元规则与实例分离原则 |
| ri.nupkg 类二进制杂物 / .plan gitignore 生态 | desktop 糟粕；本仓过程资产入 git |

## 7. 已知缺陷 → 本仓修复清单（教训即 ADR）

1. **技能引用链断裂**（frecency 11 技能全死链）→ 修复：md-links 把 skills/ 纳入校验；技能重写时路径全部指向本仓真实文件。
2. **verify-handoff-structure 卷名写死跨月失效**（frecency）→ 修复：卷名按月推导 + self-test 夹具覆盖跨月场景。
3. **门禁阈值与现实脱节**（frecency 滚动窗实测 400+ 字 vs 260 上限）→ 修复：立阈值时先实测现有条目分布；上线后阈值失守即触发 ADR（而非默默改宽）。
4. **feature-flow 超密长段**（desktop 321 词单段）→ 修复：流程卡加段落密度纪律（单段 ≤120 词 / 契约拆小节+表格）；doc-budgets 现不管段落密度，记录为预算机制已知盲区。
5. **agnents typo + 模板三处重复定义**（frecency）→ 修复：命名 + 规则只写一处他处链接。
6. **journal/过程档案不落库换机即丢**（desktop/frecency）→ 修复：journal 入 git（§4 反转拍板）。
7. **双源漂移**（work HANDOFF ↔ global 记忆互为镜像）→ 修复：单源原则写进常驻基座；交接条目只留指针。
8. **检查单驱动纪律无机器保活**（desktop README 徽章漂移数月）→ 修复：session-close 检查单机器化项（S3 门禁）+ 预算 manifest 管 README 计数节。
9. **"先全带后清理"变成"全带永不清理"**（frecency 11 技能零适配）→ 修复：本仓技能引入纪律 = 引入即适配（verify-skill-format + md-links 双闸把关，不适配不引入）。

## 8. 实施批次

- **S1 骨架**：目标树建目录；3 份设计文档移入 docs/research/；LICENSE(MIT) + .gitignore + 预算 manifest 先立；`agents-hierarchy` 模板落位。
- **S2 常驻基座**：AGENTS 双层（≤800/≤300 词）+ .agents/notes/ ADR 系统（README + 双模板 + verify-adr-format）；迁移决策本身写成首批 ADR（journal 入 git / 评审闸延后 / 技能前缀等拍板项）。
- **S3 门禁第一梯队**：§5.4 七脚本 + change-scope/setup-hooks + .githooks 接线；每脚本过 self-test。
- **S4 流程卡**：6 张落位（feature-flow 重排为小节结构）。
- **S5 知识层**：docs/method/ 4 篇 + cookbook 首批原子（含 §6 负面清单对应的 AVOID 条目）+ skills 7 个适配。
- **S6 交接**：HANDOFF 家庭 + journal 月卷开卷 + verify-handoff-structure（修复版）上线。
- **S7 CI + dogfood 验收**：.github/workflows/validate.yml 复跑全部门禁；用本体系真实走一次"非平凡变更"全链路（ADR→实现→门禁→评审→收尾）作为验收动作。

每批次一次提交 + 按当批范围跑门禁（最小证据原则的本仓首次实践）。

## 9. 验收标准

1. 门禁第一梯队全部在本仓跑绿（含 self-test）。
2. `verify-md-links` 含 skills/ 全绿——零死链（上游债不复刻的硬证明）。
3. 常驻基座预算达标：AGENTS.md ≤800 词、.agents/AGENTS.md ≤300 词（manifest 门禁绿）。
4. 每个搬迁资产头部有 provenance 行（源路径 + 相对源的差异说明）。
5. 负面清单零残留：grep `autoReview|record-browser-gif|doc-site-sync|stacked-pr` 等无命中。
6. 首批 ADR 全部含 `## Alternatives considered`。
7. dogfood 闭环：S7 的真实变更全链路走通，结论落 durable 四家。

## 10. 开放问题（需拍板）

1. **评审机械闸延后**：verify-review-tier / verify-review-brief 按本仓评审面重写后进 v0.2；评审契约先以 docs/method/review.md + 流程卡承载。是否接受？（建议：接受——机械闸的 FULL 路径模式必须对着真实评审面写，空仓上写必然返工）
2. **journal 叙事卷入 git**：与 desktop 相反的拍板，理由是"过程即资产、轨迹是演化原料"。是否接受？（建议：接受；代价是仓库体积增长，可用月卷 + 后期瘦身对策）
3. **技能前缀**：自研技能沿用 `dsh-*` 还是改 `noo-*`？（建议：`noo-*`——它们是心源胶囊技能，`dsh-*` 应留给面向 DSH 市场发布的插件本体，避免与官方生态命名混淆）
4. **cookbook 首批原子数量**：建议 10–15 条起步（desktop 通用条目 + work Gotchas + OBSERVATION 5 条），宁少勿滥，其余按需蒸馏。

## 附：四源盘点报告存档

四份盘点全文见子代理回报记录；要点已并入本计划 §3/§5/§6/§7。原报告不落库（避免与计划双源）。
