# Agent Note: B0 框架结构面批立项——四件结构件 + 新门禁直接 TS + 最小 TS 切片

Status: proposed

Related: [2026-09-06-collab-rebuild-impl](2026-09-06-collab-rebuild-impl.md)（五批立项，本 ADR 为 B0 批的实现轮立项与拍板拆解）；[2026-09-06-framework-rebuild-charter](../../implemented/architecture/2026-09-06-framework-rebuild-charter.md)（charter，先框架后协作层）；蓝图对账单源 [framework-rebuild-blueprint](../../../../docs/research/framework-rebuild-blueprint.md) §1/§2/§3 + C11/C12

## Problem

立项 ADR 把四件框架结构件（C11 子树布点 / C12 教训层 / archived 校验件 / 技能 references/ 形态）散排在 B4/B5 顺带，削弱 charter「先框架」的语义，B0 是否插入 = 下会话首题。2026-09-08 讨论轮实机器面（数字为当日实测）：

- `docs/postmortem/` 目录不存在——C12 门禁建时即「目录空时零约束」形态，立规则不立实例。
- `.agents/notes/archived/` 现存 1 件（process/ 下）——archived 校验件非空仓，首件即可入冻结名单。
- `noo-doc-standards/SKILL.md` 正文 198 词，远未超预算——立项 ADR「首个候选 = noo-doc-standards 实拆」的前提不成立。
- 子树 `AGENTS.md` 仅根 + `.agents/` 两件；`.cache/`、`.noogenesis/` 内有大量同名缓存副本——布点文件与扫描域都必须对缓存目录免疫。

另发现立项 ADR 一处经不起推敲：**「新门禁按现行 Python 栈建，B1 随族迁 TS」是回头路**——并存期「旧件保持权威 + 双跑对账」纪律管的是存量件，对全新门禁不适用：新门禁没有旧版、没有对账面，用 Python 写等于写一遍、B1 迁一遍、self-test 夹具同迁一遍，还白占 B1 的对账工作量。用户拍板指认（2026-09-08）。

## Proposal

**用户拍板（2026-09-08）：B0 插入 B1 之前；新门禁直接 TS（修正立项 ADR「Python 栈建」表述）。**

**新门禁直接 TS 的边界**：B0 拉前的是**最小 TS 切片**——不引任何 devDependency：node ≥22.18 原生 type stripping 直接跑 `scripts/*.ts`（本地 node v26 实证可跑；`tsx` 从候选中落败——node 原生能力在场时不引工具链依赖，连 npm 安装步都省去）；CI 补 `setup-node@v4` 钉 node 22。**DAG runner（needs/after + 有界并行 + 图校验）仍归 B1**，tsc 工具链与 tsconfig 亦归 B1（B0 无 tsconfig，typecheck 依赖 B1）。B0 两件 TS 门禁兼作 B1 全族迁移的形态样板。engine 零依赖纪律（骨架 D1）约束 engine 运行时面，不受影响。

**件 1 · C11 子树布点**：按蓝图 §1 布点表建五件——`engine/`（CLI 命令面语言无关、gates.json 消费方契约、self-test 义务）/ `adapters/`（零宿主依赖、接线契约、防火墙 selftest）/ `scripts/`（门禁判据面、--self-test 夹具纪律、DAG 消费口径）/ `docs/`（tier 表指针 + 文档纪律链接，不重抄）/ `.agents/notes/`（新建即超车检查纪律，下钻件，与 `.agents/AGENTS.md` 分工：子树件只写 notes 专属约束）。每件 ≤300 词、入 doc-budgets manifest、立判据写明「agent 动这个目录会踩的具体失败」（蓝图 §1 HERO 投影）；规则只收编散处约束 + 链接单源，禁重抄根文件。

**件 2 · C12 教训层**：`scripts/verify-postmortem-naming.ts`——判据：`docs/postmortem/` 下仅允许 `000N-<kebab-topic>.md` 编号递增命名，目录不存在或空时 PASS（零约束）；挂 gates.json。cookbook 拆分规则并入 doc-budgets 超限处理序：`verify-doc-budgets.py` 超限 FAIL 文案带出「迁移 → 精简 → 提额度」三步 + cookbook 域拆分指针，处理序正文单源在 [doc-standards](../../../../docs/method/doc-standards.md)（此为存量 Python 件的小改，随 B1 迁 TS）。

**件 3 · archived-notes 校验件**：`scripts/verify-archived-agent-notes.ts`，判据四条（蓝图 §2）：封闭类树（archived/ 下仅 `{class}/yyyy-mm-dd-*.md` 合法路径）/ Status 行 archived + `Archived: YYYY-MM-DD` 行在位且合法 / 冻结内容清单比对（清单文件 `scripts/archived-notes.freeze.json` 记每件哈希，append-only——清单文件的 staged diff 只允许追加条目，经 git diff 校验，改写已有条目即 FAIL）/ archived 出站链接豁免。挂 gates.json 第十一条；扫描域固定 `.agents/notes/archived/`（对 `.cache/`、`.noogenesis/` 同名树免疫）；不引上游 sidecar 双文件（单语单文件、现仅 1 件，单清单文件 + append-only 校验同等强度）。首件 archived 随本批入冻。

**件 4 · references/ 形态规则（不实拆）**：`verify-skill-format.py`（存量 Python 件）增判据：存在 `references/` 时目录必须非空且 SKILL.md 至少含一条指向其中的相对链接（防预铺空目录，同 `.agents` 「用不上不写」纪律）；立项 ADR「首拆 noo-doc-standards」按实测修正——198 词不构成拆分需求，拆分触发条件（正文超预算或需携带模板/清单）落 noo-doc-standards 正文纪律行，实拆随真实需求另起。

**批纪律**：沿用立项 ADR——触碰 scripts/ 门禁判据 = FULL 三审；新 TS 门禁各带 `--self-test`（夹具自测违约 FAIL / 合规 PASS）；gates.json 现有条目集与门禁名不变，只追加。

## Alternatives considered

- **新门禁 Python 栈先行（立项 ADR 原案）**：落败——用户拍板指认回头路；新门禁无存量无对账面，双写 + 夹具同迁纯亏，还让 B1 对账工作量白增。
- **B0 拆序（资产先行、archived 校验排 B1 后）**：落败——archived 冻结的机器强制延后一批，「先框架」不完整；TS 切片终归要在 B1 前就位，拉前成本一次性，拆序只推迟不省。
- **sidecar 哈希双文件（上游形态）**：落败——本仓单语单文件、archived 现存 1 件，双文件管理成本大于收益；单清单 + staged diff append-only 校验同等强度。
- **references/ 实拆 noo-doc-standards**：落败——实测 198 词无拆分需求，预拆违反「用不上不写」。
- **postmortem 命名并入 verify-doc-budgets 等存量件**：落败——判据域不同（命名编号 vs 词数），并件让存量判据面变混；独立小件可独立 --self-test。

## Consequences

- **采用面**：五件子树 `AGENTS.md`；`scripts/verify-postmortem-naming.ts` + `scripts/verify-archived-agent-notes.ts` + 各自 self-test 夹具；`scripts/archived-notes.freeze.json`（首件入冻）；`verify-skill-format.py` 与 `verify-doc-budgets.py` 判据/文案增补；`gates.json` 追加两条（archived-notes / postmortem-naming，cmd = `node` 原生跑 .ts）；CI validate.yml 补 `setup-node@v4`（钉 node 22，type stripping 前提）；doc-budgets manifest 增五件子树条目；noo-doc-standards 正文补 references/ 触发纪律行；立项 ADR 三处修正（B0 拍板已定 / 新门禁 TS / 首拆表述）。
- **风险面**：冻结清单 append-only 校验依赖 git HEAD 对比——绕过钩子的强改属评审兜底面（implemented 同步纪律 + 评审检查项 2），机器层不设第二道；TS 门禁依赖 node ≥22.18（type stripping）——CI 钉 22、本地低于该版时报 node 版本诊断而非语法错。
- **验收**：门禁全绿（含两件新 TS 门禁 self-test）；五件布点逐件 ≤300 词过 manifest；C11/C12 蓝图对账行转绿；事件轨标注「本批按蓝图判据」；FULL 三审采纳收口后本 ADR 转 implemented。
