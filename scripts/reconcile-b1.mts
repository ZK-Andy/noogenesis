#!/usr/bin/env node
/**
 * reconcile-b1.mts — B1 门禁族 TS 化的双跑对账驱动（临时代件，不入门禁）。
 *
 * B1 ADR 2026-09-08-collab-rebuild-b1-gates-ts：py 与 TS 逐件双跑，比对
 * stdout / stderr / 退出码；stderr 程序名差异（*.py → *.mts）先归一再比。
 * 对账面：
 * - verify-*：仓库实跑 + --self-test（py 有夹具者）；
 * - verify-md-links / verify-doc-budgets：py 无夹具（B1 补齐缺口在 TS 侧），
 *   只对账实跑，--self-test 为 TS 单侧自证；
 * - gen-manifest：stdout 对账 + 产物与仓库现文件字节一致（运行后 git 零漂移）；
 * - gates runner：--list 全等（逐行）+ --run 行集合（排序后比对——父行发射
 *   时序属语言缓冲行为，不入对账面，见 ADR 点 3）+ --self-test 单侧自证。
 *
 * 本件不挂 gates.json；B5 切换批随 py/sh 旧件一并删除。
 * 用法（仓库根运行）：node scripts/reconcile-b1.mts [--only name,name...]
 * 退出码：0 全对账通过 / 1 有差异 / 2 运行面失败。
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

interface Case {
  name: string;
  pyArgs: string[][];
  tsArgs?: string[][];        // 缺省 = 与 pyArgs 相同
  compare: "exact" | "lineSet";
  tsOnlyArgs?: string[][];    // 仅 TS 侧自证（必须 0 退出）
}

const CASES: Case[] = [
  { name: "verify-adr-format", pyArgs: [[], ["--self-test"]], compare: "exact" },
  { name: "verify-doc-budgets", pyArgs: [["--manifest", "scripts/doc-budgets.manifest.json"]], tsOnlyArgs: [["--self-test"]], compare: "exact" },
  { name: "verify-md-links", pyArgs: [[]], tsOnlyArgs: [["--self-test"]], compare: "exact" },
  { name: "verify-cookbook", pyArgs: [[], ["--self-test"]], compare: "exact" },
  { name: "verify-skill-format", pyArgs: [[], ["--self-test"]], compare: "exact" },
  { name: "verify-handoff-structure", pyArgs: [[], ["--self-test"]], compare: "exact" },
  { name: "verify-manifest", pyArgs: [[], ["--self-test"]], compare: "exact" },
  { name: "verify-review-tier", pyArgs: [["--self-test"], ["--since", "2d725ee", "--enforce"]], compare: "exact" },
  { name: "verify-review-brief", pyArgs: [["--lanes", "R1,R2,R3"], ["--self-test"]], compare: "exact" },
  { name: "verify-gene-format", pyArgs: [[], ["--self-test"]], compare: "exact" },
  { name: "gen-manifest", pyArgs: [[]], compare: "exact" },
  { name: "gates", pyArgs: [["--list"], ["--run", "--skip", "review-tier,review-brief,change-scope"]], tsArgs: [["--list"], ["--jobs", "1", "--run", "--skip", "review-tier,review-brief,change-scope"]], tsOnlyArgs: [["--self-test"]], compare: "lineSet" },
];

const normalize = (s: string): string => s.replace(/([a-z][a-z0-9-]*)\.py\b/g, "$1.mts");

function runOne(cmd: string, args: string[], cwd: string): { code: number; stdout: string; stderr: string } {
  const res = spawnSync(cmd, args, { cwd, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
  return {
    code: res.status ?? -1,
    stdout: normalize(res.stdout ?? ""),
    stderr: normalize(res.stderr ?? ""),
  };
}

function compareStreams(a: { code: number; stdout: string; stderr: string }, b: typeof a, mode: "exact" | "lineSet"): string[] {
  const diffs: string[] = [];
  if (a.code !== b.code) diffs.push(`exit ${a.code} != ${b.code}`);
  const cmp = (sa: string, sb: string, what: string): void => {
    const na = mode === "exact" ? sa : sa.split("\n").filter(Boolean).sort().join("\n");
    const nb = mode === "exact" ? sb : sb.split("\n").filter(Boolean).sort().join("\n");
    if (na !== nb) {
      diffs.push(`${what} diff（${mode}）:\n${unifiedSuffix(na, nb)}`);
    }
  };
  cmp(a.stdout, b.stdout, "stdout");
  cmp(a.stderr, b.stderr, "stderr");
  return diffs;
}

/** 简易差异定位：找首个分叉行并给出上下文，避免整段大文本刷屏。 */
function unifiedSuffix(a: string, b: string): string {
  const la = a.split("\n");
  const lb = b.split("\n");
  const n = Math.min(la.length, lb.length);
  let i = 0;
  while (i < n && la[i] === lb[i]) i += 1;
  const ctx = (arr: string[]): string => arr.slice(Math.max(0, i - 1), i + 3).join("\n    ");
  return `  首个分叉行 #${i + 1}\n  py侧: ${ctx(la)}\n  ts侧: ${ctx(lb)}`;
}

function main(): number {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const only = new Set(
    (process.argv[process.argv.indexOf("--only") + 1] ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  );
  let failed = 0;
  let ran = 0;
  for (const c of CASES) {
    if (only.size > 0 && !only.has(c.name)) continue;
    ran += 1;
    const pyCmd = ["python3", `scripts/${c.name}.py`];
    const tsCmd = [process.execPath, `scripts/${c.name}.mts`];
    const pyArgSets = c.pyArgs;
    const tsArgSets = c.tsArgs ?? c.pyArgs;
    const problems: string[] = [];
    for (let i = 0; i < pyArgSets.length; i++) {
      const pyArgs = pyArgSets[i]!;
      const tsArgs = tsArgSets[i] ?? pyArgs;
      const py = runOne(pyCmd[0]!, [...pyCmd.slice(1), ...pyArgs], repoRoot);
      const ts = runOne(tsCmd[0]!, [...tsCmd.slice(1), ...tsArgs], repoRoot);
      const diffs = compareStreams(py, ts, c.compare);
      if (diffs.length > 0) {
        problems.push(`  [args=${JSON.stringify(pyArgs)}]\n${diffs.map((d) => `  ${d}`).join("\n")}`);
      }
    }
    for (const tsArgs of c.tsOnlyArgs ?? []) {
      const ts = runOne(tsCmd[0]!, [...tsCmd.slice(1), ...tsArgs], repoRoot);
      if (ts.code !== 0) {
        problems.push(`  [tsOnly args=${JSON.stringify(tsArgs)}] exit ${ts.code}（应 0）\n  stdout: ${ts.stdout.trim().split("\n").slice(-3).join("\n  ")}\n  stderr: ${ts.stderr.trim().split("\n").slice(-3).join("\n  ")}`);
      }
    }
    if (problems.length > 0) {
      failed += 1;
      console.log(`DIFF ${c.name}:\n${problems.join("\n")}`);
    } else {
      console.log(`OK   ${c.name}（${pyArgSets.length} 组对账${(c.tsOnlyArgs ?? []).length > 0 ? ` + ${(c.tsOnlyArgs ?? []).length} 组 ts 单侧自证` : ""}）`);
    }
  }
  // gen-manifest 产物字节面：两次运行后 manifest.json 必须与 HEAD 零漂移
  if (only.size === 0 || only.has("gen-manifest")) {
    const git = spawnSync("git", ["status", "--porcelain", "manifest.json"], { cwd: repoRoot, encoding: "utf-8" });
    if ((git.stdout ?? "").trim() !== "") {
      failed += 1;
      console.log("DIFF gen-manifest 产物：manifest.json 相对 HEAD 漂移");
    } else {
      console.log("OK   gen-manifest 产物字节面（manifest.json 与 HEAD 零漂移）");
    }
  }
  console.log(`reconcile-b1: ${ran} 件，${failed} 件有差异`);
  return failed === 0 ? 0 : 1;
}

process.exit(main());
