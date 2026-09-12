#!/usr/bin/env node
/**
 * verify-dossier-format — 主题状态页（档案页）骨架门禁。
 *
 * 判据（`docs/state/` 下每件 `*-dossier.md`，全部机器可查）：
 * 1. 落点与命名：仅 `docs/state/`，文件名 `[a-z0-9-]*-dossier.md`；目录缺席或空
 *    时零约束（PASS）——与 verify-postmortem-naming 同姿态；
 * 2. 头部说明块：H1 标题 + 首个 `##` 之前至少一行 `> ` 引用块（档案页自述其
 *    唯一状态家身份与迁入源）；
 * 3. 骨架四段封闭集：`## 决策指针` / `## 行动区` / `## 触发条件` / `## 状态日志`
 *    必须齐全、按此序，且不得出现第五个 `##` 节——新素材归其 tier 的家，不往
 *    状态页塞（单源纪律的机器面）；
 * 4. 条目形态：决策指针条目须带相对 Markdown 链接（「决策不落本页，只列指针」
 *    的合同面）；行动区条目须 `- [ ]` / `- [x]`；状态日志条目须
 *    `- YYYY-MM-DD｜` 前缀；
 * 5. 有界：行动区 open 条 ≤ 12、状态日志条 ≤ 40——超限即压缩最旧条目（写作
 *    规则见 doc-standards §1「主题状态页」），闸只判「有没有越界」，压缩本身
 *    的语义面归评审。
 *
 * 制度单源：docs/method/doc-standards.md §1（tier 表 + 主题状态页规则）；
 * 立项 ADR 2026-09-13-dossier-institution。
 *
 * 用法（仓库根运行，同其余 verify-*）：
 *   node scripts/verify-dossier-format.mts [--self-test]
 * 退出码：0 = PASS（含零约束 SKIP），1 = 违约；2 = 参数错（fail-closed）。
 * 运行前提：node ≥22.18（原生 type stripping）；模块形态显式 .mts（同族纪律）。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { cmpPyStr, pyFromIso, pyStrip, splitLines } from "./pypara.mts";

interface Violation { file: string; reason: string }

const DEFAULT_MAX_OPEN = 12;
const DEFAULT_MAX_LOG = 40;

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*-dossier\.md$/;
const H1_RE = /^#\s+\S/;
const QUOTE_RE = /^>\s?\S/;
const H2_RE = /^##\s+(.+?)\s*$/;
const ITEM_RE = /^- \[([ x])\] /;
const DECISION_LINK_RE = /\]\([^)]+\.md(?:#[^)]*)?\)/;
const LOG_ITEM_RE = /^- (\d{4})-(\d{2})-(\d{2})｜\S/;

/** 骨架四段，顺序即判据。 */
const SECTIONS = ["决策指针", "行动区", "触发条件", "状态日志"] as const;

/** 单件档案页校验：返回违约理由清单，空即合规。 */
function checkDossierText(text: string, maxOpen: number, maxLog: number): string[] {
  const errors: string[] = [];
  const lines = splitLines(text).map((l) => pyStrip(l));

  if (!lines.some((l) => H1_RE.test(l))) errors.push("缺 H1 标题（`# <标题>`）");

  // 节切分：首个 `##` 之前的内容即头部说明块。
  const headings: { name: string; index: number }[] = [];
  lines.forEach((l, i) => {
    const m = H2_RE.exec(l);
    if (m) headings.push({ name: m[1]!, index: i });
  });
  const firstHeading = headings.length > 0 ? headings[0]!.index : lines.length;
  if (!lines.slice(0, firstHeading).some((l) => QUOTE_RE.test(l))) {
    errors.push("缺头部说明块（首个 `##` 之前至少一行 `> ` 引用）");
  }

  const unknown = headings.filter((h) => !(SECTIONS as readonly string[]).includes(h.name));
  if (unknown.length > 0) {
    errors.push(`骨架四段是封闭集，多出节：${unknown.map((h) => `## ${h.name}`).join(" / ")}`);
  }
  const known = headings.filter((h) => (SECTIONS as readonly string[]).includes(h.name));
  const seenNames = known.map((h) => h.name);
  // 出现次数独立成判据：只查「名字集合」会放行重复段（重复段既不在 unknown 面，
  // 又让长度不再等于 4，从而绕过下面的顺序判据，且 body() 只读首次出现）。
  const counts = new Map<string, number>();
  for (const h of known) counts.set(h.name, (counts.get(h.name) ?? 0) + 1);
  const dupes = [...counts.entries()].filter(([, n]) => n > 1);
  if (dupes.length > 0) {
    errors.push(`骨架段重复：${dupes.map(([name, n]) => `## ${name}（${n} 次）`).join(" / ")}`);
  }
  for (const name of SECTIONS) {
    if (!seenNames.includes(name)) errors.push(`缺骨架段：## ${name}`);
  }
  if (dupes.length === 0 && seenNames.length === SECTIONS.length) {
    const ordered = known.every((h, i) => SECTIONS[i] === h.name);
    if (!ordered) {
      errors.push(`骨架四段顺序错：实际 [${seenNames.join(" → ")}]，应为 [${SECTIONS.join(" → ")}]`);
    }
  }

  const body = (name: string): string[] => {
    const at = headings.findIndex((h) => h.name === name);
    if (at < 0) return [];
    const start = headings[at]!.index + 1;
    const end = at + 1 < headings.length ? headings[at + 1]!.index : lines.length;
    return lines.slice(start, end);
  };

  const items = (rows: string[]): string[] => rows.filter((l) => l.startsWith("- "));

  const decisions = items(body("决策指针"));
  if (decisions.length === 0) errors.push("## 决策指针 为空（决策须以指针入场）");
  for (const [i, row] of decisions.entries()) {
    if (!DECISION_LINK_RE.test(row)) {
      errors.push(`## 决策指针 第 ${i + 1} 条缺相对 Markdown 链接（本段只列指针，不落决策）`);
    }
  }

  const actions = items(body("行动区"));
  let open = 0;
  for (const [i, row] of actions.entries()) {
    if (!ITEM_RE.test(row)) {
      errors.push(`## 行动区 第 ${i + 1} 条须以 \`- [ ]\` / \`- [x]\` 开头`);
      continue;
    }
    if (ITEM_RE.exec(row)![1] === " ") open += 1;
  }
  if (open > maxOpen) {
    errors.push(`## 行动区 open 条 ${open} 超出上限 ${maxOpen}（先办或压缩，再入场）`);
  }

  if (body("触发条件").every((l) => l === "")) errors.push("## 触发条件 为空（未到触发的项须在案）");

  const logs = items(body("状态日志"));
  if (logs.length === 0) errors.push("## 状态日志 为空");
  for (const [i, row] of logs.entries()) {
    const m = LOG_ITEM_RE.exec(row);
    if (!m) {
      errors.push(`## 状态日志 第 ${i + 1} 条须以 \`- YYYY-MM-DD｜\` 开头`);
      continue;
    }
    // 日历日判定走共享原语 pyFromIso（同 verify-gene-format 的 ISO 口径），不手搓。
    const dateStr = `${m[1]}-${m[2]}-${m[3]}`;
    if (pyFromIso(dateStr) === null) {
      errors.push(`## 状态日志 第 ${i + 1} 条日期非法：${dateStr}`);
    }
  }
  if (logs.length > maxLog) {
    errors.push(`## 状态日志 ${logs.length} 条超出上限 ${maxLog}（超限即把最旧条目压缩为一行）`);
  }
  return errors;
}

/** 对目录内每件档案页做校验；dir 不存在或空 → 无违规（零约束）。 */
function checkDossierDir(dir: string, maxOpen: number, maxLog: number): Violation[] {
  if (!fs.existsSync(dir)) return [];
  const violations: Violation[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => cmpPyStr(a.name, b.name))) {
    if (ent.isDirectory()) {
      violations.push({ file: ent.name, reason: "docs/state/ 只收扁平档案页，不收子目录" });
      continue;
    }
    if (!ent.name.endsWith(".md")) {
      violations.push({ file: ent.name, reason: "只允许 .md 条目" });
      continue;
    }
    if (!NAME_RE.test(ent.name)) {
      violations.push({ file: ent.name, reason: "命名须为 <kebab-topic>-dossier.md" });
      continue;
    }
    const text = fs.readFileSync(path.join(dir, ent.name), "utf-8");
    for (const reason of checkDossierText(text, maxOpen, maxLog)) {
      violations.push({ file: ent.name, reason });
    }
  }
  return violations;
}

/** 最小合规档案页：夹具基线与自测的可读锚点。 */
function conformingDossier(): string {
  return [
    "# 示例线档案页",
    "",
    "> 本线状态唯一家；骨架四段固定。",
    "",
    "## 决策指针",
    "",
    "- **基线拍板**：[示例 ADR](../../.agents/notes/implemented/process/2026-09-13-dossier-institution.md)。",
    "",
    "## 行动区",
    "",
    "- [x] 已办事项（一行指针）。",
    "- [ ] 待办事项：动作 + 触发 + 指针。",
    "",
    "## 触发条件",
    "",
    "- 前置 ✅（示例）。",
    "",
    "## 状态日志",
    "",
    "- 2026-09-13｜建档。",
    "",
  ].join("\n");
}

function realRun(): number {
  const dir = path.join(process.cwd(), "docs", "state");
  if (!fs.existsSync(dir)) {
    console.log("SKIP: docs/state/ 不存在（零约束）");
    return 0;
  }
  const entries = fs.readdirSync(dir);
  const violations = checkDossierDir(dir, DEFAULT_MAX_OPEN, DEFAULT_MAX_LOG);
  if (violations.length === 0) {
    console.log(entries.length === 0 ? "SKIP: docs/state/ 为空（零约束）" : `OK: ${entries.length} 件档案页骨架合规`);
    return 0;
  }
  for (const v of violations) console.log(`FAIL: ${v.file}: ${v.reason}`);
  return 1;
}

/** 夹具自测：合规样例必须 PASS，每类违约必须 FAIL（判据逐条可证伪）。 */
function selfTest(): number {
  const failures: string[] = [];
  const check = (label: string, text: string, expectFail: boolean, maxOpen = DEFAULT_MAX_OPEN, maxLog = DEFAULT_MAX_LOG): void => {
    const got = checkDossierText(text, maxOpen, maxLog);
    const failed = expectFail ? got.length === 0 : got.length > 0;
    if (failed) failures.push(`${label}: expected ${expectFail ? "FAIL" : "PASS"}, got ${JSON.stringify(got)}`);
  };
  const mut = (fn: (lines: string[]) => void): string => {
    const lines = conformingDossier().split("\n");
    fn(lines);
    return lines.join("\n");
  };

  check("合规样例", conformingDossier(), false);
  check("缺 H1", mut((l) => { l[0] = "无标题"; }), true);
  check("缺头部说明块", mut((l) => { l[2] = ""; }), true);
  check("缺骨架段", mut((l) => { l[l.indexOf("## 触发条件")] = "## 别的"; }), true);
  check("骨架段顺序错", mut((l) => {
    const b = l.indexOf("## 行动区");
    const c = l.indexOf("## 触发条件");
    const d = l.indexOf("## 状态日志");
    const out = [...l.slice(0, b), ...l.slice(c, d), ...l.slice(b, c), ...l.slice(d)];
    l.length = 0;
    l.push(...out);
  }), true);
  check("骨架段重复", mut((l) => {
    l.splice(l.indexOf("## 状态日志"), 0, "## 行动区", "", "- 非法条目", "");
  }), true);
  check("多出封闭集外的节", mut((l) => {
    l.splice(l.indexOf("## 状态日志"), 0, "## 术语", "", "- 表外节。", "");
  }), true);
  check("决策指针条目无链接", mut((l) => { l[l.indexOf("- **基线拍板**：[示例 ADR](../../.agents/notes/implemented/process/2026-09-13-dossier-institution.md)。")] = "- **基线拍板**：无指针。"; }), true);
  check("行动区条目形态坏", mut((l) => { l[l.indexOf("- [ ] 待办事项：动作 + 触发 + 指针。")] = "- 待办事项（缺 checkbox）。"; }), true);
  check("状态日志条目无日期前缀", mut((l) => { l[l.indexOf("- 2026-09-13｜建档。")] = "- 建档（缺日期）。"; }), true);
  check("状态日志日期非法", mut((l) => { l[l.indexOf("- 2026-09-13｜建档。")] = "- 2026-02-30｜建档。"; }), true);
  check("触发条件为空", mut((l) => { l[l.indexOf("- 前置 ✅（示例）。")] = ""; }), true);
  check("行动区 open 超限", mut((l) => {
    const at = l.indexOf("- [ ] 待办事项：动作 + 触发 + 指针。");
    l.splice(at + 1, 0, ...Array.from({ length: 12 }, (_, i) => `- [ ] 待办 ${i}。`));
  }), true, DEFAULT_MAX_OPEN);
  check("状态日志超限", mut((l) => {
    const at = l.indexOf("- 2026-09-13｜建档。");
    l.splice(at + 1, 0, ...Array.from({ length: 40 }, (_, i) => `- 2026-08-${String((i % 28) + 1).padStart(2, "0")}｜日志 ${i}。`));
  }), true, DEFAULT_MAX_OPEN, DEFAULT_MAX_LOG);

  // 目录面：命名与扁平约束（临时树，不触真实仓）。
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dossier-"));
  try {
    fs.writeFileSync(path.join(dir, "ok-topic-dossier.md"), conformingDossier());
    if (checkDossierDir(dir, DEFAULT_MAX_OPEN, DEFAULT_MAX_LOG).length > 0) {
      failures.push("目录面：合规命名被误判 FAIL");
    }
    fs.writeFileSync(path.join(dir, "bad-name.md"), conformingDossier());
    if (checkDossierDir(dir, DEFAULT_MAX_OPEN, DEFAULT_MAX_LOG).length === 0) {
      failures.push("目录面：坏命名未被拒");
    }
    fs.writeFileSync(path.join(dir, "notes.txt"), "x");
    if (checkDossierDir(dir, DEFAULT_MAX_OPEN, DEFAULT_MAX_LOG).length === 0) {
      failures.push("目录面：非 .md 条目未被拒");
    }
    fs.mkdirSync(path.join(dir, "nested"));
    if (checkDossierDir(dir, DEFAULT_MAX_OPEN, DEFAULT_MAX_LOG).length === 0) {
      failures.push("目录面：子目录未被拒");
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    for (const f of failures) console.log(`SELF-TEST FAIL: ${f}`);
    return 1;
  }
  console.log("self-test OK");
  return 0;
}

function argError(msg: string): never {
  console.error(`usage: verify-dossier-format.mts [--self-test]`);
  console.error(`error: ${msg}`);
  process.exit(2);
}

if (process.argv[2] === "--self-test") {
  process.exit(selfTest());
}
const argv = process.argv.slice(2);
if (argv.length > 0) argError(`unrecognized arguments: ${argv.join(" ")}`);
process.exit(realRun());
