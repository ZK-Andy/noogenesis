# Agent Note: consolidate R1 simplification candidates

Status: implemented

> Provenance：本仓原创（R1 评审产出打包拍板，评审叙事见 [journal 2026-09 卷](../../../../journal/2026-09.md)）。

## Problem

胶囊 01 搬迁 FULL 三审的 R1（简化路）产出三件简化候选，散在待办中未裁决。逐件实证：

1. **链接校验五件套重复**：`verify-md-links.py` 与 `verify-skill-format.py` 各自持有逐字节相同的 `LINK_RE` / `HEADING_RE` / `ANCHOR_RE` / `slugify()` / `heading_slugs()` 五件定义（旧版前者 L30–55 ↔ 后者 L36–61，diff 为空）与同构的"链接目标解析 + 锚点校验"循环（L74–91 ↔ L110–126），合计约 40 行真重复。同一逻辑两处表述，漂移只是时间问题；v0.2 评审机械闸若再涉引用面将变三处。
2. **self-test 骨架同构、范式不一**：`verify-adr-format.py` / `verify-cookbook.py` / `verify-handoff-structure.py` 的 `_self_test()` 骨架同构（`import tempfile` + 临时目录 fixture + `sys.argv` 手工分派 + OK 行收尾），但可共享的只有分派与输出约定这点薄壳——fixture 主体是各域私有校验逻辑；且范式不一（`verify-skill-format.py` 用 argparse 分派，assert 有带消息有不带）。范式漂移会被 v0.2 新增的 `verify-review-tier` / `verify-review-brief` 继承。
3. **feature-flow 评审节对 review.md 语义重复**：[feature-flow](../../../../.agents/workflows/feature-flow.md) §4.2≈[review.md](../../../../docs/method/review.md) §2（范围收窄）、§4.4≈review.md §6（并行纪律）+ §3 Report contract，同一定义两处表述、语义未漂移但措辞已分叉；§4.3 的"门禁自证耦合"与 review.md §3 字段规则语义重复（措辞已分叉）。

## Decision

三件处置已落地（2026-09-05 拍板并同会话实施，顺序 ③→①→②生效）：

1. **①链接校验单一来源**：`scripts/mdref.py` 承载五件套与解析循环；对外 API 单一函数 `check_relative_links(text, path, root, errors)`——错误以 `文件路径: missing target/dead anchor` 前缀追加进调用方传入的列表，返回文件存在的目标数。`verify-md-links.py` / `verify-skill-format.py` 各一行导入，行为不变（对仓输出逐行一致实测）；跳目录/归档排除等策略面留在各自脚本。
2. **②self-test 调用面约定**（约束 v0.2 起新增 `verify-*` 脚本；存量四脚本不回改）：`--self-test` 经 argparse `action="store_true"` 定义，与其余参数共存；fixture 经临时目录触碰主校验函数，禁纯孤立断言；assert 必带消息；OK 行格式 `<script> --self-test OK (<覆盖面摘要>)`。
3. **③复述收敛**：feature-flow §4.2/§4.3/§4.4 收敛为 review.md §2/§3/§3+§6 指针；「简报给材料 + 检查项，不给结论倾向」迁入 review.md §3、「主会话裁决」迁入 §6；§4.5 等待纪律保留。
4. **py 头注引用 ADR 的口径**（三审立）：只写日期 + 主题（如 `per ADR 2026-09-05-consolidate-r1-simplification-candidates`），不写 lifecycle 目录路径——路径随晋级失效且 py 注释无门禁覆盖；引用前先核对该 ADR 在 notes 树存在。

## Alternatives considered

- **①暂缓到第三处使用场景出现（规则三）**：落败——v0.2 机械闸在即，重复即将变三处；同源重复的漂移是静默 bug，收敛成本低于三次同步修复成本。
- **①维持双写并加注释互指**：落败——注释不拦漂移，只是把同步责任转嫁给每个改动人。
- **②建公共 runner 框架**：落败——对 5 个小脚本过度设计；fixture 主体域私有，框架只能抽象最薄的壳，抽象漏比重复更难维护。
- **②存量四脚本一并回改统一**：落败——分派方式差异无行为后果，回改是纯 churn；约定只约束新出生脚本即可止住漂移。
- **③维持双写靠自觉同步**：落败——违反文档纪律"每个事实只有一个家"；已实测语义重复，靠评审兜底同步不可持续。

## Consequences

- ①行为恒等与门禁：新旧脚本输出逐行一致实测（含 self-test dead-link 负路径）；七门禁 + 四 self-test 全绿。
- ②=约定已立即生效且首轮合规验收已对照执行（2026-09-05：`verify-review-tier` / `verify-review-brief` 出生即按 Decision 第 2 条落地——argparse 分派 / fixture 触碰主逻辑 / assert 带消息 / OK 行格式，见 [review-mechanical-gate ADR](../process/2026-09-05-review-mechanical-gate.md)）；后续新增 `verify-*` 脚本继续对照本条执行。
- `import mdref` 依赖 sys.path[0]=scripts/（CI/hooks 均以 `python3 scripts/verify-*.py` 从仓根调用，实测成立）；出现包外导入用例时需改包结构——当前无此用例。
- 两脚本 provenance 头与 desktop 上游差异扩大（共享件移至 `mdref.py`），头注已同步更新差异说明。
- feature-flow 评审节不再自持范围/简报/并行契约全文，改读 review.md——同一定义单一来源消除漂移，代价是读流程卡需跳转一次。
