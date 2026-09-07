#!/usr/bin/env node
/**
 * verify-manifest — 共享基因库 manifest 一致性校验（P2 门禁；单源：ADR
 * .agents/notes/proposed/architecture/2026-09-06-p2-shared-consumer.md，D3）。
 *
 * manifest 是库的检索索引（repo 根 manifest.json，由 scripts/gen-manifest 生成）；
 * 本门禁把漂移变成 CI 失败：已提交的 manifest 必须精确描述 genes/ 树。
 *
 * 校验（对 repo 根，默认 cwd）：
 *   manifest.json
 *     - JSON 可解析；version == 1；genes 为数组；ref 唯一且按码点序排好
 *     - 每条恰有 {ref, path, summary, signals} 四键
 *     - path 为 POSIX 相对路径、形如 genes/<domain>/<id>.json 且文件存在
 *     - 条目内容与基因文件在 {summary, signals} 与锚字段（id == stem、
 *       domain == 父目录）上逐值一致
 *   genes/ 树
 *     - 每个 genes/<domain>/<id>.json 都在 manifest 中（无缺行）
 *
 * 用法（仓库根运行）：node scripts/verify-manifest.mts [--repo ROOT]
 *                     node scripts/verify-manifest.mts --self-test   # 离线夹具自检
 * 退出码：0 = PASS，1 = FAIL（违约）。
 * 模块形态：显式 .mts（ESM），node ≥22.18 原生 type stripping 直跑，零 devDependency。
 *
 * Provenance: original to Noogenesis (2026-09-06, P2 implementation round).
 * B1 随族迁 TS（2026-09-08，.agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md）。
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ENTRY_FIELDS = ["ref", "path", "summary", "signals"];

/** Python == 语义（跨 bool/number：True==1、False==0；对象/数组按值深度比较）。 */
function pyEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if ((a === true && b === 1) || (a === 1 && b === true) || (a === false && b === 0) || (a === 0 && b === false)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => pyEq(x, b[i]));
  }
  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    const ka = Object.keys(a as object), kb = Object.keys(b as object);
    return ka.length === kb.length && ka.every((k) =>
      Object.prototype.hasOwnProperty.call(b, k) && pyEq((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

/** Python repr() 对常用标量的近似（字符串带引号转义；None/bool/数字的字面形态）。 */
function pyRepr(v: unknown): string {
  if (v === undefined || v === null) return "None";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    const q = v.includes("'") && !v.includes('"') ? '"' : "'";
    return q + v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t").split(q).join("\\" + q) + q;
  }
  return JSON.stringify(v);
}

function pyListRepr(xs: unknown[]): string {
  return `[${xs.map(pyRepr).join(", ")}]`;
}

/** 码点序比较（Python 字符串排序语义）。 */
function pyCmp(a: string, b: string): number {
  const ca = Array.from(a);
  const cb = Array.from(b);
  const n = Math.min(ca.length, cb.length);
  for (let i = 0; i < n; i++) {
    const x = ca[i]!.codePointAt(0)!;
    const y = cb[i]!.codePointAt(0)!;
    if (x !== y) return x < y ? -1 : 1;
  }
  return ca.length - cb.length;
}

/** Python PurePosixPath 字符串规范化。 */
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

function isDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** 读 genes/<domain>/<id>.json → {ref: {path, id, domain, summary, signals}}；
 *  JSON 坏文件记为 {_error}，由 verify 汇入错误清单。 */
function scanTree(repo: string): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  const root = path.join(repo, "genes");
  if (!isDir(root)) return out;
  for (const domainDir of fs.readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort(pyCmp)) {
    for (const fname of fs.readdirSync(path.join(root, domainDir))
        .filter((f) => f.endsWith(".json"))
        .sort(pyCmp)) {
      const ref = `${domainDir}/${fname.slice(0, -".json".length)}`;
      const rel = normPyPath(path.relative(path.resolve(repo), path.resolve(path.join(root, domainDir, fname))).split(path.sep).join("/"));
      let data: any;
      try {
        data = JSON.parse(fs.readFileSync(path.join(root, domainDir, fname), "utf-8"));
      } catch (e) {
        out[ref] = { "_error": `${rel}: not valid JSON: ${e instanceof Error ? e.message : e}` };
        continue;
      }
      out[ref] = {
        "path": rel,
        "id": Object.prototype.hasOwnProperty.call(data, "id") ? data["id"] : null,
        "domain": Object.prototype.hasOwnProperty.call(data, "domain") ? data["domain"] : null,
        "summary": Object.prototype.hasOwnProperty.call(data, "summary") ? data["summary"] : null,
        "signals": Object.prototype.hasOwnProperty.call(data, "signals") ? data["signals"] : null,
      };
    }
  }
  return out;
}

/** 校验 repo：返回 [检查项数, 错误列表]。 */
function verify(repo: string): [number, string[]] {
  const errors: string[] = [];
  const mpath = path.join(repo, "manifest.json");
  if (!isFile(mpath)) {
    const tree = scanTree(repo);
    return [Object.keys(tree).length + 1, ["manifest.json missing at repo root (run scripts/gen-manifest.mts)"]];
  }
  let manifest: any;
  try {
    manifest = JSON.parse(fs.readFileSync(mpath, "utf-8"));
  } catch (e) {
    return [1, [`manifest.json: not valid JSON: ${e instanceof Error ? e.message : e}`]];
  }
  if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest)) {
    return [1, ["manifest.json: must be a JSON object"]];
  }
  // py `!= 1`：bool 是 int 子类（True == 1），此处对齐该相等语义。
  const version = Object.prototype.hasOwnProperty.call(manifest, "version") ? manifest["version"] : null;
  if (!(version === 1 || version === true)) {
    errors.push("manifest.json: version must be 1");
  }
  const genes = Object.prototype.hasOwnProperty.call(manifest, "genes") ? manifest["genes"] : null;
  if (!Array.isArray(genes)) {
    return [errors.length + 1, [...errors, "manifest.json: genes must be a list"]];
  }

  const tree = scanTree(repo);
  const rows: Record<string, Record<string, unknown>> = {};
  for (const [i, entry0] of genes.entries()) {
    const where = `manifest.json genes[${i}]`;
    const keys = (typeof entry0 === "object" && entry0 !== null && !Array.isArray(entry0)) ? Object.keys(entry0).sort() : null;
    if (keys === null || JSON.stringify(keys) !== JSON.stringify([...ENTRY_FIELDS].sort())) {
      errors.push(`${where}: entry must have exactly ${pyListRepr([...ENTRY_FIELDS].sort())}`);
      continue;
    }
    const entry = entry0 as Record<string, unknown>;
    const ref = entry["ref"];
    if (typeof ref !== "string") {
      errors.push(`${where}: ref must be two kebab segments <domain>/<id>`);
      continue;
    }
    const segs = ref.split("/");
    if (segs.length !== 2 || !segs.every((s) => KEBAB_RE.test(s))) {
      errors.push(`${where}: ref must be two kebab segments <domain>/<id>`);
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(rows, ref)) {
      errors.push(`${where}: duplicate ref ${ref}`);
      continue;
    }
    rows[ref] = entry;
    const p = entry["path"];
    if (p !== `genes/${ref}.json`) {
      errors.push(`${where}: path must be genes/<domain>/<id>.json matching ref, got ${pyRepr(p)}`);
      continue;
    }
    const f = path.join(repo, p as string);
    if (!isFile(f)) {
      errors.push(`${where}: path does not exist: ${p}`);
      continue;
    }
    let data: any;
    try {
      data = JSON.parse(fs.readFileSync(f, "utf-8"));
    } catch (e) {
      errors.push(`${where}: gene file not valid JSON: ${e instanceof Error ? e.message : e}`);
      continue;
    }
    const get = (o: any, k: string): unknown => (o !== null && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k)) ? o[k] : null;
    if (!(pyEq(get(data, "id"), ref.split("/")[1]) && pyEq(get(data, "domain"), ref.split("/")[0]))) {
      errors.push(`${where}: anchor drift (id/domain vs ref)`);
    }
    if (!pyEq(get(data, "summary"), entry["summary"])) {
      errors.push(`${where}: summary drift vs ${p}`);
    }
    if (!pyEq(get(data, "signals"), entry["signals"])) {
      errors.push(`${where}: signals drift vs ${p}`);
    }
  }

  const refs = genes
    .filter((e: unknown) => typeof e === "object" && e !== null && !Array.isArray(e) && typeof (e as Record<string, unknown>)["ref"] === "string")
    .map((e: any) => e["ref"] as string);
  const sortedRefs = [...refs].sort(pyCmp);
  if (JSON.stringify(refs) !== JSON.stringify(sortedRefs)) {
    errors.push("manifest.json: genes must be sorted by ref");
  }
  const treeKeys = Object.keys(tree);
  const rowKeys = Object.keys(rows);
  for (const ref of treeKeys.filter((r) => !rowKeys.includes(r)).sort(pyCmp)) {
    errors.push(`manifest.json: missing gene ${ref} (run scripts/gen-manifest.mts)`);
  }
  for (const ref of rowKeys.filter((r) => !treeKeys.includes(r)).sort(pyCmp)) {
    errors.push(`manifest.json: stale entry ${ref} (file absent from genes/)`);
  }
  for (const [ref, info] of Object.entries(tree)) {
    if (Object.prototype.hasOwnProperty.call(info, "_error")) {
      errors.push(info["_error"] as string);
    }
  }
  return [Object.keys(tree).length + genes.length, errors];
}

/** 离线夹具自检：构造合规与违约 genes 树 + manifest，违约样例必须 FAIL、合规样例必须 PASS。 */
function selfTest(): number {
  const gene = (domain: string, gid: string, summary = "s"): string =>
    JSON.stringify({ "id": gid, "domain": domain, "summary": summary, "signals": [`${gid} signal`], "strategy": ["step"] }, null, 2) + "\n";

  const manifestOf = (entries: Array<Record<string, unknown>>): string =>
    JSON.stringify({ "version": 1, "genes": entries }, null, 2) + "\n";

  const entry = (ref: string, summary = "s", signals?: string[]): Record<string, unknown> => ({
    "ref": ref,
    "path": `genes/${ref}.json`,
    "summary": summary,
    "signals": signals ?? [`${ref.split("/")[1]} signal`],
  });

  const conforming = (t: string): void => {
    fs.mkdirSync(path.join(t, "genes/process"), { recursive: true });
    fs.mkdirSync(path.join(t, "genes/doc"), { recursive: true });
    fs.writeFileSync(path.join(t, "genes/process/alpha.json"), gene("process", "alpha"), "utf-8");
    fs.writeFileSync(path.join(t, "genes/doc/beta.json"), gene("doc", "beta"), "utf-8");
    fs.writeFileSync(path.join(t, "manifest.json"), manifestOf(
      [entry("doc/beta"), entry("process/alpha")].sort((a, b) => pyCmp(a["ref"] as string, b["ref"] as string))), "utf-8");
  };

  const cases: Array<[(t: string) => void, string[], string]> = [];
  cases.push([conforming, [], "manifest matching genes tree -> pass"]);

  const missingManifest = (t: string): void => {
    fs.mkdirSync(path.join(t, "genes/process"), { recursive: true });
    fs.writeFileSync(path.join(t, "genes/process/alpha.json"), gene("process", "alpha"), "utf-8");
  };
  cases.push([missingManifest, ["manifest.json missing"], "no manifest -> fail"]);

  const summaryDrift = (t: string): void => {
    conforming(t);
    fs.writeFileSync(path.join(t, "manifest.json"), manifestOf(
      [entry("doc/beta"), entry("process/alpha", "edited")].sort((a, b) => pyCmp(a["ref"] as string, b["ref"] as string))), "utf-8");
  };
  cases.push([summaryDrift, ["summary drift"], "manifest summary drift -> fail"]);

  const missingRow = (t: string): void => {
    conforming(t);
    fs.writeFileSync(path.join(t, "genes/doc/gamma.json"), gene("doc", "gamma"), "utf-8");
  };
  cases.push([missingRow, ["missing gene doc/gamma"], "gene without manifest row -> fail"]);

  const staleRow = (t: string): void => {
    conforming(t);
    fs.unlinkSync(path.join(t, "genes/doc/beta.json"));
  };
  cases.push([staleRow, ["stale entry doc/beta"], "manifest row without file -> fail"]);

  const unsorted = (t: string): void => {
    conforming(t);
    fs.writeFileSync(path.join(t, "manifest.json"), manifestOf([entry("process/alpha"), entry("doc/beta")]), "utf-8");
  };
  cases.push([unsorted, ["must be sorted"], "unsorted refs -> fail"]);

  const badPath = (t: string): void => {
    conforming(t);
    const e = entry("doc/beta");
    e["path"] = "genes/doc/beta.yaml";
    fs.writeFileSync(path.join(t, "manifest.json"), manifestOf([entry("process/alpha"), e]), "utf-8");
  };
  cases.push([badPath, ["path must be genes/"], "path not matching ref layout -> fail"]);

  let failed = 0;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tmp"));
  for (const [i, [builder, expected, desc]] of cases.entries()) {
    const t = path.join(root, `case${i}`);
    fs.mkdirSync(t);
    builder(t);
    const [, errors] = verify(t);
    const actualOk = errors.length === 0;
    const wantOk = expected.length === 0;
    if (wantOk && actualOk) {
      console.log(`  ok: ${desc}`);
    } else if (!wantOk && !actualOk && errors.some((e) => expected.some((sub) => e.includes(sub)))) {
      console.log(`  ok: ${desc}`);
    } else {
      console.error(`  FAIL ${desc}: expected ${wantOk ? "pass" : pyListRepr(expected)}, got ${actualOk ? "pass" : pyListRepr(errors)}`);
      failed = 1;
    }
  }
  if (failed === 0) {
    console.log("== verify-manifest self-test passed ==");
  } else {
    console.error("== verify-manifest self-test failed ==");
  }
  return failed;
}

function main(): number {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) {
    return selfTest();
  }
  let repo = ".";
  const idx = args.indexOf("--repo");
  if (idx !== -1) {
    const v = args[idx + 1];
    if (v === undefined) throw new TypeError("path argument missing after --repo");
    repo = normPyPath(v);
  }
  const [checked, errors] = verify(repo);
  console.log(`Checked manifest vs ${checked} items`);
  if (errors.length > 0) {
    for (const e of errors) console.log(`FAIL: ${e}`);
    return 1;
  }
  console.log("OK");
  return 0;
}

process.exit(main());
