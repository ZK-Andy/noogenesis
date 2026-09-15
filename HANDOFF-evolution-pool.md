# HANDOFF-evolution-pool — 演化轮池（候选归集区）

> 本件 = 演化轮候选的**归集面**（HANDOFF 家庭行动区的第二件）；规则与步序单源 = [feature-flow](.agents/workflows/feature-flow.md) §4.6（攒账三类 / 开轮触发 / 成批处理 / 销账）；「候选」节语义恒 = 未处理项（销账 = 处理完即删，口径单源 = [销账 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-candidate-disposal.md)）。
> 归集面决策 = [池件 ADR](.agents/notes/implemented/process/2026-09-12-evolution-pool-file.md)；立闸门槛单源 = [发现机械化 ADR](.agents/notes/implemented/process/2026-09-11-review-finding-mechanization.md) Decision 1；准则条文 = [主设计 §6](docs/research/dsh-swarm-evolution-framework-design.md)。

## 候选

- **[纪律] 判据声明的观察面未取证**（症状 = 一条 B 类真机复验判据写「宿主日志里每会话恰一行 `noogenesis token baseline reading: …`」，而该通道从不承载插件日志——0.2.7 装机首跑实测零观察面，判据挂空一轮发版；根因 = 写判据时假设「宿主日志」在场，未给可复跑读取入口也未实测一次；出处 = 2026-09-16 插件日志落盘批，同族前例 = 「零覆盖报绿」两类）。可机械判方向 = 「判据/交接条目声明观察面时须同条带读取入口（路径 + 命令）」的发射前检查。第二形态（2026-09-16 复验发现）= 判据带了在该机制下不可达的半条（读数行每会话至多一次，却要求「随会话增长」）→ 方向加「且每条可观测要求须给出该机制下可达的观测方式」。

- **[纪律] ADR「现值」段的同步面靠人工枚举**（症状 = 前批升代 ADR 的现值段「peer 区间不覆盖实跑代」在第二次升代批里被 `package.json` 证伪，本批只同步了 B4 / 情境注入两处、漏掉该件，由 R1 判 Blocker 抓出；根因 = 现值段把「决策时外部观测值」升格为当下状态声明，`notes/README` 的「外部观测值免同步」豁免对它不适用，而同步面零清单；出处 = 2026-09-16 二次升代批）。可机械判方向 = 现值段须同段给出「受影响件清单 / 同步触发」，或立一条比对面（现值段的版本串 ↔ `package.json` 与代码现值）的发射前检查。

## 待定（已记录的需求，待后续拍板）

（空——原「池件自身的机器面」一条经 2026-09-15 拍板关闭，结论家 = [裁决 ADR](.agents/notes/implemented/process/2026-09-15-evolution-pool-machine-face-verdict.md)；重议触发见该件 Decision 2。）
