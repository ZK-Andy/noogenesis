# Noogenesis（心源）— 项目规则

心源：建立在 DeepSeek Harness 插件架构之上的"蜂群进化框架"。终极北极星是 AGI（只定方向，不定当前范围）；当前落地 = 第一个进化胶囊「AI 协作编码方法论」。本仓库既是框架本体，也是该胶囊的第一个宿主（self-hosting：用心源的体系开发心源）。设计基准见 [docs/research/dsh-swarm-evolution-framework-design.md](docs/research/dsh-swarm-evolution-framework-design.md)。

## 协作模式（AI + 人）

- agent 先读本文件与 `.agents/` 流程卡再动手；每次动手前说清变更范围。
- **非平凡变更必须同变更携带 ADR**（见 [.agents/notes/README.md](.agents/notes/README.md)）；讨论与取舍落 ADR，不散在会话里。
- 会话开场声明模式（讨论/调研/实现/发布），许可边界见流程卡 [session-modes](.agents/workflows/session-modes.md)。

## 流程卡（索引）

- [session-modes](.agents/workflows/session-modes.md) — 模式契约：讨论/调研/实现/发布的许可边界；开场必须声明模式。
- [session-open](.agents/workflows/session-open.md) / [session-close](.agents/workflows/session-close.md) — 会话开、收尾检查单。
- [feature-flow](.agents/workflows/feature-flow.md) — 非平凡变更主链路：ADR→实现→门禁→评审→收尾。
- [release-flow](.agents/workflows/release-flow.md) — 发版主链路。
- [github-research](.agents/workflows/github-research.md) — GitHub 调研六步配方（强制：gh CLI，禁 web 检索开局）。

## 文档纪律

- **每个事实只有一个家**：rationale → ADR；procedure/踩坑 → [docs/cookbook.md](docs/cookbook.md)；方法论正文 → [docs/method/doc-standards.md](docs/method/doc-standards.md) 及同目录；规则 → 本文件 + 链接。
- durable 文档**写当前状态，不写变更历史**（"previously / now / no longer / renamed" 是 slop）。
- ADR 路径即元数据：`{lifecycle}/{class}/yyyy-mm-dd-<topic>.md`；rejected 仅当理由能防重蹈覆辙才保留；archived 永久冻结。
- 相对 Markdown 链接 + 机器可校验；禁裸文件名引用。

## Git 纪律

- raw `--force` 永远禁止；改写历史必须 `--force-with-lease=<branch>:<observed-oid>`，改写后重新审计评审状态。
- push 前最小证据：按 diff 面选最窄检查（先用 `scripts/change-scope.mts`）；禁止默认全量跑、禁止为掩盖未覆盖文件收窄范围。
- hooks 只做快检查，CI 拥有穷尽矩阵。
- **过程资产入 git**：`journal/` 月卷与 HANDOFF 家庭均提交——过程即资产，会话轨迹是未来演化原料；durable 结论仍只落四家，交接只留指针。

## 评审检查项（AI 兜底）

评审代理按此清单显式核对机器门禁盖不住的语义面（契约与机制见 [review.md](docs/method/review.md) §5）；新增兜底项时同变更更新本节：

1. **文档纪律语义面**：单源（同一事实一个家）、写当前状态不写变更史 — [doc-standards](docs/method/doc-standards.md)。
2. **ADR 口径一致性**：决策与实现/README/头注对同一事实的表述一致；证据严肃性三件套（现象/机制分离 · 数值标强度 · 勘误通道）— [.agents/notes/README.md](.agents/notes/README.md)。
3. **胶囊内容域与门禁判据口径一致** — [doc-standards](docs/method/doc-standards.md) tier 表 + [standard-authoring](docs/method/standard-authoring.md)。
4. **编码规范语义面**：机器面已盖（导出函数/类注释存在性、TODO/FIXME 词面、未用变量、`as const`、写码当轮 lint 反馈）——评审核对注释**内容**（契约是否说清、变更史/推理转写/控制流复述、命名是否揭示意图）与格式约定（头注三要素/尾随注释/中英混杂）— [code-standards](docs/method/code-standards.md) 各「[R] 留评审」档条目。

## 质量门

可执行门禁清单**单源**于 `engine/gates.json`：`node scripts/gates.mts --list` 发射、`--run` 运行，hooks/CI 消费同一清单；结构性例外四件（review-tier / review-brief / change-scope / gene-format）非平跑，机制见 gates.mts 头注。清单明细不在此手抄。

## 字数预算

| 文件 | 上限 |
|---|---|
| 本文件 | ≤ 800 词 |
| .agents/AGENTS.md | ≤ 300 词 |
| .agents/notes/README.md | ≤ 800 词 |
| docs/cookbook.md | ≤ 2700 词 |
| docs/method/ 各篇 | 见 manifest |

超限处理序：迁移到其他层（留一行链接）→ 精简 → 才允许提额度（manifest `_justify_bump` 留理由）。

## 参考

- 蜂群框架设计（主设计）：[docs/research/dsh-swarm-evolution-framework-design.md](docs/research/dsh-swarm-evolution-framework-design.md)
- 胶囊 01 搬迁计划（评审定稿，已实施冻结）：[journal/capsule-01-migration-plan.md](journal/capsule-01-migration-plan.md)
- 技能 / ADR / 门禁细则：[.agents/AGENTS.md](.agents/AGENTS.md)
