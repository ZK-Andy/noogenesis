#!/usr/bin/env bash
# pre-push self-test — e2e 验证评审档位循环四态（tag 修复证据，ADR
# 2026-09-06-pre-push-tag-outgoing）。独立证据脚本：不进 engine/gates.json
# 白名单（它测 hook 本体，非文档门）。需要 git / python3 / node 在 PATH。
# 四态：A 新分支首推拒（fail-closed 保持）；B tag 目标 commit 已达远端过；
#       C tag 携带未推 commit 拒（fail-closed 保持）；D tag 删除跳过。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "== pre-push self-test: 搭建临时远端与克隆 =="
git init --bare -q "$TMP/origin.git"
git clone -q "$ROOT" "$TMP/clone"
cd "$TMP/clone"
git config user.name pre-push-selftest
git config user.email selftest@example.invalid
git config core.hooksPath .githooks
git remote set-url origin "$TMP/origin.git"
# 克隆检出的是已提交版 hook；本脚本验证工作树版（含未提交修复）——显式同步。
cp "$ROOT/.githooks/pre-push" .githooks/pre-push

fail() { echo "pre-push-selftest: FAIL — $*" >&2; exit 1; }

# hook 档位段在 tty stdin 下整体跳过（非 push 调用豁免）——本脚本必须非 tty
# 运行（CI / `</dev/null`），否则四态断言失真（R2 评审 2026-09-06）。
if [ -t 0 ]; then
  fail "需要 stdin 非 tty 运行（如 ./scripts/pre-push-selftest.sh </dev/null）"
fi

echo "-> 态 A：新分支首推（无豁免）应被拒"
if git push origin main >/dev/null 2>&1; then
  fail "A: 新分支首推未被 fail-closed 拦截"
fi

echo "-> 态 A'：新分支首推（--no-verify）应通过"
git push -q --no-verify origin main || fail "A': --no-verify 首推失败"

echo "-> 态 B：tag 目标 commit 已达远端应通过（不豁免，走 tag 跳过分支）"
git tag -a vTEST -m "pre-push-selftest"
git push origin vTEST >"$TMP/B.out" 2>"$TMP/B.err" || {
  cat "$TMP/B.out" "$TMP/B.err" >&2
  fail "B: 达远端 tag 被误拦"
}
# 「零 outgoing」是 tag 跳过分支输出里的唯一子串（终端跳过消息不含它），
# 把「通过来自 tag 分支」钉死（R2 评审 2026-09-06）。
grep -qs "零 outgoing" "$TMP/B.out" "$TMP/B.err" || {
  cat "$TMP/B.out" "$TMP/B.err" >&2
  fail "B: 推送成功但未走 tag 跳过分支（行为来源存疑）"
}

echo "-> 态 C：tag 携带未推 commit 应被拒"
echo selftest > unreached-probe.txt
git add unreached-probe.txt
git commit -qm "selftest: unreached probe"
git tag -a vUNREACHED -m "pre-push-selftest"
if git push origin vUNREACHED >/dev/null 2>&1; then
  fail "C: 携带未推 commit 的 tag 未被 fail-closed 拦截"
fi

echo "-> 态 D：tag 删除（local 全零）应跳过且成功"
git push origin :vTEST >/dev/null 2>&1 || fail "D: tag 删除失败"

echo "pre-push-selftest OK（四态全过）"
