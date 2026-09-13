# Agent Note: 序 30 蒸馏——`distill` 命令面（失败面汇编 + 候选落盘，压缩在宿主侧）

Status: implemented
Review: FULL/2026-09-14/R1=ok R2=ok R3=ok
> 三审明细：R1 0B+3S（readGene 复用两处采纳、walk 合并拒——边际收益）；R2 1B+2S 全采纳（collect 分诊 try/catch 补、ADR 排序措辞对齐、usage 缩进 + 坏 JSON 行断言）；R3 0B+2S 全采纳（todos 括号 + journal 计数笔误）。

Related: 边界单源 [P1 D3 重拍 ADR](2026-09-14-p1-d3-distillation-reshoot.md) Decision 2/3 · 批次表 [行 30](../../proposed/architecture/2026-09-13-feature-completion-backlog.md) · 主设计 [§12-P3 蒸馏 / §6 Solidify](../../../../docs/research/dsh-swarm-evolution-framework-design.md) · gene 协议 [S1](2026-09-05-gene-event-schema.md) · 格式闸 [verify-gene-format](../../../../scripts/verify-gene-format.mts) · 入档面 [solidify.ts](../../../../engine/solidify.ts)

## Problem

批次表序 30（蒸馏：失败 → 基因候选，人工在环）的重拍门已过（[重拍 ADR](2026-09-14-p1-d3-distillation-reshoot.md)）：显式触发、压缩步在宿主侧、产物是候选（不落 `genes/`、不发事件、不参与 select）、入档走既有闸。本件定实现形态：引擎的确定性面做什么、候选落哪、闸怎么覆盖。

## Decision

1. **命令面 = `distill` 三子命令**（与 capsule/mutation 同构的子命令风格）：
   - `distill collect`——**失败面汇编**（只读，确定性 stdout）：汇总三类既有落盘失败面——`events/*.jsonl` 中 `outcome: "fail"` 的行（入档失败带拒因）、`capsules/` 中 `outcome.status = "fail"` 的 Capsule、`genes/` 各基因的 `avoid` 字段（失败面压缩的既有家）。按面分组、组内按落盘序（事件行 = 月卷内时间序、目录面 = 字典序），零写盘、零 spawn；三类面全空时输出空汇总照常 exit 0（空是合法读数，不是错误）。
   - `distill add <candidate.json>`——**候选落盘**：候选以 gene 校验器验形（复用 `engine/gene.ts` 的 `validateGene`，`skipDirAnchor` 姿态），落 `candidates/<domain>/<id>.json`（id = 文件名、domain = 目录，锚点规则同基因）；已存在同名候选 → exit 2 拒覆盖（改稿 = 显式删后重加，fail-closed）；**零事件、零 git commit**——候选是草稿不是档案，append-only 原子提交面是 `genes/` / `capsules/` / `mutations/` 的语义，候选不占。
   - `distill show <domain>/<id>`——读并渲染单条候选（复用 `renderGene`，确定性输出）。
2. **候选 = 基因形，零私有字段**：候选文件就是合法 gene（S1 八字段封闭 schema），与基因的唯一差别 = 落盘位置（`candidates/` 非 `genes/`）——这正是 D3 边界的物理形态：不在 `genes/` 就不进 select 扫描、不进 manifest、不发 `gene.added`。策展改写完成后走既有 `solidify <candidate.json>` 入档，入档路径零新增。`distill collect` 的输出即策展的原料，压缩工作在宿主会话中完成（引擎不产基因内容——重拍 ADR Decision 2）。
3. **闸覆盖 = `verify-gene-format` 增 `candidates/` 节**（既有单脚本扩节，不新增门禁——capsules/mutations 同例）：布局封闭 `candidates/<domain>/<id>.json`、协议面 = 基因校验同判据（镜像 engine 侧）、candidates 内跨域 id 唯一；**无事件复算面**（候选不发事件，无 sha 可复算——与 fail/retired 事件的「只查结构」分型同理）。
4. **观测面不进 collect**：`.noogenesis/observations/` 是 gitignored 可丢弃权重面（融合立宪 D8），不是失败档案；collect 只汇编 git 内的持久失败面（events/capsules/avoid）。范围单源 = 重拍 ADR Decision 2 点名的三类面。

## Alternatives considered

- **引擎产候选草稿（`distill draft <ref>` 从失败记录自动生成基因骨架）**：落败——压缩是归纳工作，重拍 ADR 已钉死在宿主侧；引擎从单条失败记录拼出的「骨架」没有策展价值（avoid 行不是 strategy），只有脚手架成本；collect 的汇编输出已给足原料。
- **候选带 `source` 溯源字段**：落败——候选必须是合法 gene 才能零改动过 `solidify` 的 gene 验形；加私有字段 = 入档前必删的刮擦面；溯源的家 = 策展会话的 journal/ADR（过程即资产），不进协议字段。
- **候选允许覆盖更新（草稿迭代语义）**：落败——静默覆盖丢稿是真实失败；`add` 拒重 + 显式删后重加两步可追溯，成本是一次 rm。
- **candidates/ 独立门禁脚本**：落败——`verify-gene-format` 已是 genes/capsules/mutations/events 四面的单脚本，第五面同性质（封闭布局 + 协议镜像），分脚本只复制骨架（门禁数量克制性惯例）。

## Consequences

- CLI 九命令（+ `distill` 子命令面）：`bin.ts` usage、engine README 合同面块、`engine/AGENTS.md` 与 README.zh 的计数句、`code-standards.md` 实例句同步；`verify-command-surface` 机器面核一致。
- `candidates/` 不进 git ignore（候选是策展过程资产，入 git）；空目录不存在即 collect 面照常为空。
- self-test 增 distill 夹具（collect 三面汇编 + add 合规/重名/违约基因形 + show）。
- 入档链路（`solidify`）与事件轨零改动；select/propose/manifest 扫描根零改动（`candidates/` 天然不在 `genes/` 扫描根）。
