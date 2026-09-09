# Agent Note: 全仓规范审计简化候选批——原语归口 / 双源 / 清理纪律 / 口径拍板

Status: proposed
Review: pending

> Provenance：本仓原创（2026-09-10，三族 [R] 语义面审计的范围外观察面）。同源审计的缺陷修复批 = [2026-09-10-standards-audit-fix-batch](../../implemented/bug-fix/2026-09-10-standards-audit-fix-batch.md)（行为面已收口，本件只承载非缺陷的简化/拍板候选）。

## Problem

三族审计（engine/adapters/scripts 按架构与代码规范 `[R]` 清单逐行核对）在缺陷之外发现六处可简化/需拍板面，均不构成行为缺陷、但有真实的维护或漂移成本：

1. **py 兼容原语多副本未归口 mdref**：码点序比较器 8 处副本（gen-manifest / verify-cookbook / verify-manifest / verify-adr-format `cmpCodepoints` / verify-md-links / verify-review-tier `cmpPyStr` / verify-skill-format / verify-review-brief 内联）；路径归一 7 处变体（`normPyPath` ×4 + `pathNorm` + `pyNorm` + `pyPathStr`，其中 pyNorm/pyPathStr 语义略异——保留 `..`）。2026-09-10 mdref 归口批只收了 splitLines/pyStrip。
2. **ADR class 六类封闭集双源**：verify-adr-format.mts `CLASS_SET` 与 verify-archived-agent-notes.mts `CLASSES` 各存一份，漂移无闸；规则单源是散文（.agents/notes/README.md）。
3. **门禁自测临时目录清理纪律不一致**：7 件无清理（gen-manifest / verify-cookbook / verify-doc-budgets / verify-manifest / verify-archived-agent-notes / verify-postmortem-naming ×7 / verify-review-brief），其余 9 件有 rmSync 清理。
4. **模型面字符串语言无单源拍板**：mount-policies 注入消息中英混排、工具 description/诊断串全英文、solidify 提醒英文；注释面全中文合规——模型可见字符串的语言口径没有一次显式拍板。
5. **verify-archived-agent-notes 裸 `split("\n")` 未消费单源 splitLines**（行 77；若 py 原版即按 `\n` 切则行为有意保留，归口前先对账）。
6. **命中节 maxGenes 缺省 12 双写**：section.mts 默认参数与 config.mts `maxIndexGenes ?? 12` 各一份（README 配置表声明为缺省单源）。

## Proposal

逐项拍板后一个 LIGHT 批收口（1/2/5/6 是代码归口，3 是纪律统一，4 是拍板+归档）：

- **1**：先逐处对齐比较器语义（全部是「Python str 序 = 码点序」——8 处可直接归口 mdref 单件）；路径归一先对账 pyNorm/pyPathStr 与 normPyPath 的 `..` 语义差异，能统一则统一，不能则各保留并头注写明差异。
- **2**：class 封闭集提为共享常量件（或最小成本：给两件各加双源一致性自测断言）。
- **3**：统一为 try/finally rmSync（与已清理的 9 件同款）。
- **4**：拍板一次（中文 or 英文 or 按宿主面），结论归档 adapters/dsh/README 配置/语义节。
- **5**：对账 py 原版后归口或头注写明豁免理由。
- **6**：抽共享常量或 hitsSectionText 改必传（index 恒传）。

## Alternatives considered

- **全部保持现状（各自独立，不归口）**：落败——比较器 8 处副本已经出现口径漂移实例（verify-review-brief 尾注把 UTF-16 码元序标成码点序，审计批已修文案）；漂移成本随副本数增长。
- **与缺陷修复批合并同批做**：落败——路径归一变体涉及语义对账（非机械归口），混入行为批会放大爆炸半径；本批独立跑 LIGHT 即可。

## Consequences

- 拍板前零代码变动；拍板后 1/2/3/5/6 全部是行为等价重构（各自 --self-test + tsc 盖住），4 是散文拍板面。
- 归口后 mdref 成为 py 兼容原语唯一家（splitLines/pyStrip/码点比较器/路径归一），后续门禁新件不再复制原语。
