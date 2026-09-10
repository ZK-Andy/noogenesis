# Agent Note: 全仓规范审计简化候选批——单源归口 / 清理纪律 / 语言口径拍板

Status: implemented

> Provenance：本仓原创（2026-09-10，三族 [R] 语义面审计的范围外观察面）。同源审计的缺陷修复批 = [2026-09-10-standards-audit-fix-batch](../bug-fix/2026-09-10-standards-audit-fix-batch.md)（行为面已收口，本件只承载非缺陷的简化/拍板候选）。

## Problem

三族审计（engine/adapters/scripts 按架构与代码规范 `[R]` 清单逐行核对）在缺陷之外发现六处可简化/需拍板面，均不构成行为缺陷、但有真实的维护或漂移成本：

1. ~~**py 兼容原语多副本未归口**~~——已收口（[pypara 归口批 ADR](2026-09-10-pypara-fold-responsibility-split.md)）。
2. **ADR class 六类封闭集双源**：verify-adr-format.mts `CLASS_SET` 与 verify-archived-agent-notes.mts `CLASSES` 各存一份，漂移无闸；规则单源是散文（.agents/notes/README.md）。
3. **门禁自测临时目录清理纪律不一致**：7 件无有效清理（gen-manifest / verify-cookbook / verify-doc-budgets / verify-manifest / verify-archived-agent-notes ×2 根 / verify-postmortem-naming ×2 / verify-review-brief）——其余 9 件有完整 try/finally rmSync 清理。
4. **模型面字符串语言无单源拍板**：mount-policies 子树地图两条规范指针行为中文，其余模型可见面（基座节/命中节/lint 拦回/工具 description/warn）英文——中英混排，口径没有一次显式拍板。
5. **verify-archived-agent-notes 裸 `split("\n")` 未消费单源 splitLines**，而头注自称「与 verify-adr-format 同口径」——后者实为 splitLines，声明与实现不符。
6. **命中节 maxGenes 缺省 12 双写**：section.mts 缺省参数与 config.mts `maxIndexGenes ?? 12` 各一份（README 配置表声明为缺省单源）。

## Decision

逐项拍板（2026-09-10 用户三项：语言口径英文 / 直接 import 单源 / maxGenes 改必传），一个批收口：

- **2**：verify-archived-agent-notes 删本地 `CLASSES`，`import { CLASS_SET as CLASSES }` 自 verify-adr-format；后者补 `invokedAsEntry` 入口守卫（同 verify-review-tier 先例：argv[1] realpath 比对 import.meta.url），import 面安全。零新文件，单源真归口。
- **3**：7 件统一 try/finally rmSync（与已清理 9 件同款）；多临时根件（doc-budgets / postmortem-naming / archived-agent-notes）用收集数组在 finally 逐根清理。
- **4**：拍板**模型可见字符串（本层自有措辞）统一英文**（注释与 durable 文档仍中文）；数据面 carve-out——信号短语、基因 summary、基因注入文本跟随内容自身语言，不在口径内。落地 = mount-policies 子树地图两条指针行翻英文（selftest 夹具同批同步）；口径单源归档 adapters/dsh/README「语义与失败模式」节。
- **5**：行解析归口 pypara `splitLines`。对账前提不存在：该件是 B0 原生 TS 新写（无 py 原版），无语义对账负担；归口后头注「与 verify-adr-format 同口径」声明由假转真。
- **6**：`hitsSectionText` 的 maxGenes 改必传（实况所有调用点显式传值，index 恒传 config）；缺省 12 单源 = config.mts，README 配置表为口径单源。selftest 夹具同批补显式传值。

## Alternatives considered

- **全部保持现状（各自独立，不归口）**：落败——副本口径已现漂移实例（verify-review-brief 尾注码元/码点序错标，审计批已修）；漂移成本随副本数增长。
- **与缺陷修复批合并同批做**：落败——语义对账面混入行为批会放大爆炸半径，本批独立跑。
- **项2 用共享常量件 / 一致性自测断言**：落败——多一个文件 / 双源仅可测不可消；直接 import 是最小真单源。
- **项4 改中文 / 按宿主 locale**：落败——改中文改动面大且工具 description 面向英文宿主生态；宿主 locale 机制未接线，speculative。
- **项4 子树地图两行 carve-out 保留中文（按「规则指针文本=数据」口径）**：落败——两行是本层自有措辞而非数据（基因 summary/信号短语才是数据面），保留即持续违反本批口径。

## Consequences

- 全部行为等价重构：8 件门禁 --self-test + tsc + adapters dist selftest 全绿；临时目录零残留实证（run 前后 /tmp 计数差为 0）。
- verify-adr-format 新增首个 export（CLASS_SET）+ 入口守卫；scripts 族跨件 import 面从 1 件（brief→tier）增至 2 件，新跨件消费沿此形。
- 评审档位：scripts/** 触发 FULL（机器判级覆盖本批收口前预想的 LIGHT）；三审证据行随收口回填。
