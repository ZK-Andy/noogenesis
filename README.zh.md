# Noogenesis（心源）

[English](README.md) | 中文

**心源**：建立在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件架构之上的"蜂群进化框架"——让"AI 协作方法论"成为第一个可被群体共同演化、且每次演化都经机器可复现验证的**进化胶囊**。终极北极星是 AGI（只定方向，不定当前范围）。

noogenesis＝心智的发生与持续生长（德日进谱系下集体知识演化过程）；gene → genesis → Noogenesis。

## 当前状态

**胶囊 01「AI 协作编码方法论」**（本仓即其第一个宿主，self-hosting）：常驻基座（分层 AGENTS：根 + `.agents/` + 五件子树）+ 流程卡 + ADR 生命周期 + 机器门禁（清单单源 `engine/gates.json`，含评审档位/简报两闸）+ 原子踩坑库 + 交接家庭。搬迁计划（已实施冻结）见 [journal/capsule-01-migration-plan.md](journal/capsule-01-migration-plan.md)；ADR 家在 [.agents/notes/README.md](.agents/notes/README.md)。

两个运行层已就位：

- **演化发动机**——`engine/` 五命令（`select` / `propose` / `evaluate` / `solidify` / `pull`，Node 零依赖）+ 验证白名单（`engine/gates.json`）+ 基因/事件协议。
- **DSH 适配层**——本仓即 DSH 插件包 [`noogenesis-dsh`](https://www.npmjs.com/package/noogenesis-dsh)@0.1.3（AGPL-3.0）：经 spawn CLI 单合同把引擎接进会话生命周期，并随基因库分发 7 个 `noo-*` 技能。

前置条件：**运行仓 = git 仓且 git CLI 在场**——引擎命令依赖 git 子进程，非 git 目录用 `noo_*` 工具会 fail-closed 退出 2；git 未装时引擎诊断指名 git 缺失，不误报非 git 仓。

## 安装

把插件装进 DSH profile：

```sh
dsh plugin --profile <name> -- add noogenesis-dsh
```

适配层 `geneBankUrl` 缺省官方基因库（`false` 显式禁用拉库），默认安装零配置即拉库。新发版本满 pnpm `minimumReleaseAge` 窗口前需单命令豁免，见 [docs/cookbook.md](docs/cookbook.md) [环境] 条目；包名规则见 [adapters/dsh/README.md](adapters/dsh/README.md)。

## 从源码运行

参与框架开发：

```sh
git clone https://github.com/ZK-Andy/noogenesis.git
cd noogenesis
bash scripts/setup-hooks.sh       # 接线 pre-commit / pre-push 门禁
python3 scripts/gates.py --run    # 机器门禁（清单单源 engine/gates.json）
node engine/bin.js self-test      # 引擎自检
```

## 结构

```
├── AGENTS.md               # 常驻基座（agent 自动加载，≤800 词；子树件 engine/ adapters/ scripts/ docs/ .agents/notes/ 各 ≤300 词）
├── .agents/                # AI 协作层：技能 noo-* / 流程卡 / ADR
├── docs/
│   ├── method/             # 方法论正文（被演化的内容域）
│   ├── cookbook.md         # 踩坑单一事实源（原子条目）
│   └── research/           # 设计文档（蜂群框架设计 / 共享层设计 / JIT-Agent 研究）+ 参考引擎调研解剖
├── scripts/                # verify-* 机器门禁（Python 存量族随 B1 迁 TS；新门禁为零依赖 .mts，node ≥22.18 原生直跑）+ gates.py 门禁清单单源发射器
├── engine/                 # 演化发动机（Node 零依赖五命令 + gates.json 白名单；pull = 基因库只读消费；B2 起源码 TS——js 源并存期权威至 B5，npm 包 = tsc dist）
├── adapters/dsh/           # DSH 适配层（插件壳接线：system-prompt 节 / noo_* 工具 / solidify 人工确认 / geneBankUrl 惰性 pull / 技能随库分发；B2 起源码 TS，npm 包 = tsc dist）
├── genes/                  # 基因库（<domain>/<id>.json，经 solidify 入档；本仓即库）
├── manifest.json           # 基因库检索索引（gen-manifest 生成，verify-manifest 门禁）
├── events/                 # 演化事件月卷（JSONL 审计面，入 git）
├── templates/              # ADR / AGENTS 分层模板
├── HANDOFF.md + HANDOFF-todos.md   # 交接家庭
└── journal/                # 会话叙事月卷（过程即资产，入 git）
```

## 门禁

可执行门禁清单**单源**于 `engine/gates.json`：`python3 scripts/gates.py --list` 发射、`--run` 运行，hooks/CI 消费同一清单；结构性例外四件（review-tier / review-brief / change-scope / gene-format）非平跑，机制见 gates.py 头注。

hooks 只做快检查（`bash scripts/setup-hooks.sh` 接线），CI 拥有穷尽矩阵（`.github/workflows/validate.yml`）。

## 文档与出处

- 主设计（蜂群框架，路线图 P0–P4 与未决问题）：[docs/research/dsh-swarm-evolution-framework-design.md](docs/research/dsh-swarm-evolution-framework-design.md)
- 方法论正文：[docs/method/ai-collaboration-method.md](docs/method/ai-collaboration-method.md)
- 踩坑判别：[docs/cookbook.md](docs/cookbook.md)

血统：方法论与门禁蒸馏自 `dotnet-deepseek-harness-desktop`、`dsh-frecency`、`devops-template`（MIT），上游 `deepseek-ai/deepseek-harness`（MIT）；**提炼后搬迁，非逐字节搬运**，每件资产头部带 provenance 行。

## 参与贡献

评审走 [docs/method/review.md](docs/method/review.md) 三重审核契约；agent 遵循 [AGENTS.md](AGENTS.md)。

## License

**AGPL-3.0**（见 [LICENSE](LICENSE)，整仓统一）。商用不被排除；被排除的是不履行源码提供义务的分发与网络服务形态（含 SaaS）。上游 MIT 资产的版权与许可文本见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)，逐件血统标注由各资产 provenance 行承担。独立项目——与 DeepSeek 无关联。
