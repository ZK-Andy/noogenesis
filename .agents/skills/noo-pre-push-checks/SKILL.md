---
name: noo-pre-push-checks
description: Use before pushing, force-pushing, marking ready for review, or claiming checks pass in this repo to select the smallest checks that cover the outgoing diff without reflexively running the full repository suite. Aligns with root AGENTS.md Git discipline (hooks fast / CI exhaustive, --force-with-lease, change-scope).
---

# Push 前检查选择（最小证据）

> Provenance：蒸馏自 dotnet-deepseek-harness-desktop `dsh-pre-push-checks`（MIT，2026-09-05）；.NET 构建面替换为本仓门禁面。
>
> 宿主口径：`noo-*` 技能随胶囊分发——引用的心源仓路径在 self-hosting 仓（Noogenesis）为活路径，在其他宿主为缓存参照实现（`<repoRoot>/.noogenesis/genes-cache/`），照读恒可，照跑先确认路径归谁。
>
> **本技能是引导，不是脚本（guidance, not a script）。** push 前把相关本地证据跑**一次**，然后停。git hooks 故意只做窄快检；CI 拥有穷尽覆盖。

## Sources of truth（只读，不重述）

- [根 AGENTS.md](../../../AGENTS.md)「Git 纪律」— `--force-with-lease`、raw `--force` 禁止、change-scope 标准前置、hooks 快 / CI 全。
- [scripts/change-scope.mts](../../../scripts/change-scope.mts) — 算变更范围。
- 根 AGENTS.md「质量门」— 本仓 `verify-*.mts` 门禁清单。

## 检视 outgoing 变更

1. 确认 checkout 与分支：`git status --short --branch`。
2. 核实 PR base / 父提交，inspect 完整范围：`scripts/change-scope.mts <base> <head>`。**绝不猜测/自行 fetch base**；给出已核实的 ref。base 合并或 retarget 后重跑并重新评估哪些检查被合并范围作废。

## 工作流（Workflow）——选择相关证据

没有超越 hooks 的通用本地基线。每个行为变更需要**能对它的回归失败**的最窄测试或专用检查；更宽的检查只加给 diff 真正触达的表面。

- **文档/ADR/技能/cookbook/HANDOFF 变更**：跑受触达的 `verify-*.mts`（adr-format / doc-budgets / md-links / cookbook / skill-format / handoff-structure）+ `git diff --check`。
- **门禁脚本自身变更**（`scripts/**`、`lefthook.yml`）：跑其自带 `--self-test`（有则）+ 冒烟（对夹具样例实跑）。
- **CI workflow 变更**（`.github/workflows/**`）：必须 dispatch 实跑验证——表达式错误只有真 runner 能暴露，ci.yml 绿不代表该流水线绿。
- **代码/行为变更**：跑所属模块的测试与受影响门禁；仓级覆盖留给 CI，除非变更真的横切。

不因"接着要 commit/push"就手动重复已通过的检查。pending 的 CI 就报告为 pending；归因前先看失败。

## 保护历史改写 push

允许 rebase（独立分支，含评审后）。改写前 fetch 远端分支并记录其确切 OID；用 `--force-with-lease=<branch>:<observed-oid>` 发布，并发更新会中止 push。**raw `--force` 永远禁止**。改写 push 后：重新 fetch live heads，重审未决评审线程/approval/mergeability/checks——改写前的哈希/锚点不是当前证据。

## 失败处理

相关检查失败：停，修或说明 blocker；**不 push 后赌 CI 不同**。疑似环境特异：证明它——记录确切命令、失败测试、平台差异，确认非平台证据；必需检查优先修跨平台非确定性。仅当用户显式要求才绕过本地 hook，并如实报告失败内容与 CI 预期差异。

## Push 程序

1. 选好的相关检查跑一次。
2. 正常 commit；pre-commit 若改了文件先检查再继续。
3. 正常 push（或对授权改写用精确 lease），让 pre-push hook 跑。
4. 核对远端 ref = 本地 HEAD：`git rev-parse HEAD origin/$(git branch --show-current)`。
5. 有 PR 时看远端 CI：`gh pr checks`。

pending 报告为 pending；**绝不因 diff 没真正触达的绿灯就宣称 push 干净**。
