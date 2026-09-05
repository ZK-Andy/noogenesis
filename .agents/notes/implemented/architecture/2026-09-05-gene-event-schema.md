# Agent Note: Gene/Event schema 与落盘协议（P1）

Status: implemented
Review: FULL/2026-09-05/R1=ok R2=ok R3=ok

> Provenance：本仓原创设计（2026-09-05 立项讨论轮）。骨架选型的上游拍板见 [2026-09-05-p1-engine-skeleton](2026-09-05-p1-engine-skeleton.md)（D1 零依赖 JSON / D2 显式信号 / D3 确定性 propose / D4 保守评估）；本 ADR 承接协议细节，逐题拍板。原语字段渊源自[主设计 §5.1](../../../../docs/research/dsh-swarm-evolution-framework-design.md)，按 P1 语义收窄处逐条注明。"协议先行"正例出自[演化史解剖](../../../../docs/research/evomap-evolver-engine-evolution.md)的 D2 阶段里程碑（该文档的阶段标签，与本 ADR 决策编号无涉）。

## Problem

骨架四题拍板后，协议层（Gene 文件长什么样、放哪、Event 记什么记到哪）仍悬空。协议先行是引擎演化史六条可借思路之首（GEP 协议先行定稿，引擎围着协议长）——schema 与落盘协议不定，实现轮无从起步。逐题拍板，结论落本 ADR，与骨架 ADR 同批三审。

## Decision

### S1（2026-09-05，已拍板）：Gene 落盘协议

- **目录**：仓根顶层 `genes/<domain>/<gene-id>.json`——与[主设计 §9.1](../../../../docs/research/dsh-swarm-evolution-framework-design.md) P2 共享基因库形态同构，本仓自托管即种子，P2 迁移目录零改动。域子目录对齐胶囊域（process / doc / gates…）。不放 `.agents/`：基因是被演化物（胶囊内容），非协作机制本身。
- **粒度**：一基因一文件；**P1 无 manifest.json**——engine 直接扫目录，避免双记账漂移；manifest 是 P2 共享库的检索索引，到时再加。
- **ID**：kebab-case 短名（如 `push-precheck-order`），文件名 = ID；SHA-256 内容寻址由 solidify 写进 Event（不进文件名——文件名须人可读）。
- **schema 校验器**：新 `scripts/verify-gene-format.py`（结构/必选字段类型/ID 与文件名一致/JSON 可解析/白名单条目脚本存在性，见 S3）+ self-test 违约夹具，挂入 CI = 第十门禁——协议先行 + 护栏同节奏的机械面。
- **字段表 P1 具体化**（主设计 §5.1 的六字段 + 新增 id/domain，共八字段；字段名收窄均记此处）：

| 字段 | 类型 | 语义（P1） | 对主设计 §5.1（[链接](../../../../docs/research/dsh-swarm-evolution-framework-design.md)）的收窄 |
|---|---|---|---|
| `id` | string | kebab-case，= 文件名 | 新增（文件名锚点） |
| `domain` | string | 域标签（封闭集随首批翻译形成） | 新增（目录锚点） |
| `summary` | string | 一行人读摘要 | 同 §5.1 |
| `signals` | string[] | 精确匹配键（骨架 ADR D2 口径：归一化后字面匹配） | `signals_match` → `signals`，语义收窄为字面匹配 |
| `strategy` | string[]（有序） | propose 渲染主体 | 同 §5.1 |
| `constraints` | object，可选 | `max_files` / `forbidden_paths` | 同 §5.1，v0 可选 |
| `validation` | string[]，可选 | 仅白名单内命令（骨架 ADR D4 + 本 ADR S3） | 收窄：§5.1 为无白名单约束的"真执行命令" → 仅白名单内 |
| `avoid` | string[]，可选 | 失败面压缩警告，渲染进注入文本尾部 | `AVOID` → `avoid`（snake_case 统一） |

### S2（2026-09-05，已拍板）：Event 最小 schema 与落盘协议

- **kind 封闭集（演化事件 ≠ 运行日志）**：v0 仅 `gene.added` / `gene.updated` / `gene.retired` 三种。select/propose 运行不记（会话噪音，与 #18 单例判定约束的"常开确定性成本"同类——[cookbook 条目](../../../../docs/cookbook.md)）；evaluate 结果只在入档尝试时随 solidify 事件落一条（成功带证据，失败带拒因）。
- **落盘语义逐 kind 钉死**：`gene.added`/`gene.updated` = `genes/` 下文件新增/变更（工作树可复算）；`gene.retired` = 从 `genes/` 删除该文件（git 历史仍可溯），事件 `gene_sha` = 退役时最后内容 SHA；入档失败事件 = 候选未落 `genes/`，`gene_sha` = 被拒候选内容 SHA。
- **字段（P1 最小集）**：`ts`（ISO 时间）、`actor`、`kind`、`gene`（id）、`gene_sha`（内容寻址防篡改锚点）、`outcome`（ok | fail+拒因）、`evidence`（一行证据摘要）。主设计 §5.1 的 `mutation_id`/`capsule_id`/`env_fingerprint`/`validation_report_id` 不进 P1——对应原语已后置，字段先于原语出现即死字段。
- **落盘**：`events/<YYYY-MM>.jsonl`，月卷与 journal 同节奏（diff 可读、量有界）；**入 git**（审计面非缓存面，"过程即资产"直接适用）；**原子证据**：solidify 将 `genes/` 变更与 `events/` 追加行放同一 commit——基因更替与审计记录不可分离，是 content-addressable + append-only 在 git 载体上的落法。
- **校验**：不新增第十一门禁——`verify-gene-format.py` 扩展覆盖 `events/`：行级 JSON、kind 封闭集、月卷内时间序；**复算规则分型**——工作树存在的 `genes/<id>.json` ↔ 其最新 added/updated 事件的 `gene_sha` 必须一致（复算）；fail/retired 事件只查结构/kind/时间序，**不作工作树复算**（内容经 git 历史复核）。仍单脚本 = 第十门禁，gate 数量的克制性守住。

### S3（2026-09-05，已拍板）：验证白名单、安全模型、元评测夹具

- **白名单载体 = `engine/gates.json` 版本化机器清单**：v0 内容 = 九门禁（无参门禁直接实例化；带上下文参数的 review-tier/review-brief/change-scope 以参数槽收录，取值仅由引擎从 git 事实注入，见骨架 ADR D4）。**P1 消费者 = 引擎 evaluate + `verify-gene-format.py` 的条目脚本存在性校验**（防漂移）；hooks/CI 经 `scripts/gates.py` 改引同一清单（2026-09-06 收口，[M2 ADR](2026-09-06-m2-adapter-wiring.md)；结构性例外见该脚本头注）。与 AGENTS 质量门（[根 AGENTS.md](../../../../AGENTS.md) 人读面）的漂移由上述双机械闸兜底。
- **安全模型五条**（实现轮落 engine README + 夹具验证）：①白名单封闭，字面匹配，结构化 spawn 不走 shell 拼接；②引擎零网络（骨架 D1/D3 一脉）；③基因不含可执行内容——`strategy`/`avoid` 是渲染文本，永不 eval；④子进程最小 env、工作目录锁仓根；⑤fail-closed：白名单缺失/格式坏/条目不存在 → evaluate 拒跑不静默退化。
- **元评测 = engine 自带 `self-test` 子命令**（对齐 verify-* self-test 惯例，违约样例必须 FAIL）：select 命中/未命中/多信号并集/归一化规则（D2 钉死的 trim→小写→空白折叠）；propose 金样渲染精确匹配（D3 可测性兑现）；evaluate 白名单外命令必须拒、约束违约必须 FAIL；solidify 在临时 git 仓验证原子提交（genes/ + events/ 同 commit）与 gene_sha 可复算。CI 加一步 `node engine/bin.js self-test`，与 verify-* self-test 平级、不占门禁编号。
- **自托管纪律**：self-test 全程临时目录/沙箱，不触碰真实仓（引擎测试自己不污染被演化对象）。

## Alternatives considered

- **YAML + js-yaml 例外即刻启用**：落败——骨架 ADR D1 已拍零依赖，YAML 的策展书写舒适性属一次性收益；例外权保留至 M2（单源见骨架 ADR 遗留面）。
- **P1 即建 manifest.json**：落败——单机单仓下 manifest 与目录天然可漂移，双记账换不来检索收益；P2 多仓共享时 manifest 才有存在理由。
- **基因内嵌哈希文件名（content-addressable 至文件名）**：落败——不可读、不可 grep、git diff 噪音化；SHA 归 Event 已满足防篡改与审计。

## Consequences

- **采用面**：首批基因人工策展翻译以本 ADR 为唯一协议依据；`verify-gene-format.py` 第十门禁先挂本地闸再进 CI。
- **单源指针**：严格改进度量 open 单源在骨架 ADR D4；js-yaml 迁移风险单源在骨架 ADR 遗留面——本 ADR 不复述。
- **域标签封闭集风险**：首批翻译若域划分失当，迁移成本落在目录重组；首批 ≤3 域起步，宁粗勿细。
- **JSON 书写体验弱于 YAML**：首批基因量小可忍；M2 引 `js-yaml` 时按骨架 ADR 遗留面处理。
