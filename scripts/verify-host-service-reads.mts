#!/usr/bin/env node
/**
 * verify-host-service-reads — 适配层宿主服务读取面闸（ADR 2026-09-13-host-service-reads-gate）。
 *
 * 判据：`adapters/**` 的 .ts/.mts 里对插件 runtime 上下文（标识符 `ctx`）的读取，其名字
 * 必须落在白名单内：
 *   ① `inject` 声明——各件 `export const inject = [ … ]` 的字符串面并集（本件不手抄声明集）；
 *   ② cordis `Context` 的混入/代理面——`CTX_SURFACE` 常量（名单枚举自 devDependency
 *      `@deepseek-ai/cordis` 的 Context 声明面：context / events / reflect / registry / fiber；
 *      宿主升代后按新声明复核）。
 * 白名单外的读取 = 未声明服务直读。cordis runtime fiber 对未 inject 的服务直读即抛
 * （`ctx.get` 才返回 `undefined`），降级路径整条变成一条 warn——可缺席服务一律走
 * `ctx.get(<name>)`（现象与取证见 ADR 2026-09-13-adapter-service-read-lazy-get）。
 * `ctx.get(<name>)` 的服务名字符串不在判据内：无 inject 要求即合法读法。
 *
 * 判据边界（如实记）：
 * - 只认标识符名 `ctx`——本层 runtime 上下文的既有命名；改名或换载体即不在判据内
 *   （AST 判据，不是语义判据）。
 * - 读法只判三种：属性读取 `ctx.x`、字面量元素访问 `ctx["x"]`、字面量键的解构
 *   `const { x } = ctx` / `const { a: x } = ctx`。计算属性键（`ctx[expr]`、计算键解构）、
 *   rest 元素（`const { ...rest } = ctx`）与嵌套解构不在判据内。
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
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { listSources } from "./srctree.mts";

const PROGRAM = "verify-host-service-reads.mts";
const USAGE = `usage: ${PROGRAM} [--self-test]\n`;
const SOURCE_ROOT = "adapters";
/** 判据载体标识符（本层 runtime 上下文命名；见头注「判据边界」）。 */
const CTX_IDENT = "ctx";
/**
 * cordis `Context` 的混入/代理面：读这些名字不走 service resolver、不会因未 inject 而抛。
 * 名单来自两处权威面（宿主升代后按新声明复核）：①`@deepseek-ai/cordis` 的 Context 声明
 * （lib/types 的 context / events / reflect / registry / fiber）；②运行时转发面
 * `src/reflect.ts` 的 `ctx.mixin(...)` 调用（把各服务成员挂到 ctx，如 `fiber` → `runtime`
 * / `effect`）。
 */
const CTX_SURFACE = new Set([
  "root",
  "baseUrl",
  "events",
  "logger",
  "reflect",
  "registry",
  "fiber",
  "effect",
  "runtime",
  "on",
  "once",
  "emit",
  "parallel",
  "serial",
  "bail",
  "waterfall",
  "get",
  "set",
  "provide",
  "accessor",
  "mixin",
  "inject",
  "plugin",
]);

interface Violation {
  file: string;
  line: number;
  name: string;
  /** 观测到的读法（违约行诊断面：三种形态各带原样表达式）。 */
  read: string;
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

/** 单文件判据：`ctx` 的白名单外读取 → 违规（三种读法各计一处，按源码序）。 */
function checkSource(file: string, text: string, declared: ReadonlySet<string>): Violation[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const out: Violation[] = [];
  const push = (node: ts.Node, name: string, read: string): void => {
    if (CTX_SURFACE.has(name) || declared.has(name)) return;
    out.push({
      file,
      line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      name,
      read,
    });
  };
  const isCtx = (node: ts.Expression): boolean => ts.isIdentifier(node) && node.text === CTX_IDENT;
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node) && isCtx(node.expression)) {
      push(node, node.name.text, `${CTX_IDENT}.${node.name.text}`);
    } else if (
      ts.isElementAccessExpression(node) &&
      isCtx(node.expression) &&
      node.argumentExpression !== undefined &&
      ts.isStringLiteral(node.argumentExpression)
    ) {
      push(node, node.argumentExpression.text, `${CTX_IDENT}["${node.argumentExpression.text}"]`);
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer !== undefined &&
      isCtx(node.initializer)
    ) {
      for (const el of node.name.elements) {
        if (!ts.isBindingElement(el)) continue;
        const key = el.propertyName ?? el.name;
        if (!ts.isIdentifier(key)) continue;
        push(el, key.text, `const { ${key.text} } = ${CTX_IDENT}`);
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
    `FAIL: ${v.file}:${v.line}: ${v.read} 读的名字既不在 inject 声明内、也不属 cordis Context 混入面` +
      ` —— 可缺席服务走 ctx.get("${v.name}")`,
  );
}

type TreeJudgment =
  | { failClosed: string }
  | { files: number; declared: string[]; violations: Violation[] };

/** 单仓判据：扫描面 + 覆盖面 fail-closed 两档（夹具直跑，收益 = 覆盖面分支可证伪）。 */
function judgeTree(root: string): TreeJudgment {
  const dir = path.join(root, SOURCE_ROOT);
  if (!fs.existsSync(dir)) return { failClosed: `源根缺失：${SOURCE_ROOT}` };
  const files = listSources(dir);
  if (files.length === 0) return { failClosed: `${SOURCE_ROOT}/ 下零源码件` };
  const texts = files.map((f) => ({ file: path.relative(root, f), text: fs.readFileSync(f, "utf-8") }));
  const declared = new Set(texts.flatMap(({ file, text }) => declaredServices(text, file)));
  const violations = texts.flatMap(({ file, text }) => checkSource(file, text, declared));
  return { files: files.length, declared: [...declared], violations };
}

function realRun(repoRoot: string): number {
  const judgment = judgeTree(repoRoot);
  if ("failClosed" in judgment) {
    console.error(`${PROGRAM}: FAIL-CLOSED — ${judgment.failClosed}（覆盖面不得静默归零）`);
    return 2;
  }
  if (judgment.violations.length === 0) {
    console.log(
      `OK: ${judgment.files} 件适配层源码的 ctx 读取均在 inject 声明 ∪ cordis Context 混入面白名单内` +
        `（声明服务 ${judgment.declared.length} 个）`,
    );
    return 0;
  }
  for (const v of judgment.violations) printViolation(v);
  return 1;
}

/** 夹具自测：违约样例必须 FAIL，合规样例必须 PASS，覆盖面两档必须 fail-closed。 */
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
    `${all}function f(ctx: any) {\n  ctx.tools.register();\n  ctx.systemPrompt.section();\n  ctx.get("tokenMeter");\n  ctx.on("e", () => {});\n  ctx.emit("e");\n  ctx.logger("n");\n  ctx.provide("p", 1);\n  ctx.inject(["skills"], () => {});\n  ctx.plugin({});\n}\n`,
    0,
    "合规样例（inject 声明 ∪ cordis Context 混入面）被误判 FAIL",
  );
  expect(
    "ctx-surface.ts",
    'function f(ctx: any) {\n  ctx.runtime;\n  ctx.fiber;\n  ctx.mixin("x", []);\n}\n',
    0,
    "合规样例（cordis 转发面 runtime/fiber/mixin）被误判 FAIL",
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
    "element-access.ts",
    'function f(ctx: any) {\n  ctx["userQuestions"];\n}\n',
    1,
    "违约样例（字面量元素访问）未被拒",
  );
  expect(
    "element-access-surface.ts",
    'function f(ctx: any) {\n  ctx["get"]("x");\n}\n',
    0,
    "合规样例（元素访问读混入面）被误判 FAIL",
  );
  expect(
    "computed-element-access.ts",
    'function f(ctx: any, name: string) {\n  ctx[name];\n}\n',
    0,
    "合规样例（计算属性键不在判据内）被误判 FAIL",
  );
  expect(
    "destructure.ts",
    'function f(ctx: any) {\n  const { userQuestions } = ctx;\n}\n',
    1,
    "违约样例（字面量键解构）未被拒",
  );
  expect(
    "destructure-renamed.ts",
    'function f(ctx: any) {\n  const { userQuestions: ask } = ctx;\n}\n',
    1,
    "违约样例（重命名解构取原名判据）未被拒",
  );
  expect(
    "destructure-surface.ts",
    'function f(ctx: any) {\n  const { logger, get } = ctx;\n}\n',
    0,
    "合规样例（解构混入面）被误判 FAIL",
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
    "违约样例（模板串插值内是真代码）未被拒",
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
    "empty-inject.ts",
    "export const inject: string[] = [];\nfunction f(ctx: any) {\n  ctx.on(\"e\", () => {});\n}\n",
    0,
    "合规样例（带类型标注的空 inject 声明）被误判 FAIL",
  );
  const declared = declaredServices(all, "decl.ts");
  if (declared.join(",") !== "tools,systemPrompt") {
    failures.push(`inject 声明解析不符：期望 tools,systemPrompt，实得 ${declared.join(",")}`);
  }

  // 覆盖面与过滤分支（判据面之外的扫描面）：真树夹具直跑 judgeTree。
  const td = fs.mkdtempSync(path.join(os.tmpdir(), "hsr-"));
  const write = (rel: string, text: string): void => {
    const abs = path.join(td, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text);
  };
  try {
    write("ok/adapters/dsh/good.mts", `${all}function f(ctx: any) {\n  ctx.on("e", () => {});\n}\n`);
    write("ok/adapters/dsh/data.json", "{}\n");
    write("ok/adapters/notes.md", "# 非源码\n");
    const ok = judgeTree(path.join(td, "ok"));
    if ("failClosed" in ok || ok.files !== 1 || ok.violations.length !== 0) {
      failures.push(`源树夹具（非源码件须过滤）判定不符：${JSON.stringify(ok)}`);
    }
    write("bad/adapters/dsh/bad.mts", "function f(ctx: any) {\n  ctx.userQuestions;\n}\n");
    const bad = judgeTree(path.join(td, "bad"));
    if ("failClosed" in bad || bad.violations.length !== 1 || bad.violations[0]?.name !== "userQuestions") {
      failures.push(`源树夹具（白名单外读取）判定不符：${JSON.stringify(bad)}`);
    }
    fs.mkdirSync(path.join(td, "missing"));
    const missing = judgeTree(path.join(td, "missing"));
    if (!("failClosed" in missing) || !missing.failClosed.includes("源根缺失")) {
      failures.push(`覆盖面夹具（源根缺失）应 fail-closed，got ${JSON.stringify(missing)}`);
    }
    write("empty/adapters/dsh/data.json", "{}\n");
    const empty = judgeTree(path.join(td, "empty"));
    if (!("failClosed" in empty) || !empty.failClosed.includes("零源码件")) {
      failures.push(`覆盖面夹具（零源码件）应 fail-closed，got ${JSON.stringify(empty)}`);
    }
  } finally {
    fs.rmSync(td, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    for (const f of failures) console.log(`SELF-TEST FAIL: ${f}`);
    return 1;
  }
  console.log(
    `${PROGRAM} self-test: 20 判据夹具 + 1 声明解析夹具 + 4 源树/覆盖面夹具 passed`,
  );
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
