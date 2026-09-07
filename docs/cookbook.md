# Cookbook（踩坑记录）

> 踩坑单一事实源。条目格式：`- **[域] 主题（日期 来源）**：症状。根因。规避。`——域标签封闭集见 `scripts/verify-cookbook.py`（演化/门禁/文档/协作/环境/上游/产品），格式由该门禁机器强制。
> Provenance：原子蒸馏自 dotnet-deepseek-harness-desktop、dsh-frecency、work 区（dsh-continual-evolve）的已验证踩坑（首批搬迁见 ADR `2026-09-05-capsule-01-migration`）。

## 演化

- **[演化] 自动蒸馏零可追溯收益，token 成本倒挂（2026-09-05 来源：dsh-continual-evolve #18 用户判定）**：症状——自动沉淀机制常开运行，收益无法追溯到任何一条沉淀产物，token 成本反而上升。根因——常开确定性成本 × 概率性收益的结构；会话记忆类沉淀的代表性与价值密度过低。规避——蒸馏只在人工策展下进行：收益全在紧凑手工资产（流程卡/verify 脚本/cookbook）；自动门禁（autoReview/fate/wrapup 类）不再复刻，进化触发必须由人或显式目标驱动。
- **[演化] 沉淀形态路由：自由沉淀导致技能爆炸（2026-09-05 来源：work 区 hermes 式沉淀 100+ 技能被否定）**：症状——agent 把一切经验自由沉淀为技能条目，技能目录爆炸、质量参差、检索失效。根因——形态与知识类型错配：交接/流程类知识被沉淀成 harness skill 条目。规避——形态路由：交接/流程类 → 指导型技能（人工按写作规范创建，见 [ai-collaboration-method.md](method/ai-collaboration-method.md) §三）；一次性 → 流程卡/文档；事实 → cookbook/README。
- **[演化] 存在性检查类用例天花板低（2026-09-05 来源：dsh-continual-evolve D2 实验两连，n=2 探索性）**：症状——benchmark 用例只验证"产物存在"，候选再差也能过，分数失去区分度。根因——用例只测存在性，不测行为。规避——测行为必须用"执行任务观察行为"型用例；"继承加速"类收益以耗时度量不可靠（波动远超信号），需行为级指标。
- **[演化] 机械守卫不对称：防过度写入不防过度归档（2026-09-05 来源：dsh-continual-evolve wrapup 同 id 弱信号误判）**：症状——守卫误判 + LLM 顺着错误前提行动，把不该归档的条目批量归档。根因——守卫只对写方向设限，归档方向无对称拦截；LLM 缺"质疑机械前提"的纪律。规避——治理守卫必须双向对称；LLM 不得基于机械判定的前提行动，机械误判须有勘误/回滚通道。
- **[演化] 推理模型把输出预算烧在可见思考上，最终文本块为空（2026-09-05 来源：dsh-continual-evolve FAQ #7）**：症状——推理模型做门禁判定/结构化提取时报 `produced no text`，而 maxTokens 预算充足。根因——输出预算被可见思考整段耗尽，最终 text 块为零。规避——提取类 LLM 调用显式关 reasoning（DeepSeek 适配器 `reasoningEffort: "off"`），并显式处理 max-tokens 截断，不要假设"预算够就有正文"。
- **[演化] flag 值解析用单下标排除法，缺省哨兵误伤首参（2026-09-06 来源：noogenesis engine pull 参数解析两轮 bug，adapter selftest e2e 抓出）**：症状——`rest.find((a,i) => a !== flag && i !== flagIdx + 1)` 在 flag 缺席时 `flagIdx = -1`，`flagIdx + 1 = 0` 恰把第一个位置参数排除，URL 恒 undefined 报「缺参数」；重复 flag 时也只排除首个的值。根因——用"下标 + 哨兵"做排除，缺省值 -1 参与了算术。规避——flag 解析用线性扫描收集（遇 flag 取下一 token、其余即位置参数）+ 位置参数数量断言；解析夹具必须覆盖「flag 在/不在/缺值/重复」四排列——只断言退出码不断言原因的夹具会漏检（本例 engine selftest 过、adapter e2e 红）。

## 门禁

- **[门禁] 门禁阈值与现实脱节即失效（2026-09-05 来源：dsh-frecency verify-handoff-structure）**：症状——260 字上限形同虚设，实测条目普遍 400+ 字。根因——立阈值时未实测现有分布，之后默默改宽无痕。规避——立阈值先实测样本分布；阈值失守必须触发 ADR（改宽要留痕），禁止静默调整。
- **[门禁] Python 移植的门禁未经真实样例校准会带 bug（2026-09-05 来源：devops-template verify-adr-format 头注释自证）**：症状——移植脚本按误读的约定实现，首次落地即跑才抓出。根因——照文本移植，未对真实合规样例校验。规避——移植类门禁落地即对真实样例跑通 + `--self-test` 夹具（违约样例应 FAIL、合规样例应 PASS）。
- **[门禁] 弱检查长期红着没人发现（2026-09-05 来源：desktop verify-governance 自曝注释）**：症状——某模板豁免检查后，门禁对该文件长期红、无人处理。根因——豁免无自动执行点，无 follow-up。规避——豁免必须带注释说明豁免范围与补偿机制；弱检查（关键词级）要么升档要么显式标注为"快检非穷尽"。
- **[门禁] 本地 YAML/模板解析通过 ≠ CI 平台接受（2026-08-28 来源：desktop release.yml 实证）**：症状——workflow 解析失败后，每次 push 都产出零 job 的 `failure` run，Actions 列表里 workflow 名回退为文件路径（与 `on` 过滤器无关）。根因——step `with:` 里的 GitHub 表达式被表达式层拒绝，本地 PyYAML 通过不等于 GitHub 接受；且解析失败 run 的 name 字段是最快判别位。规避——复杂判定（正则等）改写为 step 内 bash + output 引用；判别走 `gh api .../actions/workflows` 看 name。
- **[门禁] CI 缓存按分支/ref 作用域隔离，tag 首 run 必 miss（2026-08-21 来源：desktop 实测）**：症状——同一缓存键在 tag 发布流首 run 不命中，误判为缓存配置坏了。根因——Actions 缓存不跨 ref 互通，每个 tag 是独立 ref。规避——做缓存优化别期待跨 tag 复利；命中条件只有同 tag 重跑或与默认分支共享。
- **[门禁] 沙箱只能验降级分支，成功分支须真机或 force 开关走通（2026-08-24 来源：desktop dev 门禁）**：症状——「命令路由不存在即优雅降级」类功能在沙箱验过即当功能验证完成。根因——沙箱环境只能触达失败/降级路径，成功路径根本没执行。规避——成功分支需真机或显式 force 开关（如 `*_FORCE=1`）实走一遍再定性；"优雅降级正常"与"功能正常"是两个结论。
- **[门禁] 超类型聚合对象 + 遍历键当数据键，是迟早误判的脆弱模式（2026-09-05 来源：dsh-continual-evolve FAQ #11）**：症状——候选分数大涨（0→100）却被判回归 REJECTED，理由 `case totalDurationMs regressed`，且 `autoRollbackOnReject` 连坐回滚删掉刚沉淀的产物。根因——聚合返回值把 per-case 键与元数据键（`overall`/`totalDurationMs` 等）混在同一对象，回归判定遍历 `Object.entries` 只硬编码排除部分元数据键；新增键漏排除，且"耗时更短"方向语义相反仍被当分数比对。规避——判定/报告从真实数据键集合（cells 派生的 caseId 集）出发，元数据只在明确键名上取，不做"遍历一切键"式兜底。
- **[门禁] 测试模块直跑是 no-op 时，静默 exit 0 = 假绿（2026-09-06 来源：noogenesis engine/selftest.js 只导出无顶层调用，R2 评审实证）**：症状——`node engine/selftest.js` 直跑零输出 exit 0 被当全绿，坏夹具实际从未执行（真 runner = `node engine/bin.js self-test`，在其下 exit 1）。根因——测试入口有两个形状：导出模块（供 bin 分发）与顶层直跑脚本，直跑面无调用即静默成功。规避——验证一律走真装配入口（bin 分发面）；「零输出 + exit 0」必须与已知 ok 数核对，不裸信静默成功。
- **[门禁] CJS 包内的裸 .ts 走不了 ESM，type stripping 又是解析期动作（2026-09-08 来源：noogenesis B0 两件 .mts 门禁，R1/R2 评审实证）**：症状——`package.json` `type:commonjs` 下写 `scripts/*.ts` 用 `import` 语法，node 按包类型分类为 CJS 直接语法错；又指望「文件内加 node 版本守卫」兜 ≥22.18（原生 type stripping 前提），但剥类型发生在解析期，守卫代码根本执行不到。规避——新 TS 门禁一律 `.mts`（显式 ESM，不赌版本间模块探测差异）；node 版本前提靠 CI `setup-node` 钉版 + 头注声明，不写文件内守卫。
- **[门禁] `wc -w` 对中文文本严重少计词数（2026-09-08 来源：noogenesis B0，R3 评审实证）**：症状——SKILL.md 用 `wc -w` 量得 198 词当拍板依据，仓计数单源（verify-doc-budgets 的 WORD_RE，CJK 逐字计词）实为 359，差近一倍。根因——`wc -w` 按空白分词，CJK 无空格。规避——凡「词数」判断一律用 doc-budgets 同款计数口径；拿不准时两种口径都算并声明用的是哪个。

## 文档

- **[文档] 预算管字数不管段落密度（2026-09-05 来源：desktop feature-flow 321 词单段）**：症状——流程卡单段塞十余个子契约，人读不动、agent 难解析。根因——doc-budgets 只统计总词数。规避——段落密度纪律：单段 ≤120 词，多契约拆小节/表格；已知盲区记录在案（见 [doc-standards.md](method/doc-standards.md) slop 清单"段落墙"）。
- **[文档] 模板文件名 typo 会自我复制（2026-09-05 来源：dsh-frecency agnents-hierarchy.md）**：症状——`agnents` typo 在两个仓库间传播。根因——模板跨仓复制无校对步骤。规避——模板搬迁时过 md-links/拼写核对；规则只写一处（typo 且与 README 三处重复定义规则，双重违规）。
- **[文档] 交接双源漂移（2026-09-05 来源：work 区 62KB HANDOFF ↔ 全局记忆互为镜像）**：症状——两处同主题内容各说各话，文中自认"可能滞后——以本文为准"。根因——同一事实两个家。规避——每事实一个家；交接只留指针不复述结论（见 [doc-standards.md](method/doc-standards.md) tier 表）。

## 协作

- **[协作] 逐字节搬运上游技能 = 引用链全断（2026-09-05 来源：dsh-frecency 11 技能零可用）**：症状——技能加载即误导（指向不存在的上游路径），"逐字节一致"的洁癖让可维护性归零；门禁还默认排除 skills/ 掩盖断链。根因——搬文件不搬方法，且校验面被排除。规避——引入即适配（方法吸收、引用重映射到本仓"家"、解析不了的删除）；md-links 强制检查 skills/。
- **[协作] README 徽章漂移数月无人察觉（2026-09-05 来源：desktop session-close 教训）**：症状——测试计数徽章长期与现实不符。根因——README 更新无强制触发点。规避——收尾清单强制核对项：只有收尾清单强制它才会有人更新它；核对无变更也要显式声明。
- **[协作] 未记录的提交导致决策误读（2026-09-05 来源：desktop session-open 教训）**：症状——HEAD 比 HANDOFF 多出提交，下个会话误判决策状态。根因——提交与交接记录脱节。规避——开场 git 对账步骤 + 收尾提交对账：每条提交必须能对应到交接条目。
- **[协作] 把 agent 的调研结论包装成用户的主张与决策（2026-09-06 来源：心源优化轮会话三次实锤）**：症状——待办区出现用户从未拍板的「立项」条目（非 git 运行仓支持立项）；用户问「技能够不够」被答成 agent 审计结论「流程卡零技能化」；材料刚集齐就立「待拍板清单」。根因——agent 把自己的调研结论/分诊框架冒充用户主张，替用户回答了用户还没回答的问题。规避——记录用户原话原版（引用块逐字、不转述）；agent 推导与用户主张分开标注；方案未出之前不存在拍板项，决策点只能由用户显式给出；被指曲解时逐字回放原话请用户校准，不二次发挥。

## 环境

- **[环境] 日期相关常量写死会跨月失效（2026-09-05 来源：dsh-frecency verify-handoff-structure 卷名）**：症状——journal 卷名硬编码 `2026-08-session-journal.md`，九月起校验对象失焦。根因——把"当前月"物化成常量。规避——日期常量按当前日期推导 + self-test 覆盖跨月场景（本仓修复版已含当月卷宽容与跨月夹具）。
- **[环境] 跨平台 shell 语义差五连坑（2026-08-27 来源：desktop CI 三平台实机/评审沉淀）**：症状——同一脚本在 Linux/macOS/Git Bash 行为分裂：`sed -i` 的 GNU/BSD 语法不同；`xargs -r` 是 GNU 专属；Git Bash 命令行上限 32K，批量处理超限 `CreateProcess` 失败；`set -euo pipefail` 下 `grep -rl` 零命中非零退出炸管道；`grep -rlZ` 输出 NUL 分隔使 `wc -l` 恒 0、`for` 循环吞整串。根因——GNU/BSD 语义差 + Windows 32K 限制。规避——跨平台脚本：`sed -i` 改 `perl -i`（三平台一致）；空输入守卫用 `[[ -s "$list" ]]` 不用 `-r`；批量显式 `-n 64` 级分批；`grep -rl` 补 `|| true`；NUL 输出先 `tr '\0' '\n'` 再数。
- **[环境] pnpm minimumReleaseAge 拦新包，且更新会静默 no-op（2026-09-06 来源：noogenesis npm 首发 + dsh-market install.ts #39/#13/#22）**：症状——`pnpm add` 刚发布的包报 `[ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION]`（包发布时间早于 cutoff = now − 窗口即拒），且 add 会重验 lockfile 全集，把早已安装的 too-young 条目（如 dshmarket@1.44.0）一起连坐拦下；更新场景更隐蔽——pnpm 对 too-young 新版本**静默保持旧版并 exit 0**，干净退出不等于真更新。根因——供应链新鲜度闸作用于 lockfile 全集且对更新路径静默失败。规避——单命令一次性豁免 `--config.minimumReleaseAge=0`（不改持久配置，dsh-market 的 RELEASE_AGE_OVERRIDE 同款）；更新后必须比对版本号而非看退出码；自发包等不满窗口期再分发或文档明示豁免命令。
- **[环境] DSH 插件工具注册面单参合同：一次传多定义静默丢失（2026-09-06 来源：noogenesis 0.1.0 首发实机）**：症状——`ctx.tools.register(t1, t2, t3)` 一次传三个 defineTool 定义，模型工具面只有第一个，无任何报错。根因——宿主合同是 `ctx.tools.register(definition: ToolDefinition)` 单参，多余实参被静默忽略。规避——逐个调用 register；自测假面必须复刻单参合同（register 收到多实参即断言失败），宽容假面会让测试照绿漏检。
- **[环境] lefthook v2 钩子三坑：push-files 门控 / wrapper fail-open / npm12 脚本守卫（2026-09-08 来源：noogenesis B3 实探）**：症状——① pre-push job 在 tag 推送与新分支首推被静默全跳（"no matching push files"，推送文件集为空），fail-closed 档位强制被旁路；② node_modules 缺失时 lefthook wrapper 末行 `echo "Can't find lefthook in PATH"` 以 exit 0 收场，钩子整体静默不跑；③ 本地 npm ≥12 install-scripts 守卫默认拦 lefthook 的 postinstall，钩子没装也以为装了。根因——v2 把 pre-push 语义绑在推送文件集上（上游 discussion #504 无官方恒跑出口）；wrapper 二进制寻路失败不 fail-closed；npm12 新守卫只管依赖脚本，CI（npm10）无感。规避——① job 级 `files: echo lefthook.yml` + run 串引用 `{files}` 恒跑逃生口（files 必须输出真实存在的路径，`echo .` 会被过滤；e2e 四态把「tag/新分支必跑」钉死为回归判据）；② e2e 以 `LEFTHOOK_BIN` 显式钉二进制，wrapper 的相对寻路依赖 `npm install` 后的 node_modules；③ `npm install-scripts approve lefthook` 一次性放行；旧 clone 迁移 = `git config --unset core.hooksPath` 后 `npx lefthook install`（hooksPath 已设时 lefthook 拒装并自带 `--reset-hooks-path` 补跑路径）。

## 上游

- **[上游] 发版正文类型映射漏 bucket 静默少一节（2026-09-05 来源：desktop v0.4.1 教训）**：症状——某 conventional commit 类型（refactor）未映射，发行说明静默缺节。根因——映射表不全且无断言。规避——类型映射集中一处 + `--self-test` 断言全类型有归属。
