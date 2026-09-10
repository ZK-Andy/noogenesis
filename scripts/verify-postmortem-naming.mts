#!/usr/bin/env node
/**
 * verify-postmortem-naming — C12 教训层命名规则门禁（蓝图 §5/C12）。
 *
 * 判据：docs/postmortem/ 下仅允许 `000N-<kebab-topic>.md` 编号递增命名；
 * 目录不存在或空时零约束（PASS）。postmortem 形态单源：
 * docs/research/framework-rebuild-blueprint.md §5；立项 ADR 2026-09-08-b0-framework-structure。
 *
 * 用法（仓库根运行，同其余 verify-*）：node scripts/verify-postmortem-naming.mts [--self-test]
 * 退出码：0 = PASS，1 = FAIL（违命名规则）。
 * 运行前提：node ≥22.18（原生 type stripping 默认开启；更低版本表现为解析期
 * 语法错而非本门禁输出——CI setup-node 钉 22，本地需自备）。
 * 模块形态：显式 .mts（ESM）——本仓 package.json type=commonjs，裸 .ts 会被分类
 * 为 CJS 装不下 import 语法，且不依赖 node 版本间的模块语法探测差异。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { cmpPyStr } from "./pypara.mts";

interface Violation { entry: string; reason: string }

const NAME_RE = /^\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

/** 对 postmortem 目录做命名校验；dir 不存在或空 → 无违规（零约束）。 */
function checkPostmortemDir(dir: string): Violation[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const violations: Violation[] = [];
  let prev = -1;
  // 排序序与 py sorted 在非 ASCII 名上可不同（码元序 vs 码点序），但违规集合与
  // 退出码不变：匹配名被 NAME_RE 钉死 ASCII（prev 递增判据同序），不匹配名恒违规。
  for (const ent of entries.sort((a, b) => cmpPyStr(a.name, b.name))) {
    if (ent.isDirectory()) {
      violations.push({ entry: ent.name, reason: "postmortem/ 只收扁平叙事文件，不收子目录" });
      continue;
    }
    if (!ent.name.endsWith(".md")) {
      violations.push({ entry: ent.name, reason: "只允许 .md 条目" });
      continue;
    }
    const m = ent.name.match(NAME_RE);
    if (!m) {
      violations.push({ entry: ent.name, reason: "命名须为 000N-<kebab-topic>.md（四位零填充编号 + 小写连字符 slug）" });
      continue;
    }
    const n = Number.parseInt(m[0].slice(0, 4), 10);
    if (n <= prev) {
      violations.push({ entry: ent.name, reason: `编号重复（零填充四位编号按文件名序必须严格递增，前一件编号 ${prev}）` });
      continue;
    }
    prev = n;
  }
  return violations;
}

function realRun(): number {
  const dir = path.join(process.cwd(), "docs", "postmortem");
  if (!fs.existsSync(dir)) {
    console.log("SKIP: docs/postmortem/ 不存在（零约束）");
    return 0;
  }
  const violations = checkPostmortemDir(dir);
  if (violations.length === 0) {
    const count = fs.readdirSync(dir).length;
    console.log(count === 0 ? "SKIP: docs/postmortem/ 为空（零约束）" : `OK: ${count} 件 postmortem 命名合规`);
    return 0;
  }
  for (const v of violations) console.log(`FAIL: ${v.entry}: ${v.reason}`);
  return 1;
}

/** 夹具自测：违约样例必须 FAIL，合规样例必须 PASS。 */
function selfTest(): number {
  const failures: string[] = [];
  const created: string[] = [];
  const mk = (files: Record<string, string>): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pmn-"));
    created.push(dir);
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, name), content);
    }
    return dir;
  };

  try {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "pmn-"));
    created.push(empty);
    if (checkPostmortemDir(empty).length !== 0) failures.push("合规样例（空目录）被误判 FAIL");
    const ok = mk({ "0001-first-postmortem.md": "x", "0002-second-postmortem.md": "x" });
    if (checkPostmortemDir(ok).length !== 0) failures.push("合规样例（递增编号）被误判 FAIL");
    const badName = mk({ "1-bad.md": "x" });
    if (checkPostmortemDir(badName).length === 0) failures.push("违约样例（坏命名）未被拒");
    const dup = mk({ "0001-a.md": "x", "0001-b.md": "x" });
    if (checkPostmortemDir(dup).length === 0) failures.push("违约样例（重复编号）未被拒");
    const subdir = mk({});
    fs.mkdirSync(path.join(subdir, "nested"));
    if (checkPostmortemDir(subdir).length === 0) failures.push("违约样例（子目录）未被拒");
    const nonMd = mk({ "notes.txt": "x" });
    if (checkPostmortemDir(nonMd).length === 0) failures.push("违约样例（非 .md 条目）未被拒");
  } finally {
    for (const dir of created) fs.rmSync(dir, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    for (const f of failures) console.log(`SELF-TEST FAIL: ${f}`);
    return 1;
  }
  console.log("self-test OK");
  return 0;
}

if (process.argv[2] === "--self-test") {
  process.exit(selfTest());
}
process.exit(realRun());
