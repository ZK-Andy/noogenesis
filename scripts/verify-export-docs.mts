#!/usr/bin/env node
/**
 * verify-export-docs — 导出面契约注释闸（C2；ADR 2026-09-08-c2-lint-enforcement）。
 *
 * 判据：`adapters/dsh/` + `scripts/` 的 .ts/.mts 中，**导出函数/类声明**必须有紧邻
 * JSDoc 块（`/** *\/`）。类型/接口/常量不判——契约常由类型自身承载，强制注释产
 * slop（code-standards §2.1 判别式）。注释内容质量仍留评审（根 AGENTS「评审检查项」
 * 第 4 条），本闸只判存在性。
 *
 * 范围不含 `engine/`：其导出走文件尾 `export { … }` 形态且是引擎内部接缝（适配层
 * 只 spawn CLI、不 import），公共契约 = CLI（engine/README.md）；内部注释沿用 `//`
 * 块（engine 约定），入闸会逼出签名复述式注释（R1 评审 2026-09-08）。
 *
 * 判据语义：
 * - 两种导出形态都认：声明上的 `export` 修饰符 + 文件尾 `export { local as exported }`；
 * - 重载：同名声明成组，组内**任一**带 JSDoc 即通过（一份契约注释即可，不逼重复）；
 * - TS 的 JSDoc 归属把「文件头块直接紧邻首个导出」计为该导出的注释（本仓文件头后
 *   必有 import 或非导出声明，实测无此形态）。
 *
 * 用法（仓库根运行，同其余 verify-*）：
 *   node scripts/verify-export-docs.mts [--self-test]     # 全量：SOURCE_ROOTS 下全部源码
 *   node scripts/verify-export-docs.mts <file>...         # 文件目标模式（在环面消费）
 * 退出码：0 = PASS，1 = FAIL（导出函数/类缺契约注释），2 = 参数误用 / 全量模式任一根缺失（fail-closed）。
 *
 * 文件目标模式（适配层 A4 注释面在环消费，ADR 2026-09-10-export-docs-inloop）：只判给定目标中
 * 落在 SOURCE_ROOTS 内、存在且为 .ts/.mts 的件；**域归属由本件单源判定**——调用方不复刻域表
 * （复刻即双源：域表一改，漏判静默）。无参调用 = 全量扫描，门禁面（gates.json / pre-commit / CI）
 * 条目与行为零变化。
 * **在环消费协议**：stdout 的 `FAIL: ` 前缀行 = 判据违约行（适配层 `export-docs-feedback.mts`
 * 按此协议取反馈文本并原样呈现给模型；改前缀即破在环面）。违约行语言 = 英文（模型面字符串
 * 语言口径，单源 = adapters/dsh/README.md「模型面字符串语言口径」行）；本件其余输出仍为中文（人面）。
 * 运行前提：node ≥22.18（原生 type stripping）+ devDependency typescript（解析器）。
 * 模块形态：显式 .mts（ESM）——本仓 package.json type=commonjs，裸 .ts 装不下 import。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const PROGRAM = "verify-export-docs.mts";
const USAGE = `usage: ${PROGRAM} [--self-test] [file ...]\n`;
const SOURCE_ROOTS = ["adapters/dsh", "scripts"];
const SOURCE_EXT_RE = /\.(ts|mts)$/;

interface Violation {
  file: string;
  line: number;
  kind: "function" | "class";
  name: string;
}

/** 违约行输出（全量/文件目标两模式共用——该行是在环消费协议面，文案单源）。 */
function printViolation(v: Violation): void {
  console.log(`FAIL: ${v.file}:${v.line}: exported ${v.kind} ${v.name} lacks an adjacent JSDoc contract comment`);
}

/** 递归收集源树下的 .ts/.mts（目录缺失记为空集，由调用方判 fail-closed）。 */
function listSources(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, ent.name);
    if (ent.isDirectory()) out.push(...listSources(p));
    else if (SOURCE_EXT_RE.test(ent.name)) out.push(p);
  }
  return out;
}

function isFnOrClass(node: ts.Node): node is ts.FunctionDeclaration | ts.ClassDeclaration {
  return ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node);
}

/** 单文件判据：导出函数/类（两种导出形态）无 JSDoc → 违规。 */
function checkSource(file: string, text: string): Violation[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const byName = new Map<string, ts.Node[]>();
  const direct: { node: ts.Node; name: string }[] = [];
  const trailing = new Set<string>();
  const collect = (node: ts.Node): void => {
    const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    const isExport = mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    if (isFnOrClass(node)) {
      const name = node.name?.getText(sf);
      if (name !== undefined) {
        byName.set(name, [...(byName.get(name) ?? []), node]);
      }
      if (isExport) direct.push({ node, name: name ?? "<default>" });
    }
    if (ts.isExportDeclaration(node) && node.exportClause !== undefined && ts.isNamedExports(node.exportClause)) {
      for (const el of node.exportClause.elements) {
        if (!el.isTypeOnly) trailing.add((el.propertyName ?? el.name).getText(sf));
      }
    }
    ts.forEachChild(node, collect);
  };
  collect(sf);

  const out: Violation[] = [];
  const reported = new Set<string>();
  const report = (nodes: ts.Node[], name: string): void => {
    if (reported.has(name) || nodes.some((n) => ts.getJSDocCommentsAndTags(n).length > 0)) return;
    reported.add(name);
    const node = nodes[0]!;
    out.push({
      file,
      line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      kind: ts.isClassDeclaration(node) ? "class" : "function",
      name,
    });
  };
  for (const { node, name } of direct) {
    report(name === "<default>" ? [node] : (byName.get(name) ?? [node]), name);
  }
  for (const name of trailing) {
    const nodes = byName.get(name);
    if (nodes !== undefined) report(nodes, name);
  }
  return out;
}

/** 目标件域归属判定（域表单源 = SOURCE_ROOTS）；POSIX 形态 rel 入参。 */
function inScope(relPosix: string): boolean {
  return SOURCE_ROOTS.some((root) => relPosix === root || relPosix.startsWith(`${root}/`));
}

/**
 * 文件目标模式判据面：逐目标解析（相对 cwd）→ 域内 + 存在 + 源码扩展名才判；
 * 其余计入 skipped（判据对它们无语义：域外不是违规、不存在无从判）。
 */
function judgeTargets(repoRoot: string, targets: string[]): { judged: number; skipped: number; violations: Violation[] } {
  const violations: Violation[] = [];
  let judged = 0;
  let skipped = 0;
  for (const target of targets) {
    const abs = path.resolve(process.cwd(), target);
    const rel = path.relative(repoRoot, abs);
    const relPosix = rel.split(path.sep).join("/");
    const outside = rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel);
    if (outside || !inScope(relPosix) || !SOURCE_EXT_RE.test(relPosix) || !fs.existsSync(abs)) {
      skipped += 1;
      continue;
    }
    judged += 1;
    violations.push(...checkSource(relPosix, fs.readFileSync(abs, "utf-8")));
  }
  return { judged, skipped, violations };
}

/** 文件目标模式执行面：违约 → FAIL 行 + exit 1；无违约 → OK 行 + exit 0（域外/不存在只计跳过）。 */
function runFileTargets(repoRoot: string, targets: string[]): number {
  const { judged, skipped, violations } = judgeTargets(repoRoot, targets);
  if (violations.length === 0) {
    console.log(`OK: ${judged} 件文件目标（跳过 ${skipped} 件域外/非源码/不存在）`);
    return 0;
  }
  for (const v of violations) {
    printViolation(v);
  }
  return 1;
}

function realRun(repoRoot: string): number {
  const files: string[] = [];
  const missingRoots: string[] = [];
  for (const rel of SOURCE_ROOTS) {
    const abs = path.join(repoRoot, rel);
    if (!fs.existsSync(abs)) missingRoots.push(rel);
    files.push(...listSources(abs));
  }
  if (missingRoots.length > 0) {
    console.error(`${PROGRAM}: FAIL-CLOSED — 源根缺失：${missingRoots.join(", ")}（覆盖面不得静默归零）`);
    return 2;
  }
  const violations = files.flatMap((f) => checkSource(path.relative(repoRoot, f), fs.readFileSync(f, "utf-8")));
  if (violations.length === 0) {
    console.log(`OK: ${files.length} 件源码的导出函数/类均带契约注释`);
    return 0;
  }
  for (const v of violations) {
    printViolation(v);
  }
  return 1;
}

/** 夹具自测：违约样例必须 FAIL，合规样例必须 PASS。 */
function selfTest(): number {
  const failures: string[] = [];
  const check = (name: string, text: string): number => checkSource(name, text).length;
  const expect = (name: string, text: string, wantViolation: boolean, what: string): void => {
    const n = check(name, text);
    if (wantViolation ? n === 0 : n !== 0) failures.push(what);
  };
  expect("good.ts", "/** 契约：返回 1。 */\nexport function foo(): number { return 1; }\n", false, "合规样例（导出函数带 JSDoc）被误判 FAIL");
  expect("good-class.ts", "/** 契约：持有 n。 */\nexport class Box { constructor(readonly n: number) {} }\n", false, "合规样例（导出类带 JSDoc）被误判 FAIL");
  expect("bad.ts", "export function foo(): number { return 1; }\n", true, "违约样例（导出函数无 JSDoc）未被拒");
  expect("bad-class.ts", "export class Box {}\n", true, "违约样例（导出类无 JSDoc）未被拒");
  expect("bad-line-comment.ts", "// 行注释不是 JSDoc\nexport function foo(): number { return 1; }\n", true, "违约样例（仅行注释）未被拒");
  expect("ok-const.ts", "export const N = 1;\nexport type T = string;\nexport interface I { a: number }\n", false, "合规样例（导出常量/类型/接口不在判据内）被误判 FAIL");
  expect("ok-internal.ts", "function hidden(): number { return 1; }\n", false, "合规样例（非导出函数不在判据内）被误判 FAIL");
  expect("bad-default.ts", "export default function (): number { return 1; }\n", true, "违约样例（匿名默认导出函数无 JSDoc）未被拒");
  expect("trailing-good.ts", "/** 契约：返回 1。 */\nfunction foo(): number { return 1; }\nexport { foo };\n", false, "合规样例（文件尾导出 + 声明 JSDoc）被误判 FAIL");
  expect("trailing-bad.ts", "function foo(): number { return 1; }\nexport { foo as bar };\n", true, "违约样例（文件尾导出无 JSDoc）未被拒");
  expect(
    "overload.ts",
    "/** 契约：接受两种入参。 */\nexport function f(x: string): string;\nexport function f(x: number): number;\nexport function f(x: string | number): string | number { return x; }\n",
    false,
    "合规样例（重载组内一份 JSDoc）被误判 FAIL",
  );
  // 文件目标模式（在环面消费）：域归属 / 存在性 / 源码扩展名三分支 + 绝对与相对目标。
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "export-docs-"));
  try {
    const write = (rel: string, text: string): string => {
      const abs = path.join(repo, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, text);
      return abs;
    };
    const goodAbs = write("adapters/dsh/good.ts", "/** 契约：返回 1。 */\nexport function foo(): number { return 1; }\n");
    const badAbs = write("adapters/dsh/bad.ts", "export function foo(): number { return 1; }\n");
    const scriptsAbs = write("scripts/ok.ts", "/** 契约：返回 1。 */\nexport function bar(): number { return 1; }\n");
    const engineAbs = write("engine/out.ts", "export function baz(): number { return 1; }\n");
    const jsonAbs = write("scripts/data.json", "{}\n");

    const mixed = judgeTargets(repo, [goodAbs, badAbs, scriptsAbs]);
    if (mixed.judged !== 3 || mixed.skipped !== 0 || mixed.violations.length !== 1 || mixed.violations[0]?.file !== "adapters/dsh/bad.ts") {
      failures.push(`文件目标模式（域内混合）判定不符：${JSON.stringify(mixed)}`);
    }
    const clean = judgeTargets(repo, [goodAbs, scriptsAbs]);
    if (clean.judged !== 2 || clean.violations.length !== 0) failures.push(`文件目标模式（域内全合规）应判 2 件零违约，got ${JSON.stringify(clean)}`);
    const outOfScope = judgeTargets(repo, [engineAbs, jsonAbs, path.join(repo, "nope.ts")]);
    if (outOfScope.judged !== 0 || outOfScope.skipped !== 3) failures.push(`文件目标模式（域外/非源码/不存在）应全跳过，got ${JSON.stringify(outOfScope)}`);
    const relative = judgeTargets(repo, [path.relative(process.cwd(), badAbs)]);
    if (relative.judged !== 1 || relative.violations.length !== 1) failures.push(`文件目标模式（相对目标）未命中，got ${JSON.stringify(relative)}`);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
  if (failures.length > 0) {
    for (const f of failures) console.log(`SELF-TEST FAIL: ${f}`);
    return 1;
  }
  console.log(`${PROGRAM} self-test: 11 判据夹具 + 4 文件目标模式夹具 passed`);
  return 0;
}

/** CLI 分发：`--self-test` 独占；无参 = 全量（门禁面）；`<file>...` = 文件目标模式（在环面）。 */
function main(): number {
  const argv = process.argv.slice(2);
  if (argv.includes("--self-test")) {
    if (argv.length !== 1) {
      process.stderr.write(`${USAGE}${PROGRAM}: error: --self-test takes no other arguments\n`);
      return 2;
    }
    return selfTest();
  }
  const flag = argv.find((a) => a.startsWith("-") && a !== "-");
  if (flag !== undefined) {
    process.stderr.write(`${USAGE}${PROGRAM}: error: unrecognized arguments: ${flag}\n`);
    return 2;
  }
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  if (argv.length > 0) return runFileTargets(repoRoot, argv);
  return realRun(repoRoot);
}

process.exit(main());
