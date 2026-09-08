#!/usr/bin/env node
/**
 * verify-lint — oxlint 白名单闸（C2；ADR 2026-09-08-c2-lint-enforcement）。
 *
 * 判据单源 = 仓库根 `.oxlintrc.json`（显式白名单，逐条规则写明理由）。本件只做
 * 三件事：定位二进制与配置（缺任一 fail-closed）、固定调用形态（--config +
 * --deny-warnings）、用夹具把「配置腐烂」挡在自测里——与 ts-typecheck 的差别在于
 * tsc 的判据是第三方语义，而 lint 的判据是本仓配置数据。
 *
 * 用法（仓库根运行，同其余 verify-*）：node scripts/verify-lint.mts [--self-test] [-- <oxlint 参数>]
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

function realRun(repoRoot: string, extra: string[]): number {
  const invocation = resolveInvocation(repoRoot);
  if (invocation === null) {
    console.error(`${PROGRAM}: FAIL-CLOSED — 缺 ${OXLINT_BIN_REL} 或 ${CONFIG_REL}（先 npm ci）`);
    return 2;
  }
  return runOxlint(invocation, extra.length > 0 ? extra : ["."], repoRoot, true);
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
    fs.writeFileSync(clean, "export function ok(): number { return 1; }\n");
    // no-var：白名单首条可判失败类——配置若被整体关掉，此夹具即失去红灯。
    fs.writeFileSync(bad, "export function bad(): number { var x = 1; return x; }\n");
    if (runOxlint(invocation, [clean], dir, false) !== 0) failures.push("合规样例（干净文件）被误判 FAIL");
    if (runOxlint(invocation, [bad], dir, false) === 0) failures.push("违约样例（no-var 违规）未被拒");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  if (failures.length > 0) {
    for (const f of failures) console.log(`SELF-TEST FAIL: ${f}`);
    return 1;
  }
  console.log(`${PROGRAM} self-test: 2 fixture groups passed`);
  return 0;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
if (argv[0] === "--self-test") {
  process.exit(selfTest(repoRoot));
}
const sep = argv.indexOf("--");
process.exit(realRun(repoRoot, sep === -1 ? [] : argv.slice(sep + 1)));
