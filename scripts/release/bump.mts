#!/usr/bin/env node
/**
 * bump.mts — 发布版本 bump（单仓适配；ADR
 * .agents/notes/proposed/process/2026-09-09-release-shape-alignment.md）。
 *
 * 对齐上游 deepseek-ai/deepseek-harness `scripts/release/bump.ts` 语义：
 * - 版本单一来源 = 本仓 package.json；bump 后同步 package-lock.json（npm
 *   install --package-lock-only），保证「version 与 lock 同一提交」（cookbook
 *   [环境] 版本 bump 漏连动 lock 教训）。
 * - 只 commit，不建 tag、不发布——tag 与 GitHub Release 人建（上游哲学：
 *   CI/harness 永不写仓；审计边界在人工）。
 * - 发布形态 = git tag `dsh-vX.Y.Z` + GitHub Release 正文由
 *   scripts/release/release-note.mts 生成（双语 + @作者）。
 *
 * 用法（仓库根运行）：
 *   node scripts/release/bump.mts <new-version> --msg <主题>
 *   # 例：node scripts/release/bump.mts 0.2.4 --msg "A4 真机复验收口"
 * 产出：
 *   - package.json version 更新为 <new-version>
 *   - package-lock.json 同步
 *   - `chore(release): noogenesis-dsh <new-version>——<主题>` commit
 * 前置：工作树干净、在 main 分支；不满足则 fail-closed（exit 1）。
 * 零运行时依赖（node ≥22.18 原生直跑）。
 *
 * Provenance: original to Noogenesis（2026-09-09 release-shape-alignment）。
 */
import * as childProcess from "node:child_process";
import * as fs from "node:fs";

const PKG = "package.json";
const LOCK = "package-lock.json";
const VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/** 运行 git 命令，非零退出即抛（fail-closed）。 */
function git(...args: string[]): string {
  const out = childProcess.spawnSync("git", args, { encoding: "utf8" });
  if (out.status !== 0) {
    const err = out.stderr.trim();
    throw new Error(`git ${args[0]} failed: ${err || `exit ${out.status}`}`);
  }
  return out.stdout.trim();
}

/** 同步 package-lock.json（版本 bump 后 lock 根 version 随之更新）。 */
function syncLock(): void {
  const out = childProcess.spawnSync(
    "npm",
    ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"],
    { encoding: "utf8" },
  );
  if (out.status !== 0) {
    const err = out.stderr.trim();
    throw new Error(`npm install --package-lock-only failed: ${err || `exit ${out.status}`}`);
  }
}

/** 校验新版本号合法。 */
function checkVersion(version: string): void {
  if (!VERSION_RE.test(version)) {
    throw new Error(`invalid version '${version}' (expected semver like 0.2.4 or 0.3.0-rc.1)`);
  }
}

/** 前置检查：工作树干净 + main 分支（fail-closed）。 */
function checkPrereqs(): void {
  const status = git("status", "--porcelain");
  if (status !== "") {
    throw new Error("working tree not clean — commit or stash before releasing");
  }
  const branch = git("rev-parse", "--abbrev-ref", "HEAD");
  if (branch !== "main") {
    throw new Error(`release must run on main (on ${branch})`);
  }
}

/**
 * 执行 bump：更新 package.json + lock + 生成 chore(release) commit。
 * @param version - 新版本（semver）。
 * @param msg - 主题（进入 commit 标题，作 release-note 的分类参考）。
 */
export function bump(version: string, msg: string): void {
  checkVersion(version);
  checkPrereqs();

  const pkg = fs.readFileSync(PKG, "utf8");
  const parsed = JSON.parse(pkg) as { version?: unknown };
  const current = typeof parsed.version === "string" ? parsed.version : "";
  if (current === "") throw new Error(`cannot read version from ${PKG}`);

  // 版本推进校验：新版本应高于当前（防止误降）。
  const major = (v: string): number => Number(v.split(".")[0] ?? "0");
  const minor = (v: string): number => Number(v.split(".")[1] ?? "0");
  const patch = (v: string): number => Number(v.split(".")[2] ?? "0");
  const cur = major(current) * 1e6 + minor(current) * 1e3 + patch(current);
  const next = major(version) * 1e6 + minor(version) * 1e3 + patch(version);
  if (next <= cur) {
    throw new Error(`version ${version} must be higher than current ${current}`);
  }

  // 写 package.json（JSON 保持 2 空格缩进 + 尾换行）。
  const updated = JSON.stringify({ ...parsed, version }, null, 2) + "\n";
  fs.writeFileSync(PKG, updated);
  syncLock();

  git("add", PKG, LOCK);
  const subject = `chore(release): noogenesis-dsh ${version}——${msg}`;
  git("commit", "-m", subject);
  console.log(`bumped ${current} → ${version}; commit created`);
  console.log(`next: tag as dsh-v${version}, then run:`);
  console.log(`  node scripts/release/release-note.mts ${tagGuess()} ${version} > RELEASE_BODY.md`);
}

/** 上一版 tag 猜测（用于提示；取最近 dsh-v* 或 v* tag）。 */
function tagGuess(): string {
  const tags = git("tag", "--sort=-creatordate", "--list", "dsh-v*", "v*")
    .split("\n")
    .filter((t) => /^(dsh-)?v\d/.test(t));
  return tags[0] ?? "";
}

/** CLI 入口：node scripts/release/bump.mts <new-version> --msg <主题> */
function main(): void {
  const args = process.argv.slice(2);
  const msgIdx = args.indexOf("--msg");
  if (msgIdx < 1) {
    console.error("usage: node scripts/release/bump.mts <new-version> --msg <主题>");
    process.exit(1);
  }
  const version = args[0]!;
  const msg = args[msgIdx + 1];
  if (msg === undefined || msg === "") {
    console.error("usage: node scripts/release/bump.mts <new-version> --msg <主题>");
    process.exit(1);
  }
  try {
    bump(version, msg);
  } catch (cause) {
    console.error(`bump failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("bump.mts")) {
  main();
}