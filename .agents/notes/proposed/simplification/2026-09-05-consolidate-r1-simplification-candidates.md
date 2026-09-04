# Agent Note: consolidate R1 simplification candidates

Status: proposed

> Provenance：本仓原创（R1 评审产出打包拍板，评审叙事见 [journal 2026-09 卷](../../../../journal/2026-09.md)）。

## Problem

胶囊 01 搬迁 FULL 三审的 R1（简化路）产出三件简化候选，散在待办中未裁决。逐件实证：

1. **链接校验五件套重复**：`verify-md-links.py` 与 `verify-skill-format.py` 各自持有逐字节相同的 `LINK_RE` / `HEADING_RE` / `ANCHOR_RE` / `slugify()` / `heading_slugs()` 五件定义与同构的"链接目标解析 + 锚点校验"循环（前者 L30–55 + 74–91，后者 L36–61 + 110–126），合计约 35 行真重复。同一逻辑两处表述，漂移只是时间问题；v0.2 评审机械闸若再涉引用面将变三处。
2. **self-test 骨架同构、范式不一**：`verify-adr-format.py` / `verify-cookbook.py` / `verify-handoff-structure.py` 的 `_self_test()` 骨架同构（`import tempfile` + 临时目录 fixture + `sys.argv` 手工分派 + OK 行收尾），但可共享的只有分派与输出约定这点薄壳——fixture 主体是各域私有校验逻辑；且范式不一（`verify-skill-format.py` 用 argparse 分派，assert 有带消息有不带）。范式漂移会被 v0.2 新增的 `verify-review-tier` / `verify-review-brief` 继承。
3. **feature-flow 评审节对 review.md 近逐句复述**：[feature-flow](../../../../.agents/workflows/feature-flow.md) §4.2≈[review.md](../../../../docs/method/review.md) §2（范围收窄）、§4.4≈review.md §6（并行纪律）+ §3 Report contract，同一定义两处表述，暂未漂移；§4.3 的"门禁自证耦合"句与 review.md §3 字段规则逐字重复。

## Proposal

三件处置（2026-09-05 拍板，实现走 feature-flow）：

1. **①收敛公共模块**：新建 `scripts/mdref.py`，承载五件套 + 链接解析循环（`resolve` + 锚点校验单一函数，返回 error 列表，调用方拼各自前缀）；`verify-md-links.py` / `verify-skill-format.py` 导入，删除各自副本。两脚本行为不变（对现有仓输出逐行一致）。模块头带 provenance 行（蒸馏自 desktop 两脚本的同源件）。归档/跳目录等策略面留在各自脚本。
2. **②立约定、不建框架**：self-test 调用面约定写入本 ADR，只约束 v0.2 起新增的 `verify-*` 脚本，存量四脚本不回改（零行为收益的 churn 不做）：`--self-test` 经 argparse `action="store_true"` 定义（与其余参数自然共存）；fixture 经临时目录触碰主校验函数，禁纯孤立断言；assert 必带消息；OK 行格式 `<script> --self-test OK (<覆盖面摘要>)`。
3. **③收敛指针 + 迁移差异面**：feature-flow §4.2/§4.4 收敛为指向 review.md 对应节的指针 + 一行差异面；§4.3 中"简报给材料 + 检查项，**不给结论倾向**"是 review.md 未承载的独立规则，先迁入 review.md §3 字段规则，§4.3 自证耦合句随复述一并删除；§4.5 等待纪律为 feature-flow 独有，保留。

实施顺序：③（纯文档，先消化迁移）→ ①（脚本收敛）→ ② 无独立动作（约定随 v0.2 机械闸生效）；完成后本 ADR 转 implemented。

## Alternatives considered

- **①暂缓到第三处使用场景出现（规则三）**：落败——v0.2 机械闸在即，重复即将变三处；35 行同源重复的漂移是静默 bug，收敛成本低于三次同步修复成本。
- **①维持双写并加注释互指**：落败——注释不拦漂移，只是把同步责任转嫁给每个改动人。
- **②建公共 runner 框架**：落败——对 5 个小脚本过度设计；fixture 主体域私有，框架只能抽象最薄的壳，抽象漏比重复更难维护。
- **②存量四脚本一并回改统一**：落败——分派方式差异无行为后果，回改是纯 churn；约定只约束新出生脚本即可止住漂移。
- **③维持双写靠自觉同步**：落败——违反文档纪律"每个事实只有一个家"；已实测近逐句，靠评审兜底同步不可持续。

## Acceptance criteria

- ①：`scripts/mdref.py` 存在且两脚本导入后，七门禁 + 各 self-test 全绿；`verify-md-links.py` 与 `verify-skill-format.py` 对现有仓的输出与收敛前逐行一致。
- ②：约定落在本文 Proposal；v0.2 两新脚本的 self-test 合规（argparse 分派 / fixture 触碰主逻辑 / assert 带消息 / OK 行格式）。
- ③：feature-flow 评审节无对 review.md 的逐句复述（指针 + 差异面）；"不给结论倾向"规则在 review.md §3 可查；feature-flow §4.5 保留；`verify-md-links` / `verify-doc-budgets` 全绿。

## Risks

- 公共模块导入依赖"脚本目录在 `sys.path[0]`"（`python3 scripts/xxx.py` 与 CI 均成立）；若未来出现从包外 `import verify_md_links` 的用例需改包结构——当前无此用例。
- ③迁移遗漏差异面会丢规则——验收时对 §4.2–4.4 逐句对照 review.md 清点。
- 两脚本 provenance 头因收敛与 desktop 上游差异扩大——头注同变更更新差异说明。
