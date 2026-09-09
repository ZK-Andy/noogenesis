#!/usr/bin/env node
/**
 * verify-handoff-structure — HANDOFF 家庭结构/预算/指针门禁。
 *
 * 判据（五组，全部机器可查）：
 * 1. HANDOFF.md 必须存在——HANDOFF 家庭是提交进 git 的过程资产
 *    （ADR 2026-09-05-journal-in-git），缺席 = 违约，不是免检；
 * 2. 必备正文小节：背景 / 位置 / 当前状态 / 待办 / 开始步骤
 *    （小节名允许「（…）」括注后缀，如「## 待办（第二步 …）」）；
 * 3. `## 交接更新记录` 滚动窗口有界：条目数 ≤ --max-window（默认 24），每条
 *    ≤ --max-entry 字符（默认 260）——窗口只收「日期｜一行结论」式摘要，
 *    完整叙事归档 journal/<YYYY-MM>.md；
 * 4. `## 待办` 是指针：必须引用 HANDOFF-todos.md；todos 件存在且
 *    open（`[ ]`）≤ --max-open（默认 16）且每条 ≤ --max-open-chars（默认
 *    340）、总条数 ≤ --max-total（默认 70）、closed（`[x]`）每条 ≤
 *    --max-closed-chars（默认 220，一行指针）；
 * 5. journal 归档指针必须在位；被引用卷仅在过去月份强制存在（当前月份允许
 *    尚无卷——月初合法空档）；校验全部匹配而非仅首个，防止前文散文提法静默改靶。
 * 路径解析：todos 与 journal 卷相对 HANDOFF 自身父目录解析（--handoff 指向
 * 别处的 HANDOFF 时不误报），非相对 cwd。
 *
 * 用法（仓库根运行，同其余 verify-*）：
 *   node scripts/verify-handoff-structure.mts [--handoff PATH] [--todos PATH]
 *       [--max-window N] [--max-entry N] [--max-open N] [--max-total N]
 *       [--max-open-chars N] [--max-closed-chars N]
 *   node scripts/verify-handoff-structure.mts --self-test   # 离线夹具
 * 退出码：0 = PASS，1 = 违约；2 = 参数错（fail-closed，同 argparse 口径）。
 *
 * Provenance: distilled from dotnet-deepseek-harness-desktop/scripts/verify-handoff-structure.py
 * (MIT, 2026-09-05)。与上游 diff：journal 在仓库根 `journal/`（非 .plan/journal/）；
 * 卷名取自当月而非硬编码（修上游跨月滚动 bug）。
 * B1 随族迁 TS（2026-09-08，.agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md）。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { pyStrip, splitLines } from "./mdref.mts";

const DEFAULT_HANDOFF = "HANDOFF.md";
const DEFAULT_TODOS = "HANDOFF-todos.md";
const DEFAULT_MAX_WINDOW = 24;
const DEFAULT_MAX_ENTRY = 260;
const DEFAULT_MAX_OPEN = 16;
const DEFAULT_MAX_TOTAL = 70;
const DEFAULT_MAX_OPEN_CHARS = 340;
const DEFAULT_MAX_CLOSED_CHARS = 220;

const HEADER_SECTIONS = ["背景", "位置", "当前状态", "待办", "开始步骤"] as const;
const ENTRY_RE = /^- \d{4}-\d{2}-\d{2}｜/;
const SECTION_RE = /^## (?<name>.+?)\s*$/;
// Python \w 是 unicode 词字符（字母/数字/下划线），JS \w 仅 ASCII——按
// \p{L}\p{N}_ 等价展开（已在 /tmp 夹具实测：假名/汉字/西里尔/全角数字两侧
// 同匹配、组合序列两侧同拒）。
const JOURNAL_RE = /journal\/[\p{L}\p{N}_\u4e00-\u9fff-]+\.md/gu;
const TODO_RE = /^- \[([ x])\] /;
const TODOS_REF_RE = /HANDOFF-todos\.md/;
const VOLUME_RE = /^(\d{4})-(\d{2})\.md$/;

// 单时钟：UTC now，模块加载时读一次；CURRENT_MONTH 与 self-test 夹具皆由它
// 派生（与 verify-cookbook.py 容忍口径一致；单次读取消除跨午夜两次读数的
// 不确定性）。
const NOW = new Date();
const CURRENT_MONTH = NOW.toISOString().slice(0, 7);

// --- Python→JS 语义等价原语（空白与 splitlines 归口 mdref） -------------------

/** Python len() = unicode 码点数（JS .length 是 UTF-16 码元数，增补区差 2 倍）。 */
function cpLen(s: string): number {
  return [...s].length;
}

/** pathlib str(Path(p)) 等价：去掉空段与「.」段、保留「..」、折叠重复斜杠、
 *  去尾斜杠；绝对路径保留前导「/」。 */
function pyPathStr(p: string): string {
  const isAbs = p.startsWith("/");
  const segs = p.split("/").filter((seg) => seg !== "" && seg !== ".");
  let out = segs.join("/");
  if (isAbs) out = "/" + out;
  return out === "" ? "." : out;
}

/** Path(p).parent 等价（字符串形态）。 */
function pyParentDir(p: string): string {
  const isAbs = p.startsWith("/");
  const segs = p.split("/").filter((seg) => seg !== "" && seg !== ".");
  let out = segs.slice(0, -1).join("/");
  if (isAbs) out = "/" + out;
  return out === "" ? "." : out;
}

/** Path(p).name 等价。 */
function pyBasename(p: string): string {
  const segs = p.split("/").filter((seg) => seg !== "" && seg !== ".");
  return segs.length > 0 ? segs[segs.length - 1]! : "";
}

/** Path(parent) / child 等价（parent 为 "." 时直接取 child）。 */
function joinPy(parent: string, child: string): string {
  return pyPathStr(parent === "." ? child : `${parent}/${child}`);
}

function isFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

// --- 判据 -------------------------------------------------------------------

interface ScanResult { count: number; errors: string[] }

/** 返回（窗口条目数, 错误列表）。journal 卷与 todos 件相对 HANDOFF 自身父目录
 *  解析（HANDOFF 在仓库根时即仓库根），使 --handoff 指向别处不误报。 */
function scan(handoff: string, todosPath: string, maxWindow: number, maxEntry: number,
              maxOpen: number, maxTotal: number, maxOpenChars: number,
              maxClosedChars: number): ScanResult {
  if (!isFile(handoff)) {
    // HANDOFF 家庭提交在 git（ADR 2026-09-05-journal-in-git）：缺席是违约，
    // 不是免检豁免。
    return { count: 0, errors: [`${handoff}: HANDOFF not found — the family is tracked in ` +
      `git; deleting it must go through an ADR, not silence.`] };
  }

  const errors: string[] = [];
  const text = fs.readFileSync(handoff, "utf-8");
  const lines = splitLines(text);

  // 1) 必备正文小节在位
  const seenSections = new Set<string>();
  for (const line of lines) {
    const m = SECTION_RE.exec(pyStrip(line));
    if (m) {
      // 容忍括注后缀，如「## 待办（第二步 …）」
      const name = pyStrip(m.groups?.name ?? "");
      const base = pyStrip(name.split("（")[0]!.split("(")[0]!);
      seenSections.add(base);
    }
  }
  const missing = HEADER_SECTIONS.filter((s) => !seenSections.has(s));
  if (missing.length > 0) {
    errors.push(`${handoff}: missing required section(s): [${missing.map((s) => `'${s}'`).join(", ")}]`);
  }

  // 2) 滚动窗口条目：数量有界 + 每条为短摘要
  let windowCount = 0;
  let inWindow = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const stripped = pyStrip(line);
    if (stripped.startsWith("## 交接更新记录")) {
      inWindow = true;
      continue;
    }
    if (inWindow && SECTION_RE.test(stripped)) {
      inWindow = false;
      continue;
    }
    if (inWindow && ENTRY_RE.test(stripped)) {
      windowCount++;
      if (cpLen(line) > maxEntry) {
        errors.push(
          `${handoff}: line ${i + 1}: window entry exceeds ${maxEntry} ` +
          `chars (${cpLen(line)}). Summaries only — full narrative ` +
          `goes to journal/.`);
      }
    }
  }
  if (windowCount > maxWindow) {
    errors.push(
      `${handoff}: 交接更新记录 has ${windowCount} entries, exceeds max ` +
      `window ${maxWindow}. Archive the oldest summaries to ` +
      `journal/ before adding to HANDOFF.`);
  }

  // 3) `## 待办` 小节必须指向 todos 件
  let todosFound = false;
  let inTodo = false;
  for (const line of lines) {
    const stripped = pyStrip(line);
    if (stripped.startsWith("## 待办")) {
      inTodo = true;
      continue;
    }
    if (inTodo && SECTION_RE.test(stripped)) break;
    if (inTodo && TODOS_REF_RE.test(line)) todosFound = true;
  }
  if (!todosFound) {
    errors.push(
      `${handoff}: \`## 待办\` section must reference the todos file ` +
      `(${pyBasename(todosPath)}).`);
  }

  // 4) todos 件：存在 + 条目数/压缩预算
  if (isFile(todosPath)) {
    errors.push(...scanTodos(todosPath, maxOpen, maxTotal, maxOpenChars, maxClosedChars));
  } else if (todosFound) {
    errors.push(`${handoff}: referenced todos file missing: ${todosPath}`);
  } else {
    errors.push(`${handoff}: todos file missing: ${todosPath} ` +
      `(create ${pyBasename(todosPath)} for the action area).`);
  }

  // 5) journal 指针：每个 `journal/….md` 提法在过去月份必须可解析；当前月份
  //    允许尚无卷。校验全部匹配（非仅首个）消除「前文散文提法静默改靶」的
  //    脆弱性。
  const refs = text.match(JOURNAL_RE) ?? [];
  if (refs.length === 0) {
    errors.push(
      `${handoff}: missing archive pointer to \`journal/<YYYY-MM>.md\` ` +
      `(add a '## 会话叙事档案' note so old narrative has a home).`);
  } else {
    const parent = pyParentDir(handoff);
    for (const ref of refs) {
      const vol = ref.split("/").pop()!;
      const jpath = parent === "." ? `journal/${vol}` : `${parent}/journal/${vol}`;
      if (isFile(jpath)) continue;
      const isCurrent = VOLUME_RE.test(vol) && vol === `${CURRENT_MONTH}.md`;
      if (!isCurrent) {
        errors.push(`${handoff}: referenced journal volume '${vol}' ` +
          `not found at ${jpath}`);
      }
    }
  }
  return { count: windowCount, errors };
}

function scanTodos(p: string, maxOpen: number, maxTotal: number, maxOpenChars: number,
                   maxClosedChars: number): string[] {
  const errors: string[] = [];
  const lines = splitLines(fs.readFileSync(p, "utf-8"));
  let openCount = 0;
  let closedCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const m = TODO_RE.exec(line);
    if (!m) continue;
    const state = m[1]!;
    if (state === " ") {
      openCount++;
      if (cpLen(line) > maxOpenChars) {
        errors.push(
          `${p}: line ${i + 1}: open todo exceeds ${maxOpenChars} ` +
          `chars (${cpLen(line)}). Keep action + trigger + pointer.`);
      }
    } else {
      closedCount++;
      if (cpLen(line) > maxClosedChars) {
        errors.push(
          `${p}: line ${i + 1}: closed todo exceeds ${maxClosedChars} ` +
          `chars (${cpLen(line)}). Compress to a one-line pointer — ` +
          `detail lives in journal/ADR.`);
      }
    }
  }
  const total = openCount + closedCount;
  if (openCount > maxOpen) {
    errors.push(`${p}: ${openCount} open items exceed max ${maxOpen} ` +
      `— finish or prune before adding more.`);
  }
  if (total > maxTotal) {
    errors.push(`${p}: ${total} items exceed max ${maxTotal}.`);
  }
  return errors;
}

// --- 夹具自测 ---------------------------------------------------------------

interface Case {
  entries: string[];
  jref: boolean;
  secs: boolean;
  jfile: boolean;
  todos: boolean;
  tlines: string[];
  ref: boolean;
  expected: 0 | 1;
  desc: string;
  vol?: string;
}

/** 离线夹具自检：合成 HANDOFF 树逐组校验。 */
function selfTest(): number {
  // 卷名确定性：由模块级单时钟派生（无二次读数 → 无跨午夜抖动）：存在的
  // 过去月份 / 不存在的过去月份 / 当前月份（允许缺卷）。
  const first = Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), 1);
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const prev = new Date(first - MS_PER_DAY);
  const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const prevMonth = fmt(prev);
  const volExists = `${prevMonth}.md`;
  const volCurrent = `${CURRENT_MONTH}.md`;

  function build(tree: string, entries: string[], journal: boolean, sections: boolean,
                 journalFile: boolean, todos: boolean, todoLines: string[],
                 todosRef: boolean, vol: string): void {
    fs.mkdirSync(path.join(tree, "journal"), { recursive: true });
    const lines = ["# HANDOFF — test\n", "\n", "## 交接更新记录\n", "\n"];
    if (journal) {
      lines.push(`> 滚动窗口有界；旧叙事归档 \`journal/${vol}\`。\n`);
    }
    lines.push("\n");
    for (const e of entries) lines.push(e + "\n");
    if (sections) {
      lines.push("\n## 背景\n\n正文。\n");
      lines.push("\n## 位置\n\n正文。\n");
      lines.push("\n## 当前状态\n\n正文。\n");
      lines.push("\n## 待办\n\n");
      if (todosRef) lines.push("> 行动区在 [HANDOFF-todos.md](HANDOFF-todos.md)。\n");
      lines.push("\n## 开始步骤\n\n正文。\n");
    }
    fs.writeFileSync(path.join(tree, "HANDOFF.md"), lines.join(""), "utf-8");
    if (journalFile) fs.writeFileSync(path.join(tree, "journal", vol), "# journal\n", "utf-8");
    if (todos) {
      fs.writeFileSync(path.join(tree, "HANDOFF-todos.md"),
        todoLines.map((t) => t + "\n").join(""), "utf-8");
    }
  }

  const short = "- 2026-08-31｜**会话 t**：一句结论。";
  const longEntry = "- 2026-08-31｜**会话 t**：" + "长".repeat(300);

  const cases: Case[] = [
    { entries: [short], jref: true, secs: true, jfile: true, todos: true,
      tlines: ["- [ ] 待办甲，行动+触发+指针。", "- [x] 已办乙，一行指针。"],
      ref: true, expected: 0, desc: "conforming (summary window + todos file) -> pass" },
    { entries: Array.from({ length: 30 }, () => short), jref: true, secs: true, jfile: true, todos: true,
      tlines: ["- [ ] 待办甲。"], ref: true, expected: 1, desc: "30 entries exceeds max window -> fail" },
    { entries: [longEntry], jref: true, secs: true, jfile: true, todos: true,
      tlines: ["- [ ] 待办甲。"], ref: true, expected: 1, desc: "over-long window entry -> fail" },
    { entries: [short], jref: true, secs: true, jfile: true, todos: false, tlines: [], ref: false,
      expected: 1, desc: "todos file missing -> fail" },
    { entries: [short], jref: true, secs: true, jfile: true, todos: true,
      tlines: ["- [ ] " + "长".repeat(500)], ref: true, expected: 1, desc: "over-long open todo -> fail" },
    { entries: [short], jref: true, secs: true, jfile: true, todos: true,
      tlines: ["- [ ] 待办甲。"], ref: false, expected: 1, desc: "todos file not referenced from 待办 -> fail" },
    { entries: [short], jref: false, secs: true, jfile: true, todos: true,
      tlines: ["- [ ] 待办甲。"], ref: true, expected: 1, desc: "missing journal pointer -> fail" },
    { entries: [short], jref: true, secs: false, jfile: true, todos: true,
      tlines: ["- [ ] 待办甲。"], ref: true, expected: 1, desc: "missing body sections -> fail" },
    { entries: [short], jref: true, secs: true, jfile: false, todos: true,
      tlines: ["- [ ] 待办甲。"], ref: true, expected: 1, desc: "referenced past-month volume missing -> fail" },
    { entries: [short], jref: true, secs: true, jfile: false, todos: true,
      tlines: ["- [ ] 待办甲。"], ref: true, expected: 0, desc: "current-month volume missing -> pass (fresh month)",
      vol: volCurrent },
    { entries: [short], jref: true, secs: true, jfile: true, todos: true,
      tlines: Array.from({ length: 25 }, (_, n) => `- [ ] 待办 ${n}。`), ref: true, expected: 1,
      desc: "too many open todos -> fail" },
    { entries: [short], jref: true, secs: true, jfile: true, todos: true,
      tlines: ["- [x] 已办乙。"], ref: true, expected: 0, desc: "no open items, closed ok -> pass" },
  ];

  let failed = 0;
  const td = fs.mkdtempSync(path.join(os.tmpdir(), "hstruct-"));
  try {
    cases.forEach((c, i) => {
      const vol = c.vol ?? volExists;
      const tree = path.join(td, `tree-${i}`);
      fs.mkdirSync(tree, { recursive: true });
      build(tree, c.entries, c.jref, c.secs, c.jfile, c.todos, c.tlines, c.ref, vol);
      const { count: _count, errors } = scan(
        path.join(tree, "HANDOFF.md"), path.join(tree, "HANDOFF-todos.md"),
        DEFAULT_MAX_WINDOW, DEFAULT_MAX_ENTRY, DEFAULT_MAX_OPEN, DEFAULT_MAX_TOTAL,
        DEFAULT_MAX_OPEN_CHARS, DEFAULT_MAX_CLOSED_CHARS);
      const actual: 0 | 1 = errors.length > 0 ? 1 : 0;
      if (actual === c.expected) {
        console.log(`  ok: ${c.desc}`);
      } else {
        console.log(`  ✗ ${c.desc}: expected exit ${c.expected}, got ${actual} ` +
          `(${errors.join(" ; ")})`);
        failed = 1;
      }
    });
  } finally {
    fs.rmSync(td, { recursive: true, force: true });
  }
  if (failed === 0) {
    console.log("== verify-handoff-structure self-test passed ==");
  } else {
    console.error("== verify-handoff-structure self-test failed ==");
  }
  return failed;
}

// --- CLI（argparse 同参数面） -----------------------------------------------

interface Args {
  handoff: string;
  todos: string;
  maxWindow: number;
  maxEntry: number;
  maxOpen: number;
  maxTotal: number;
  maxOpenChars: number;
  maxClosedChars: number;
}

const INT_FLAGS = new Set(["max-window", "max-entry", "max-open", "max-total", "max-open-chars", "max-closed-chars"]);
const PATH_FLAGS = new Set(["handoff", "todos"]);

function usage(prog: string): string {
  return `usage: ${prog} [-h] [--handoff HANDOFF] [--todos TODOS] [--max-window MAX_WINDOW] [--max-entry MAX_ENTRY] [--max-open MAX_OPEN] [--max-total MAX_TOTAL] [--max-open-chars MAX_OPEN_CHARS] [--max-closed-chars MAX_CLOSED_CHARS]`;
}

function argError(prog: string, msg: string): never {
  console.error(usage(prog));
  console.error(`${prog}: error: ${msg}`);
  process.exit(2);
}

function showHelp(prog: string): void {
  console.log(usage(prog));
  console.log();
  console.log("Verify HANDOFF.md structure");
  console.log();
  console.log("options:");
  console.log("  -h, --help            show this help message and exit");
  for (const f of ["handoff", "todos", "max-window", "max-entry", "max-open", "max-total", "max-open-chars", "max-closed-chars"]) {
    console.log(`  --${f} ${f.toUpperCase().replace(/-/g, "_")}`);
  }
}

function parseArgs(argv: string[]): Args {
  const prog = path.basename(process.argv[1] ?? "verify-handoff-structure.mts");
  const opts = new Map<string, string>();
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "-h" || a === "--help") {
      showHelp(prog);
      process.exit(0);
    }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      const name = eq >= 0 ? a.slice(2, eq) : a.slice(2);
      if (!INT_FLAGS.has(name) && !PATH_FLAGS.has(name)) {
        argError(prog, `unrecognized arguments: ${a}`);
      }
      let val: string | undefined;
      if (eq >= 0) {
        val = a.slice(eq + 1);
      } else {
        val = argv[++i];
        if (val === undefined) argError(prog, `argument --${name}: expected one argument`);
      }
      opts.set(name, val!);
    } else {
      positional.push(a);
    }
  }
  if (positional.length > 0) {
    argError(prog, `unrecognized arguments: ${positional.join(" ")}`);
  }
  const num = (name: string, def: number): number => {
    const raw = opts.get(name);
    if (raw === undefined) return def;
    if (!/^[+-]?\d+$/.test(raw)) {
      argError(prog, `argument --${name}: invalid int value: '${raw}'`);
    }
    return Number.parseInt(raw, 10);
  };
  return {
    handoff: opts.get("handoff") ?? DEFAULT_HANDOFF,
    todos: opts.get("todos") ?? DEFAULT_TODOS,
    maxWindow: num("max-window", DEFAULT_MAX_WINDOW),
    maxEntry: num("max-entry", DEFAULT_MAX_ENTRY),
    maxOpen: num("max-open", DEFAULT_MAX_OPEN),
    maxTotal: num("max-total", DEFAULT_MAX_TOTAL),
    maxOpenChars: num("max-open-chars", DEFAULT_MAX_OPEN_CHARS),
    maxClosedChars: num("max-closed-chars", DEFAULT_MAX_CLOSED_CHARS),
  };
}

function realRun(): number {
  const args = parseArgs(process.argv.slice(2));
  // 与 py 同口径：todos 相对 HANDOFF 自身父目录解析，非 cwd。
  const handoff = pyPathStr(args.handoff);
  const todos = joinPy(pyParentDir(args.handoff), args.todos);
  const { count, errors } = scan(handoff, todos, args.maxWindow, args.maxEntry,
    args.maxOpen, args.maxTotal, args.maxOpenChars, args.maxClosedChars);
  console.log(`HANDOFF 交接更新记录 entries: ${count}`);
  if (errors.length > 0) {
    for (const e of errors) console.log(`FAIL: ${e}`);
    return 1;
  }
  console.log("OK");
  return 0;
}

if (process.argv[2] === "--self-test") {
  process.exit(selfTest());
}
process.exit(realRun());
