# Agent Note: pypara 归口与职责下分批——py 原语单源立户 / 夹具同件拍板 / 行数判别式入文档

Status: implemented
Review: FULL/2026-09-10/pending（三重审核进行中，收口时回填真实结论）

> Provenance：本仓原创（2026-09-10，规范审计简化候选批的落地实施）。候选出处 = [2026-09-10-standards-audit-simplification-candidates](../../proposed/simplification/2026-09-10-standards-audit-simplification-candidates.md) 第 1 项 + 用户拍板「职责往下分」。
> Related：超车取代 [2026-09-10-mdref-py-primitives-fold](2026-09-10-mdref-py-primitives-fold.md) 的单源落点（splitLines/pyStrip 从 mdref 迁入本批 pypara；mdref 收窄回链接/锚点域）——相关非否定：该批的「行为等价差分归口」方法与 mdref 单件收窄沿用。

## Problem

1. **py 兼容原语复刻面比已登记的更大**：候选 ADR 只盘了比较器 9 副本 + 路径归一 7 变体；实测 `verify-gene-format.mts` 单件内还有 ~420 行 py 兼容原语（完整 CPython JSON 解析器 + dumps/repr 族 + ISO 日期时间族 + OSError 文案族）——该文件 1151 行里近半是原语库，与「基因/事件协议校验」的主职责无关。
2. **单源落点分叉**：splitLines/pyStrip 单源在 mdref（同日早批拍板），repr/json/iso 族散在 gene-format——py 兼容原语没有一个统一的家，下一个门禁新件不知道该 import 谁。
3. **「职责往下分」缺判别式**：大文件（p90=542，max=1151）被误读为分层失败的信号；文档只有「上帝类闸判不立 + 触发条件」，没有把「行数为什么不是职责的度量」写显眼，导致每轮审计都重新争论一次。
4. **夹具同件 vs 姊妹件**是持续推大单文件的架构选择，从未显式拍板。

## Decision

1. **`scripts/pypara.mts` 立 py 兼容原语单源**（str / path / cmp / json / datetime / 常量六族；splitLines/pyStrip 自 mdref 迁入）。归口判别式：**语义逐字恒等的副本才归口**；有意变体保留并头注注明差异——`pyNorm`（保 `//` 前缀，pathlib 语义）vs `normPyPath`（折叠，PurePosixPath 语义）并存；verify-manifest 的标量近似 `pyRepr`（JSON.stringify 兜底、错误文案面不同）不并入 pypara 容器版。mdref 收窄回链接/锚点域。
2. **夹具同件拍板保留**：verify-* 的 --self-test 夹具与判据同件，不拆姊妹件。理由：夹具测的是**非导出内部函数**（scan/validateName/checkGene 级），拆件必须扩导出面——「导出即公共契约」（code-standards R5）与 export-docs 闸的契约注释面随之扩大，为文件体积买进契约面膨胀，得不偿失；判据-夹具同批原子性由同件天然保证。行数由原语归口管（本批后 gene-format 预期 ~700 行），不由拆夹具管。
3. **职责下分判别式入文档**（architecture-standards §4 上帝类闸条目 + code-standards §3 文件组织条）：行数不是职责的度量——职责 = 一句话可述；真失控信号 = 一句话说不清职责 / 改写困难 / 评审反复抓同一件（三有其一才触发上帝类闸候选）。
4. **候选 ADR 第 1 项收口**：proposed simplification 笔记更新（比较器/路径/原语族归口完成，pyEq/pyRepr 标量版等有意变体仍开放观察）。

## Alternatives considered

- **夹具拆姊妹件**：落败——夹具必须测非导出内部函数，拆件即扩导出面（R5 最小化反向）；且同件是「改判据忘改夹具」的原子性保证，拆件后靠批次纪律保证，防护降档。
- **立文件行数硬上限闸（如 300 行）**：落败——数据不支持（p50=177、p90=542 全部是单一职责文件，职责一句话可述；行数大 = 夹具同件纪律 + py 对齐原语的合法体积）；硬阈值制造人为切半（把一个内聚校验器切成「前半/后半」），比大文件更伤可维护性。维持「触发条件闸 + 判别式」形态。
- **把 pypara 并入 mdref（单文件双域）**：落败——mdref 域 = Markdown 链接/锚点，塞进 JSON/ISO/路径族后域名与内容脱节；两件各自单一职责（pypara = py 原语，mdref = md 原语）优于一件大杂烩。
- **pyJSONParse 换 JSON.parse + 错误映射**：落败——CPython json 错误文案（line/column/char + trailing-comma 专文案）是门禁判据面，JSON.parse 的 V8 文案对不上；手写 scanner 的 ~145 行是逐字镜像的必要体积。

## Consequences

- **采用面**：新增 `scripts/pypara.mts`（六族原语 + KEBAB_RE/MS 常量）；`verify-gene-format` 删除 ~450 行原语块改 import（预期 1151 → ~700）；`mdref` 删 splitLines/pyStrip 收窄回链接域；比较器归口 9 处（gen-manifest/verify-manifest/verify-cookbook/verify-adr-format/verify-review-tier/verify-md-links/verify-skill-format/verify-review-brief 内联/verify-postmortem-naming）；路径归一 6 处同语义副本归口（normPyPath ×4 + pathNorm + pyPathStr）；其余 touched 件 import 行改指 pypara。
- **行为面**：零行为变更——恒等体替换；唯一非逐字替换 = postmortem 排序比较器（cmpByStringOrder 码元序 → cmpPyStr 码点序，ASCII 钉死名下行为等价，上一批已拍板该口径）。全部消费方 --self-test 夹具（含 gene-format 18 组）必须全过，证明文案面逐字保持。
- **单源变化**：py 兼容原语的家 = pypara（mdref-py-primitives-fold ADR 的落点被本批取代）；新门禁件的 py 原语诉求一律 import pypara，不再手搓副本。
- **文档面**：architecture-standards §4 与 code-standards §3 各补一行判别式（互指不重抄）。
