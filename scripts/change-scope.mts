#!/usr/bin/env node
/**
 * change-scope.mts — 输出变更范围（评审 / push 前的最小证据前置）。
 *
 * 输出三部分：
 *   base  /  head  —— 本次范围的两个锚点
 *   commits      —— base..head 的提交列表
 *   changed      —— 涉及的路径：已提交 diff + 工作区未暂存 diff + 未跟踪文件（dedupe）
 *
 * 用法（仓库根运行）：
 *   node scripts/change-scope.mts [<base-ref> [<head-ref>]]   # 显式指定；缺省自动取最近 fork-point
 *   node scripts/change-scope.mts                             # 自动推导 base
 *
 * 消费面（gates.json 结构性例外「change-scope 双推导口径」）：
 * - hooks/CI/pre-push 展示面 = 脚本自身缺省推导（fork-point，绝不臆测 base；
 *   能用显式 ref 就用显式 ref，自动推导结果需人工确认）；
 * - gates.json 槽位形态（{{outgoing_base}}/{{head}}）供引擎 evaluate 使用，
 *   base 推导与引擎 changedPaths 同源——两条推导口径的有意分工，见 P1 实现
 *   ADR D4 与 gates.mts 头注（例外机制单家）。
 *
 * stderr 口径（R1 评审对齐）：与 bash 原版一致——bash 以 `2>/dev/null` 显式
 * 压制的调用（rev-parse --short / merge-base / 三点 diff）此处同样丢弃，
 * 其余（rev-list 回退 / log / 未暂存 diff / ls-files）透传；stdout 是对账面，
 * 诊断面不静默。
 * 排序口径：changed paths 用码点序（等价 `LC_ALL=C sort`，确定性）；bash 原版
 * 裸 `sort -u` 随环境 locale 漂移（含 `_` 的文件名两种排序不同）——TS 面钉死
 * 为确定性序，与 engine changedPaths 同序。
 *
 * Provenance：蒸馏自 dotnet-deepseek-harness-desktop/scripts/change-scope.sh（MIT，
 * 2026-09-05），经本仓 bash 件（quotePath=off 修复，ADR
 * .agents/notes/implemented/bug-fix/2026-09-05-change-scope-quotepath.md）行为恒等
 * 端口为 TS（B5 切换批，bash 退役收尾）：输出格式与三条 path 命令
 * （`-c core.quotePath=off`，非 ASCII 文件名原样）逐一保持。
 */

import { spawnSync } from "node:child_process";

/** spawn git；quiet=true 时丢弃 stderr（对应 bash `2>/dev/null`），否则透传。 */
function git(args: string[], quiet = false): { status: number; stdout: string } {
  const r = spawnSync("git", args, { encoding: "utf-8" });
  if (!quiet && r.stderr && r.stderr.length > 0) process.stderr.write(r.stderr);
  return { status: r.status ?? -1, stdout: r.stdout ?? "" };
}

function revParseShort(ref: string): string {
  const r = git(["rev-parse", "--short", ref], true);
  const out = r.stdout.trim();
  return r.status === 0 && out.length > 0 ? out : "?";
}

function main(): number {
  const argv = process.argv.slice(2);
  const baseArg = argv[0];
  const headArg = argv[1];
  const head = headArg ?? "HEAD";

  let base: string;
  if (baseArg !== undefined) {
    base = baseArg;
  } else {
    // 自动推导：fork-point → 根提交；两步都拿不到 = 仓库还没有历史 → exit 1。
    const fp = git(["merge-base", "--fork-point", "HEAD"], true);
    const fpOut = fp.status === 0 ? fp.stdout.trim() : "";
    base =
      fpOut.length > 0
        ? fpOut
        : (git(["rev-list", "--max-parents=0", "HEAD"]).stdout.trim().split("\n").filter(Boolean).pop() ?? "");
    if (base.length === 0) {
      console.error(`error: 无法确定 base（仓库还没有历史？）`);
      return 1;
    }
  }

  console.log(`== base:  ${base}  (${revParseShort(base)}${headArg ?? ""})`);
  console.log(`== head:  ${head}  (${revParseShort(head)}${baseArg ? " from arg" : ""})`);
  console.log("");
  console.log(`== commits (${base}..${head}):`);
  process.stdout.write(git(["log", "--oneline", `${base}..${head}`]).stdout);
  console.log("");
  console.log("== changed paths:");
  // == quotePath=off：非 ASCII 文件名原样，与 engine changedPaths 同口径 ==
  const paths = new Set<string>();
  for (const [quiet, args] of [
    [true, ["-c", "core.quotePath=off", "diff", "--name-only", `${base}...${head}`]],
    [false, ["-c", "core.quotePath=off", "diff", "--name-only"]],
    [false, ["-c", "core.quotePath=off", "ls-files", "--others", "--exclude-standard"]],
  ] as const) {
    const r = git([...args], quiet);
    for (const line of r.stdout.split("\n")) {
      const p = line.trim();
      if (p.length > 0) paths.add(p);
    }
  }
  for (const p of [...paths].sort()) console.log(p);
  return 0;
}

process.exit(main());
