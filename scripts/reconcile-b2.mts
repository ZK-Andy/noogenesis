#!/usr/bin/env node
/**
 * reconcile-b2.mts — B2 引擎+适配层 TS 化的双跑对账驱动（临时代件，不入门禁）。
 *
 * B2 ADR 2026-09-08-b2-engine-adapter-ts §Proposal 点 6：js 源（并存期权威）
 * vs dist 产物（tsc 构建）逐件双跑，比对 stdout / stderr / 退出码；路径差异
 * （dist/engine/ → engine/、dist/adapters/ → adapters/）先归一再比——TS 件的
 * engine-bridge/solidify 提示串有意指 dist（B5 后幸存形态），归一后必须全等。
 * 对账面：
 * - engine 五命令的只读子集：self-test（离线夹具全集）/ select / propose，
 *   另加两条 fail-closed 用法错误路径（exit 2 stderr 面）；
 * - solidify / pull 不入对账：写面与网络面，行为由 self-test 沙箱夹具覆盖；
 * - adapter self-test：js 版（spawn js engine）vs dist 版（spawn dist engine），
 *   双跑连带覆盖桥接面的两条链。
 *
 * 本件不挂 gates.json；B5 切换批随 py/sh/旧 js 一并删除。
 * 前置：npm run build（dist 需在场）。
 * 用法（仓库根运行）：node scripts/reconcile-b2.mts [--only name,name...]
 * 退出码：0 全对账通过 / 1 有差异 / 2 运行面失败。
 */

import { spawnSync } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

interface Case {
  name: string;
  /** js 权威面参数组（多组 = 多次双跑） */
  jsArgs: string[][];
}

const CASES: Case[] = [
  { name: "engine-self-test", jsArgs: [["self-test"]] },
  { name: "engine-select", jsArgs: [["select", "git 对账"], ["select"]] },
  { name: "engine-propose", jsArgs: [["propose", "doc/doc-single-home"], ["propose"]] },
  { name: "adapter-self-test", jsArgs: [] }, // 特例：整件自测双跑，参数面为空
];

/** dist 路径归一：TS 件的有意 dist 指向不计入对账面；self-test 夹具的随机 mkdtemp 路径同理 */
const normalize = (s: string): string =>
  s
    .replace(/dist\/engine\//g, "engine/")
    .replace(/dist\/adapters\//g, "adapters/")
    .replace(/\/tmp\/noo-engine-selftest-[^/\s"']+/g, "<tmpdir>");

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

function runOne(cmd: string, args: string[], cwd: string): RunResult {
  const res = spawnSync(cmd, args, { cwd, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
  return {
    code: res.status ?? -1,
    stdout: normalize(res.stdout ?? ""),
    stderr: normalize(res.stderr ?? ""),
  };
}

function compareStreams(a: RunResult, b: RunResult, mode: "exact" | "lineSet"): string[] {
  const diffs: string[] = [];
  if (a.code !== b.code) diffs.push(`exit ${a.code} != ${b.code}`);
  const cmp = (sa: string, sb: string, what: string): void => {
    const na = mode === "exact" ? sa : sa.split("\n").filter(Boolean).sort().join("\n");
    const nb = mode === "exact" ? sb : sb.split("\n").filter(Boolean).sort().join("\n");
    if (na !== nb) diffs.push(`${what} diff（${mode}）:\n${unifiedSuffix(na, nb)}`);
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
  return `  首个分叉行 #${i + 1}\n  js侧: ${ctx(la)}\n  ts侧: ${ctx(lb)}`;
}

function main(): number {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const argv = process.argv.slice(2);
  const i = argv.indexOf("--only");
  if (i !== -1 && (argv[i + 1] === undefined || argv[i + 1] === "")) {
    console.error("reconcile-b2: FAIL-CLOSED — --only needs a comma-separated case list");
    return 2;
  }
  const only = i === -1 ? new Set<string>() : new Set((argv[i + 1] ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  const unknown = [...only].filter((n) => !CASES.some((c) => c.name === n));
  if (unknown.length > 0) {
    console.error(`reconcile-b2: FAIL-CLOSED — --only names unknown case: ${unknown.join(", ")}`);
    return 2;
  }

  for (const distDir of ["dist/engine/bin.js", "dist/adapters/dsh/selftest.mjs"]) {
    if (!fs.existsSync(path.join(repoRoot, distDir))) {
      console.error(`reconcile-b2: FAIL-CLOSED — ${distDir} 不在场，先 npm run build`);
      return 2;
    }
  }

  let failed = 0;
  let ran = 0;
  for (const c of CASES) {
    if (only.size > 0 && !only.has(c.name)) continue;
    ran += 1;
    const problems: string[] = [];
    if (c.name === "adapter-self-test") {
      const js = runOne(process.execPath, ["adapters/dsh/selftest.mjs"], repoRoot);
      const ts = runOne(process.execPath, ["dist/adapters/dsh/selftest.mjs"], repoRoot);
      const diffs = compareStreams(js, ts, "exact");
      if (diffs.length > 0) problems.push(diffs.map((d) => `  ${d}`).join("\n"));
    } else {
      for (const args of c.jsArgs) {
        const js = runOne(process.execPath, ["engine/bin.js", ...args], repoRoot);
        const ts = runOne(process.execPath, ["dist/engine/bin.js", ...args], repoRoot);
        const mode = c.name === "engine-self-test" ? "exact" : "lineSet";
        const diffs = compareStreams(js, ts, mode);
        if (diffs.length > 0) {
          problems.push(`  [args=${JSON.stringify(args)}]\n${diffs.map((d) => `  ${d}`).join("\n")}`);
        }
      }
    }
    if (problems.length > 0) {
      failed += 1;
      console.log(`DIFF ${c.name}:\n${problems.join("\n")}`);
    } else {
      console.log(`OK   ${c.name}`);
    }
  }

  // C9 资产面：对账运行不得触碰 genes/events/gates.json（git 零漂移）
  const git = spawnSync("git", ["status", "--porcelain", "genes/", "events/", "engine/gates.json"], { cwd: repoRoot, encoding: "utf-8" });
  if ((git.stdout ?? "").trim() !== "") {
    failed += 1;
    console.log("DIFF C9 资产面：genes/events/gates.json 相对 HEAD 漂移");
  } else {
    console.log("OK   C9 资产面（genes/events/gates.json 与 HEAD 零漂移）");
  }

  console.log(`reconcile-b2: ${ran} 件，${failed} 件有差异`);
  return failed === 0 ? 0 : 1;
}

process.exit(main());
