#!/usr/bin/env node
/**
 * verify-lint — oxlint 白名单闸（C2；ADR 2026-09-08-c2-lint-enforcement；
 * 升格批 2026-09-09-lint-block-and-staged-hook 加 `--staged`：pre-commit
 * 只拦本次暂存面，pre-push/CI 仍全仓穷尽）。
 *
 * 判据单源 = 仓库根 `.oxlintrc.json`（显式白名单，逐条规则写明理由）。本件只做
 * 四件事：定位二进制与配置（缺任一 fail-closed）、固定调用形态（--config +
 * --deny-warnings）、用夹具把「配置腐烂」挡在自测里、`--staged` 时把目标收窄为
 * 暂存区的 .ts/.mts（git diff --cached）——与 ts-typecheck 的差别在于 tsc 的判据
 * 是第三方语义，而 lint 的判据是本仓配置数据。
 *
 * 用法（仓库根运行，同其余 verify-*）：node scripts/verify-lint.mts [--staged]
 * [--self-test]
 * 退出码：0 = PASS，1 = 有违规，2 = fail-closed（oxlint 或配置缺失）。
 * 运行前提：node ≥22.18 + devDependency oxlint（精确钉版，见 package.json）。
 * 模块形态：显式 .mts（ESM）——本仓 package.json type=commonjs，裸 .ts 装不下 import。
 */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const PROGRAM = "verify-lint.mts";
const OXLINT_BIN_REL = path.join("node_modules", "oxlint", "bin", "oxlint");
const CONFIG_REL = ".oxlintrc.json";

interface Invocation {
  bin: string;
  config: string;
}

/** 定位 oxlint 二进制与配置；缺任一 → null（调用方 fail-closed exit 2）。 */
function resolveInvocation(repoRoot: string): Invocation | null {
  const bin = path.join(repoRoot, OXLINT_BIN_REL);
  const config = path.join(repoRoot, CONFIG_REL);
  if (!fs.existsSync(bin) || !fs.existsSync(config)) return null;
  return { bin, config };
}

/** 固定调用形态：显式 --config + --deny-warnings（warn 档不得静默放行）。 */
function runOxlint(invocation: Invocation, targets: string[], cwd: string, inherit: boolean): number {
  const result = spawnSync(
    process.execPath,
    [invocation.bin, "--config", invocation.config, "--deny-warnings", ...targets],
    { cwd, stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"], encoding: "utf-8" },
  );
  if (result.error !== undefined) {
    console.error(`${PROGRAM}: oxlint 启动失败 — ${result.error.message}`);
    return 2;
  }
  return result.status ?? 2;
}

/** 暂存面目标收集：`git diff --cached --name-only --diff-filter=ACMR` 中 .ts/.mts
 * （pre-commit 只拦本次引入违规；全仓穷尽归 pre-push/CI）。R（rename）目标恒以
 * 目标路径出现在 name-only（B2 实测：改名带违规须拦）；无匹配 → 空数组。
 * git 启动失败或非零退出（非 git 仓 exit 129 等）→ null（fail-closed exit 2）。 */
function stagedTargets(repoRoot: string): string[] | null {
  const git = spawnSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], { cwd: repoRoot, encoding: "utf-8" });
  if (git.error !== undefined || git.status !== 0) {
    console.error(`${PROGRAM}: git diff --cached 失败（exit ${git.status ?? "spawn"}: ${git.error?.message ?? ""}）— fail-closed`);
    return null;
  }
  return (git.stdout ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => /\.(ts|mts)$/.test(s));
}

function realRun(repoRoot: string, staged: boolean): number {
  const invocation = resolveInvocation(repoRoot);
  if (invocation === null) {
    console.error(`${PROGRAM}: FAIL-CLOSED — 缺 ${OXLINT_BIN_REL} 或 ${CONFIG_REL}（先 npm ci）`);
    return 2;
  }
  if (!staged) return runOxlint(invocation, ["."], repoRoot, true);
  const targets = stagedTargets(repoRoot);
  // git 失败（fail-closed）
  if (targets === null) return 2;
  // 无暂存 .ts/.mts → 快检零噪音
  if (targets.length === 0) return 0;
  return runOxlint(invocation, targets, repoRoot, true);
}

/** 夹具自测：违规必红、干净必绿、配置与二进制在册。 */
function selfTest(repoRoot: string): number {
  const failures: string[] = [];
  const invocation = resolveInvocation(repoRoot);
  if (invocation === null) {
    console.log(`SELF-TEST FAIL: 缺 ${OXLINT_BIN_REL} 或 ${CONFIG_REL}`);
    return 1;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-lint-"));
  try {
    const clean = path.join(dir, "clean.ts");
    const bad = path.join(dir, "bad.ts");
    const badTs = path.join(dir, "bad-ts.ts");
    fs.writeFileSync(clean, "export function ok(): number { return 1; }\n");
    // no-var：白名单首条可判失败类——配置若被整体关掉，此夹具即失去红灯。
    fs.writeFileSync(bad, "export function bad(): number { var x = 1; return x; }\n");
    // typescript/no-inferrable-types：插件面腐烂（plugins 数组被清空 → 该规则静默消失）时红灯。
    fs.writeFileSync(badTs, "export const n: number = 1;\n");
    if (runOxlint(invocation, [clean], dir, false) !== 0) failures.push("合规样例（干净文件）被误判 FAIL");
    if (runOxlint(invocation, [bad], dir, false) === 0) failures.push("违约样例（no-var 违规）未被拒");
    if (runOxlint(invocation, [badTs], dir, false) === 0) failures.push("违约样例（typescript 插件规则违规）未被拒");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  // --staged 夹具：临时 git 仓——staged 含违规 .ts 必红；staged 干净（仅暂存
  // 干净 .ts）必绿；无 staged .ts/.mts → exit 0；未暂存违规不拦（全仓归
  // pre-push/CI）。git 用户身份用环境钉住，避免夹具受本机配置影响。
  {
    const gdir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-lint-staged-"));
    const env: NodeJS.ProcessEnv = { ...process.env, GIT_AUTHOR_NAME: "selftest", GIT_AUTHOR_EMAIL: "selftest@test", GIT_COMMITTER_NAME: "selftest", GIT_COMMITTER_EMAIL: "selftest@test" };
    try {
      const run = (c: string, wd = gdir): number => spawnSync(c, { cwd: wd, shell: true, stdio: "ignore", env }).status ?? 2;
      if (run("git init -q") !== 0) failures.push("staged: git init 失败");
      fs.copyFileSync(path.join(repoRoot, ".oxlintrc.json"), path.join(gdir, ".oxlintrc.json"));
      fs.symlinkSync(path.join(repoRoot, "node_modules"), path.join(gdir, "node_modules"), "dir");
      const bad = path.join(gdir, "bad.ts");
      const clean = path.join(gdir, "clean.ts");
      const md = path.join(gdir, "notes.md");
      fs.writeFileSync(bad, "export function bad(): number { var x = 1; return x; }\n");
      fs.writeFileSync(clean, "export function ok(): number { return 1; }\n");
      fs.writeFileSync(md, "# n\n");
      if (realRun(gdir, true) !== 0) failures.push("staged: 无 staged 文件 → 应 PASS(exit 0)");
      run("git add bad.ts");
      if (realRun(gdir, true) === 0) failures.push("staged: staged 含违规 bad.ts → 应 FAIL");
      run("git rm --cached -q bad.ts && git add clean.ts");
      if (realRun(gdir, true) !== 0) failures.push("staged: staged 干净 clean.ts → 应 PASS");
      run("git rm --cached -q clean.ts && git add notes.md");
      if (realRun(gdir, true) !== 0) failures.push("staged: staged 仅非 .ts(notes.md) → 应 PASS(零噪音)");
      // 未暂存违规不拦：bad.ts 落盘但不 add → --staged 应绿（全仓穷尽归 pre-push/CI）
      run("git rm --cached -q notes.md");
      fs.writeFileSync(path.join(gdir, "unadded.ts"), "export function u(): number { var y = 1; return y; }\n");
      if (realRun(gdir, true) !== 0) failures.push("staged: 未暂存违规(空暂存) → 应 PASS");
      // rename(R) 档：git mv 改名 + 内容引入违规 → 目标路径须被拦（B2 实测：
      // ACM 的 name-only 为空漏网；ACMR 输出目标路径）。先暂存合规基座 →
      // git mv（内容未变）→ 再改内容引入违规 → add（此时 git 判 R 档）。
      run("git rm --cached -q unadded.ts && git add clean.ts");
      if (realRun(gdir, true) !== 0) failures.push("staged: 基线 clean.ts 暂存 → 应 PASS 前置失败");
      const mvVar = path.join(gdir, "mv-var.ts");
      run("git mv clean.ts mv-var.ts");
      fs.writeFileSync(mvVar, "export function mvV(): number { var z = 9; return z; }\n");
      run("git add -A");
      if (realRun(gdir, true) === 0) failures.push("staged: rename 目标含违规(mv-var.ts) → 应 FAIL");
      // 非 git 仓 → fail-closed exit 2（S2：git.status 非零不再静默 PASS）。
      const nongit = fs.mkdtempSync(path.join(os.tmpdir(), "verify-lint-nongit-"));
      try {
        if (realRun(nongit, true) !== 2) failures.push("staged: 非 git 仓 → 应 fail-closed exit 2");
      } finally {
        fs.rmSync(nongit, { recursive: true, force: true });
      }
    } finally {
      fs.rmSync(gdir, { recursive: true, force: true });
    }
  }

  if (failures.length > 0) {
    for (const f of failures) console.log(`SELF-TEST FAIL: ${f}`);
    return 1;
  }
  console.log(`${PROGRAM} self-test: 3 fixture groups + staged group passed`);
  return 0;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv[2];
if (arg === "--self-test") {
  process.exit(selfTest(repoRoot));
}
if (arg === "--staged") {
  process.exit(realRun(repoRoot, true));
}
if (arg !== undefined) {
  console.error(`${PROGRAM}: unknown argument '${arg}'（仅 --staged / --self-test）`);
  process.exit(2);
}
process.exit(realRun(repoRoot, false));
