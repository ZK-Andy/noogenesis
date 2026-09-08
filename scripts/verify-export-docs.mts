#!/usr/bin/env node
/**
 * verify-export-docs — 导出面契约注释闸（C2；ADR 2026-09-08-c2-lint-enforcement）。
 *
 * 判据：engine/ + adapters/dsh/ + scripts/ 的 .ts/.mts 中，**导出函数/类声明**
 * 必须有紧邻 JSDoc 块（`/** *\/`）。类型/接口/常量不判——契约常由类型自身承载，
 * 强制注释产 slop（code-standards §2.1 判别式：「删掉注释调用方能否安全使用」）。
 * 注释内容质量仍留评审（根 AGENTS「评审检查项」第 4 条），本闸只判存在性。
 *
 * 已知语义：TS 的 JSDoc 归属把「文件头块直接紧邻首个导出」计为该导出的注释
 * （本仓文件头后必有 import 或非导出声明，实测无此形态）。
 *
 * 用法（仓库根运行，同其余 verify-*）：node scripts/verify-export-docs.mts [--self-test]
 * 退出码：0 = PASS，1 = FAIL（导出函数/类缺契约注释），2 = fail-closed（源树缺失）。
 * 运行前提：node ≥22.18（原生 type stripping）+ devDependency typescript（解析器）。
 * 模块形态：显式 .mts（ESM）——本仓 package.json type=commonjs，裸 .ts 装不下 import。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const PROGRAM = "verify-export-docs.mts";
const SOURCE_ROOTS = ["engine", "adapters/dsh", "scripts"];
const SOURCE_EXT_RE = /\.(ts|mts)$/;

interface Violation {
  file: string;
  line: number;
  kind: "function" | "class";
  name: string;
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

/** 单文件判据：导出函数/类声明无 JSDoc → 违规。 */
function checkSource(file: string, text: string): Violation[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const out: Violation[] = [];
  const visit = (node: ts.Node): void => {
    const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    const isExport = mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    const isFn = ts.isFunctionDeclaration(node);
    const isClass = ts.isClassDeclaration(node);
    if (isExport && (isFn || isClass) && ts.getJSDocCommentsAndTags(node).length === 0) {
      const start = node.getStart(sf);
      out.push({
        file,
        line: sf.getLineAndCharacterOfPosition(start).line + 1,
        kind: isClass ? "class" : "function",
        name: node.name?.getText(sf) ?? "<default>",
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

function realRun(repoRoot: string): number {
  const files: string[] = [];
  for (const rel of SOURCE_ROOTS) files.push(...listSources(path.join(repoRoot, rel)));
  if (files.length === 0) {
    console.error(`${PROGRAM}: FAIL-CLOSED — 源树为空（${SOURCE_ROOTS.join(", ")}），判据失效`);
    return 2;
  }
  const violations = files.flatMap((f) => checkSource(path.relative(repoRoot, f), fs.readFileSync(f, "utf-8")));
  if (violations.length === 0) {
    console.log(`OK: ${files.length} 件源码导出函数/类均带契约注释`);
    return 0;
  }
  for (const v of violations) {
    console.log(`FAIL: ${v.file}:${v.line}: 导出 ${v.kind} ${v.name} 缺契约注释（/** */ 紧邻声明）`);
  }
  return 1;
}

/** 夹具自测：违约样例必须 FAIL，合规样例必须 PASS。 */
function selfTest(): number {
  const failures: string[] = [];
  const check = (name: string, text: string): number => checkSource(name, text).length;
  if (check("good.ts", "/** 契约：返回 1。 */\nexport function foo(): number { return 1; }\n") !== 0) {
    failures.push("合规样例（导出函数带 JSDoc）被误判 FAIL");
  }
  if (check("good-class.ts", "/** 契约：持有 n。 */\nexport class Box { constructor(readonly n: number) {} }\n") !== 0) {
    failures.push("合规样例（导出类带 JSDoc）被误判 FAIL");
  }
  if (check("bad.ts", "export function foo(): number { return 1; }\n") === 0) {
    failures.push("违约样例（导出函数无 JSDoc）未被拒");
  }
  if (check("bad-class.ts", "export class Box {}\n") === 0) {
    failures.push("违约样例（导出类无 JSDoc）未被拒");
  }
  if (check("bad-line-comment.ts", "// 行注释不是 JSDoc\nexport function foo(): number { return 1; }\n") === 0) {
    failures.push("违约样例（仅行注释）未被拒");
  }
  if (check("ok-const.ts", "export const N = 1;\nexport type T = string;\nexport interface I { a: number }\n") !== 0) {
    failures.push("合规样例（导出常量/类型/接口不在判据内）被误判 FAIL");
  }
  if (check("ok-internal.ts", "function hidden(): number { return 1; }\n") !== 0) {
    failures.push("合规样例（非导出函数不在判据内）被误判 FAIL");
  }
  if (check("bad-default.ts", "export default function (): number { return 1; }\n") === 0) {
    failures.push("违约样例（匿名默认导出函数无 JSDoc）未被拒");
  }
  if (failures.length > 0) {
    for (const f of failures) console.log(`SELF-TEST FAIL: ${f}`);
    return 1;
  }
  console.log(`${PROGRAM} self-test: 8 fixtures passed`);
  return 0;
}

if (process.argv[2] === "--self-test") {
  process.exit(selfTest());
}
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.exit(realRun(repoRoot));
