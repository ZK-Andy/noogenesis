# Noogenesis（心源）

**心源**：建立在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件架构之上的"蜂群进化框架"——让"AI 协作方法论"成为第一个可被群体共同演化、且每次演化都经机器可复现验证的**进化胶囊**。终极北极星是 AGI（只定方向，不定当前范围）。

noogenesis＝心智的发生与持续生长（德日进谱系下集体知识演化过程）；gene → genesis → Noogenesis。

## 当前状态

**胶囊 01「AI 协作编码方法论」**（本仓即其第一个宿主，self-hosting）：由四个来源项目提炼搬迁而成——常驻基座（双层 AGENTS）+ 流程卡 + ADR 生命周期 + 机器门禁（十一件，含评审档位/简报两闸）+ 原子踩坑库 + 交接家庭。胶囊 v0.2 评审机械闸已落地（ADR 见 [.agents/notes/](.agents/notes/README.md)）。搬迁计划见 [capsule-01-migration-plan.md](capsule-01-migration-plan.md)。P1 演化发动机已落地：`engine/` 五命令（select/propose/evaluate/solidify/pull，Node 零依赖）+ 验证白名单 + 第十门禁 + 首批 6 基因（process/doc/gates 三域）经 solidify 原子入档（ADR 同见 [.agents/notes/](.agents/notes/README.md)）。M2 适配层已落地：本仓即 DSH 插件包（npm 包 [`noogenesis-dsh`](https://www.npmjs.com/package/noogenesis-dsh)@0.1.3，AGPL-3.0），`adapters/dsh/` 经 spawn CLI 单合同把引擎接进会话生命周期（ADR 同见；包名规则见 [adapters/dsh/README.md](adapters/dsh/README.md)）；安装方式 `dsh plugin --profile <name> -- add noogenesis-dsh`（新发版本满 pnpm minimumReleaseAge 窗口前需单命令豁免，见 [docs/cookbook.md](docs/cookbook.md) [环境] 条目）。前置条件：**运行仓 = git 仓且 git CLI 在场**——引擎五命令与 pull 依赖 git 子进程，非 git 目录用 `noo_*` 工具会 fail-closed 退出 2（git 未装时引擎诊断指名 git 缺失，不误报非 git 仓）。P2 只读共享消费已落地（本仓即基因库）：`engine pull <bank-url>` + `manifest.json` 检索索引（[verify-manifest](scripts/verify-manifest.py) 门禁）+ 缓存合并扫描（本仓基因优先）；适配层 `geneBankUrl` 缺省官方库（`false` 显式禁用），pull 触发点随会话工作区——默认安装零配置即拉库（ADR 同见）。技能随库分发已落地（`noogenesis-bank` provider，rank 600）：7 个 `noo-*` 技能经基因库缓存进 DSH 技能面，装包 → pull 即得（ADR 同见）。

## 结构

```
├── AGENTS.md               # 常驻基座（agent 自动加载，≤800 词）
├── .agents/                # AI 协作层：技能 noo-* / 流程卡 / ADR
├── docs/
│   ├── method/             # 方法论正文（被演化的内容域）
│   ├── cookbook.md         # 踩坑单一事实源（原子条目）
│   └── research/           # 设计文档（蜂群框架设计 / 共享层设计 / JIT-Agent 研究）+ 参考引擎调研解剖
├── scripts/                # verify-* 机器门禁（零依赖 Python）+ gates.py 门禁清单单源发射器
├── engine/                 # 演化发动机（Node 零依赖五命令 + gates.json 白名单；pull = P2 只读消费）
├── adapters/dsh/           # M2 DSH 适配层（插件壳接线：system-prompt 节 / noo_* 工具 / solidify 人工确认触发 / geneBankUrl 惰性 pull / 技能随库分发）
├── genes/                  # 基因库（<domain>/<id>.json，经 solidify 入档；本仓即库）
├── manifest.json           # 基因库检索索引（gen-manifest 生成，verify-manifest 门禁）
├── events/                 # 演化事件月卷（JSONL 审计面，入 git）
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
python3 scripts/verify-gene-format.py
python3 scripts/verify-manifest.py
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
