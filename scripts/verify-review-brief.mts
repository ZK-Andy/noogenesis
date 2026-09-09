#!/usr/bin/env node
/**
 * verify-review-brief — 评审简报闸（review.md §3 契约）。
 *
 * 判据：每条评审泳道（R1/R2/R3）必须由主会话在评审 agent 启动「前」从简报发射
 * ——简报界定评审任务（范围 + 定向检查 + 显式除外），使泳道一次完整跑完；
 * 「中断 = 未审」：不存在「到限即返部分发现」出口，有界简报正是泳道无需打断
 * 即可完整完成的机制。本件机械化检查该纪律：
 *   - R1/R2/R3 各需恰有一份 `<repo>/.review-briefs/R<N>-<topic>.md`（本地工作
 *     文档，gitignored）；
 *   - Scope 须带 `base:`/`head:`、非空「需深审面」清单（「无」拒绝）与「陪跑
 *     文件」行；
 *   - 陪跑文件（声称机器门禁已盖）⇒ 必须有「门禁自证」行且 exit 码全 0——
 *     「已盖」须由主会话实跑背书；exit 非 0 的红门禁不得列陪跑；
 *     「陪跑文件：无」免自证；
 *   - Directed checks 1–5 条 `- [ ]`；显式除外 ≥1 条；Report contract 固定句
 *     `Blocker[]/Suggestion[]` 在位。
 * 结构模板与字段规则单源 docs/method/review.md §3；本闸只管机器可查子集。
 *
 * 泳道推导（单源 = tier 分类）：默认由简报自报 base..head 范围的 tier 决定
 * （FULL→R1/R2/R3，LIGHT→R2；适配先提交后评审的批次序）；--lanes R1,R2,R3
 * 覆盖；保守回退 = 三条全要。飞行中简报的 base..head 必须一致（防一份更窄
 * 的范围把整场评审泳道集静默降级）。
 *
 * 结构性例外：brief 闸是评审发射前检查、仅本地预发射不入 CI（简报目录
 * gitignored；无简报在飞 = 空过，CI 侧保持绿且安静）。
 * 消费契约（同族单源）：import 同族 scripts/verify-review-tier.mts 的 export
 * classify 做泳道推导（其入口分发带守卫，被 import 不执行 main）。分类单源零副本。
 *
 * 用法（仓库根运行）：
 *     node scripts/verify-review-brief.mts [--repo ROOT] [--lanes R1,R2,R3] [--enforce]
 *     node scripts/verify-review-brief.mts --self-test
 * 退出码：0 = PASS，1 = 违约（仅 --enforce 时；默认 report-only 仍 0），
 * 2 = fail-closed（参数违约：unknown lanes / unrecognized arguments 等）。
 *
 * Provenance: distilled from dotnet-deepseek-harness-desktop
 * scripts/verify-review-brief.py (MIT, 2026-09-05)。
 * B1 随族迁 TS（2026-09-08，.agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md）
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { splitLines, cmpPyStr } from "./pypara.mts";
import { classify } from "./verify-review-tier.mts";

const BRIEFS_DIR = ".review-briefs";
const LANES = ["R1", "R2", "R3"] as const;
const PROG = "verify-review-brief.mts";
const DESCRIPTION = "Review brief existence + structure gate";

// 标题须为一级标题且恰好点名一条泳道。(?![\p{L}\p{N}_]) 等价 Python 的 (?!\w)
// （Python \w 为 Unicode 感知，JS \w 仅 ASCII——防 "R2x 评审简报" 过匹配）。
const TITLE_RE = /#\s*(R[123])(?![\p{L}\p{N}_])\s*评审简报/u;
const SCOPE_HEADING = "## Scope";
const CHECKS_HEADING = "## Directed checks";
const OUTSCOPE_HEADING = "## Explicitly out of scope";
const REPORT_HEADING = "## Report contract";
const REPORT_SENTENCE = "Blocker[]/Suggestion[]";
const CHECK_ITEM_RE = /^\s*-\s*\[ \]\s+.+/u;
// Scope 引用只捕裸 git ref——模板允许尾注（"head: 0b3a501（评审对象 = …）"），
// 贪婪捕获会把尾注吞进 ref 毒化泳道推导。
const BASE_RE = /base:\s*([0-9A-Za-z._/~^-]+)/u;
const HEAD_RE = /head:\s*([0-9A-Za-z._/~^-]+)/u;
const DEEP_RE = /需深审面[^\n]*?[:：]/u;
const COMPANION_RE = /陪跑文件[^\n]*?[:：]/u;
// 门禁自证行：声明陪跑文件「机器门禁已盖」必须由主会话实跑的 exit 码背书。
// 形如「门禁自证：md-links:0，skill-format:0」。
const SELFASSERT_RE = /门禁自证[^\n]*?[:：]/u;
// 自证单项 <name>:<exit>（容忍全角冒号）。exit 任意数字、非 0 即拒收——[012]
// 会让 exit 3 等码被静默忽略成"全 0 通过"。扫描绑定在本行内，简报正文其余部分
// 的 `<token>:1`（文件:行引用）不会误报。尾部 (?![\p{L}\p{N}_]) 等价 Python \b
// 的 Unicode 边界语义（数字后跟字母 = 非边界，不得成项）。
const SELFASSERT_ITEM_RE = /([A-Za-z0-9._-]+)[:：](\d+)(?![\p{L}\p{N}_])/gu;

/** Python str.isspace 的字符集（JS \s 差 \x1c-\x1f、多 \ufeff——按 Python 口径）。 */
const PY_SPACE_RE =
  // oxlint-disable-next-line no-control-regex -- py str.isspace 集含控制字符（有意匹配）
  /[\t\n\v\f\r\x1c-\x1f\x85 \xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/u;
function pyIsSpace(ch: string | undefined): boolean {
  return ch !== undefined && PY_SPACE_RE.test(ch);
}

// ---- 逐件判据 ---------------------------------------------------------------

/** 单份简报文件的违规串（结构合规时空）。 */
function violationsForLane(filePath: string, lane: string): string[] {
  const v: string[] = [];
  if (!fs.existsSync(filePath)) {
    return [`${lane}: missing brief ${BRIEFS_DIR}/R${lane[1]}-*.md (must write brief before launching review)`];
  }
  const name = path.basename(filePath);
  const text = fs.readFileSync(filePath, "utf-8");

  const titleMatch = TITLE_RE.exec(text);
  if (titleMatch === null) {
    v.push(`${lane}: ${name} lacks '# R${lane[1]} 评审简报' title`);
  } else if (titleMatch[1] !== lane) {
    v.push(`${lane}: ${name} title lane '${titleMatch[1]}' != ${lane}`);
  }

  for (const heading of [SCOPE_HEADING, CHECKS_HEADING, OUTSCOPE_HEADING, REPORT_HEADING]) {
    if (!text.includes(heading)) v.push(`${lane}: ${name} missing '${heading}' section`);
  }

  if (BASE_RE.exec(text) === null || HEAD_RE.exec(text) === null) {
    v.push(`${lane}: ${name} Scope must carry both 'base: <ref>' and 'head: <ref>'`);
  }
  if (DEEP_RE.exec(text) === null) {
    v.push(`${lane}: ${name} Scope must list 需深审面 (files this lane reads line-by-line; empty = unbounded)`);
  } else if (!listContentIsNonempty(text, DEEP_RE)) {
    // 「需深审面：无」能过 key+colon 正则但等于没有逐行深读对象——
    // 有界自称而无界之实的简报不得溜过。
    v.push(`${lane}: ${name} 需深审面 must name ≥1 file (write 无 only under 陪跑文件)`);
  }
  if (COMPANION_RE.exec(text) === null) {
    v.push(`${lane}: ${name} Scope must list 陪跑文件 (machine-gated files scanned only; write 无 when none)`);
  }

  // 门禁自证耦合：声明「陪跑文件机器门禁已盖」必须携带主会话实跑且全 0 的 exit 码。
  const companionDeclaresGated = COMPANION_RE.exec(text) !== null && !companionIsNone(text);
  if (companionDeclaresGated) {
    if (SELFASSERT_RE.exec(text) === null) {
      v.push(`${lane}: ${name} 陪跑文件声明机器门禁已盖，但缺「门禁自证」行——主会话须实跑门禁并随行 exit 码（如「门禁自证：md-links:0，skill-format:0」）`);
    } else {
      const selfassertText = selfassertLineText(text);
      const bad: string[] = [];
      for (const m of selfassertText.matchAll(SELFASSERT_ITEM_RE)) {
        if (m[2] !== "0") bad.push(m[1]!);
      }
      if (bad.length > 0) {
        v.push(`${lane}: ${name} 门禁自证含非 0 exit（${bad.join(", ")}）——红门禁文件不得列陪跑（声言已盖却实际红 = 未证）`);
      }
    }
  }

  const checksZone = zone(text, CHECKS_HEADING, OUTSCOPE_HEADING);
  const checks = splitLines(checksZone).filter((ln) => CHECK_ITEM_RE.test(ln));
  if (checks.length === 0) {
    v.push(`${lane}: ${name} Directed checks must have 1–5 '- [ ]' items (empty = unbounded review)`);
  } else if (checks.length > 5) {
    v.push(`${lane}: ${name} Directed checks has ${checks.length} items (>5 — too broad to focus)`);
  }

  const outscopeZone = zone(text, OUTSCOPE_HEADING, REPORT_HEADING);
  const outscopeLines = splitLines(outscopeZone).filter((ln) => {
    const t = ln.trim();
    return t.startsWith("-") || t.startsWith("*");
  });
  if (outscopeLines.length === 0) {
    v.push(`${lane}: ${name} Explicitly out of scope must list ≥1 item (none = unbounded task)`);
  }

  if (!text.split("`").join("").includes(REPORT_SENTENCE)) {
    v.push(`${lane}: ${name} Report contract must carry '${REPORT_SENTENCE}'`);
  }

  return v;
}

/** 陪跑文件行声明「无」（未声称有陪跑）时为真。 */
function companionIsNone(text: string): boolean {
  const m = COMPANION_RE.exec(text);
  if (m === null) return true;
  const lineEnd = text.indexOf("\n", matchEnd(m));
  const inline = text.slice(matchEnd(m), lineEnd < 0 ? text.length : lineEnd).trim();
  return inline === "无" || inline.startsWith("无。");
}

/** 门禁自证行冒号后的内容；无该行为空串。非 0 exit 扫描只绑这一行——简报正文
 *  其余部分可携带任意 `<token>:1` / `:2` 片段（文件:行引用），全文扫描会误报
 *  成红门禁。 */
function selfassertLineText(text: string): string {
  const m = SELFASSERT_RE.exec(text);
  if (m === null) return "";
  const lineEnd = text.indexOf("\n", matchEnd(m));
  return text.slice(matchEnd(m), lineEnd < 0 ? text.length : lineEnd);
}

/** start_heading 到下一个 end_heading 之间（均不含）。 */
function zone(text: string, startHeading: string, endHeading: string): string {
  const start = text.indexOf(startHeading);
  if (start < 0) return "";
  const end = text.indexOf(endHeading, start + startHeading.length);
  return text.slice(start + startHeading.length, end < 0 ? text.length : end);
}

/** 键控清单至少点到一个具名条目时为真。内容可在键行（「需深审面：a.md」）或
 *  裸键行下的缩进子行。拒绝「需深审面：无」、裸键与空内容。 */
function listContentIsNonempty(text: string, keyRe: RegExp): boolean {
  const m = keyRe.exec(text);
  if (m === null) return false;
  const lineEnd = text.indexOf("\n", matchEnd(m));
  const inline = text.slice(matchEnd(m), lineEnd < 0 ? text.length : lineEnd).trim();
  if (inline !== "" && inline !== "无" && !inline.startsWith("无。")) return true;
  const rest = text.slice(lineEnd < 0 ? text.length : lineEnd);
  for (const ln of splitLines(rest)) {
    if (ln.trim() === "") continue;
    if (ln.startsWith("- ") || ln.startsWith("* ") || ln.startsWith("## ") || !pyIsSpace(ln[0])) {
      // 下一顶级条目/标题——清单结束
      break;
    }
    const stripped = ln.trim().replace(/^[-* ]+/, "").trim();
    if (stripped !== "" && stripped !== "无" && !stripped.startsWith("无。")) return true;
  }
  return false;
}

function matchEnd(m: RegExpExecArray): number {
  return m.index + m[0].length;
}

/** lane → 简报文件名映射（每泳道一份）+ 重复泳道名。 */
function briefPaths(repo: string): { paths: Record<string, string>; duplicates: string[] } {
  const briefsDir = path.join(repo, BRIEFS_DIR);
  const found: Record<string, string> = {};
  const duplicates: string[] = [];
  if (fs.existsSync(briefsDir) && fs.statSync(briefsDir).isDirectory()) {
    const names = fs.readdirSync(briefsDir)
      .filter((n) => /^R[123]-.*\.md$/.test(n))
      .sort(cmpPyStr); // 泳道名 ASCII——码点序与码元序同序；归口 pypara 家族单源
    for (const n of names) {
      const lane = n.slice(0, 2);
      if (found[lane] !== undefined) {
        duplicates.push(`${lane}: multiple briefs for one lane: ${path.basename(found[lane]!)} and ${n}`);
      } else {
        found[lane] = `${BRIEFS_DIR}/${n}`;
      }
    }
  }
  const paths: Record<string, string> = {};
  for (const lane of LANES) paths[lane] = found[lane]!;
  return { paths, duplicates };
}

// ---- 泳道推导（单源 = verify-review-tier 的 classify，同族 import；分类单源零副本） ------------

/** 由简报自报 base..head 范围的 tier 推导所需泳道。读第一份同时带两个 ref 的
 *  简报，用 tier 分类 base..head（适配先提交后评审的批次序）。简报/ref/分类
 *  不可用时回退三条全要。 */
function lanesFromBriefRange(repo: string, briefs: Record<string, string>): string[] {
  let base: string | null = null;
  let head: string | null = null;
  for (const lane of LANES) {
    const p = briefs[lane];
    if (p === undefined) continue;
    const text = fs.readFileSync(path.join(repo, p), "utf-8");
    const mb = BASE_RE.exec(text);
    const mh = HEAD_RE.exec(text);
    if (mb !== null && mh !== null) {
      base = mb[1]!;
      head = mh[1]!;
      break;
    }
  }
  if (base === null || head === null) return [...LANES];
  try {
    const r = spawnSync("git", ["diff", "--name-only", `${base}..${head}`],
      { cwd: repo, encoding: "utf-8" });
    if (r.error !== undefined || r.status !== 0) return [...LANES];
    const changed = splitLines(r.stdout ?? "").filter((x) => x.trim() !== "");
    const { full } = classify(changed, repo);
    return full ? [...LANES] : ["R2"];
  } catch {
    // 保守：三条全要
    return [...LANES];
  }
}

/** 飞行中简报必须声明同一 base..head 范围——范围分歧会让一份（更窄的）范围
 *  把整场评审的泳道集静默降级（防降级闸）。 */
function inconsistentRangeViolations(briefs: Record<string, string>, repo: string): string[] {
  const declared: Record<string, [string, string]> = {};
  for (const lane of LANES) {
    const p = briefs[lane];
    if (p === undefined) continue;
    const text = fs.readFileSync(path.join(repo, p), "utf-8");
    const mb = BASE_RE.exec(text);
    const mh = HEAD_RE.exec(text);
    if (mb !== null && mh !== null) declared[lane] = [mb[1]!, mh[1]!];
  }
  const distinct = new Set(Object.values(declared).map(([b, h]) => `${b}\u0000${h}`));
  if (distinct.size > 1) {
    const detail = Object.keys(declared).sort()
      .map((k) => `${k}: ${declared[k]![0]}..${declared[k]![1]}`)
      .join("; ");
    return [`briefs declare inconsistent diff ranges — ${detail}`];
  }
  return [];
}

/** 跨所需泳道汇总全部违规（结构合规时空）。
 *
 * lanes 缺省 ⇒ 由简报自报范围的 tier 推导（FULL 需 R1/R2/R3，LIGHT 需 R2）。
 * 完全无简报文件 = 无评审在飞——空过（使看不到 gitignored 简报目录的 CI
 * 保持绿且安静）。 */
function checkRepo(repo: string, lanes?: string[] | null): string[] {
  const { paths, duplicates } = briefPaths(repo);
  let out: string[];
  let required: string[];
  if (lanes === null || lanes === undefined) {
    if (LANES.every((l) => paths[l] === undefined)) return duplicates;
    out = [...duplicates, ...inconsistentRangeViolations(paths, repo)];
    required = lanesFromBriefRange(repo, paths);
  } else {
    out = [...duplicates];
    required = lanes;
  }
  for (const lane of required) {
    const p = paths[lane];
    out.push(...(p !== undefined
      ? violationsForLane(path.join(repo, p), lane)
      : [`${lane}: missing brief under ${BRIEFS_DIR}/`]));
  }
  return out;
}

// ---- argparse 等价（usage/help 折行随终端宽度，语义对齐 Python argparse） ----

/** shutil.get_terminal_size 等价：COLUMNS 环境变量优先，否则 tty 宽，否则 80。 */
function terminalWidth(): number {
  const env = process.env.COLUMNS;
  let cols = 0;
  if (env !== undefined && /^-?\d+$/.test(env)) cols = Number.parseInt(env, 10);
  if (cols <= 0) {
    cols = (process.stdout.isTTY === true &&
      Number.isInteger(process.stdout.columns) &&
      process.stdout.columns > 0)
      ? process.stdout.columns
      : 80;
  }
  return cols;
}

const USAGE_PARTS = ["[-h]", "[--repo REPO]", "[--lanes R1,R2,R3]", "[--enforce]", "[--self-test]"];
const OPTIONS_HELP: { invocation: string; help: string }[] = [
  { invocation: "-h, --help", help: "show this help message and exit" },
  { invocation: "--repo REPO", help: "repo root (default cwd)" },
  { invocation: "--lanes R1,R2,R3", help: "required lanes override (default: derive from briefs' base..head tier)" },
  { invocation: "--enforce", help: "exit 1 on any violation" },
  { invocation: "--self-test", help: "run offline fixtures" },
];

function usageGetLines(parts: string[], indent: string, prefix: string | null, textWidth: number): string[] {
  const lines: string[] = [];
  let line: string[] = [];
  const indentLength = indent.length;
  let lineLen = prefix !== null ? prefix.length - 1 : indentLength - 1;
  for (const part of parts) {
    const partLen = part.length;
    if (lineLen + 1 + partLen > textWidth && line.length > 0) {
      lines.push(indent + line.join(" "));
      line = [];
      lineLen = indentLength - 1;
    }
    line.push(part);
    lineLen += partLen + 1;
  }
  if (line.length > 0) lines.push(indent + line.join(" "));
  if (prefix !== null && lines.length > 0) lines[0] = lines[0]!.slice(indentLength);
  return lines;
}

function formatUsage(): string {
  const prefix = "usage: ";
  const textWidth = terminalWidth() - 2;
  const usage = [PROG, ...USAGE_PARTS].join(" ");
  if (prefix.length + usage.length <= textWidth) return `${prefix}${usage}\n\n`;

  const progLen = PROG.length;
  let lines: string[];
  if (prefix.length + progLen <= 0.75 * textWidth) {
    const indent = " ".repeat(prefix.length + progLen + 1);
    lines = usageGetLines([PROG, ...USAGE_PARTS], indent, prefix, textWidth);
  } else {
    const indent = " ".repeat(prefix.length);
    lines = usageGetLines(USAGE_PARTS, indent, null, textWidth);
    if (lines.length > 1) lines = usageGetLines(USAGE_PARTS, indent, null, textWidth);
    lines = [PROG, ...lines];
  }
  let wrapped = lines.join("\n");
  if (wrapped.startsWith(PROG)) wrapped = wrapped.slice(PROG.length);
  return `${prefix}${PROG}${wrapped}\n\n`;
}

/** textwrap.wrap 等价（贪心按词折行，词内空白折叠）。 */
function wrapWords(text: string, width: number): string[] {
  const collapsed = text.replace(/[ \t\n\r\v\f]+/g, " ").trim();
  if (collapsed === "") return [];
  const words = collapsed.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur === "") {
      cur = w;
      continue;
    }
    if (cur.length + 1 + w.length > width) {
      lines.push(cur);
      cur = w;
    } else {
      cur = `${cur} ${w}`;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function formatHelp(): string {
  const width = terminalWidth() - 2;
  let out = formatUsage();
  out += wrapWords(DESCRIPTION, Math.max(width, 11)).join("\n") + "\n\n";
  const maxHelpPosition = Math.min(24, Math.max(width - 20, 4));
  const actionMaxLength = Math.max(...OPTIONS_HELP.map((o) => o.invocation.length + 2));
  const helpPosition = Math.min(actionMaxLength + 2, maxHelpPosition);
  const helpWidth = Math.max(width - helpPosition, 11);
  const actionWidth = helpPosition - 2 - 2;
  let items = "";
  for (const o of OPTIONS_HELP) {
    let head: string;
    let indentFirst: number;
    if (o.invocation.length <= actionWidth) {
      head = "  " + o.invocation.padEnd(actionWidth, " ") + "  ";
      indentFirst = 0;
    } else {
      head = `  ${o.invocation}\n`;
      indentFirst = helpPosition;
    }
    items += head;
    const helpLines = wrapWords(o.help, helpWidth);
    if (helpLines.length > 0) {
      items += " ".repeat(indentFirst) + helpLines[0] + "\n";
      for (const l of helpLines.slice(1)) items += " ".repeat(helpPosition) + l + "\n";
    } else {
      items += "\n";
    }
  }
  out += "options:\n" + items + "\n";
  return out.replace(/^\n+/, "").replace(/\n+$/, "") + "\n";
}

/** argparse parser.error 等价：usage + error 行进 stderr，exit 2。 */
function parserError(message: string): never {
  process.stderr.write(formatUsage().replace(/\n\n$/, "\n"));
  process.stderr.write(`${PROG}: error: ${message}\n`);
  return process.exit(2) as never;
}

// ---- self-test（夹具逐组同迁 py） -------------------------------------------

function assertOk(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`AssertionError: ${msg}`);
}

function anyMatch(rows: string[], cond: (s: string) => boolean): boolean {
  return rows.some(cond);
}

function reprList(rows: string[]): string {
  return `[${rows.map((s) => `'${s}'`).join(", ")}]`;
}

/** 离线夹具；每组真跑 checkRepo/violationsForLane。 */
function selfTest(): number {
  const td = fs.mkdtempSync(path.join(os.tmpdir(), "vrb-"));
  const root = td;
  const briefsDirOf = (dir: string) => path.join(dir, BRIEFS_DIR);

  const w = (dir: string, name: string, lane: string, scopeBody: string,
    checks = "- [ ] c\n", outscope = "- d\n"): void => {
    const p = path.join(briefsDirOf(dir), name);
    fs.writeFileSync(p,
      `# ${lane} 评审简报（lane）\n\n## Scope\n- base: a  head: b\n${scopeBody}\n` +
      "- 门禁自证：md-links:0，skill-format:0\n\n" +
      `## Directed checks\n${checks}\n## Explicitly out of scope\n${outscope}\n` +
      "## Report contract\n- 返回 `Blocker[]/Suggestion[]`；空即无发现\n",
      "utf-8");
  };

  fs.mkdirSync(briefsDirOf(root));
  w(root, "R1-a.md", "R1", "- 需深审面：scripts/verify-x.py\n- 陪跑文件：docs/method/review.md\n- diff 面相邻件：无");
  w(root, "R2-a.md", "R2", "- 需深审面：scripts/verify-x.py\n- 陪跑文件：无");
  w(root, "R3-a.md", "R3", "- 需深审面：.agents/notes/x.md\n- 陪跑文件：无");
  assertOk(checkRepo(root, [...LANES]).length === 0, "fixture 1 (well-formed R1/R2/R3) should pass");

  // 缺 R1 简报 → 违约
  const root2 = path.join(td, "f2");
  fs.mkdirSync(briefsDirOf(root2), { recursive: true });
  fs.writeFileSync(path.join(briefsDirOf(root2), "R2-a.md"),
    "# R2 评审简报（code-review）\n\n## Scope\n- base: a  head: b\n- 需深审面：x\n- 陪跑文件：无\n\n" +
    "## Directed checks\n- [ ] c\n\n## Explicitly out of scope\n- d\n\n## Report contract\n" +
    "- 返回 `Blocker[]/Suggestion[]`；空即无发现\n", "utf-8");
  assertOk(anyMatch(checkRepo(root2, [...LANES]), (s) => s.includes("R1: missing brief")),
    "fixture 2 (missing R1) should flag R1");

  // 无界（缺 out-of-scope）R2 → 违约
  const root3 = path.join(td, "f3");
  fs.mkdirSync(briefsDirOf(root3), { recursive: true });
  fs.writeFileSync(path.join(briefsDirOf(root3), "R2-a.md"),
    "# R2 评审简报（code-review）\n\n## Scope\n- base: a  head: b\n- 需深审面：x\n- 陪跑文件：无\n\n" +
    "## Directed checks\n- [ ] c\n\n" +
    "## Report contract\n- 返回 `Blocker[]/Suggestion[]`；空即无发现\n", "utf-8");
  assertOk(anyMatch(checkRepo(root3, [...LANES]), (s) => s.includes("R2") && s.includes("out of scope")),
    "fixture 3 (no out-of-scope) should flag R2");

  // >5 条定向检查 → 违约
  const root4 = path.join(td, "f4");
  fs.mkdirSync(briefsDirOf(root4), { recursive: true });
  fs.writeFileSync(path.join(briefsDirOf(root4), "R1-a.md"),
    "# R1 评审简报（simplifications）\n\n## Scope\n- base: a  head: b\n- 需深审面：x\n- 陪跑文件：无\n\n" +
    "## Directed checks\n" + Array.from({ length: 6 }, (_, i) => `- [ ] c${i}\n`).join("") +
    "\n## Explicitly out of scope\n- d\n\n## Report contract\n" +
    "- 返回 `Blocker[]/Suggestion[]`；空即无发现\n", "utf-8");
  assertOk(anyMatch(checkRepo(root4, [...LANES]), (s) => s.includes("R1") && s.includes(">5")),
    "fixture 4 (>5 checks) should flag R1");

  // 缺需深审面 → 违约
  const root5 = path.join(td, "f5");
  fs.mkdirSync(briefsDirOf(root5), { recursive: true });
  fs.writeFileSync(path.join(briefsDirOf(root5), "R2-a.md"),
    "# R2 评审简报（code-review）\n\n## Scope\n- base: a  head: b\n- 陪跑文件：x\n- 门禁自证：md-links:0\n\n" +
    "## Directed checks\n- [ ] c\n\n## Explicitly out of scope\n- d\n\n## Report contract\n" +
    "- 返回 `Blocker[]/Suggestion[]`；空即无发现\n", "utf-8");
  assertOk(anyMatch(checkRepo(root5, [...LANES]), (s) => s.includes("R2") && s.includes("需深审面")),
    "fixture 5 (missing 需深审面) should flag R2");

  // 「需深审面：无」→ 违约（非空清单强制）
  const root6 = path.join(td, "f6");
  fs.mkdirSync(briefsDirOf(root6), { recursive: true });
  fs.writeFileSync(path.join(briefsDirOf(root6), "R2-a.md"),
    "# R2 评审简报（code-review）\n\n## Scope\n- base: a  head: b\n- 需深审面：无\n- 陪跑文件：无\n\n" +
    "## Directed checks\n- [ ] c\n\n## Explicitly out of scope\n- d\n\n## Report contract\n" +
    "- 返回 `Blocker[]/Suggestion[]`；空即无发现\n", "utf-8");
  assertOk(anyMatch(checkRepo(root6, [...LANES]), (s) => s.includes("R2") && s.includes("需深审面 must name ≥1 file")),
    "fixture 6 (需深审面：无) should flag R2");

  // 陪跑声明已盖但缺门禁自证 → 违约（门禁自证耦合）
  const root7 = path.join(td, "f7");
  fs.mkdirSync(briefsDirOf(root7), { recursive: true });
  fs.writeFileSync(path.join(briefsDirOf(root7), "R2-a.md"),
    "# R2 评审简报（code-review）\n\n## Scope\n- base: a  head: b\n- 需深审面：x\n- 陪跑文件：scripts/verify-x.py（机器门禁已盖）\n\n" +
    "## Directed checks\n- [ ] c\n\n## Explicitly out of scope\n- d\n\n## Report contract\n" +
    "- 返回 `Blocker[]/Suggestion[]`；空即无发现\n", "utf-8");
  assertOk(anyMatch(checkRepo(root7, [...LANES]), (s) => s.includes("R2") && s.includes("门禁自证")),
    "fixture 7 (companion without gate self-assertion) should flag R2");

  // 门禁自证含非 0 exit → 违约（红门禁不得搭车陪跑）
  const root8 = path.join(td, "f8");
  fs.mkdirSync(briefsDirOf(root8), { recursive: true });
  fs.writeFileSync(path.join(briefsDirOf(root8), "R2-a.md"),
    "# R2 评审简报（code-review）\n\n## Scope\n- base: a  head: b\n- 需深审面：x\n- 陪跑文件：scripts/verify-x.py（机器门禁已盖）\n" +
    "- 门禁自证：md-links:2，skill-format:0\n\n" +
    "## Directed checks\n- [ ] c\n\n## Explicitly out of scope\n- d\n\n## Report contract\n" +
    "- 返回 `Blocker[]/Suggestion[]`；空即无发现\n", "utf-8");
  assertOk(anyMatch(checkRepo(root8, [...LANES]), (s) => s.includes("R2") && s.includes("非 0 exit")),
    "fixture 8 (self-assertion with non-zero exit) should flag R2");

  // 同泳道重复简报 → 上报
  const root9 = path.join(td, "f9");
  fs.mkdirSync(briefsDirOf(root9), { recursive: true });
  for (const name of ["R2-a.md", "R2-b.md"]) {
    fs.writeFileSync(path.join(briefsDirOf(root9), name),
      "# R2 评审简报（code-review）\n\n## Scope\n- base: a  head: b\n- 需深审面：x\n- 陪跑文件：无\n\n" +
      "## Directed checks\n- [ ] c\n\n## Explicitly out of scope\n- d\n\n## Report contract\n" +
      "- 返回 `Blocker[]/Suggestion[]`；空即无发现\n", "utf-8");
  }
  assertOk(anyMatch(checkRepo(root9, ["R2"]), (s) => s.includes("multiple briefs")),
    "fixture 9 (duplicate lane briefs) should be reported");

  // 无简报在飞 → 空过（CI 形态：简报目录 gitignored）
  const root10 = path.join(td, "f10");
  fs.mkdirSync(briefsDirOf(root10), { recursive: true });
  assertOk(checkRepo(root10).length === 0, "fixture 10 (no briefs in flight) should pass vacuously");

  // 面向真实 git 仓的泳道推导：FULL 范围 → 三条泳道；LIGHT 范围 → 仅 R2。
  const repo = path.join(td, "f11");
  fs.mkdirSync(path.join(repo, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(repo, "docs"));
  fs.writeFileSync(path.join(repo, "docs", "note.md"), "base\n", "utf-8");

  const git = (...args: string[]): void => {
    const r = spawnSync("git", args, { cwd: repo, encoding: "utf-8" });
    if (r.error !== undefined || r.status !== 0) {
      throw new Error(`fixture git ${args.join(" ")} failed: ${r.stderr}`);
    }
  };
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  git("add", "-A");
  git("commit", "-qm", "init");
  fs.writeFileSync(path.join(repo, "scripts", "verify-x.py"), "# gate\n", "utf-8");
  git("add", "-A");
  git("commit", "-qm", "full change");
  const revParse = (ref: string): string => {
    const r = spawnSync("git", ["rev-parse", ref], { cwd: repo, encoding: "utf-8" });
    if (r.error !== undefined || r.status !== 0) throw new Error(`fixture git rev-parse failed: ${r.stderr}`);
    return (r.stdout ?? "").trim();
  };
  const base = revParse("HEAD~1");
  const head = revParse("HEAD");

  const briefText = (lane: string, b: string, h: string): string =>
    `# ${lane} 评审简报（lane）\n\n## Scope\n- base: ${b}  head: ${h}\n` +
    "- 需深审面：scripts/verify-x.py\n- 陪跑文件：无\n\n" +
    "## Directed checks\n- [ ] c\n\n## Explicitly out of scope\n- d\n\n" +
    "## Report contract\n- 返回 `Blocker[]/Suggestion[]`；空即无发现\n";

  const root11 = briefsDirOf(repo);
  fs.mkdirSync(root11);
  fs.writeFileSync(path.join(root11, "R2-a.md"), briefText("R2", base, head), "utf-8");
  // 泳道由自报的 FULL 范围推导
  const vsFull = checkRepo(repo);
  assertOk(anyMatch(vsFull, (s) => s.includes("R1: missing brief")),
    `fixture 11a (FULL range) should derive three lanes, got ${reprList(vsFull)}`);
  assertOk(!anyMatch(vsFull, (s) => s.includes("R2")),
    `fixture 11a: R2 brief itself is well-formed, got ${reprList(vsFull)}`);
  // LIGHT 范围（base..HEAD~1 只动 docs/）→ R2 即足
  fs.writeFileSync(path.join(root11, "R2-a.md"), briefText("R2", base, "HEAD~1"), "utf-8");
  assertOk(checkRepo(repo).length === 0, "fixture 11b (LIGHT range) should derive R2-only and pass");

  // 声明范围分歧 → 违约（防降级闸）
  const root12 = path.join(td, "f12");
  fs.mkdirSync(briefsDirOf(root12), { recursive: true });
  fs.writeFileSync(path.join(briefsDirOf(root12), "R1-a.md"), briefText("R1", "a", "b"), "utf-8");
  fs.writeFileSync(path.join(briefsDirOf(root12), "R2-a.md"), briefText("R2", "a", "HEAD~2"), "utf-8");
  assertOk(anyMatch(checkRepo(root12), (s) => s.includes("inconsistent diff ranges")),
    "fixture 12 (divergent ranges) should be reported");

  console.log("verify-review-brief --self-test OK (12 fixtures: structure/self-assertion/lane-derivation)");
  return 0;
}

// ---- 入口（CLI 参数面与 py argparse 逐一对齐） -------------------------------

function looksLikeOption(tok: string): boolean {
  // argparse 口径：以 "-" 开头即按选项处理（ lone "-" 与负数除外）。
  return tok.startsWith("-") && tok !== "-" && !/^-\d+$/.test(tok) && !/^-\d*\.\d+$/.test(tok);
}

interface Args { repo?: string; lanes?: string; enforce: boolean; selfTest: boolean }

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = { enforce: false, selfTest: false };
  const extras: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]!;
    if (tok === "-h" || tok === "--help") {
      process.stdout.write(formatHelp());
      process.exit(0);
    }
    const takeValue = (flag: string): string => {
      const v = argv[i + 1];
      if (v === undefined || looksLikeOption(v)) {
        parserError(`argument ${flag}: expected one argument`);
      }
      i += 1;
      return v;
    };
    if (tok === "--repo") {
      args.repo = takeValue("--repo");
      continue;
    }
    if (tok.startsWith("--repo=")) {
      args.repo = tok.slice("--repo=".length);
      continue;
    }
    if (tok === "--lanes") {
      args.lanes = takeValue("--lanes");
      continue;
    }
    if (tok.startsWith("--lanes=")) {
      args.lanes = tok.slice("--lanes=".length);
      continue;
    }
    if (tok === "--enforce") {
      args.enforce = true;
      continue;
    }
    if (tok === "--self-test") {
      args.selfTest = true;
      continue;
    }
    extras.push(tok);
  }
  if (extras.length > 0) parserError(`unrecognized arguments: ${extras.join(" ")}`);
  return args;
}

function main(): number {
  const args = parseArgs();

  if (args.selfTest) return selfTest();

  // py 口径：args.lanes 为 "" 时 falsy → lanes=None（走推导，不报错）。
  const lanes = args.lanes !== undefined && args.lanes !== ""
    ? args.lanes.split(",").map((x) => x.trim().toUpperCase())
    : null;
  const bad = (lanes ?? []).filter((x) => !(LANES as readonly string[]).includes(x));
  if (bad.length > 0) parserError(`unknown lanes: ${bad.join(", ")} (allowed: R1,R2,R3)`);

  let repo = path.resolve(args.repo ?? ".");
  try {
    repo = fs.realpathSync(repo);
  } catch {
    // Python Path.resolve(strict=False)：解析不了符号链接时保留已解析路径
  }

  const violations = checkRepo(repo, lanes);
  for (const lane of LANES) {
    for (const s of violations.filter((v) => v.startsWith(`${lane}:`))) {
      console.log(s);
    }
  }
  if (violations.length > 0) {
    console.log(`review-brief: ${violations.length} violation(s)`);
    return args.enforce ? 1 : 0;
  }
  console.log("review-brief: OK (required briefs present and well-formed)");
  return 0;
}

// 入口守卫：直接运行时才分发 main；被同族 import 时不执行（scripts/AGENTS 规则）。
const invokedAsEntry = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href;
if (invokedAsEntry) process.exit(main());
