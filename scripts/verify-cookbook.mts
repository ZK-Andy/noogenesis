#!/usr/bin/env node
/**
 * verify-cookbook — cookbook（docs/cookbook.md）结构门禁。
 *
 * 判据（阶段封闭集单源：本件集合 + docs/cookbook.md 头注；桌面源声称的
 * "sync with AGENTS/ADR" 在本仓不存在，勿据此发散）：
 * 1. 每个 `## <阶段>` 标题须落在封闭阶段集（演化/门禁/文档/协作/环境/上游/产品）；
 *    未知阶段标题、重复阶段标题 = FAIL；`##` 后接 "#" 开头文本（如 "###"）视为
 *    非阶段分隔行，不校验。增删/改名阶段须同步本集合与显示顺序并重跑 --self-test。
 * 2. 阶段节内每个 `- **` 条目须形如
 *    `- **[阶段] 主题（… yyyy-mm-dd …）**：正文…`（正文引导符 ：，； 皆可；日期须
 *    出现在收尾 ** 之前的标题区）：
 *      - 阶段须在封闭集内；
 *      - 须含真实日历日 yyyy-mm-dd，不晚于 UTC 今日 +1 天（UTC+14 早 / UTC-12 晚的
 *        时区跨日容差，对齐 verify-adr-format 先例 97a702f），且年份 ≥ 1970；
 *      - 主题与正文非空。
 * 3. 条目阶段与所属节不一致 = FAIL。
 *
 * 用法（仓库根运行，同其余 verify-*）：node scripts/verify-cookbook.mts [cookbook_path]
 *                                     node scripts/verify-cookbook.mts --self-test
 * 退出码：0 = PASS，1 = FAIL（违约）。注意：除 --self-test 外不做参数甄别，
 * 多余参数一律按 cookbook 路径解释（同 py 行为），无 fail-closed 档。
 * 模块形态：显式 .mts（ESM）——本仓 package.json type=commonjs，node ≥22.18 原生
 * type stripping 直跑，零 devDependency。
 *
 * Provenance: distilled from dotnet-deepseek-harness-desktop/scripts/verify-cookbook.py
 * (MIT, 2026-09-05)；阶段封闭集映射为 Noogenesis 域（演化/门禁/文档/协作/环境/上游/产品），
 * 校验逻辑未改。
 * B1 随族迁 TS（2026-09-08，.agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md）。
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const DEFAULT_PATH = "docs/cookbook.md";

// 封闭阶段集（canonical home = 本集合 + docs/cookbook.md 头注）。
const STAGE_SET: string[] = ["演化", "门禁", "文档", "协作", "环境", "上游", "产品"];

// 展示顺序；--self-test 断言其为 STAGE_SET 的置换（防静默漂移）。
const STAGE_ORDER: string[] = ["演化", "门禁", "文档", "协作", "环境", "上游", "产品"];

// 阶段节内条目行：
//   - **[演化] 主题（… yyyy-mm-dd …）**：正文...
//   - **[演化] 主题（… yyyy-mm-dd …）**，正文...
// 日期须出现在收尾 ** 之前的标题区；正文跟在 ** 后的 ：，； 之后。
const ENTRY_RE = /^- \*\*\[(?<stage>[^\]]+)\]\s+(?<title>.+?)\*\*[：，；](?<body>.+)$/;
// Python \d 是 unicode 十进制数字（Nd）——JS 需 \p{Nd} + u flag 才语义等价。
const DATE_RE = /(?<date>\p{Nd}{4}-\p{Nd}{2}-\p{Nd}{2})/u;
const HEADING_RE = /^## (?<stage>.+?)\s*$/;

/** Python str.splitlines 边界集（\n \r \r\n \v \f \x1c-\x1e \x85 U+2028 U+2029）。 */
function splitPyLines(text: string): string[] {
  // oxlint-disable-next-line no-control-regex -- py str.splitlines 边界集含控制字符（有意匹配）
  return text.split(/\r\n|[\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]/);
}

/** 码点序比较（Python 字符串排序语义；JS 默认序对星面字符不同）。 */
function pyCmp(a: string, b: string): number {
  const ca = Array.from(a);
  const cb = Array.from(b);
  const n = Math.min(ca.length, cb.length);
  for (let i = 0; i < n; i++) {
    const x = ca[i]!.codePointAt(0)!;
    const y = cb[i]!.codePointAt(0)!;
    if (x !== y) return x < y ? -1 : 1;
  }
  return ca.length - cb.length;
}

/** Python PurePosixPath 字符串规范化（折叠 //、去 ./、尾斜杠、空串 → "."）。 */
function normPyPath(p: string): string {
  if (p === "") return ".";
  const absolute = p.startsWith("/");
  const parts = p.split("/").filter((s) => s !== "" && s !== ".");
  const joined = parts.join("/");
  if (joined === "") return absolute ? "/" : ".";
  return (absolute ? "/" : "") + joined;
}

/** date.fromisoformat（限 yyyy-mm-dd ASCII 数字形）等价：非法日历日返回 null。 */
function parsePyIsoDate(s: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, mo, d] = s.split("-").map(Number) as [number, number, number];
  if (y < 1 || y > 9999 || mo < 1 || mo > 12) return null;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1]!;
  if (d < 1 || d > daysInMonth) return null;
  return Date.UTC(y, mo - 1, d);
}

function todayUtcMs(): number {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
}

function fmtUtcDate(ms: number): string {
  const d = new Date(ms);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function closedSetRepr(): string {
  return `[${STAGE_SET.map((s) => `'${s}'`).join(", ")}]`;
}

function validateEntry(line: string, label: string): string[] {
  const errors: string[] = [];
  const m = ENTRY_RE.exec(line);
  if (m === null || m.groups === undefined) {
    errors.push(`${label}: entry must match '- **[阶段] 主题（… yyyy-mm-dd …）**：正文…'`);
    return errors;
  }

  const stage = m.groups["stage"]!;
  if (!STAGE_SET.includes(stage)) {
    errors.push(`${label}: unknown stage '${stage}' (closed set: ${closedSetRepr()})`);
  }

  const title = m.groups["title"]!.trim();
  const dm = DATE_RE.exec(title);
  if (dm === null) {
    errors.push(`${label}: entry title must contain a yyyy-mm-dd date`);
    return errors;
  }
  const dateStr = dm.groups!["date"]!;
  const noteDate = parsePyIsoDate(dateStr);
  if (noteDate === null) {
    errors.push(`${label}: '${dateStr}' is not a real calendar date`);
    return errors;
  }
  // 时区容差：作者本地日期可领先/落后 UTC 至多 1 天，故允许 note_date ≤ today_utc+1。
  // 对齐 verify-adr-format.py 先例（97a702f），保留"不晚于今日"意图同时容忍合法时区跨日。
  const todayUtc = todayUtcMs();
  if (noteDate > todayUtc + 24 * 60 * 60 * 1000) {
    errors.push(`${label}: date '${dateStr}' is after today (${fmtUtcDate(todayUtc)})`);
  }
  if (Number(dateStr.slice(0, 4)) < 1970) {
    errors.push(`${label}: date '${dateStr}' is before the epoch (1970)`);
  }

  if (title === "") {
    errors.push(`${label}: entry has an empty title`);
  }
  const body = m.groups["body"]!.trim();
  if (body === "") {
    errors.push(`${label}: entry has an empty body after '：'`);
  }
  return errors;
}

/** 真实 cookbook 扫描：返回 { 条目数, 错误列表 }。 */
function scan(p: string): { checked: number; errors: string[] } {
  if (!fs.existsSync(p) || !fs.statSync(p).isFile()) {
    return { checked: 0, errors: [`${p}: cookbook file not found`] };
  }

  const errors: string[] = [];
  let checked = 0;
  let currentStage: string | null = null;
  const seenStages: string[] = [];
  const lines = splitPyLines(fs.readFileSync(p, "utf-8"));
  for (let i = 0; i < lines.length; i++) {
    const lineno = i + 1;
    const line = lines[i]!;
    const hm = HEADING_RE.exec(line.trim());
    if (hm !== null && hm.groups !== undefined) {
      const stage = hm.groups["stage"]!.trim();
      if (stage.startsWith("#")) {
        currentStage = null;
        continue;
      }
      if (!STAGE_SET.includes(stage)) {
        errors.push(`${p}:${lineno}: unknown stage heading '${stage}' (closed set: ${closedSetRepr()})`);
        currentStage = null;
        continue;
      }
      if (seenStages.includes(stage)) {
        errors.push(`${p}:${lineno}: duplicate stage heading '${stage}'`);
      }
      seenStages.push(stage);
      currentStage = stage;
      continue;
    }

    if (line.trim().startsWith("- **")) {
      checked++;
      const stripped = line.trim();
      errors.push(...validateEntry(stripped, `${p}:${lineno}`));
      const m = ENTRY_RE.exec(stripped);
      if (m !== null && m.groups !== undefined && currentStage !== null && m.groups["stage"] !== currentStage) {
        errors.push(`${p}:${lineno}: entry stage '${m.groups["stage"]}' does not match section '${currentStage}'`);
      }
    }
  }
  return { checked, errors };
}

/** 离线夹具自检：构造合规与违约 cookbook，断言校验器只命中预期项。 */
function selfTest(): number {
  // 展示顺序必须是封闭集的置换（漂移护栏）——与 py assert 同语义（失败即非零退出）。
  if ([...STAGE_ORDER].sort(pyCmp).join("\u0000") !== [...STAGE_SET].sort(pyCmp).join("\u0000")) {
    throw new Error("STAGE_ORDER drifted from STAGE_SET");
  }

  const HEADERS = STAGE_ORDER.map((s) => `## ${s}`).join("\n");
  // 用过去日期，使"不晚于今日"与运行日无关。
  const PAST = "2026-08-27";

  const okEntry = `- **[演化] 示例主题（${PAST} 实机）**：示例正文内容。\n`;
  // 合规样例：条目置于其所属阶段节之下。
  const okBody = `# Cookbook\n\n## 演化\n\n${okEntry}\n`;

  const cases: Array<[string, number, string]> = [];
  cases.push([okBody, 0, "conforming cookbook -> pass"]);

  // 条目阶段不在封闭集
  const badEntry = `- **[未知] 示例主题（${PAST} 实机）**：正文。\n`;
  const badBody = `# Cookbook\n\n${HEADERS}\n\n${badEntry}\n`;
  cases.push([badBody, 1, "unknown entry stage -> fail"]);

  // 未来日期：UTC 今日 +2 —— 恒超出 +1 容差，与本地时区无关，确定性 FAIL。
  const todayUtc = todayUtcMs();
  const future = fmtUtcDate(todayUtc + 2 * 24 * 60 * 60 * 1000);
  const futureBody = `# Cookbook\n\n## 演化\n\n- **[演化] 示例主题（${future} 实机）**：正文。\n`;
  cases.push([futureBody, 1, "future date -> fail"]);

  // 非法日历日
  const badDateBody = `# Cookbook\n\n## 演化\n\n- **[演化] 示例主题（2026-02-31 实机）**：正文。\n`;
  cases.push([badDateBody, 1, "invalid calendar date -> fail"]);

  // 条目阶段与所属节不一致
  const mismatchBody = `# Cookbook\n\n## 门禁\n\n- **[演化] 示例主题（${PAST} 实机）**：正文。\n`;
  cases.push([mismatchBody, 1, "entry stage mismatch section -> fail"]);

  // 畸形条目（无正文）
  const malformedBody = `# Cookbook\n\n## 演化\n\n- **[演化] 示例主题（${PAST} 实机）**：\n`;
  cases.push([malformedBody, 1, "empty body -> fail"]);

  // 未知阶段标题
  const unknownHead = `# Cookbook\n\n## 未知\n\n${okEntry}\n`;
  cases.push([unknownHead, 1, "unknown stage heading -> fail"]);

  let failed = 0;
  const td = fs.mkdtempSync(path.join(os.tmpdir(), "tmp"));
  for (const [i, [content, expected, desc]] of cases.entries()) {
    const p = path.join(td, `cookbook-${i}.md`);
    fs.writeFileSync(p, content, "utf-8");
    const { errors } = scan(p);
    const actual = errors.length > 0 ? 1 : 0;
    if (actual === expected) {
      console.log(`  ok: ${desc}`);
    } else {
      console.log(`  ✗ ${desc}: expected exit ${expected}, got ${actual} (${errors.join(" ; ")})`);
      failed = 1;
    }
  }
  if (failed === 0) {
    console.log("== verify-cookbook self-test passed ==");
  } else {
    console.error("== verify-cookbook self-test failed ==");
  }
  return failed;
}

function main(): number {
  if (process.argv[2] === "--self-test") {
    return selfTest();
  }

  const p = process.argv[2] !== undefined ? normPyPath(process.argv[2]) : DEFAULT_PATH;
  const { checked, errors } = scan(p);
  console.log(`Checked ${checked} cookbook entries`);
  if (errors.length > 0) {
    for (const e of errors) console.log(`FAIL: ${e}`);
    return 1;
  }
  console.log("OK");
  return 0;
}

process.exit(main());
