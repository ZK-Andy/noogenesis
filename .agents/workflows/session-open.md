# 会话开场检查单（session-open）

> Provenance：蒸馏自 dotnet-deepseek-harness-desktop（MIT，2026-09-05）；差异：.NET 基线 → 本仓门禁基线；journal 路径随 journal-in-git 调整。
>
> 每次会话恢复/开始时顺序执行；全部完成后向用户复述关键状态并等待命令。

1. **读 HANDOFF 家庭**——读 `HANDOFF.md`「状态区」（背景/位置/当前状态/待办/开始步骤）+「交接更新记录」摘要滚动窗；**待办明细读 `HANDOFF-todos.md`**（`[ ]` 条为行动清单、`[x]` 为一行指针）；近期过程细节按需读 `journal/` 对应**月卷**（如 `2026-09.md`）。踩坑判别要点见 `docs/cookbook.md`（HANDOFF 不承载踩坑）。
2. **git 对账**：`git log --oneline -8 && git status`
   - HEAD 若比 HANDOFF 最新记录**多出提交**：逐条查明内容再继续（教训：未记录的提交曾导致决策误读）。
3. **门禁基线**：质量门十件全绿（九个 `verify-*.py` + `change-scope.sh`，清单见根 AGENTS「质量门」；`--self-test` 抽查一项）。
4. **声明会话模式**：按 [session-modes.md](session-modes.md) 与用户确认本轮类型与边界。
5. **（可选）喂信号**：动手前用 `noo_select` 喂当前任务关键词（如 `noo_select(["git 对账"])`）命中本仓基因——人判断"像不像踩过那个坑的场景"，引擎只做匹配（骨架 ADR D2 口径；信号词表见 `genes/` 各基因 `signals` 字段）。
6. 向用户复述：关键状态、当前待办、相关踩坑判别（见 `docs/cookbook.md`）；然后等待命令。
