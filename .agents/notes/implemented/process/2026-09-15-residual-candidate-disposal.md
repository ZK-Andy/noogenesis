# Agent Note: 残余演化轮候选处置——踩坑入账、纪律落卡、已覆盖销账

Status: implemented
Review: FULL/2026-09-15/pending（三重审核进行中，收口时回填真实结论）

> Related：出处 = [演化轮池](../../../../HANDOFF-evolution-pool.md) 残余候选（git 路径 trim / 跨 bash 调用 `/tmp` / 判据夹具抽检 / `git add` 残留 / `git add -A` 卷他改）；规则家 = [docs/cookbook.md](../../../../docs/cookbook.md)、[scripts/AGENTS.md](../../AGENTS.md)；同批实现件 = [add 命令参数面收紧](../bug-fix/2026-09-15-add-command-arg-contract.md)。

## Problem

池件残余 5 条各有具名实例，但都不该立闸：git 路径 trim 与跨 bash 调用 `/tmp` 是踩坑原子（家 = cookbook）；「判据分支是否都有夹具」是作者纪律（家 = scripts/AGENTS）；`git add` 残留与 `git add -A` 卷他改的教训已在 cookbook；「提交前出现非己方路径」机械判定无法区分合法协同与误卷。

## Decision

**1. 踩坑入 cookbook。** 新增 [门禁] 条「git 路径输出不能 trim」（路径是字节串不是文本，按行原样取用）；[门禁] 变异副本条补「跨 bash 调用不共享 `/tmp`；恢复面用仓内 `.cache/`、同一调用内完成或 git（提交后再变异 / `git checkout -- <path>`）」。

**2. 纪律落卡。** [scripts/AGENTS.md](../../AGENTS.md) 的 `--self-test` 夹具纪律补「新增判据分支须过『删该分支』变异，仍绿即无夹具」——语义面唯一的机器面是作者按纪律做，不立闸。

**3. 已覆盖销账。** `git add` 残留（代码修复已落 + cookbook 条 15 已写 `git reset` 清半应用索引）与 `git add -A` 卷他改（cookbook [协作] 条已给显式点名路径 + `reset --soft` 退回）无新动作；「提交前出现非己方路径」判不立，不立闸。

**4. 预算。** [scripts/AGENTS.md](../../AGENTS.md) 保持 300；cookbook 2700→2720（压缩 [环境] lefthook 条的机制细节为 B3 ADR 指针腾位后，评审 R1-S3 要求补回 git 恢复面，按文档纪律以 `_justify_bump` 提额）。

## Alternatives considered

- **给「路径不能 trim」加静态门禁**：落败——判的是「代码把路径当文本处理」，静态识别等价于猜语义；真实防线是评审 + 这条踩坑原子。
- **「判据夹具抽检」上闸（自动逐分支变异）**：落败——需 AST 级逐分支改写，成本与稳定性未实测；落卡 + 当批实做一次变异为证（见 [同批实现件](../bug-fix/2026-09-15-add-command-arg-contract.md) Decision 4）。门槛单源 = [findings 机械化 ADR](2026-09-11-review-finding-mechanization.md) Decision 1。
- **跨调用 `/tmp` 单独立条**：落败——与既有变异副本条同根（临时面落点），并条更紧。
- **cookbook 提额 2700→2800**：落败——既有最大条（lefthook 154 词）的可压缩叙事足够腾位；先精简后提额是文档纪律的既定序。

## Consequences

- **采用面**：[docs/cookbook.md](../../../../docs/cookbook.md)（新增一条 + 一条扩充 + 一条压缩）、[scripts/AGENTS.md](../../AGENTS.md)（夹具纪律补句）。
- **行为变化面**：无机器面；cookbook 条目 49→50。
- **未覆盖**：[演化] 原语三件拷贝候选不在本批（触发 = 第 4 原语前）。
- **评审收口**：（待回填）
