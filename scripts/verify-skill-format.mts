#!/usr/bin/env node
/**
 * verify-skill-format — 项目技能形态门禁：frontmatter / 目录捆绑 / 链接 / 结构。
 *
 * 判据（校验 `.agents/skills/` 下每个 `<dir>/SKILL.md`）：
 *   - frontmatter `name` 在位且为 lowercase-kebab（`^[a-z0-9]+(-[a-z0-9]+)*$`）
 *   - frontmatter `description` 在位且非空
 *   - 目录捆绑：`<name>/SKILL.md`（目录 basename == name）
 *   - `.agents/skills/` 根层不允许裸 `.md`（DSH 按扁平技能解析）
 *   - 相对 .md 链接解析到存在的文件，带 `#frag` 时命中标题 slug 或显式 `<a id>`
 *   - 正文含定位行与 Workflow 小节（防空洞填充）
 *   - references/ 形态规则（蓝图 §3 扩展位；B0 拍板 2026-09-08）：references/
 *     存在时必须非空，且 SKILL.md 至少一条指向其中的相对链接（正文提及不算链接）
 * ——判据与 verify-skill-format.py 完全同迁。
 *
 * 技能是项目自有件；引用必须对本仓可解析（verify-md-links 也默认查 skills/，
 * 本件另加 frontmatter/结构面，技能不得带断链引入）。
 *
 * 用法（仓库根运行，同其余 verify-*）：node scripts/verify-skill-format.mts [--self-test]
 * 退出码：0 = PASS，1 = 违约（2 仅 argparse 形态的 CLI 误用）。
 * self-test：夹具逐组同迁 py 版（frontmatter/name 单元、合规样本 PASS、坏命名 +
 * 缺 Workflow、死链、references/ 空目录 / 只提及不链接 / 已链接合规），另跑
 * 真仓 skills 目录 smoke（check_skill 经 mdref 覆盖死链路径）。
 *
 * Provenance: distilled from dotnet-deepseek-harness-desktop/scripts/verify-skill-format.py
 * (MIT, 2026-09-05)；diff vs source：最小技能数 8 -> 7（Noogenesis 7 技能，noo-* 前缀，
 * ADR 2026-09-05-skill-prefix-noo）；链接原语单源于 scripts/mdref（ADR
 * 2026-09-05-consolidate-r1-simplification-candidates）。
 * B1 随族迁 TS（2026-09-08，.agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md）。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";
import { checkRelativeLinks } from "./mdref.mts";
import { splitLines, cmpPyStr } from "./pypara.mts";

const PROG = "verify-skill-format.mts";
const USAGE = `usage: ${PROG} [-h] [--self-test]\n`;
const HELP = `${USAGE}\noptions:\n  -h, --help   show this help message and exit\n  --self-test\n`;

const ROOT = path.dirname(path.dirname(fs.realpathSync(fileURLToPath(import.meta.url))));
const SKILLS_DIR = path.join(ROOT, ".agents", "skills");

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FRONTMATTER_RE = /^---\s*$/;
const POSITIONING_RE = /guidance, not a script/i;
const POSITIONING_ZH_RE = /不是脚本|是引导/;
const WORKFLOW_RE = /^## .*Workflow|^## .*工作流|^## .*工作流程/m;
const REFS_LINK_RE = /\]\(references\//;

/** Python str.strip(charset) 等价：剥去首尾全部指定字符。 */
function stripChars(s: string, chars: string): string {
  let start = 0;
  let end = s.length;
  while (start < end && chars.includes(s[start]!)) start++;
  while (end > start && chars.includes(s[end - 1]!)) end--;
  return s.slice(start, end);
}

/** 返回 frontmatter dict，顶部无 frontmatter 块时返回 null。 */
function parseFrontmatter(text: string): Record<string, string> | null {
  const lines = splitLines(text);
  if (lines.length === 0 || !FRONTMATTER_RE.test(lines[0]!)) {
    return null;
  }
  let end: number | null = null;
  for (let i = 1; i < lines.length; i++) {
    if (FRONTMATTER_RE.test(lines[i]!)) {
      end = i;
      break;
    }
  }
  if (end === null) {
    return null;
  }
  const fm: Record<string, string> = {};
  for (const line of lines.slice(1, end)) {
    const idx = line.indexOf(":");
    if (idx !== -1) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      fm[k] = stripChars(stripChars(v, '"'), "'");
    }
  }
  return fm;
}

function checkSkill(p: string, errors: string[]): void {
  const text = fs.readFileSync(p, "utf-8");
  const fm = parseFrontmatter(text);
  if (fm === null) {
    errors.push(`${p}: missing YAML frontmatter block`);
    return;
  }

  const name = fm["name"] ?? "";
  if (!name) {
    errors.push(`${p}: frontmatter 'name' missing`);
  } else if (!NAME_RE.test(name)) {
    errors.push(`${p}: name '${name}' not lowercase-kebab`);
  }

  const desc = fm["description"] ?? "";
  if (!desc) {
    errors.push(`${p}: frontmatter 'description' missing/empty`);
  }

  // 目录捆绑：目录名 == 技能名
  if (name) {
    const dirname = path.basename(path.dirname(p));
    if (dirname !== name) {
      errors.push(`${p}: bundle dir '${dirname}' != frontmatter name '${name}'`);
    }
  }

  // 相对 md 链接可解析
  checkRelativeLinks(text, p, ROOT, errors);

  // 结构守卫：定位行 + Workflow 节
  if (!POSITIONING_RE.test(text) && !POSITIONING_ZH_RE.test(text)) {
    errors.push(`${p}: missing 'guidance, not a script' positioning line`);
  }
  if (!WORKFLOW_RE.test(text)) {
    errors.push(`${p}: missing '## Workflow' section`);
  }

  // references/ 形态规则（蓝图 §3 扩展位；B0 拍板 2026-09-08）：拆了就必须非空
  // 且被 SKILL.md 以相对链接引用——防预铺空目录（.agents「用不上不写」纪律在技能层的投影）
  const refsDir = path.join(path.dirname(p), "references");
  if (fs.existsSync(refsDir) && fs.statSync(refsDir).isDirectory()) {
    if (fs.readdirSync(refsDir).length === 0) {
      errors.push(`${p}: references/ 目录为空（预铺空目录；用不上不写）`);
    } else if (!REFS_LINK_RE.test(text)) {
      errors.push(`${p}: 存在 references/ 但 SKILL.md 无指向其中的相对链接（正文提及不算链接）`);
    }
  }
}

function scan(errors: string[]): number {
  if (!fs.existsSync(SKILLS_DIR) || !fs.statSync(SKILLS_DIR).isDirectory()) {
    errors.push(`${SKILLS_DIR}: skills dir missing`);
    return 1;
  }
  // skills/ 根层禁 .md（DSH 把平铺 .md 解析为技能）
  for (const ent of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (ent.name.endsWith(".md")) {
      errors.push(`${path.join(SKILLS_DIR, ent.name)}: root-level README/\`.md\` parsed as flat skill`);
    }
  }
  const skills: string[] = [];
  for (const ent of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const skill = path.join(SKILLS_DIR, ent.name, "SKILL.md");
    if (fs.existsSync(skill) && fs.statSync(skill).isFile()) {
      skills.push(skill);
    }
  }
  // 整串码点序（单源 = pypara cmpPyStr；py sorted(str) 语义，非逐段路径序）
  skills.sort(cmpPyStr);
  for (const skill of skills) {
    checkSkill(skill, errors);
  }
  return skills.length;
}

/** 真覆盖：合规与违约样本各过一遍 check_skill，并对真仓 skills 目录跑 scan()，
 *  避免自测沦为不触主逻辑的孤立断言。断言消息与 py 版逐字同文。 */
function selfTest(): number {
  const check = (cond: boolean, msg: string): void => {
    if (!cond) throw new Error(msg);
  };

  // --- frontmatter/name regex unit checks ---
  check(parseFrontmatter("---\nname: dsh-foo\n---\n# x\n") !== null,
    "parse_frontmatter should parse valid frontmatter");
  check(parseFrontmatter("# no frontmatter\n") === null,
    "parse_frontmatter should reject missing frontmatter");
  check(NAME_RE.test("dsh-foo"), "NAME_RE should match kebab");
  check(!NAME_RE.test("Dsh-Foo"), "NAME_RE should reject uppercase");
  check(!NAME_RE.test("dsh_foo"), "NAME_RE should reject underscore");

  const td = fs.mkdtempSync(path.join(os.tmpdir(), "tmp"));
  try {
    const okDir = path.join(td, "ok-skill");
    fs.mkdirSync(okDir);
    const ok = path.join(okDir, "SKILL.md");
    fs.writeFileSync(
      ok,
      "---\nname: ok-skill\ndescription: Use when testing.\n---\n\n" +
        "# Title\n\n**This skill is guidance, not a script.**\n\n" +
        "## Workflow\n\n1. Do the thing.\n"
    );
    let errs: string[] = [];
    checkSkill(ok, errs);
    check(errs.length === 0, `compliant sample should pass, got ${JSON.stringify(errs)}`);

    const bad1 = path.join(td, "Bad_Skill");
    fs.mkdirSync(bad1);
    const bad1file = path.join(bad1, "SKILL.md");
    fs.writeFileSync(bad1file, "---\nname: Bad_Skill\n---\n\n# Title\n\nNo workflow here.\n");
    errs = [];
    checkSkill(bad1file, errs);
    const joined = errs.join("\n");
    check(joined.includes("not lowercase-kebab"), `should flag bad name: ${JSON.stringify(errs)}`);
    check(joined.includes("missing '## Workflow'"), `should flag missing workflow: ${JSON.stringify(errs)}`);

    const bad2 = path.join(td, "dead-link");
    fs.mkdirSync(bad2);
    const bad2file = path.join(bad2, "SKILL.md");
    fs.writeFileSync(
      bad2file,
      "---\nname: dead-link\ndescription: Use when testing.\n---\n\n" +
        "# Title\n\n**This skill is guidance, not a script.**\n\n" +
        "## Workflow\n\nSee [missing](../../nope.md).\n"
    );
    errs = [];
    checkSkill(bad2file, errs);
    check(errs.some((e) => e.includes("missing target")), `should flag dead link: ${JSON.stringify(errs)}`);

    // references/ 形态规则：空目录违约、已链接合规
    const emptyRefs = path.join(td, "empty-refs");
    fs.mkdirSync(emptyRefs);
    fs.writeFileSync(
      path.join(emptyRefs, "SKILL.md"),
      "---\nname: empty-refs\ndescription: Use when testing.\n---\n\n" +
        "# Title\n\n**This skill is guidance, not a script.**\n\n## Workflow\n\n1. Do.\n"
    );
    fs.mkdirSync(path.join(emptyRefs, "references"));
    errs = [];
    checkSkill(path.join(emptyRefs, "SKILL.md"), errs);
    check(errs.some((e) => e.includes("references/ 目录为空")), `should flag empty references/: ${JSON.stringify(errs)}`);

    // references/ 非空但正文只提及不链接 → 违约
    const unlinkedRefs = path.join(td, "unlinked-refs");
    fs.mkdirSync(path.join(unlinkedRefs, "references"), { recursive: true });
    fs.writeFileSync(path.join(unlinkedRefs, "references", "detail.md"), "# Detail\n");
    fs.writeFileSync(
      path.join(unlinkedRefs, "SKILL.md"),
      "---\nname: unlinked-refs\ndescription: Use when testing.\n---\n\n" +
        "# Title\n\n**This skill is guidance, not a script.**\n\n## Workflow\n\n1. Put templates in references/ when needed.\n"
    );
    errs = [];
    checkSkill(path.join(unlinkedRefs, "SKILL.md"), errs);
    check(errs.some((e) => e.includes("无指向其中的相对链接")), `should flag unlinked references/: ${JSON.stringify(errs)}`);

    const linkedRefs = path.join(td, "linked-refs");
    fs.mkdirSync(path.join(linkedRefs, "references"), { recursive: true });
    fs.writeFileSync(path.join(linkedRefs, "references", "detail.md"), "# Detail\n");
    fs.writeFileSync(
      path.join(linkedRefs, "SKILL.md"),
      "---\nname: linked-refs\ndescription: Use when testing.\n---\n\n" +
        "# Title\n\n**This skill is guidance, not a script.**\n\n## Workflow\n\n1. Do; detail in [detail](references/detail.md).\n"
    );
    errs = [];
    checkSkill(path.join(linkedRefs, "SKILL.md"), errs);
    check(errs.length === 0, `linked references sample should pass, got ${JSON.stringify(errs)}`);
  } finally {
    fs.rmSync(td, { recursive: true, force: true });
  }

  // 真实扫描冒烟：实际 skills/ 目录必须全绿
  const errs: string[] = [];
  const n = scan(errs);
  check(n >= 7, `expected >=7 skills, got ${n}`);
  console.log(`verify-skill-format --self-test OK (frontmatter/dir-bundle/link/structure; scan=${n} real skills)`);
  return 0;
}

function main(): number {
  const argv = process.argv.slice(2);
  const knownLong = ["--help", "--self-test"];
  let help = false;
  let selfTestRequested = false;
  const extra: string[] = [];
  let endOpts = false;
  for (const a of argv) {
    if (!endOpts && a === "--") {
      endOpts = true;
      continue;
    }
    if (!endOpts && a.startsWith("-") && a !== "-") {
      if (a === "-h" || (a.startsWith("--") && knownLong.filter((k) => k.startsWith(a)).length === 1)) {
        const resolved =
          a === "-h" ? "--help" : knownLong.find((k) => k.startsWith(a))!;
        if (resolved === "--help") help = true;
        else selfTestRequested = true;
      } else {
        extra.push(a);
      }
      continue;
    }
    extra.push(a);
  }
  if (help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (extra.length > 0) {
    process.stderr.write(`${USAGE}${PROG}: error: unrecognized arguments: ${extra.join(" ")}\n`);
    return 2;
  }
  if (selfTestRequested) {
    return selfTest();
  }
  const errors: string[] = [];
  const n = scan(errors);
  if (errors.length > 0) {
    for (const e of errors) console.log(`FAIL: ${e}`);
    console.log(`${n} skills, ${errors.length} violations`);
    return 1;
  }
  console.log(`OK: ${n} skills conform`);
  return 0;
}

if (process.argv.length === 3 && process.argv[2] === "--self-test") {
  process.exit(selfTest());
}
process.exit(main());
