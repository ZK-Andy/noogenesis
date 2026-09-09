#!/usr/bin/env node
/**
 * verify-adr-format — Agent Note (ADR) 格式门禁：头块 / 骨架 / 状态-目录一致性，
 * 加文件与日期命名机器校验。
 *
 * 判据（对 .agents/notes/ 下每个 .md，排除 archived/ 与 .zh.md，README.md 免检）：
 *   1. 第 1 行为 "# Agent Note: <title>"；Status 行紧随标题之后
 *      （标题与 Status 之间允许空一行 —— 对齐 deepseek-harness 真实笔记约定）；
 *   2. Status 值与所在 lifecycle 目录一致（proposed/implemented/rejected）；
 *   3. 必需骨架节在位（## Problem、## Alternatives considered；lifecycle 专属：
 *      implemented 需 ## Decision/## Consequences，proposed 需 ## Proposal）；
 *   4. implemented 笔记不得出现 spec 语汇标题
 *      （## Proposal / ## Plan / ## Migration plan / ## Acceptance criteria）；
 *   5. 文件/路径命名（ADR 命名规则单源 .agents/notes/README.md）：
 *        - 路径恰为 <lifecycle>/<class>/<name>.md（顶层仅 README.md 与 AGENTS.md
 *          免检——豁免面封闭集合，其余任何 .md 路径一律按违约报告，绝不静默跳过）
 *        - lifecycle ∈ {proposed, implemented, rejected} —— 与 Status 同值（复用）
 *        - class ∈ {feature, bug-fix, simplification, architecture, process, testing}
 *        - <name> = yyyy-mm-dd-<slug>.md，日期为真实日历日且不晚于 UTC 今日+1
 *          （时区容差：作者本地日期可领先/落后 UTC 至多 1 天，CI runner 是 UTC），
 *          年不早于 1970；slug 为 kebab-case。
 * 结构性例外（零约束）：notes_root 不存在时打 SKIP 并 PASS。
 *
 * 用法（仓库根运行）：node scripts/verify-adr-format.mts [notes_root]
 *       node scripts/verify-adr-format.mts --self-test   # 离线夹具自检
 * 退出码：0 = pass，1 = violations found。
 * 模块形态：显式 .mts（ESM），相对 import 带显式扩展，只依赖 node: 内建；
 * node ≥22.18 原生 type stripping 直跑。
 *
 * Provenance: distilled from dotnet-deepseek-harness-desktop/scripts/verify-adr-format.py
 * (MIT, 2026-09-05); verbatim port, no logic changes for Noogenesis.
 * B1 随族迁 TS（2026-09-08，.agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md）。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { TextDecoder } from "node:util";
import { pyStrip, splitLines } from "./mdref.mts";

const HEADER_RE = /^# Agent Note: .+$/;
const STATUS_RE = /^Status: (proposed|implemented|rejected(?: — .+)?)$/;
const LIFECYCLE_SET = ["proposed", "implemented", "rejected"];
const BANNED_IN_IMPLEMENTED = ["## Proposal", "## Plan", "## Migration plan", "## Acceptance criteria"];
const REQUIRED_ALL = ["## Problem", "## Alternatives considered"];
const REQUIRED_IMPLEMENTED = ["## Decision", "## Consequences"];
const REQUIRED_PROPOSED = ["## Proposal"];

// --- ADR 命名规则（机器校验）---
const CLASS_SET = ["feature", "bug-fix", "simplification", "architecture", "process", "testing"];
// Python \d 是 unicode 十进制数字（≡ \p{Nd}）；JS \d 只匹配 ASCII——用 \p{Nd} + u flag 对齐。
const NAME_RE = /^(\p{Nd}{4}-\p{Nd}{2}-\p{Nd}{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/u;
// 顶层豁免面 = 封闭集：notes 子树常设件（索引 README + 子树规则 AGENTS）；其余一律三层深，
// 任何不识别路径都必须报违约（fail-closed）——静默跳过会让杂散笔记逃过全部检查面。
const TOP_LEVEL_EXEMPT = ["README.md", "AGENTS.md"];

/** Python str 比较的 codepoint 序（JS 默认 sort 是 UTF-16 码元序，增补平面字符不同序）。 */
function cmpCodepoints(a: string, b: string): number {
  if (a === b) return 0;
  const A = Array.from(a);
  const B = Array.from(b);
  const n = Math.min(A.length, B.length);
  for (let i = 0; i < n; i++) {
    const ca = A[i]!.codePointAt(0)!;
    const cb = B[i]!.codePointAt(0)!;
    if (ca !== cb) return ca < cb ? -1 : 1;
  }
  return A.length < B.length ? -1 : A.length > B.length ? 1 : 0;
}

/** Python datetime.date.fromisoformat 等价面：仅 ASCII 数字 YYYY-MM-DD；
 *  年 0 / 月日越界 / 非真日历日 → null（与 ValueError 分支一致）。 */
function parseIsoDate(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m === null) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  if (y < 1 || y > 9999 || mo < 1 || mo > 12 || day < 1 || day > 31) return null;
  const d = new Date(0);
  d.setUTCFullYear(y, mo - 1, day);
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== day) return null;
  return { y, m: mo, d: day };
}

function cmpDate(a: { y: number; m: number; d: number }, b: { y: number; m: number; d: number }): number {
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  if (a.m !== b.m) return a.m < b.m ? -1 : 1;
  if (a.d !== b.d) return a.d < b.d ? -1 : 1;
  return 0;
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

function todayUtcYmd(): { y: number; m: number; d: number } {
  const now = new Date();
  return { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1, d: now.getUTCDate() };
}

function ymdStr(v: { y: number; m: number; d: number }): string {
  return `${String(v.y).padStart(4, "0")}-${pad2(v.m)}-${pad2(v.d)}`;
}

function listRepr(arr: readonly string[]): string {
  return "[" + arr.map((s) => `'${s}'`).join(", ") + "]";
}

/** 等价 Python root.rglob("*.md") 后按全路径 codepoint 序排序：返回 '/' 分隔的相对路径。
 *  rglob 也命中名字形如 *.md 的目录（随后 read 时两侧同炸，退出码一致）。 */
function listNotes(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string, rel: string): void => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const childRel = rel === "" ? ent.name : `${rel}/${ent.name}`;
      if (ent.isDirectory()) {
        if (ent.name.endsWith(".md")) out.push(childRel);
        walk(path.join(dir, ent.name), childRel);
      } else if (ent.name.endsWith(".md")) {
        out.push(childRel);
      }
    }
  };
  walk(root, "");
  out.sort(cmpCodepoints);
  return out;
}

/** Python read_text(encoding="utf-8") 为严格解码（坏字节即抛错）：
 *  fatal TextDecoder 对齐，ignoreBOM 保留行首 \ufeff（Python 不剥 BOM）。 */
function readNote(p: string): string {
  const buf = fs.readFileSync(p);
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buf);
}

/** 校验非顶层笔记的 ADR 文件/路径命名规则。 */
function validateName(rel: string): string[] {
  const errors: string[] = [];
  const parts = rel.split("/");
  if (parts.length !== 3) {
    errors.push(`${rel}: path must be exactly <lifecycle>/<class>/<name>.md (3 segments; got ${parts.length})`);
    return errors;
  }

  const lifecycle = parts[0]!;
  const cls = parts[1]!;
  const name = parts[2]!;
  if (!LIFECYCLE_SET.includes(lifecycle)) {
    errors.push(`${rel}: lifecycle '${lifecycle}' not in ${listRepr(LIFECYCLE_SET)}`);
  }
  if (!CLASS_SET.includes(cls)) {
    errors.push(`${rel}: class '${cls}' not in ${listRepr(CLASS_SET)}`);
  }

  const m = NAME_RE.exec(name);
  if (m === null) {
    errors.push(`${rel}: filename must be 'yyyy-mm-dd-<kebab-slug>.md' (lowercase, hyphen-separated words; no uppercase/underscore/other)`);
    return errors;
  }

  const dateStr = m[1]!;
  const noteDate = parseIsoDate(dateStr);
  if (noteDate === null) {
    errors.push(`${rel}: '${dateStr}' is not a real calendar date`);
    return errors;
  }

  // 时区容差：作者本地日期可领先/落后 UTC 至多 1 天（UTC+14 早 / UTC-12 晚），故允许
  // note_date ≤ today_utc+1。保留"不晚于今日"意图（拦截真未来/明显错日），同时容忍
  // 同日在不同时区的合法情况——CI runner 是 UTC，作者本地可能已跨到次日。
  const today = todayUtcYmd();
  const tomorrow = new Date(Date.UTC(today.y, today.m - 1, today.d) + 86400000);
  const limit = { y: tomorrow.getUTCFullYear(), m: tomorrow.getUTCMonth() + 1, d: tomorrow.getUTCDate() };
  if (cmpDate(noteDate, limit) > 0) {
    errors.push(`${rel}: date '${dateStr}' is after today (${ymdStr(today)})`);
  }
  if (noteDate.y < 1970) {
    errors.push(`${rel}: date '${dateStr}' is before the epoch (1970)`);
  }
  return errors;
}

interface ScanResult { checked: number; errors: string[] }

/** 对真实 notes 树扫描；返回 (checked, errors)。 */
function scan(root: string): ScanResult {
  const errors: string[] = [];
  let checked = 0;
  for (const rel of listNotes(root)) {
    const parts = rel.split("/");
    const name = parts[parts.length - 1]!;
    if (parts.includes("archived") || name.endsWith(".zh.md")) {
      continue;
    }
    if (TOP_LEVEL_EXEMPT.includes(name)) {
      continue;
    }
    checked++;

    const lifecycle = parts[0]!;

    // 5. 文件/路径命名规则（独立于下方内容检查；lifecycle 判据在 validateName 内）
    errors.push(...validateName(rel));

    const text = readNote(path.join(root, rel));
    const lines = splitLines(text);

    if (lines.length === 0 || !HEADER_RE.test(lines[0]!)) {
      errors.push(`${rel}: line 1 must be '# Agent Note: <title>'`);
    }
    // 真实约定（deepseek 仓库实际笔记）：标题后可空一行，再跟 Status 行。
    let statusLine = "";
    for (const l of lines.slice(1)) {
      if (pyStrip(l) !== "") {
        statusLine = l;
        break;
      }
    }
    const sm = STATUS_RE.exec(statusLine);
    if (sm === null) {
      errors.push(`${rel}: must contain 'Status: <proposed|implemented|rejected>' after the title`);
    } else if (sm[1] !== lifecycle) {
      errors.push(`${rel}: Status '${sm[1]}' mismatches folder '${lifecycle}'`);
    }

    for (const sec of REQUIRED_ALL) {
      if (!lines.some((l) => pyStrip(l) === sec)) {
        errors.push(`${rel}: missing required section '${sec}'`);
      }
    }

    if (lifecycle === "implemented") {
      for (const sec of REQUIRED_IMPLEMENTED) {
        if (!lines.some((l) => pyStrip(l) === sec)) {
          errors.push(`${rel}: missing required section '${sec}'`);
        }
      }
      for (const banned of BANNED_IN_IMPLEMENTED) {
        if (lines.some((l) => pyStrip(l) === banned)) {
          errors.push(`${rel}: implemented note must not contain '${banned}'`);
        }
      }
    } else if (lifecycle === "proposed") {
      for (const sec of REQUIRED_PROPOSED) {
        if (!lines.some((l) => pyStrip(l) === sec)) {
          errors.push(`${rel}: missing required section '${sec}'`);
        }
      }
    }
  }
  return { checked, errors };
}

/** 离线夹具自检：构造合规/违约临时 notes 树，断言校验器恰好命中预期者。 */
function selfTest(): number {
  const okBody = (status: string, decisionSec: string): string =>
    "# Agent Note: sample\n\n" +
    `Status: ${status}\n\n` +
    "## Problem\n\nbackground\n\n" +
    `## ${decisionSec}\n\ndecision\n\n` +
    "## Alternatives considered\n\n- x\n\n" +
    "## Consequences\n\nconsequences\n";

  const writeStatus = (dirpath: string, name: string, status: string): void => {
    fs.writeFileSync(path.join(dirpath, name), okBody(status, "Decision"));
  };

  const cases: Array<[string, number, string]> = []; // (notes_root, expected_exit, description)
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "adr-format-"));

  // case A: 全合规树 → exit 0
  const conform = path.join(t, "conform");
  fs.mkdirSync(path.join(conform, "implemented", "feature"), { recursive: true });
  writeStatus(path.join(conform, "implemented", "feature"), "2026-08-27-naming-ok.md", "implemented");
  cases.push([conform, 0, "conforming tree -> pass"]);

  // case B: class 段不在封闭集 → exit 1
  const badclass = path.join(t, "badclass");
  fs.mkdirSync(path.join(badclass, "implemented", "refactor"), { recursive: true });
  writeStatus(path.join(badclass, "implemented", "refactor"), "2026-08-27-naming-ok.md", "implemented");
  cases.push([badclass, 1, "invalid class 'refactor' -> fail"]);

  // case C: slug 含大写 → exit 1
  const badslug = path.join(t, "badslug");
  fs.mkdirSync(path.join(badslug, "implemented", "feature"), { recursive: true });
  writeStatus(path.join(badslug, "implemented", "feature"), "2026-08-27-Naming-Ok.md", "implemented");
  cases.push([badslug, 1, "uppercase in filename -> fail"]);

  // case D: future date → exit 1（相对 UTC 今天 +2，恒超过 +1 容差，跨时区亦确定失败）
  const futuredate = path.join(t, "futuredate");
  fs.mkdirSync(path.join(futuredate, "implemented", "feature"), { recursive: true });
  const today = todayUtcYmd();
  const future = new Date(Date.UTC(today.y, today.m - 1, today.d) + 2 * 86400000);
  const futureStr = `${String(future.getUTCFullYear()).padStart(4, "0")}-${pad2(future.getUTCMonth() + 1)}-${pad2(future.getUTCDate())}`;
  writeStatus(path.join(futuredate, "implemented", "feature"), `${futureStr}-naming-ok.md`, "implemented");
  cases.push([futuredate, 1, "date after today -> fail"]);

  // case E: 非真日历日 → exit 1
  const baddate = path.join(t, "baddate");
  fs.mkdirSync(path.join(baddate, "implemented", "feature"), { recursive: true });
  writeStatus(path.join(baddate, "implemented", "feature"), "2026-02-31-naming-ok.md", "implemented");
  cases.push([baddate, 1, "invalid calendar date -> fail"]);

  // case F: 段数错（class 目录缺位）→ exit 1
  const badcount = path.join(t, "badcount");
  fs.mkdirSync(path.join(badcount, "implemented"), { recursive: true });
  writeStatus(path.join(badcount, "implemented"), "2026-08-27-naming-ok.md", "implemented");
  cases.push([badcount, 1, "path not 3 segments -> fail"]);

  // case G: lifecycle 树外的杂散顶层笔记 → exit 1（fail-closed：豁免面仅封闭集两件）
  const stray = path.join(t, "stray");
  fs.mkdirSync(stray, { recursive: true });
  fs.writeFileSync(path.join(stray, "drafts-scratch.md"), "# Agent Note: scratch\n\nStatus: implemented\n");
  cases.push([stray, 1, "stray note outside lifecycle tree -> fail"]);

  let failed = 0;
  for (const [notesRoot, expected, desc] of cases) {
    const { errors } = scan(notesRoot);
    const actual = errors.length > 0 ? 1 : 0;
    if (actual === expected) {
      console.log(`  ok: ${desc}`);
    } else {
      console.log(`  ✗ ${desc}: expected exit ${expected}, got ${actual} (${errors.join("; ")})`);
      failed = 1;
    }
  }
  // case F 文案钉死：段数实测值必须内插（夹具只断退出码时，文案残缺无人看见）
  const fErrors = scan(badcount).errors.filter((e) => e.includes("3 segments"));
  if (fErrors.length === 1 && /got 2\)/.test(fErrors[0]!)) {
    console.log("  ok: segment-count message interpolates actual count");
  } else {
    console.log(`  ✗ segment-count message: ${fErrors.join("; ")}`);
    failed = 1;
  }
  if (failed === 0) {
    console.log("== verify-adr-format self-test passed ==");
  } else {
    console.error("== verify-adr-format self-test failed ==");
  }
  fs.rmSync(t, { recursive: true, force: true });
  return failed;
}

/** 等价 Python Path(arg) 的轻量字符串规范化（折叠 "//" 与 "/./" 及尾斜杠；
 *  保留前导斜杠——Python Path("/tmp/x") 仍是绝对路径）。 */
function pathNorm(arg: string): string {
  const abs = arg.startsWith("/");
  const parts = arg.split("/").filter((p) => p !== "" && p !== ".");
  if (parts.length === 0) return ".";
  return (abs ? "/" : "") + parts.join("/");
}

function realRun(): number {
  const rootArg = process.argv[2] !== undefined ? pathNorm(process.argv[2]) : ".agents/notes";
  if (!fs.existsSync(rootArg) || !fs.statSync(rootArg).isDirectory()) {
    console.log(`SKIP: ${rootArg} does not exist (no Agent Notes tree)`);
    return 0;
  }

  const { checked, errors } = scan(rootArg);
  console.log(`Checked ${checked} Agent Notes`);
  if (errors.length > 0) {
    for (const e of errors) {
      console.log(`FAIL: ${e}`);
    }
    return 1;
  }
  console.log("OK");
  return 0;
}

if (process.argv[2] === "--self-test") {
  process.exit(selfTest());
}
process.exit(realRun());
