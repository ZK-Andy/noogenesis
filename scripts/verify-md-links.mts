#!/usr/bin/env node
/**
 * verify-md-links — 相对 Markdown 链接校验件：文件目标存在 + #frag 锚点可解析。
 *
 * 判据（对给定 root 下每个 .md，默认当前目录）：
 *   - `](相对路径.md)` -> 目标文件必须存在
 *   - `](相对路径.md#slug)` -> 目标存在且 slug 命中该文件标题 slug（GitHub 风格：
 *     小写、空白→连字符、去标点）或显式 `<a id="slug">` 锚
 *   - `](https://…)` / `](mailto:…)` / `](<…>)` -> 跳过（外链）
 *   - 裸文件名以其所属文件目录解析；前导 `/` 目标以扫描根解析
 *   - 第三方/生成物目录（.cache/bin/obj/node_modules）跳过；`.agents/notes/` 下
 *     archived/ 豁免（归档冻结，外链按纪律不校验，见 .agents/notes/README.md），
 *     限定 .agents/ 下，避免误伤无关目录
 * skills/ 目录也校验（引入即适配——上游路径引用未重映射的技能不得引入）。
 *
 * 用法（仓库根运行，同其余 verify-*）：node scripts/verify-md-links.mts [root_dir]
 * 退出码：0 = PASS，1 = 违约（2 仅 argparse 形态的 CLI 误用）。
 * self-test：py 版无 --self-test；按 scripts/AGENTS.md 夹具纪律补齐（B1 缺口）：
 *   相对断链 / 死锚点 / 外链跳过 / 归档豁免 / CJK 标题 slug 锚点命中。
 *
 * Provenance: distilled from dotnet-deepseek-harness-desktop/scripts/verify-md-links.py
 * (MIT, 2026-09-05)；skills/ 排除移除（默认校验）、.plan/ 排除移除（journal 入 git）、
 * 第三方/构建目录跳过表保留；链接原语单源于 scripts/mdref（同上源 ADR
 * 2026-09-05-consolidate-r1-simplification-candidates）。
 * B1 随族迁 TS（2026-09-08，.agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md）。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { checkRelativeLinks, slugify } from "./mdref.mts";
import { cmpPyStr } from "./pypara.mts";

const PROG = "verify-md-links.mts";
const USAGE = `usage: ${PROG} [-h] [root]\n`;
const HELP = `${USAGE}\npositional arguments:\n  root\n\noptions:\n  -h, --help  show this help message and exit\n`;

interface MdFile { joined: string; parts: string[] }

/** Python `sorted(Path.rglob("*.md"))` 等价：含点文件、不跟随目录符号链接，
 *  按 parts 元组序（逐段码点比较，前缀短者在前）——与 pathlib 排序语义一致。 */
function collectMd(rootArg: string): MdFile[] {
  const files: MdFile[] = [];
  const walk = (dir: string, parts: string[]): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      // Python: rglob 对不可进入目录产出空
      return;
    }
    for (const ent of entries) {
      const child = [...parts, ent.name];
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full, child);
        continue;
      }
      let isFile = ent.isFile();
      if (!isFile && ent.isSymbolicLink()) {
        try {
          isFile = fs.statSync(full).isFile();
        } catch {
          isFile = false;
        }
      }
      if (isFile && ent.name.endsWith(".md")) {
        files.push({ joined: path.join(rootArg, ...child), parts: child });
      }
    }
  };
  walk(rootArg, []);
  return files;
}

function cmpParts(a: string[], b: string[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const c = cmpPyStr(a[i]!, b[i]!);
    if (c !== 0) return c;
  }
  return a.length - b.length;
}

/** 扫描 root 下全部（豁免外）.md 并解析相对链接；与 py 主循环同构。 */
function scan(rootArg: string): { checked: number; errors: string[] } {
  const errors: string[] = [];
  let checked = 0;
  // 第三方/生成物目录：缓存、依赖、构建产物（其内 README 常带外部相对链接）
  const skipSegments = [".cache", "bin", "obj", "node_modules"];
  const files = collectMd(rootArg).sort((x, y) => cmpParts(x.parts, y.parts));
  for (const md of files) {
    if (md.parts.some((seg) => skipSegments.includes(seg))) {
      continue;
    }
    // 归档笔记：冻结历史，其外链按纪律不校验（限定 .agents/notes/ 下的 archived）
    if (
      md.parts.includes(".agents") &&
      md.parts.includes("notes") &&
      md.parts.includes("archived")
    ) {
      continue;
    }
    const text = fs.readFileSync(md.joined, "utf-8");
    checked += checkRelativeLinks(text, md.joined, rootArg, errors);
  }
  return { checked, errors };
}

/** 夹具自测（B1 补齐缺口，py 版无 --self-test）：违约样本必须 FAIL、合规必须 PASS。 */
function selfTest(): number {
  const failures: string[] = [];
  const check = (cond: boolean, msg: string): void => {
    if (!cond) failures.push(msg);
  };
  // slugify unicode 语义（Python \w 等价展开）：CJK 保留、全角标点剥离、空格折叠
  check(slugify("中文标题（v2）") === "中文标题v2", "slugify CJK/全角标点行为与 py 不符");
  check(slugify("Hello World") === "hello-world", "slugify 空格折叠行为与 py 不符");

  const rootArg = fs.mkdtempSync(path.join(os.tmpdir(), "mdlinks-"));
  try {
    const join = (...segs: string[]): string => path.join(rootArg, ...segs);
    fs.writeFileSync(
      join("target.md"),
      "## 中文标题\n\n## English Title\n\n<a id=\"sec\"></a>\n"
    );
    fs.writeFileSync(
      join("ok.md"),
      "[cjk](target.md#中文标题) [en](target.md#english-title) " +
        "[anch](target.md#sec) [ext](https://example.com/x) " +
        "[mail](mailto:a@b.c) [same](#frag)\n"
    );
    fs.writeFileSync(join("broken.md"), "[missing](nope.md) [dead](target.md#bad-frag)\n");
    fs.mkdirSync(join(".agents", "notes", "archived"), { recursive: true });
    fs.writeFileSync(join(".agents", "notes", "archived", "frozen.md"), "[gone](nope.md)\n");
    for (const dir of ["node_modules", ".cache", "bin", "obj"]) {
      fs.mkdirSync(join(dir), { recursive: true });
      fs.writeFileSync(join(dir, "skip.md"), "[gone](nope.md)\n");
    }
    // archived 豁免限定 .agents/ 下：裸 archived/ 不豁免
    fs.mkdirSync(join("archived"), { recursive: true });
    fs.writeFileSync(join("archived", "plain.md"), "[gone](nope.md)\n");

    const { checked, errors } = scan(rootArg);
    check(errors.length === 3, `夹具应产出 3 条违约（broken.md 2 + 裸 archived/plain.md 1），got: ${JSON.stringify(errors)}`);
    check(
      errors.some((e) => e.endsWith("broken.md: missing target 'nope.md'")),
      "断链夹具未被标记 missing target"
    );
    check(
      errors.some((e) => e.endsWith("broken.md: dead anchor '#bad-frag' in 'target.md#bad-frag'")),
      "死锚点夹具未被标记 dead anchor"
    );
    check(errors.every((e) => !e.includes("frozen.md") && !e.includes("skip.md")),
      "归档/跳过目录豁免失效");
    check(
      errors.some((e) => e.endsWith("plain.md: missing target 'nope.md'")),
      "裸 archived/ 目录未被校验（豁免应限定 .agents/ 下）"
    );
    // checked = 目标文件存在的相对 target 数（外链/同页/豁免文件不计）
    check(checked === 4, `应计入 4 个存在的目标（ok.md 3 + plain.md 1），got ${checked}`);
  } finally {
    fs.rmSync(rootArg, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    for (const f of failures) console.log(`SELF-TEST FAIL: ${f}`);
    return 1;
  }
  console.log("self-test OK");
  return 0;
}

function main(): number {
  const argv = process.argv.slice(2);
  let root: string | null = null;
  const extra: string[] = [];
  let help = false;
  let endOpts = false;
  for (const a of argv) {
    if (!endOpts && a === "--") {
      endOpts = true;
      continue;
    }
    if (!endOpts && a.startsWith("-") && a !== "-") {
      if (a === "-h" || (a.startsWith("--") && "--help".startsWith(a))) {
        help = true;
      } else {
        extra.push(a);
      }
      continue;
    }
    if (root === null) root = a;
    else extra.push(a);
  }
  if (help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (extra.length > 0) {
    process.stderr.write(`${USAGE}${PROG}: error: unrecognized arguments: ${extra.join(" ")}\n`);
    return 2;
  }
  const { checked, errors } = scan(root ?? ".");
  console.log(`Checked ${checked} link targets`);
  if (errors.length > 0) {
    for (const e of errors) console.log(`FAIL: ${e}`);
    return 1;
  }
  console.log("OK");
  return 0;
}

if (process.argv.length === 3 && process.argv[2] === "--self-test") {
  process.exit(selfTest());
}
process.exit(main());
