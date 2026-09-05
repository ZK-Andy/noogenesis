#!/usr/bin/env bash
# change-scope.sh — 输出变更范围（评审 / push 前的最小证据前置，替代 deepseek 原仓库的 change-scope）。
#
# 输出三部分：
#   base  /  head  —— 本次范围的两个锚点
#   commits      —— base..head 的提交列表
#   changed      —— 涉及的路径：已提交 diff + 工作区未暂存 diff + 未跟踪文件（dedupe）
#
# 用法：
#   ./scripts/change-scope.sh [<base-ref> [<head-ref>]]   # 显式指定；缺省自动取最近 fork-point
#   ./scripts/change-scope.sh                             # 自动推导 base
#
# Provenance：蒸馏自 dotnet-deepseek-harness-desktop/scripts/change-scope.sh（MIT，2026-09-05）；
# 2026-09-05 修复：三条 path 输出命令加 `-c core.quotePath=off`（非 ASCII 文件名原样输出，
# 修复前八进制转义致人读面不可读且与 engine/util.js changedPaths 口径差；bug-fix ADR
# .agents/notes/implemented/bug-fix/2026-09-05-change-scope-quotepath.md）。
#
# 原则（来自 dsh-pre-push-checks 的最小证据）：绝不臆测 base，能用显式 ref 就用显式 ref；
# 自动推导仅作为便利，结果需人工确认。
set -euo pipefail

BASE=""
HEAD="${2:-HEAD}"
if [[ $# -ge 1 ]]; then
  BASE="$1"
else
  BASE="$(git merge-base --fork-point HEAD 2>/dev/null || true)"
  [[ -z "$BASE" ]] && BASE="$(git rev-list --max-parents=0 HEAD | tail -1 || true)"
  [[ -z "$BASE" ]] && { echo "error: 无法确定 base（仓库还没有历史？）" >&2; exit 1; }
fi

echo "== base:  $BASE  ($(git rev-parse --short "$BASE" 2>/dev/null || echo '?')${2:-})"
echo "== head:  $HEAD  ($(git rev-parse --short "$HEAD" 2>/dev/null || echo '?')${1:+ from arg})"
echo
echo "== commits ($BASE..$HEAD):"
git log --oneline "$BASE..$HEAD" || true
echo
echo "== changed paths:"
# == quotePath=off：非 ASCII 文件名原样，与 engine changedPaths 同口径 ==
{
  git -c core.quotePath=off diff --name-only "$BASE...$HEAD" 2>/dev/null
  git -c core.quotePath=off diff --name-only
  git -c core.quotePath=off ls-files --others --exclude-standard
} | sort -u
