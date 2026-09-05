# Agent Note: Gene/Event schema 与落盘协议（P1）

Status: proposed

> Provenance：本仓原创设计（2026-09-05 立项讨论轮）。骨架选型的上游拍板见 [2026-09-05-p1-engine-skeleton](2026-09-05-p1-engine-skeleton.md)（D1 零依赖 JSON / D2 显式信号 / D3 确定性 propose / D4 保守评估）；本 ADR 承接其 Open questions，逐题定协议细节。原语字段渊源自主设计 §5.1，按 P1 语义收窄处逐条注明。

## Problem

骨架四题拍板后，协议层（Gene 文件长什么样、放哪、Event 记什么记到哪）仍悬空。协议先行是 evolver 考古六条可借思路之首（GEP 协议 D2 定稿，引擎围着协议长）——schema 与落盘协议不定，实现轮无从起步。逐题拍板，结论落本 ADR，与骨架 ADR 一并三审。

## Proposal

### S1（2026-09-05，已拍板）：Gene 落盘协议

- **目录**：仓根顶层 `genes/<domain>/<gene-id>.json`——与设计稿 §9.1 P2 共享基因库形态同构，本仓自托管即种子，P2 迁移目录零改动。域子目录对齐胶囊域（process / doc / gates…）。不放 `.agents/`：基因是被演化物（胶囊内容），非协作机制本身。
- **粒度**：一基因一文件；**P1 无 manifest.json**——engine 直接扫目录，避免双记账漂移；manifest 是 P2 共享库的检索索引，到时再加。
- **ID**：kebab-case 短名（如 `push-precheck-order`），文件名 = ID；SHA-256 内容寻址由 solidify 写进 Event（不进文件名——文件名须人可读）。
- **schema 校验器**：新 `scripts/verify-gene-format.py`（结构/必选字段类型/ID 与文件名一致/JSON 可解析）+ self-test 违约夹具，挂入 CI = 第十门禁——协议先行 + 护栏同节奏的机械面。
- **六字段 P1 具体化**（字段名对设计稿 §5.1 的收窄均记此处）：

| 字段 | 类型 | 语义（P1） | 对设计稿的收窄 |
|---|---|---|---|
| `id` | string | kebab-case，= 文件名 | 新增（文件名锚点） |
| `domain` | string | 域标签（封闭集随首批翻译形成） | 新增（目录锚点） |
| `summary` | string | 一行人读摘要 | 同 §5.1 |
| `signals` | string[] | 精确匹配键（骨架 ADR D2 口径：归一化后字面匹配） | `signals_match` → `signals`，语义收窄为字面匹配 |
| `strategy` | string[]（有序） | propose 渲染主体 | 同 §5.1 |
| `constraints` | object，可选 | `max_files` / `forbidden_paths` | 同 §5.1，v0 可选 |
| `validation` | string[]，可选 | 白名单命令（白名单归 S3） | 同 §5.1，v0 可选 |
| `avoid` | string[]，可选 | 失败面压缩警告，渲染进注入文本尾部 | `AVOID` → `avoid`（snake_case 统一） |

### S2（2026-09-05，已拍板）：Event 最小 schema 与落盘协议

- **kind 封闭集（演化事件 ≠ 运行日志）**：v0 仅 `gene.added` / `gene.updated` / `gene.retired` 三种。select/propose 运行不记（会话噪音，#18"常开确定性成本"同类）；evaluate 结果只在入档尝试时随 solidify 事件落一条（成功带证据，失败带拒因）。
- **字段（P1 最小集）**：`ts`（ISO 时间）、`actor`、`kind`、`gene`（id）、`gene_sha`（内容寻址防篡改锚点）、`outcome`（ok | fail+拒因）、`evidence`（一行证据摘要）。设计稿 §5.1 的 `mutation_id`/`capsule_id`/`env_fingerprint`/`validation_report_id` 不进 P1——对应原语已后置，字段先于原语出现即死字段。
- **落盘**：`events/<YYYY-MM>.jsonl`，月卷与 journal 同节奏（diff 可读、量有界）；**入 git**（审计面非缓存面，"过程即资产"直接适用）；**原子证据**：solidify 将 `genes/` 变更与 `events/` 追加行放同一 commit——基因更替与审计记录不可分离，是 content-addressable + append-only 在 git 载体上的落法。
- **校验**：不新增第十一门禁——`verify-gene-format.py` 扩展覆盖 `events/`（行级 JSON、kind 封闭集、gene_sha 可复算、genes/ 与 events/ 引用一致），仍单脚本 = 第十门禁，gate 数量的克制性守住。

<!-- S3（验证白名单 + 安全模型 + 元评测夹具）占位：拍板一题填一题。 -->

## Alternatives considered

- **YAML + js-yaml 例外即刻启用**：落败——D1 已拍零依赖，YAML 的策展书写舒适性属一次性收益；例外权保留至 M2。
- **P1 即建 manifest.json**：落败——单机单仓下 manifest 与目录天然可漂移，双记账换不来检索收益；P2 多仓共享时 manifest 才有存在理由。
- **基因内嵌哈希文件名（content-addressable 至文件名）**：落败——不可读、不可 grep、git diff 噪音化；SHA 归 Event 已满足防篡改与审计。

## Acceptance criteria

- S2–S4 拍板后本 ADR 补齐，与骨架 ADR 一并 FULL 三审；证据行落本 ADR 头部。
- 实现轮的 `genes/` 首批翻译件与 `verify-gene-format.py` 均以本 ADR 为唯一协议依据；第十门禁进 CI 前先在本地闸挂入。

## Risks

- 域标签封闭集未预设——首批翻译若域划分失当（过粗/过细），迁移成本落在目录重组；缓解：首批 ≤3 域起步，宁粗勿细。
- JSON 人类书写体验弱于 YAML——首批基因量小可忍；M2 引 `js-yaml` 时需迁移器（骨架 ADR Risks 已记）。
