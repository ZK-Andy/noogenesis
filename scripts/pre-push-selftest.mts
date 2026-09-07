#!/usr/bin/env node
/**
 * pre-push-selftest.mts — pre-push 钩子 e2e 四态自测（B3 TS 重建，ADR
 * 2026-09-08-b3-hooks-install；bash 原版见 ADR 2026-09-06-pre-push-tag-outgoing）。
 *
 * 独立证据脚本：不进 engine/gates.json 白名单（它测 hook 本体，非文档门）。
 * 需要 git / python3 / node 在 PATH；本仓 npm install 过（lefthook 二进制、
 * typescript 工具链、dist 构建产物）。
 *
 * 四态（tag 修复证据，与 bash 版逐一对应）：
 *   A  新分支首推拒（fail-closed 保持）；
 *   A' 新分支首推 --no-verify 通过；
 *   B  tag 目标 commit 已达远端过（断言输出含「零 outgoing」——钉死走 tag 分支）；
 *   C  tag 携带未推 commit 拒（fail-closed 保持）；
 *   D  tag 删除（local 全零）跳过且成功。
 *
 * 实现要点（与 bash 版差异）：
 * - 钩子经 lefthook：克隆内 cp 根仓 .git/hooks/pre-push wrapper（wrapper 经
 *   `node_modules/lefthook-<平台>/bin/lefthook` 相对寻路，克隆内以 node_modules
 *   symlink 指向根仓解析）。
 * - 工作树版同步：cp 根仓 lefthook.yml + scripts/pre-push.mts（克隆验证工作树
 *   态，含未提交修复——同 bash 版「显式同步」口径）。
 * - dist/ 拷入 + node_modules symlink：pre-push 编排器跑预构建 dist 与
 *   ts-typecheck（tsc 经 typescript 工具链），克隆缺这两样即假红。
 * - 必须 stdin 非 tty 运行（CI / `</dev/null`）：tier 循环在 tty 下整体跳过，
 *   四态断言失真（R2 评审 2026-09-06，bash 版教训同迁）。
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(message: string): never {
  console.error(`pre-push-selftest: FAIL — ${message}`);
  process.exit(1);
}

function git(cwd: string, args: string[], quiet = true): { status: number; output: string } {
  const r = spawnSync("git", args, { cwd, encoding: "utf-8" });
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (!quiet && r.status !== 0) process.stderr.write(output);
  return { status: r.status ?? -1, output };
}

function main(): void {
  if (process.stdin.isTTY) {
    fail("需要 stdin 非 tty 运行（如 node scripts/pre-push-selftest.mts </dev/null）");
  }
  if (!fs.existsSync(path.join(ROOT, "dist", "engine", "bin.js")) ||
      !fs.existsSync(path.join(ROOT, "dist", "adapters", "dsh", "selftest.mjs"))) {
    fail("缺 dist/（钩子跑预构建 dist）——先 npm run build");
  }
  if (!fs.existsSync(path.join(ROOT, "node_modules", "typescript"))) {
    fail("缺 node_modules/typescript（gates 的 ts-typecheck 需要）——先 npm install");
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pre-push-selftest-"));
  try {
    console.log("== pre-push self-test: 搭建临时远端与克隆 ==");
    git(ROOT, ["init", "--bare", "-q", path.join(tmp, "origin.git")], false);
    const clone = path.join(tmp, "clone");
    git(ROOT, ["clone", "-q", ROOT, clone], false);
    git(clone, ["config", "user.name", "pre-push-selftest"], false);
    git(clone, ["config", "user.email", "selftest@example.invalid"], false);
    git(clone, ["remote", "set-url", "origin", path.join(tmp, "origin.git")], false);

    // 钩子与工作树态同步：wrapper（相对寻路 + node_modules symlink 可解析）、
    // lefthook.yml、pre-push 编排器（工作树版，含未提交修复）。
    fs.copyFileSync(path.join(ROOT, ".git", "hooks", "pre-push"), path.join(clone, ".git", "hooks", "pre-push"));
    fs.copyFileSync(path.join(ROOT, "lefthook.yml"), path.join(clone, "lefthook.yml"));
    fs.copyFileSync(path.join(ROOT, "scripts", "pre-push.mts"), path.join(clone, "scripts", "pre-push.mts"));
    fs.cpSync(path.join(ROOT, "dist"), path.join(clone, "dist"), { recursive: true });
    fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(clone, "node_modules"), "dir");

    console.log("-> 态 A：新分支首推（无豁免）应被拒");
    const a = git(clone, ["push", "origin", "main"]);
    if (a.status === 0) fail("A: 新分支首推未被 fail-closed 拦截");

    console.log("-> 态 A'：新分支首推（--no-verify）应通过");
    const a2 = git(clone, ["push", "-q", "--no-verify", "origin", "main"]);
    if (a2.status !== 0) fail("A': --no-verify 首推失败");

    console.log("-> 态 B：tag 目标 commit 已达远端应通过（不豁免，走 tag 跳过分支）");
    git(clone, ["tag", "-a", "vTEST", "-m", "pre-push-selftest"], false);
    const b = git(clone, ["push", "origin", "vTEST"]);
    if (b.status !== 0) fail(`B: 达远端 tag 被误拦\n${b.output}`);
    // 「零 outgoing」是 tag 跳过分支输出里的唯一子串（终端跳过消息不含它），
    // 把「通过来自 tag 分支」钉死（R2 评审 2026-09-06，bash 版教训同迁）。
    if (!b.output.includes("零 outgoing")) {
      fail(`B: 推送成功但未走 tag 跳过分支（行为来源存疑）\n${b.output}`);
    }

    console.log("-> 态 C：tag 携带未推 commit 应被拒");
    fs.writeFileSync(path.join(clone, "unreached-probe.txt"), "selftest\n");
    git(clone, ["add", "unreached-probe.txt"], false);
    git(clone, ["commit", "-qm", "selftest: unreached probe"], false);
    git(clone, ["tag", "-a", "vUNREACHED", "-m", "pre-push-selftest"], false);
    const c = git(clone, ["push", "origin", "vUNREACHED"]);
    if (c.status === 0) fail("C: 携带未推 commit 的 tag 未被 fail-closed 拦截");

    console.log("-> 态 D：tag 删除（local 全零）应跳过且成功");
    const d = git(clone, ["push", "origin", ":vTEST"]);
    if (d.status !== 0) fail(`D: tag 删除失败\n${d.output}`);

    console.log("pre-push-selftest OK（四态全过）");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main();
