#!/usr/bin/env node
/**
 * verify-archived-agent-notes — archived ADR 冻结校验件（蓝图 §2 决策记忆层增量）。
 *
 * 判据（四条，蓝图 §2）：
 * 1. 封闭类树：archived/ 下仅允许 `{class}/yyyy-mm-dd-<kebab>.md`，class 六类封闭集；
 * 2. Status 行（implemented|rejected，允许 ` — <理由>` 尾注，与 verify-adr-format 同语法）
 *    + `Archived: YYYY-MM-DD` 行在位且为合法日历日（≤ today_utc+1，时区容差同
 *    verify-adr-format 的笔记日期判据）；
 * 3. 冻结内容清单（scripts/archived-notes.freeze.json，append-only）：归档件 SHA-256 与清单比对，
 *    改写已归档内容 = FAIL；清单对 HEAD 只允许追加条目；
 * 4. 本件不校验出站链接（链接面归 verify-md-links）。
 * 目录不存在或无归档件时零约束（PASS）。
 *
 * 规则单源：.agents/notes/README.md（archived 冻结节）；立项 ADR 2026-09-08-b0-framework-structure。
 * 用法（仓库根运行）：node scripts/verify-archived-agent-notes.mts [--self-test]
 * 退出码：0 = PASS，1 = FAIL，2 = fail-closed。
 * 模块语法约束：显式 .mts（ESM），不依赖 node 版本间的模块语法探测差异。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { splitLines } from "./pypara.mts";
// class 封闭集单源在 verify-adr-format（其入口分发带守卫，import 安全）；本件只消费。
import { CLASS_SET as CLASSES } from "./verify-adr-format.mts";
const FILE_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const STATUS_RE = /^Status: (implemented|rejected(?: — .+)?)\s*$/;
const ARCHIVED_RE = /^Archived: (\d{4}-\d{2}-\d{2})\s*$/;

interface Violation { entry: string; reason: string }
interface FreezeList { version: number; files: Record<string, string> }

/** 合法日历日且不晚于今日（与 verify-adr-format 命名日期口径一致）。 */
function isValidDate(s: string, allowFuture = false): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return false;
  return allowFuture || d.getTime() <= Date.now();
}

/** 归档日时限：合法日历日且 ≤ today_utc+1（时区容差与 verify-adr-format 的笔记日期同口径——
 *  作者本地可领先 UTC 至多 1 天，CI runner 是 UTC；本地凌晨归档时「Archived: <本地今日>」
 *  不能判成未来）。 */
function isWithinUtcSkewDay(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return false;
  const now = new Date();
  const limit = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + 86400000;
  return d.getTime() <= limit;
}

function sha256(buf: Buffer | string): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** 树结构 + 头部行校验（不含冻结清单面）。返回违规列表与每件相对路径。
 *  未来日期由 isValidDate 默认口径（allowFuture=false）拒绝，此处不再单判。 */
function checkTree(archivedDir: string): { violations: Violation[]; files: string[] } {
  const violations: Violation[] = [];
  const files: string[] = [];
  if (!fs.existsSync(archivedDir)) return { violations, files };
  for (const cls of fs.readdirSync(archivedDir, { withFileTypes: true })) {
    if (cls.isFile()) {
      violations.push({ entry: cls.name, reason: "archived/ 直下不允许文件，必须经 class 子目录（路径即元数据）" });
      continue;
    }
    if (!CLASSES.includes(cls.name)) {
      violations.push({ entry: cls.name, reason: `class 封闭集外目录（合法：${CLASSES.join("/")}）` });
      continue;
    }
    for (const ent of fs.readdirSync(path.join(archivedDir, cls.name), { withFileTypes: true })) {
      if (ent.isDirectory()) {
        violations.push({ entry: `${cls.name}/${ent.name}`, reason: "class 下不允许再嵌套目录" });
        continue;
      }
      const rel = `${cls.name}/${ent.name}`;
      if (!FILE_RE.test(ent.name)) {
        violations.push({ entry: rel, reason: "命名须为 yyyy-mm-dd-<kebab-topic>.md（小写连字符 slug）" });
        continue;
      }
      const date = ent.name.slice(0, 10);
      if (!isValidDate(date, true)) {
        violations.push({ entry: rel, reason: "文件名日期非法（非日历日）" });
        continue;
      }
      const text = fs.readFileSync(path.join(archivedDir, rel), "utf-8");
      const lines = splitLines(text);
      // 与 verify-adr-format 同口径：Status = 标题后第一个非空行；Archived 行紧随其下。
      const statusIdx = lines.slice(1).findIndex((l) => l.trim() !== "");
      const statusLine = statusIdx === -1 ? "" : (lines[statusIdx + 1] ?? "");
      if (!STATUS_RE.test(statusLine)) {
        violations.push({ entry: rel, reason: "标题后须有 `Status: implemented|rejected` 行（归档保留原状态，允许 ` — <理由>` 尾注）" });
        continue;
      }
      const archivedLine = (lines[statusIdx + 2] ?? "").match(ARCHIVED_RE);
      if (!archivedLine || !isWithinUtcSkewDay(archivedLine[1]!)) {
        violations.push({ entry: rel, reason: "Status 下缺 `Archived: YYYY-MM-DD` 行或日期非法" });
        continue;
      }
      files.push(rel);
    }
  }
  return { violations, files };
}

/** 冻结清单 vs 磁盘内容：改写已归档内容 / 清单漂移均 FAIL。 */
function checkFreeze(archivedDir: string, freeze: FreezeList, files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const rel of files) {
    const expect = freeze.files[rel];
    if (expect === undefined) {
      violations.push({ entry: rel, reason: "冻结清单缺条目（归档时须同步把 SHA-256 追加入 scripts/archived-notes.freeze.json）" });
      continue;
    }
    const actual = sha256(fs.readFileSync(path.join(archivedDir, rel)));
    if (actual !== expect) {
      violations.push({ entry: rel, reason: "归档后内容被改写（SHA-256 与冻结清单不符）——archived 永久冻结，勘误走 Erratum 行" });
    }
  }
  for (const rel of Object.keys(freeze.files)) {
    if (!fs.existsSync(path.join(archivedDir, rel))) {
      violations.push({ entry: rel, reason: "冻结清单条目指向不存在的文件（清单漂移）" });
    }
  }
  return violations;
}

/** append-only：对 HEAD 版清单，旧条目必须原值在位（只允许追加）。old 为空（首次提交）→ 通过。 */
function checkAppendOnly(oldFiles: Record<string, string>, newFiles: Record<string, string>): Violation[] {
  const violations: Violation[] = [];
  for (const [rel, hash] of Object.entries(oldFiles)) {
    if (newFiles[rel] !== hash) {
      violations.push({ entry: rel, reason: "冻结清单旧条目被改写或删除（append-only 违约）" });
    }
  }
  return violations;
}

/** 读 HEAD 版清单。仅「HEAD 尚无此文件（首次提交）」返回空集；其余任何失败
 *  （非 git 仓 / 对象损坏 / HEAD 版 JSON 坏）都抛错——由 realRun 转 fail-closed
 *  exit 2，绝不静默按「旧集为空」放行 append-only。 */
function loadHeadFreeze(freezeRel: string): FreezeList {
  let out: string;
  try {
    out = execFileSync("git", ["show", `HEAD:${freezeRel}`], { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (e) {
    const stderr = String((e as { stderr?: string }).stderr ?? "");
    if (/exists on disk, but not in HEAD|does not exist|unknown revision/.test(stderr)) {
      // 清单尚不在 HEAD = 首次提交，旧集为空
      return { version: 1, files: {} };
    }
    throw new Error(`HEAD:${freezeRel} 读取失败（fail-closed）：${stderr.trim() || e}`, { cause: e });
  }
  return JSON.parse(out) as FreezeList;
}

/** 清单形状校验：version 数 + files 为字符串到字符串的映射；违约由调用方 fail-closed。 */
function isValidFreezeShape(freeze: unknown): freeze is FreezeList {
  if (typeof freeze !== "object" || freeze === null) return false;
  const files = (freeze as FreezeList).files;
  if (typeof files !== "object" || files === null) return false;
  return Object.values(files).every((v) => typeof v === "string");
}

function realRun(): number {
  const root = process.cwd();
  const archivedDir = path.join(root, ".agents", "notes", "archived");
  const freezeRel = "scripts/archived-notes.freeze.json";
  if (!fs.existsSync(archivedDir)) {
    console.log("SKIP: .agents/notes/archived/ 不存在（零约束）");
    return 0;
  }
  const { violations: treeV, files } = checkTree(archivedDir);
  const violations = [...treeV];
  if (files.length === 0 && fs.readdirSync(archivedDir).length === 0) {
    console.log("SKIP: archived/ 为空（零约束）");
    return 0;
  }
  const freezePath = path.join(root, freezeRel);
  if (!fs.existsSync(freezePath)) {
    if (files.length > 0) violations.push({ entry: freezeRel, reason: "有归档件但冻结清单缺失" });
  } else {
    let freeze: FreezeList;
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(freezePath, "utf-8"));
      if (!isValidFreezeShape(parsed)) throw new Error("清单形状违约（缺 files 或值非 SHA-256 字符串）");
      freeze = parsed;
    } catch (e) {
      console.log(`FAIL: ${freezeRel}: ${e instanceof Error ? e.message : e}（fail-closed）`);
      return 2;
    }
    violations.push(...checkFreeze(archivedDir, freeze, files));
    let head: FreezeList;
    try {
      head = loadHeadFreeze(freezeRel);
    } catch (e) {
      console.log(`FAIL: ${e instanceof Error ? e.message : e}（fail-closed）`);
      return 2;
    }
    violations.push(...checkAppendOnly(head.files, freeze.files));
  }
  if (violations.length === 0) {
    console.log(`OK: ${files.length} 件归档 ADR 冻结合规`);
    return 0;
  }
  for (const v of violations) console.log(`FAIL: ${v.entry}: ${v.reason}`);
  return 1;
}

/** 夹具自测：在临时沙箱构造 archived 树与清单，违约样例必须 FAIL，合规样例必须 PASS。
 *  realRun 的 exit-2 fail-closed 路径经子进程（临时 cwd）实测。 */
function selfTest(): number {
  const failures: string[] = [];
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "arch-"));
  const roots: string[] = [];
  roots.push(root);
  try {
    const archivedDir = path.join(root, "archived", "process");
    fs.mkdirSync(archivedDir, { recursive: true });
    const note = "# Agent Note: 评审机械闸延后\n\nStatus: implemented\nArchived: 2026-09-05\n\n## Problem\n\nx\n";
    fs.writeFileSync(path.join(archivedDir, "2026-09-05-review-gate-defer.md"), note);
    const hash = sha256(note);
    const archRoot = path.join(root, "archived");

    // 合规：树 + 清单 + append-only 全过
    const r = checkTree(archRoot);
    if (r.violations.length !== 0 || r.files.length !== 1) failures.push("合规样例（树结构）被误判 FAIL");
    const freeze: FreezeList = { version: 1, files: { "process/2026-09-05-review-gate-defer.md": hash } };
    if (checkFreeze(archRoot, freeze, r.files).length !== 0) failures.push("合规样例（冻结清单）被误判 FAIL");
    if (checkAppendOnly({}, freeze.files).length !== 0) failures.push("合规样例（首次入冻 append-only）被误判 FAIL");
    if (checkAppendOnly({ "process/2026-09-05-review-gate-defer.md": hash }, freeze.files).length !== 0) failures.push("合规样例（原值在位 append-only）被误判 FAIL");

    // 违约：改写归档内容
    fs.writeFileSync(path.join(archivedDir, "2026-09-05-review-gate-defer.md"), note + "改动\n");
    if (checkFreeze(archRoot, freeze, r.files).length === 0) failures.push("违约样例（改写归档件）未被拒");
    fs.writeFileSync(path.join(archivedDir, "2026-09-05-review-gate-defer.md"), note);
    // 违约：删条目 / 改条目值
    if (checkAppendOnly(freeze.files, {}).length === 0) failures.push("违约样例（删冻结条目）未被拒");
    if (checkAppendOnly(freeze.files, { "process/2026-09-05-review-gate-defer.md": "deadbeef" }).length === 0) failures.push("违约样例（改冻结条目值）未被拒");
    // 违约：冻结清单分支（缺条目 / 清单漂移）
    if (checkFreeze(archRoot, { version: 1, files: {} }, r.files).length === 0) failures.push("违约样例（清单缺条目）未被拒");
    if (checkFreeze(archRoot, { version: 1, files: { "process/ghost.md": hash } }, r.files).length === 0) failures.push("违约样例（清单条目指向不存在文件）未被拒");
    // 违约：树面（直下文件 / class 外目录 / class 下嵌套目录 / 坏命名 / 文件名日期非法 / 缺 Status / 缺 Archived 行 / 未来日期）
    fs.writeFileSync(path.join(archRoot, "stray.md"), "x");
    if (checkTree(archRoot).violations.length === 0) failures.push("违约样例（archived 直下文件）未被拒");
    fs.unlinkSync(path.join(archRoot, "stray.md"));
    fs.mkdirSync(path.join(archRoot, "notaclass"));
    if (checkTree(archRoot).violations.length === 0) failures.push("违约样例（class 外目录）未被拒");
    fs.rmdirSync(path.join(archRoot, "notaclass"));
    fs.mkdirSync(path.join(archivedDir, "nested"));
    if (checkTree(archRoot).violations.length === 0) failures.push("违约样例（class 下嵌套目录）未被拒");
    fs.rmdirSync(path.join(archivedDir, "nested"));
    fs.writeFileSync(path.join(archivedDir, "2026-09-05-Bad_Name.md"), note);
    if (checkTree(archRoot).violations.length === 0) failures.push("违约样例（坏命名）未被拒");
    fs.unlinkSync(path.join(archivedDir, "2026-09-05-Bad_Name.md"));
    fs.writeFileSync(path.join(archivedDir, "2026-13-01-invalid-date.md"), note);
    if (checkTree(archRoot).violations.length === 0) failures.push("违约样例（文件名日期非法）未被拒");
    fs.unlinkSync(path.join(archivedDir, "2026-13-01-invalid-date.md"));
    fs.writeFileSync(path.join(archivedDir, "2026-09-06-no-status.md"), "# Agent Note: x\n\n## Problem\n");
    if (checkTree(archRoot).violations.length === 0) failures.push("违约样例（标题后无 Status 行）未被拒");
    fs.unlinkSync(path.join(archivedDir, "2026-09-06-no-status.md"));
    fs.writeFileSync(path.join(archivedDir, "2026-09-06-no-archived-line.md"), "# Agent Note: x\n\nStatus: implemented\n\n## Problem\n");
    if (checkTree(archRoot).violations.length === 0) failures.push("违约样例（缺 Archived 行）未被拒");
    fs.writeFileSync(path.join(archivedDir, "2099-01-01-future.md"), "# Agent Note: x\n\nStatus: implemented\nArchived: 2099-01-01\n");
    if (checkTree(archRoot).violations.length === 0) failures.push("违约样例（未来 Archived 日期）未被拒");
    // 归档日时区容差边界：UTC 今日+1 通过（作者本地已跨日）、+2 被拒
    const utcDay = (offsetDays: number): string => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
    fs.writeFileSync(path.join(archivedDir, "2026-09-07-archived-skew.md"), `# Agent Note: x\n\nStatus: implemented\nArchived: ${utcDay(1)}\n`);
    if (checkTree(archRoot).violations.some((v) => v.entry.includes("archived-skew.md"))) failures.push("合规样例（Archived = UTC 今日+1 时区容差）被误判 FAIL");
    fs.unlinkSync(path.join(archivedDir, "2026-09-07-archived-skew.md"));
    fs.writeFileSync(path.join(archivedDir, "2026-09-07-archived-skew2.md"), `# Agent Note: x\n\nStatus: implemented\nArchived: ${utcDay(2)}\n`);
    if (!checkTree(archRoot).violations.some((v) => v.entry.includes("archived-skew2.md"))) failures.push("违约样例（Archived = UTC 今日+2）未被拒");
    fs.unlinkSync(path.join(archivedDir, "2026-09-07-archived-skew2.md"));
    // 合规回归：Status 带 ` — <理由>` 尾注与 verify-adr-format 同语法
    fs.writeFileSync(path.join(archivedDir, "2026-09-06-rejected-tail.md"), "# Agent Note: x\n\nStatus: rejected — 理由可防重蹈覆辙\nArchived: 2026-09-06\n");
    const tail = checkTree(archRoot).violations.filter((v) => v.entry.includes("rejected-tail"));
    if (tail.length !== 0) failures.push("合规样例（rejected 尾注语法）被误判 FAIL");
    fs.unlinkSync(path.join(archivedDir, "2026-09-06-rejected-tail.md"));
    fs.unlinkSync(path.join(archivedDir, "2099-01-01-future.md"));
    fs.unlinkSync(path.join(archivedDir, "2026-09-06-no-archived-line.md"));

    // realRun exit-2 路径（子进程，临时 cwd）：清单形状违约 / 非 git 仓读 HEAD 失败
    const script = fileURLToPath(import.meta.url);
    const e2eRoot = fs.mkdtempSync(path.join(os.tmpdir(), "arch-e2e-"));
    roots.push(e2eRoot);
    fs.mkdirSync(path.join(e2eRoot, ".agents", "notes", "archived", "process"), { recursive: true });
    fs.writeFileSync(path.join(e2eRoot, ".agents", "notes", "archived", "process", "2026-09-05-a.md"), note);
    for (const [freezeBody, why] of [
      ['{"version":1}', "清单缺 files（形状违约）"] as const,
      [JSON.stringify({ version: 1, files: { "process/2026-09-05-a.md": hash } }), "非 git 仓读 HEAD 失败"] as const,
    ]) {
      fs.mkdirSync(path.join(e2eRoot, "scripts"), { recursive: true });
      fs.writeFileSync(path.join(e2eRoot, "scripts", "archived-notes.freeze.json"), freezeBody);
      const res = spawnSync(process.execPath, [script], { cwd: e2eRoot, encoding: "utf-8" });
      if (res.status !== 2) failures.push(`realRun fail-closed 路径未返回 exit 2（${why}，got ${res.status}）：${res.stderr}`);
      fs.rmSync(path.join(e2eRoot, "scripts"), { recursive: true });
    }

    if (failures.length > 0) {
      for (const f of failures) console.log(`SELF-TEST FAIL: ${f}`);
      return 1;
    }
    console.log("self-test OK");
    return 0;
  } finally {
    for (const r of roots) fs.rmSync(r, { recursive: true, force: true });
  }
}

if (process.argv[2] === "--self-test") {
  process.exit(selfTest());
}
process.exit(realRun());
