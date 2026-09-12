#!/usr/bin/env node
/**
 * verify-host-service-reads — 适配层宿主服务读取面闸（ADR 2026-09-13-host-service-reads-gate）。
 *
 * 判据：`adapters/**` 的 .ts/.mts 里对插件 runtime 上下文（标识符 `ctx`）的**属性读取**，
 * 其名字必须落在白名单内：
 *   ① `inject` 声明——各件 `export const inject = [ … ]` 的字符串面并集（本件不手抄声明集）；
 *   ② cordis mixin——`get` / `on` / `inject` / `logger` / `provide`（装载器与 runtime 提供，
 *      不走插件 inject 声明）。
 * 白名单外的读取 = 未声明服务直读。cordis runtime fiber 对未 inject 的服务直读属性即抛
 * （`ctx.get` 才返回 `undefined`），降级路径整条变成一条 warn——可缺席服务一律走
 * `ctx.get(<name>)`（现象与取证见 ADR 2026-09-13-adapter-service-read-lazy-get）。
 * `ctx.get(<name>)` 的服务名字符串不在判据内：无 inject 要求即合法读法。
 *
 * 判据边界（如实记）：
 * - 只认标识符名 `ctx` 的属性读取——本层 runtime 上下文的既有命名；改名或换载体即不在
 *   判据内（AST 判据，不是语义判据）。
 * - 类型面的服务声明（interface 字段、类型别名）不判：读面才是运行时行为面。
 * - 注释与字符串里的 `ctx.*` 天然不算（AST 判据；模板串 `${}` 内是真代码，照判）。
 * - 子目录递归（`adapters/<host>/**`），domain 归属由本件单源判定，调用方不复刻。
 *
 * 用法（仓库根运行，同其余 verify-*）：
 *     node scripts/verify-host-service-reads.mts [--self-test]
 * 退出码：0 = PASS，1 = FAIL（白名单外读取），2 = fail-closed（参数误用 / 源根缺失 / 零覆盖面）。
 * 运行前提：node ≥22.18（原生 type stripping）+ devDependency typescript（解析器）。
 * 模块形态：显式 .mts（ESM）——本仓 package.json type=commonjs，裸 .ts 装不下 import。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const PROGRAM = "verify-host-service-reads.mts";
const USAGE = `usage: ${PROGRAM} [--self-test]\n`;
const SOURCE_ROOT = "adapters";
const SOURCE_EXT_RE = /\.(ts|mts)$/;
/** 判据载体标识符（本层 runtime 上下文命名；见头注「判据边界」）。 */
const CTX_IDENT = "ctx";
/** cordis 装载器/runtime 提供的 mixin 面（不走插件 inject 声明）——白名单单源。 */
const MIXIN_NAMES = new Set(["get", "on", "inject", "logger", "provide"]);

interface Violation {
  file: string;
  line: number;
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

/** `export const inject = [ "…" ]` 的字符串面（跨件并集调用方负责；数组缺席/非字面量 = 空集）。 */
function declaredServices(text: string, file: string): string[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    const isExport = mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    if (
      isExport &&
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some(
        (d) => ts.isIdentifier(d.name) && d.name.text === "inject",
      )
    ) {
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || decl.name.text !== "inject") continue;
        const init = decl.initializer;
        if (init !== undefined && ts.isArrayLiteralExpression(init)) {
          for (const el of init.elements) {
            if (ts.isStringLiteral(el)) out.push(el.text);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** 单文件判据：`ctx.<name>` 读取面不在白名单内 → 违规（每处一次，按源码序）。 */
function checkSource(file: string, text: string, declared: ReadonlySet<string>): Violation[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const out: Violation[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === CTX_IDENT
    ) {
      const name = node.name.text;
      if (!MIXIN_NAMES.has(name) && !declared.has(name)) {
        out.push({
          file,
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          name,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** 违约行（人面输出；本闸不入在环消费面，语言按人面口径）。 */
function printViolation(v: Violation): void {
  console.log(
    `FAIL: ${v.file}:${v.line}: ctx.${v.name} 既不在 inject 声明内、也不属 cordis mixin` +
      ` —— 可缺席服务走 ctx.get("${v.name}")`,
  );
}

function realRun(repoRoot: string): number {
  const root = path.join(repoRoot, SOURCE_ROOT);
  if (!fs.existsSync(root)) {
    console.error(`${PROGRAM}: FAIL-CLOSED — 源根缺失：${SOURCE_ROOT}（覆盖面不得静默归零）`);
    return 2;
  }
  const files = listSources(root);
  if (files.length === 0) {
    console.error(`${PROGRAM}: FAIL-CLOSED — ${SOURCE_ROOT}/ 下零源码件（覆盖面不得静默归零）`);
    return 2;
  }
  const texts = files.map((f) => ({ file: path.relative(repoRoot, f), text: fs.readFileSync(f, "utf-8") }));
  const declared = new Set(texts.flatMap(({ file, text }) => declaredServices(text, file)));
  const violations = texts.flatMap(({ file, text }) => checkSource(file, text, declared));
  if (violations.length === 0) {
    console.log(
      `OK: ${files.length} 件适配层源码的 ctx 读取均在 inject 声明 ∪ cordis mixin 白名单内` +
        `（声明服务 ${declared.size} 个）`,
    );
    return 0;
  }
  for (const v of violations) printViolation(v);
  return 1;
}

/** 夹具自测：违约样例必须 FAIL，合规样例必须 PASS。 */
function selfTest(): number {
  const failures: string[] = [];
  const check = (name: string, text: string): Violation[] => {
    const declared = new Set(declaredServices(text, name));
    return checkSource(name, text, declared);
  };
  const expect = (name: string, text: string, want: number, what: string): void => {
    const n = check(name, text).length;
    if (n !== want) failures.push(`${what}（期望 ${want} 处违规，实得 ${n} 处）`);
  };
  const all = 'export const inject = ["tools", "systemPrompt"];\n';
  expect(
    "good.ts",
    `${all}function f(ctx: any) {\n  ctx.tools.register();\n  ctx.systemPrompt.section();\n  ctx.get("tokenMeter");\n  ctx.on("e", () => {});\n  ctx.logger("n");\n  ctx.provide("p", 1);\n  ctx.inject(["skills"], () => {});\n}\n`,
    0,
    "合规样例（inject 声明 ∪ cordis mixin）被误判 FAIL",
  );
  expect(
    "bad-undeclared.ts",
    'function f(ctx: any) {\n  ctx.userQuestions;\n}\n',
    1,
    "违约样例（未声明服务直读）未被拒",
  );
  expect(
    "bad-undeclared-call.ts",
    `${all}function f(ctx: any) {\n  ctx.userQuestions.ask({});\n}\n`,
    1,
    "违约样例（未声明服务的方法调用）未被拒",
  );
  expect(
    "bad-partial-inject.ts",
    'export const inject = ["systemPrompt"];\nfunction f(ctx: any) {\n  ctx.tools.register();\n}\n',
    1,
    "违约样例（inject 未声明该服务）未被拒",
  );
  expect(
    "comment.ts",
    '// ctx.tokenMeter 直读即抛\n/* ctx.userQuestions\n   另一行 */\nfunction f(ctx: any) {}\n',
    0,
    "合规样例（注释里的 ctx.*）被误判 FAIL",
  );
  expect(
    "string.ts",
    'const s = "ctx.userQuestions";\nconst t = \'ctx.tokenMeter\';\n',
    0,
    "合规样例（字符串里的 ctx.*）被误判 FAIL",
  );
  expect(
    "template-text.ts",
    "const s = `prefix ctx.userQuestions`;\n",
    0,
    "合规样例（模板串文本里的 ctx.*）被误判 FAIL",
  );
  expect(
    "template-code.ts",
    `function f(ctx: any) {\n  const s = \`\${ctx.userQuestions}\`;\n}\n`,
    1,
    '违约样例（模板串插值内是真代码）未被拒',
  );
  expect(
    "other-ident.ts",
    "function f(c: any) {\n  c.userQuestions;\n}\n",
    0,
    "合规样例（非 ctx 标识符不属判据面）被误判 FAIL",
  );
  expect(
    "optional-chain.ts",
    "function f(ctx: any) {\n  ctx?.userQuestions;\n}\n",
    1,
    "违约样例（可选链直读）未被拒",
  );
  expect(
    "nested-member.ts",
    `${all}function f(ctx: any) {\n  ctx.systemPrompt.section({ name: "s", order: 1, text: "t" });\n}\n`,
    0,
    "合规样例（二级成员只判首级属性）被误判 FAIL",
  );
  expect(
    "type-only.ts",
    "interface HostContext {\n  userQuestions?: { ask(): Promise<unknown> };\n}\n",
    0,
    "合规样例（类型面服务声明不属读面）被误判 FAIL",
  );
  expect(
    "no-inject.ts",
    "function f(ctx: any) {\n  ctx.on(\"e\", () => {});\n}\n",
    0,
    "合规样例（零 inject 声明时 mixin 仍放行）被误判 FAIL",
  );
  expect(
    "empty-inject.ts",
    "export const inject: string[] = [];\nfunction f(ctx: any) {\n  ctx.on(\"e\", () => {});\n}\n",
    0,
    "合规样例（带类型标注的空 inject 声明）被误判 FAIL",
  );
  const declared = declaredServices(all, "decl.ts");
  if (declared.join(",") !== "tools,systemPrompt") {
    failures.push(`inject 声明解析不符：期望 tools,systemPrompt，实得 ${declared.join(",")}`);
  }
  if (failures.length > 0) {
    for (const f of failures) console.log(`SELF-TEST FAIL: ${f}`);
    return 1;
  }
  console.log(`${PROGRAM} self-test: 14 判据夹具 + 1 声明解析夹具 passed`);
  return 0;
}

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
  return realRun(repoRoot);
}

process.exit(main());
