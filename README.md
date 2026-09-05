# Noogenesis（心源）

**心源**：建立在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件架构之上的"蜂群进化框架"——让"AI 协作方法论"成为第一个可被群体共同演化、且每次演化都经机器可复现验证的**进化胶囊**。终极北极星是 AGI（只定方向，不定当前范围）。

noogenesis＝心智的发生与持续生长（德日进谱系下集体知识演化过程）；gene → genesis → Noogenesis。

## 当前状态

**胶囊 01「AI 协作编码方法论」**（本仓即其第一个宿主，self-hosting）：由四个来源项目提炼搬迁而成——常驻基座（双层 AGENTS）+ 流程卡 + ADR 生命周期 + 机器门禁（九件，含评审档位/简报两闸）+ 原子踩坑库 + 交接家庭。胶囊 v0.2 评审机械闸已落地（ADR 见 [.agents/notes/](.agents/notes/README.md)）。搬迁计划见 [capsule-01-migration-plan.md](capsule-01-migration-plan.md)。

## 结构

```
├── AGENTS.md               # 常驻基座（agent 自动加载，≤800 词）
├── .agents/                # AI 协作层：技能 noo-* / 流程卡 / ADR
├── docs/
│   ├── method/             # 方法论正文（被演化的内容域）
│   ├── cookbook.md         # 踩坑单一事实源（原子条目）
│   └── research/           # 设计文档（蜂群框架设计 / 共享层设计 / JIT-Agent 研究）+ 参考引擎调研解剖
├── scripts/                # verify-* 机器门禁（零依赖 Python）
├── templates/              # ADR / AGENTS 分层模板
├── HANDOFF.md + HANDOFF-todos.md   # 交接家庭
└── journal/                # 会话叙事月卷（过程即资产，入 git）
```

## 门禁

```sh
python3 scripts/verify-adr-format.py
python3 scripts/verify-doc-budgets.py --manifest scripts/doc-budgets.manifest.json
python3 scripts/verify-md-links.py
python3 scripts/verify-cookbook.py
python3 scripts/verify-skill-format.py
python3 scripts/verify-handoff-structure.py
python3 scripts/verify-review-tier.py [--staged|--since <base>] [--enforce]
python3 scripts/verify-review-brief.py [--lanes R1,R2,R3] [--enforce]
scripts/change-scope.sh [<base> <head>]
```

hooks 只做快检查（`bash scripts/setup-hooks.sh` 接线），CI 拥有穷尽矩阵（`.github/workflows/validate.yml`）。

## 文档与出处

- 主设计：[docs/research/dsh-swarm-evolution-framework-design.md](docs/research/dsh-swarm-evolution-framework-design.md)（含路线图 P0–P4 与未决问题）
- 协作方法论：[docs/method/ai-collaboration-method.md](docs/method/ai-collaboration-method.md)
- 踩坑判别：[docs/cookbook.md](docs/cookbook.md)

血统：方法论与门禁蒸馏自 `dotnet-deepseek-harness-desktop`、`dsh-frecency`、`devops-template`（MIT），上游 `deepseek-ai/deepseek-harness`（MIT）；**提炼后搬迁，非逐字节搬运**，每件资产头部带 provenance 行。

## License

**AGPL-3.0**（见 [LICENSE](LICENSE)，整仓统一）。商用不被排除；被排除的是不履行源码提供义务的分发与网络服务形态（含 SaaS）。上游 MIT 资产的版权与许可文本见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)，逐件血统标注由各资产 provenance 行承担。独立项目——与 DeepSeek 无关联。
