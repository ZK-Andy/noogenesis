#!/usr/bin/env node
/**
 * verify-doc-budgets — 常驻文档字数预算门禁（manifest 驱动）。
 *
 * 判据：manifest（repo 根 doc-budgets.manifest.json，或 --manifest 显式给定）的
 * budgets[] 逐条：文件缺失 = 违约（预算条目失去文件 = 文档消失或 manifest 过期）；
 * 计词（代码块与表格行剔除后）超上限 = 违约，带字数与超限处理序三步。
 * 计词口径：WORD_RE = unicode 词字符连续段（JS 侧用 [\p{L}\p{N}_\u4e00-\u9fff]+ + u
 * flag 展开——JS \w 只匹配 ASCII，Python \w 含 CJK，语义必须等价展开）；
 * 剔除顺序：先代码块 ```…```（DOTALL 惰性匹配）后表格行（^…$ 逐行，\s* 可跨行）。
 * 超限处理序单源 docs/method/doc-standards.md；C12：cookbook 超限首选蒸馏/合并条目。
 *
 * 用法：
 *   node scripts/verify-doc-budgets.mts                 # manifest 缺省 ./doc-budgets.manifest.json
 *   node scripts/verify-doc-budgets.mts --manifest <p>  # 显式 manifest 路径（支持 --manifest=v、前缀缩写）
 *   node scripts/verify-doc-budgets.mts --self-test     # 补齐缺口：py 无自检，B1 按夹具纪律补最小组
 * 退出码：0 = PASS（含 SKIP），1 = FAIL（违约），2 = 参数面错误（同 py argparse 语义）。
 * 模块形态：显式 .mts（ESM），node ≥22.18 原生 type stripping 直跑，零 devDependency。
 *
 * Provenance: distilled from dotnet-deepseek-harness-desktop/scripts/verify-doc-budgets.py
 * (MIT, 2026-09-05)；verbatim 移植，逻辑未改（B0 2026-09-08：超限文案带处理序三步 +
 * cookbook 蒸馏提示，per C12 / ADR 2026-09-08-b0-framework-structure）。
 * B1 随族迁 TS（2026-09-08，.agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md）。
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// Python \w 是 unicode 词字符（含 CJK）；JS \w 只匹配 ASCII，必须等价展开 + u flag。
const WORD_RE = /[\p{L}\p{N}_\u4e00-\u9fff]+/gu;
// py `.`（DOTALL）= 任意字符 → JS [\s\S]；惰性 + 全局同序。
const CODE_BLOCK_RE = /```[\s\S]*?```/g;
// py MULTILINE ^ 仅在串首/换行符后（JS 的 m-flag 额外认 \r/\u2028/\u2029，故用
// lookbehind 精确对齐）；py `.` = [^\n]；py \s 含 \n，可跨行吞空行与尾换行。
const TABLE_LINE_RE = /(?<=^|\n)\s*\|[^\n]*\|\s*$/gm;

function countWords(text: string): number {
  let body = text.replace(CODE_BLOCK_RE, ""); // 剔除代码块
  body = body.replace(TABLE_LINE_RE, ""); // 剔除表格行
  return (body.match(WORD_RE) ?? []).length;
}

/** Python PurePosixPath 字符串规范化（f"{Path}" 的显示形态）。 */
function normPyPath(p: string): string {
  if (p === "") return ".";
  const absolute = p.startsWith("/");
  const parts = p.split("/").filter((s) => s !== "" && s !== ".");
  const joined = parts.join("/");
  if (joined === "") return absolute ? "/" : ".";
  return (absolute ? "/" : "") + joined;
}

function isFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/** Python int() 等价（bool→0/1，float 截断，str 仅整数字面量，其余抛错）。 */
function pyInt(v: unknown): number {
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new TypeError("cannot convert float infinity or NaN to integer");
    return Math.trunc(v);
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!/^[+-]?\d+$/.test(s)) throw new Error(`invalid literal for int() with base 10: ${JSON.stringify(v)}`);
    return Number.parseInt(s, 10);
  }
  throw new TypeError("int() argument must be a string, a bytes-like object or a real number");
}

/** 核心：对一个 manifest 做预算校验。返回退出码与按序输出行（供 realRun 与 self-test 共用）。
 *  doc 相对路径按 py 语义相对 baseDir（默认 = 当前 cwd）解析，显示保持 manifest 原串。 */
function budgetsCheck(manifestArg: string, baseDir: string = process.cwd()): { exit: number; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  const manifest = normPyPath(manifestArg);
  if (!isFile(manifest)) {
    out.push(`SKIP: manifest ${manifest} not found`);
    return { exit: 0, out, err };
  }
  const data: any = JSON.parse(fs.readFileSync(manifest, "utf-8"));

  const errors: string[] = [];
  for (const entry of data["budgets"]) {
    const docRaw = entry["path"];
    if (typeof docRaw !== "string") throw new TypeError("Path argument must be string, not " + typeof docRaw);
    const doc = normPyPath(docRaw);
    const limit = pyInt(entry["max_words"]);
    const resolved = path.resolve(baseDir, docRaw);
    if (!isFile(resolved)) {
      errors.push(`${doc}: budget entry but file missing (stale manifest?)`);
      continue;
    }
    const words = countWords(fs.readFileSync(resolved, "utf-8"));
    const status = words <= limit ? "OK" : "FAIL";
    if (status === "FAIL") {
      // 超限处理序单源 docs/method/doc-standards.md；C12：cookbook 超限首选蒸馏/合并条目
      errors.push(`${doc}: ${words} words > budget ${limit} (procedure: relocate -> condense -> raise ceiling with justification; cookbook: distill/merge entries first; see docs/method/doc-standards.md)`);
    } else {
      out.push(`OK   ${doc}: ${words}/${limit}`);
    }
  }

  if (errors.length > 0) {
    for (const e of errors) out.push(`FAIL: ${e}`);
    return { exit: 1, out, err };
  }
  out.push("OK");
  return { exit: 0, out, err };
}

const PROG = path.basename(process.argv[1] ?? "verify-doc-budgets.mts");
const OPTION_STRS = ["--help", "--manifest"];
const USAGE = `usage: ${PROG} [-h] [--manifest MANIFEST]`;

function printHelpAndExit(): never {
  console.log(USAGE);
  console.log("");
  console.log("options:");
  console.log("  -h, --help           show this help message and exit");
  console.log("  --manifest MANIFEST");
  process.exit(0);
}

function argErrorAndExit(msg: string): never {
  console.error(USAGE);
  console.error(`${PROG}: error: ${msg}`);
  process.exit(2);
}

/** argparse 等价解析：--manifest（支持 = 值、前缀缩写、重复取末值）、-h/--help（含
 *  单杠簇内含 h）、未知参数/位置参数 → "unrecognized arguments" exit 2。 */
function parseManifestArg(argv: string[]): string {
  let manifest: string | null = null;
  const unrecognized: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]!;
    if (tok === "--") {
      for (let j = i; j < argv.length; j++) unrecognized.push(argv[j]!);
      break;
    }
    if (tok.startsWith("--")) {
      const eq = tok.indexOf("=");
      const name = eq === -1 ? tok : tok.slice(0, eq);
      const matches = OPTION_STRS.filter((o) => o.startsWith(name));
      if (matches.length === 0) {
        unrecognized.push(tok);
        continue;
      }
      if (matches[0] === "--help") printHelpAndExit();
      if (eq !== -1) {
        manifest = tok.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next === undefined || (next.startsWith("-") && next.length > 1)) {
          argErrorAndExit("argument --manifest: expected one argument");
        }
        manifest = next!;
        i++;
      }
    } else if (tok.startsWith("-") && tok.length > 1) {
      if (tok.slice(1).includes("h")) printHelpAndExit();
      unrecognized.push(tok);
    } else {
      unrecognized.push(tok);
    }
  }
  if (unrecognized.length > 0) {
    argErrorAndExit(`unrecognized arguments: ${unrecognized.join(" ")}`);
  }
  return manifest ?? "doc-budgets.manifest.json";
}

/** 补齐缺口（py 无 --self-test，B1 按 scripts/AGENTS.md 夹具纪律补最小组）：
 *  临时 manifest + 临时文档——合规 PASS、超限 FAIL（文案含处理序三步）、
 *  manifest 缺失 SKIP、条目指向缺失文件 FAIL；另含 CJK 计词口径断言。 */
function selfTest(): number {
  const failures: string[] = [];
  const mk = (files: Record<string, string>): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "budgets-"));
    for (const [name, content] of Object.entries(files)) {
      const p = path.join(dir, name);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, content, "utf-8");
    }
    return dir;
  };

  // CJK 计词口径：中文按词字符段计数，与英文单词同权（不塌缩成 1）。
  if (countWords("中文 词组 English words") !== 4) failures.push("CJK/英文计词口径不符（期望 4）");
  if (countWords("中文🚀emoji，全角标点。") !== 3) failures.push("emoji/全角标点不应计入词（期望 3：中文/emoji/全角标点）");

  // 合规：两个文档均在预算内 → PASS
  const ok = mk({
    "manifest.json": JSON.stringify({ budgets: [{ path: "a.md", max_words: 5 }, { path: "sub/b.md", max_words: 10 }] }),
    "a.md": "one two three",
    "sub/b.md": "中文 文档 词数 很少",
  });
  let r = budgetsCheck(path.join(ok, "manifest.json"), ok);
  if (r.exit !== 0 || r.out.join("\n") !== "OK   a.md: 3/5\nOK   sub/b.md: 4/10\nOK") {
    failures.push(`合规样例被误判（exit=${r.exit}，out=${JSON.stringify(r.out)}）`);
  }

  // 超限：FAIL 文案含字数与处理序三步 + cookbook 蒸馏提示
  const over = mk({
    "manifest.json": JSON.stringify({ budgets: [{ path: "big.md", max_words: 3 }] }),
    "big.md": "a1 a2 a3 a4 a5",
  });
  r = budgetsCheck(path.join(over, "manifest.json"), over);
  const overLine = r.out.find((l) => l.startsWith("FAIL: ")) ?? "";
  if (r.exit !== 1 || !overLine.includes("5 words > budget 3") || !overLine.includes("procedure: relocate -> condense -> raise ceiling with justification") || !overLine.includes("cookbook: distill/merge entries first")) {
    failures.push(`超限样例文案/退出码不符（exit=${r.exit}，out=${JSON.stringify(r.out)}）`);
  }

  // manifest 缺失 → SKIP，退出 0
  const missingDir = mk({});
  r = budgetsCheck(path.join(missingDir, "manifest.json"));
  if (r.exit !== 0 || r.out.join("\n") !== `SKIP: manifest ${path.join(missingDir, "manifest.json")} not found`) {
    failures.push(`manifest 缺失样例应为 SKIP/0（exit=${r.exit}，out=${JSON.stringify(r.out)}）`);
  }

  // 条目指向缺失文件 → FAIL（stale manifest 提示）
  const stale = mk({
    "manifest.json": JSON.stringify({ budgets: [{ path: "ghost.md", max_words: 10 }] }),
  });
  r = budgetsCheck(path.join(stale, "manifest.json"), stale);
  if (r.exit !== 1 || r.out.join("\n") !== "FAIL: ghost.md: budget entry but file missing (stale manifest?)") {
    failures.push(`缺失文件样例应 FAIL/1（exit=${r.exit}，out=${JSON.stringify(r.out)}）`);
  }

  if (failures.length > 0) {
    for (const f of failures) console.log(`SELF-TEST FAIL: ${f}`);
    return 1;
  }
  console.log("self-test OK");
  return 0;
}

function main(): number {
  if (process.argv[2] === "--self-test") {
    return selfTest();
  }
  const manifest = parseManifestArg(process.argv.slice(2));
  const { exit, out, err } = budgetsCheck(manifest);
  for (const l of out) console.log(l);
  for (const l of err) console.error(l);
  return exit;
}

process.exit(main());
