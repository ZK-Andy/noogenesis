# engine/ — 演化发动机

> 全局纪律见根 [AGENTS.md](../AGENTS.md)。合同与协议单源：[engine/README.md](README.md) + 骨架/协议 ADR（README 头部链接）。本件只写动本目录会踩的具体失败。

- **零第三方依赖、零网络、零 LLM**（Node 标准库 only）。`require` 任何第三方包 = 破坏 D1 骨架拍板与适配层防火墙扫描；依赖诉求先立项再议。
- **CLI 十命令（select/propose/evaluate/solidify + P2 pull + 融合轮 observe + 批次 1 序 1 capsule、序 2 mutation、批次 6 序 30 distill + 批次 9 序 44 list）+ self-test 是唯一合同面**：改命令参数、退出码三档语义（0/1/2）、stdout 格式前，先读 README「合同面」节；**改行为必跑 `npm run build` 后 `node dist/engine/bin.js self-test`**（适配层按退出码映射失败模式，语义漂移会静默破坏 `noo_evaluate`）。
- **观测面与事实面分家**：`.noogenesis/events/` 只收写得复算规则的事件；观测（`gene.used` 类）走 `observe` → `.noogenesis/observations/`（gitignored、可丢弃）；写路径 fail-closed、读路径坏行 warn-skip。`select` stdout 的 `advice:` 行是建议档（不排序 / 不禁用 / 无阈值，零观测时整行不发射）——改其格式或语义即改适配层过滤面（[实现 ADR](../.agents/notes/implemented/architecture/2026-09-11-memory-line-phase1-observation-face.md)）。
- **`gates.json` 是白名单单源**：hooks/CI/gene evaluate 消费同一清单；加条目前确认脚本存在且可执行（白名单坏件 → evaluate 全体 fail-closed）。
- **入档原子性**：`.noogenesis/genes/` / `.noogenesis/capsules/` / `.noogenesis/mutations/` 变更与 `.noogenesis/events/` 追加必须在同一 commit；事件 kind 封闭集五件（gene.added / gene.updated / gene.retired / capsule.added / mutation.added），运行不记事件。事件键集 = 必需键 + 按 kind 的允许可选键（跨链 `mutation_id` / `capsule_id` + 引擎写入的环境指纹 `env_fingerprint`）——改键集即改闸件与 [`engine/README.md`](README.md)「Event 面」节（[批次 1 序 3 ADR](../.agents/notes/implemented/architecture/2026-09-13-event-field-extension.md)）。
- **缓存只读**：`pull` 的缓存基因不可评估、不可入档；同名 ref 本仓优先。
- **`.noogenesis/capsules/` 与 `.noogenesis/mutations/` 只属本仓**：两者都是 append-only、无 update/retire 面、同 id 重记即拒，不进 pull 的缓存合并面；唯一入口分别是 `capsule add` / `mutation add`——Capsule 的 `gene_ids` 引用须活在本仓 `.noogenesis/genes/`（缓存副本不算），Mutation 不引用其他原语。两件 `show` 都是读渲染，输出格式改动即改 self-test 的逐字金样。
- 演化产出 = 基因、Capsule 与 Mutation（均 closed schema）；schema 改动先改协议 ADR 再动代码。
