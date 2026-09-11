# Agent Note: 发布形态对齐上游——README 引用统一 DSH + release 脚本族 + tag dsh-v 前缀 + License 修辞

Status: implemented

Review: FULL/2026-09-09/R1=ok R2=ok R3=ok

## Problem

- 对外 README（`README.md` / `README.zh.md`）对上游的引用不一致：正文首行写「[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)」，License 节又写「not affiliated with DeepSeek」——用户明确「对本人项目的引用只说 DSH 就好」：项目名统一引用为 **DSH**（不反复出现「DeepSeek」品牌全名），只在必要处保留首次全称 + 括号缩写。
- 发布工具化缺口：本仓发版目前靠手工（`release-flow.md`：手工 bump + `vX.Y.Z` tag + GitHub Release 正文手工编），门禁清单无 release 生成器。上游 `deepseek-ai/deepseek-harness` 的发布形态（本地镜像 `c389f96bf` 实证）为：`scripts/release/bump.ts`（`release:dsh`）commit 版本 + 人建 tag、CI 永不写仓；tag 带 `dsh-v` 前缀（实拍 `dsh-v0.1.5-alpha.1`）；Release 正文 = 中英双语分节（`[中文](#cn-<ver>) | [English](#en-<ver>)` 锚点 + `<h3 id="cn-…">新增功能</h3>` / `<h3 id="en-…">New Features</h3>` 等）+ 每条变更尾缀 `@提交者`（中文）或 `by @提交者`（英文）+ 末尾 `Full Changelog: <compare 链接>`。本仓 tag 现为无前缀 `vX.Y.Z`，与上游不一致。
- License 节修辞欠佳（用户指正）：`README.zh.md` 写「被排除的是不履行源码提供义务的分发与网络服务形态（含 SaaS）」——「被排除」措辞不当（易误读为排除商用），英文版同样含糊（`excluded are distribution and network-service forms ... that fail the source-provision obligation`）。

## Decision

**对齐上游 DSH 的发布形态（单仓适配），改对外 README 引用与 License 修辞。**

1. **README 引用统一 DSH**：`README.md` / `README.zh.md` 全仓正文对上游的引用统一为 **DSH**：首次出现写 `DeepSeek Harness (DSH)`（保留链接），此后只写 `DSH`；不出现额外「DeepSeek」品牌名。范围界线（2026-09-09 用户拍板，journal 在案）：对外 README 面（README.md/zh.md/package.json description）统一缩写；`AGENTS.md` 与 `.agents/notes`、`docs/` 内对「上游 deepseek-harness 血统」的引用属 provenance 记录，**保持原名不缩写**（血统可查性优先）。`adapters/dsh/README.md` 已是 DSH 命名，核对无遗漏。
2. **release 脚本族（单仓适配）**：新增 `scripts/release/bump.mts`（bump package.json version + `npm install --package-lock-only` 同步 lock + `chore(release): noogenesis-dsh <ver>——<主题>` commit；零依赖、node 原生）与 `scripts/release/release-note.mts`（从 `git log <前tag>..HEAD` 按 conventional commits 分节，生成双语 release body：`[中文](#cn-<ver>) | [English](#en-<ver>)` 锚点 + 分节 + 每条 `@作者`；作者 = git author 经映射表（`zhangkun → ZK-Andy`，本仓唯一作者）转 GitHub login；末尾 `Full Changelog: https://github.com/ZK-Andy/noogenesis/compare/<前tag>...<新tag>`）。`package.json` 增 `release:bump` / `release:note` 两 script（不引第三方依赖，zero-dep 纪律）。CI 永不写仓、tag 人建（对齐上游哲学）。
3. **tag 前缀 `dsh-v`**：发版 release-flow 改打 `dsh-vX.Y.Z`；历史 `v0.1.0~v0.2.3` 老 tag 不动（不重写历史）。`pre-push.mts` 的 tag 可达性逻辑是通用 `refs/tags/*`，无 `v` 前缀假设，天然兼容新前缀（代码零改动，只需在 release-flow 文档写明）。
4. **License 修辞重写**（中英对齐，不改变 AGPL-3.0 判定）：① 义务句——英文 `excluded are distribution and network-service forms (including SaaS) that fail the source-provision obligation` 改为 `distribution or network-service use (including SaaS) must comply with the source-provision obligation of AGPL-3.0`，且 `Commercial use is not excluded` 一并改为 `Commercial use is allowed`（正面肯定）；中文「被排除的是不履行源码提供义务的分发与网络服务形态（含 SaaS）」改为「分发与网络服务形态（含 SaaS）须履行 AGPL-3.0 的源码提供义务」，「商用不被排除」改为「商用允许」。② **免责句实体改写**：英文 `An independent project — not affiliated with DeepSeek` → `An independent project, not affiliated with the DSH maintainers`；中文「独立项目——与 DeepSeek 无关联」→「独立项目——与 DSH 维护方无关联」。免责实体从「公司（DeepSeek）」换成「项目维护方（DSH maintainers）」——理由：本仓对上游的自我指称统一为 DSH（Decision 1），免责句指称同步，且「与 DSH 维护方无关联」语义更精确（独立于上游项目及其维护方，而不只是公司实体）。许可判定不变；license-agpl-3 ADR 同变更同步（implemented 笔记与上线现实同步规则）。

## Alternatives considered

- **README 全局改名**（把 AGENTS/doc/notes 的血统标注也缩写）——落败：provenance 行是血统可查性义务（.agents/AGENTS 出处声明纪律），缩写会破坏「上游 MIT 资产逐件标注」的可追溯性；用户指令「对本人项目的引用」限定对外 README 面。
- **沿用无前缀 tag**——落败：与上游 `dsh-v*` 不一致；用户明确 tag 脚本要「根据 deepseek-harness 修正」，前缀是其中一环。
- **release body 由 CI 自动建 tag + 写 GitHub Release**——落败：上游明确「CI never writes to the repository」（bump.ts 头注），人建 tag 是审计边界；本仓沿用。
- **引入上游 bump.ts 全量（families/多包矩阵）**——落败：本仓为单 npm 包（non-monorepo），上游 family/私有包矩阵不适用；单仓适配版保留其语义（版本单一来源 + lock 同步 + 人建 tag）。

## Consequences

- 对外 README 不再反复出现 DeepSeek 品牌全名 = 项目自我引用统一为 DSH，License 节措辞不再有「排除商用」误读空间。
- 发版从手工 git 命令 + 手工编 body 变为两条脚本：`node scripts/release/bump.mts <ver> --msg <主题>` + `node scripts/release/release-note.mts <前tag>`；body 双语结构 + @作者 + Full Changelog 与上游一致。
- 新 tag 形态 `dsh-vX.Y.Z`；`pre-push` 门禁 tag 可达性判定继续生效（零代码改动）。
- release-note 的 @作者 映射表当前只有 `zhangkun → ZK-Andy` 一项；未来多作者需扩展映射（脚本注释写明）。
- reporter 面：GitHub Release 正文由 release-note 输出粘贴；不自动发布（发布仍手动 review）。

## 落地验证（2026-09-09 实现批）

- README 中英全文只出现一次 `DeepSeek Harness (DSH)`（首行，带链接），其余只用 DSH；License 节修辞改为正面义务表述（商用允许 + 分发/SaaS 须履行源码义务），中英一致。
- `package.json` description 同步改 DSH（npm 发布面无 DeepSeek 品牌名）。
- `scripts/release/bump.mts`（semver 优先序版本护栏 + 工作树/main fail-closed + lock 同步失败回滚 + `chore(release)` commit，人建 tag/CI 不写仓）+ `scripts/release/release-note.mts`（`git log <base>..HEAD` 按 conventional commits 分节 → 双语 body：`[中文](#cn-v) | [English](#en-v)` 锚点 + 首节带 `<h3 id>` 锚、后续节 `###`（对齐上游）末节英文 Chores + `EN_POLISH_HINT` 润色提示行 + 每条 `@作者`（git author→login 映射表）+ `Full Changelog`（remote.origin.url 推导，兜底 ZK-Andy/noogenesis）；剥离 `type(scope):` 前缀；跳过 `chore(release)` 自身）。`package.json` 增 `release:bump` / `release:note` scripts。
- `release-flow.md` 更新：tag 打 `dsh-vX.Y.Z`（历史 v0.x 不动）、步骤 4 引用 release-note。
- 实机验证：`release-note.mts v0.2.3 0.2.4` 输出双语分节 + @ZK-Andy + compare 链；bump 错误路径（工作树不净）fail-closed 实证；tsc / lint / gates 16 条全绿。
- **lock 漂移修复**：bump 脚本实现时发现 package.json 0.2.3 vs package-lock.json 0.2.2（0.2.3 发版漏同步）——`npm install --package-lock-only` 对齐 0.2.3，同批提交（cookbook [环境] 版本 bump 漏连动 lock 教训实例）。

## 首次实发（2026-09-10，`noogenesis-dsh@0.2.4`）

- `node scripts/release/bump.mts 0.2.4 --msg ...` 产 `chore(release)` commit（`6fe74ea`）+ lock 同提交（package.json 与 package-lock 两处 version 一致）。
- annotated tag `dsh-v0.2.4` 推送过 pre-push：tag 目标 commit 已可达 origin 远端 refs → 走「零 outgoing 跳过档位强制」档，脚本输出该判据行。
- `release-note.mts v0.2.3 0.2.4` 输出双语分节 + `@ZK-Andy`（git author `zhangkun` 映射）+ 跨前缀 `Full Changelog`（`v0.2.3...dsh-v0.2.4`，可解析）。
- npm `latest` = 0.2.4（35 件 / 97.2 kB，含新件 `skill-guard.mjs`、`export-docs-feedback.mjs`）；GitHub Release 建（Latest、非 draft）。
- **跨大批次归并缺口**（首验实遇）：`v0.2.3..0.2.4` 跨 59 笔时「其他变更」节输出 47 条过程条目（body 147 行），发布者须手工按批次归并成 3 条——归并档缺失入 [HANDOFF-todos](../../../../HANDOFF-todos.md)（C）条。

## 第二次实发（2026-09-12，`noogenesis-dsh@0.2.5`）

- `chore(release)` commit `7cdb625`（package.json + lock 同提交）→ 版本面同步提交 `66b40d1`（双语 README + HANDOFF M2 行）；annotated tag `dsh-v0.2.5` 指向 `66b40d1`（使 tag 树的三面版本锚自洽——0.2.4 首发的 tag 停在 bump 提交，tag 树里 README 仍写上一版）。
- **判据 6 与 bump 的时序（新交叉点）**：`package-invariants` 判据 6（三面版本锚，2026-09-11 机械化批落）会拦下 README/HANDOFF 尚未同步的 bump 提交——本批首跑 `bump.mts` 的 `chore(release)` 提交被 pre-commit 拒，工作树留下已 staged 的 package.json + lock。正确次序 = 先把 README/HANDOFF 版本面改到新版本（工作树），再落 bump 提交（门禁读工作树），最后把版本面单独提交。
- **pre-push 两 leg 次序**：分支 leg 先过（tier `--enforce` + 门禁组 + engine/adapter 双 self-test）；tag leg 在分支推送前 fail-closed（`tag 目标 commit 未被 origin 远端 refs 包含`，报「无法定 outgoing base」）。正确次序 = 先推分支、再推 tag（tag 目标可达后走零 outgoing 跳过档位强制）。
- **npm 发布**：`npm latest` = 0.2.5（36 件 / 110.6 kB）；本机 `~/.npm` 只读，发布须带 `--cache=/tmp/npm-publish-cache`（否则 EROFS）。
- **GitHub Release**：`dsh-v0.2.5`（Latest、非 draft），正文 = `.cache/release-body-0.2.5.md`。
- **归并缺口第二次实证（触发再达成）**：`dsh-v0.2.4..0.2.5` 跨 67 笔，「其他变更」节输出 42 条过程条目 → 手工归并为 14 条（中英各 14）。首验记在 [HANDOFF-todos](../../../../HANDOFF-todos.md)（C）条。

## Risks

- **双语 body 手工对齐漂移**：release-note 脚本输出的英文节逐字镜像 commit 标题（本仓 commit 标题为中文）——英文节需发布者翻译润色；保持「脚本生成骨架 + 发布者润色」分工，脚本输出含 `EN_POLISH_HINT` 提示行防照贴即发。
- **@作者映射失真**：git author 字符串 ≠ GitHub login（当前仅 zhangkun ↔ ZK-Andy 一项，单人仓无歧义）；多人协作时映射表需随贡献者扩展，脚本注释标注边界。
- **tag 前缀切换期**：历史 v0.x 与未来 dsh-v 并存，compare 链接用 tag 名精确拼接（release-note 只拼 `前tag...新tag`，不假设前缀）。

## 评审收口（2026-09-09 FULL 三审）

- **R1（简化）1B/7S**：B1 = 两脚本头注 ADR 路径指 proposed（已翻 implemented）→ 改 implemented 路径（采纳）；S 采纳版本数值窗改逐段比较、usage 文案抽单点、tagGuess 空 tag 提示、prefix 正则共用常量、中英两节抽 emitSection、补尾换行；**S6（git wrapper 共享）不采纳留证**——各件自持 git 子进程形态是本仓既有惯例（change-scope/pre-push 同），两文件独立工具共享需第三件或 import，零依赖独立可跑优先。
- **R2（code-review）1B/8S**：B1 = 版本护栏遇预发布段 NaN 静默失效（`Number("3-rc.1")=NaN`，`0.2.3→0.2.3-rc.1`/`0.2.3→0.2.2-rc.1` 均误放行）→ 改完整 semver 优先序比较（parseVersion 拆 core+预发布、逐段/数值/字典序，16 用例实证全过）；S 采纳 lock 同步失败回滚、VERSION_RE 严格化（禁 `0.2.4-`/`--rc`）、h3 id 只首节带锚（对齐上游 `<h3 id>`+`###` 形态）、英文节加 EN_POLISH_HINT、GITHUB_REPO 改 remote.origin.url 推导（兜底常量）；S3 数值碰撞经逐段比较根除。
- **R3（ADR 面）1B/8S**：B1 = License 免责句实体改写（DeepSeek→DSH maintainers）未记录 + license-agpl-3 ADR 失同步 → Decision 4 补免责句改写与理由 + license-agpl-3 ADR 同变更同步（采纳）；S 采纳 Risk 语言侧标反修正、末节 Chores 对齐上游、README 血统行界线讲全、笔误修正、release-flow 类型映射纪律传承；S6（落地验证/Risks 顶格节）**不采纳留证**——既有 implemented ADR（09-09 lint-block 等）同款节形态、verify-adr-format 过、Risks 独立价值 > 骨架纯化。
- **全采纳收口**；三路各复跑门禁全绿；Review: FULL/2026-09-09/R1=ok R2=ok R3=ok。