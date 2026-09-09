#!/usr/bin/env node
/**
 * gen-manifest — 生成共享基因库 manifest（P2；ADR
 * .agents/notes/proposed/architecture/2026-09-06-p2-shared-consumer.md，D3）。
 *
 * 扫描 genes/<domain>/<id>.json（与引擎同布局），在 repo 根写 manifest.json：
 * 共享库的检索索引（schema ADR S1 保持 P1 无 manifest；因库被共享才存在）。
 * 输出确定性——按 ref 排序、无时间戳——内容不变时重跑逐字节不变（unchanged 短路）。
 * JSON 字节面：Python json.dumps(ensure_ascii=False, indent=2) 与
 * JSON.stringify(x, null, 2) 已用夹具实测逐字节等价（键序 = 插入序、分隔符、
 * 转义与非 ASCII 直出）。
 *
 * 协议校验（逐文件，FAIL 即终止）：JSON 可解析 → 是 JSON 对象 → id 等于文件名 stem
 * 且为 kebab-case → domain 等于所在目录 → summary 非空字符串 → signals 为非空字符串
 * 数组；违约文案 `FAIL: <相对路径>: <原因>` 逐字保留，exit 1。
 *
 * 用法：node scripts/gen-manifest.mts [--repo ROOT]
 *       node scripts/gen-manifest.mts --self-test   # 补齐缺口：py 无自检，B1 按夹具纪律补最小组
 * 退出码：0 = 已写入（或未变），1 = 扫描/协议错误。
 * 模块形态：显式 .mts（ESM），node ≥22.18 原生 type stripping 直跑，零 devDependency。
 *
 * Provenance: original to Noogenesis（P2 实现轮，2026-09-06；与 verify-manifest 成对，
 * manifest 格式两件同变更——scripts/AGENTS.md）。
 * B1 随族迁 TS（2026-09-08，.agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md）。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { cmpPyStr, normPyPath, KEBAB_RE } from "./pypara.mts";


interface GeneEntry { ref: string; path: string; summary: string; signals: string[] }

/** 协议违约（py SystemExit(str) 等价：stderr 出文案，exit 1）。 */
class GeneProtocolError extends Error {}

function isDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** 扫描 genes/<domain>/<id>.json → 每基因一条 {ref, path, summary, signals}，按 ref 排序。
 *  协议违约抛 GeneProtocolError（realRun 转 exit 1）。 */
function scanGenes(repo: string): GeneEntry[] {
  const root = path.join(repo, "genes");
  const entries: GeneEntry[] = [];
  if (!isDir(root)) return entries;
  for (const domainDir of fs.readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort(cmpPyStr)) {
    for (const fname of fs.readdirSync(path.join(root, domainDir))
        .filter((f) => f.endsWith(".json"))
        .sort(cmpPyStr)) {
      const f = path.join(root, domainDir, fname);
      const stem = fname.slice(0, -".json".length);
      const rel = normPyPath(path.relative(path.resolve(repo), path.resolve(f)).split(path.sep).join("/"));
      const raw = fs.readFileSync(f, "utf-8");
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        throw new GeneProtocolError(`FAIL: ${rel}: not valid JSON: ${e instanceof Error ? e.message : e}`);
      }
      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        throw new GeneProtocolError(`FAIL: ${rel}: gene must be a JSON object`);
      }
      const idVal = Object.prototype.hasOwnProperty.call(data, "id") ? data["id"] : "";
      if (idVal !== stem || !KEBAB_RE.test(String(idVal))) {
        throw new GeneProtocolError(`FAIL: ${rel}: id must equal filename stem`);
      }
      if (data["domain"] !== domainDir) {
        throw new GeneProtocolError(`FAIL: ${rel}: domain must equal its directory`);
      }
      const summary = data["summary"];
      const signals = data["signals"];
      if (!(typeof summary === "string" && summary.trim() !== "")) {
        throw new GeneProtocolError(`FAIL: ${rel}: summary must be a non-empty string`);
      }
      if (!(Array.isArray(signals) && signals.length > 0 && signals.every((s: unknown) => typeof s === "string"))) {
        throw new GeneProtocolError(`FAIL: ${rel}: signals must be a non-empty array of strings`);
      }
      entries.push({ ref: `${domainDir}/${stem}`, path: rel, summary, signals });
    }
  }
  entries.sort((a, b) => cmpPyStr(a.ref, b.ref));
  return entries;
}

/** 补齐缺口（py 无 --self-test，B1 按 scripts/AGENTS.md 夹具纪律补最小组）：
 *  临时 genes 树——合规扫描产出正确条目与排序；协议违约逐类命中预期文案。 */
function selfTest(): number {
  const failures: string[] = [];
  const td = fs.mkdtempSync(path.join(os.tmpdir(), "genmanifest-"));
  const repo = path.join(td, "repo");
  const write = (rel: string, content: string): void => {
    const p = path.join(repo, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, "utf-8");
  };
  const gene = (id: string, domain: string): string =>
    JSON.stringify({ id, domain, summary: `s of ${id}`, signals: [`${id} signal`], strategy: ["step"] }, null, 2) + "\n";

  // 空树（无 genes/ 目录）→ 空条目
  fs.mkdirSync(path.join(repo, "empty"), { recursive: true });
  if (scanGenes(path.join(repo, "empty")).length !== 0) failures.push("无 genes/ 目录应为空集");

  // 合规：两域三基因，跨域按 ref 排序
  write("genes/doc/alpha.json", gene("alpha", "doc"));
  write("genes/doc/beta.json", gene("beta", "doc"));
  write("genes/process/gamma.json", gene("gamma", "process"));
  const entries = scanGenes(repo);
  if (JSON.stringify(entries.map((e) => e.ref)) !== JSON.stringify(["doc/alpha", "doc/beta", "process/gamma"])) {
    failures.push(`合规扫描 ref 序不符：${JSON.stringify(entries.map((e) => e.ref))}`);
  }
  if (entries[0]!.path !== "genes/doc/alpha.json" || entries[0]!.summary !== "s of alpha" || JSON.stringify(entries[0]!.signals) !== JSON.stringify(["alpha signal"])) {
    failures.push(`条目内容不符：${JSON.stringify(entries[0])}`);
  }

  // 协议违约：各类必须命中预期文案
  const expectProtocol = (files: Record<string, string>, substring: string, desc: string): void => {
    const r = path.join(td, `case-${desc.replace(/\W+/g, "-")}`);
    for (const [relc, content] of Object.entries(files)) {
      const p = path.join(r, relc);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, content, "utf-8");
    }
    try {
      scanGenes(r);
      failures.push(`${desc}：未抛协议错误`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!(e instanceof GeneProtocolError) || !msg.includes(substring)) {
        failures.push(`${desc}：文案不符（got: ${msg}）`);
      }
    }
  };

  expectProtocol({ "genes/doc/bad.json": "{" }, "not valid JSON", "非 JSON 基因");
  expectProtocol({ "genes/doc/bad.json": "[1]" }, "gene must be a JSON object", "非对象基因");
  expectProtocol({ "genes/doc/bad.json": JSON.stringify({ id: "other", domain: "doc", summary: "s", signals: ["x"] }) }, "id must equal filename stem", "id 与文件名不符");
  expectProtocol({ "genes/doc/bad.json": JSON.stringify({ id: "bad", domain: "process", summary: "s", signals: ["x"] }) }, "domain must equal its directory", "domain 与目录不符");
  expectProtocol({ "genes/doc/bad.json": JSON.stringify({ id: "bad", domain: "doc", summary: "  ", signals: ["x"] }) }, "summary must be a non-empty string", "空 summary");
  expectProtocol({ "genes/doc/bad.json": JSON.stringify({ id: "bad", domain: "doc", summary: "s", signals: [] }) }, "signals must be a non-empty array of strings", "空 signals");

  if (failures.length > 0) {
    for (const f of failures) console.log(`SELF-TEST FAIL: ${f}`);
    return 1;
  }
  console.log("self-test OK");
  return 0;
}

/** scanGenes 的 realRun 包装：协议违约同 py SystemExit(str)——stderr 单行文案，exit 1。 */
function scanGenesSafe(repo: string): GeneEntry[] {
  try {
    return scanGenes(repo);
  } catch (e) {
    if (e instanceof GeneProtocolError) {
      console.error(e.message);
      process.exit(1);
    }
    throw e;
  }
}

function main(): number {
  if (process.argv[2] === "--self-test") {
    return selfTest();
  }
  const args = process.argv.slice(2);
  let repo = ".";
  const idx = args.indexOf("--repo");
  if (idx !== -1) {
    const v = args[idx + 1];
    if (v === undefined) throw new TypeError("path argument missing after --repo");
    repo = normPyPath(v);
  }
  const entries = scanGenesSafe(repo);
  const manifest = { version: 1, genes: entries };
  const out = path.join(repo, "manifest.json");
  // 与 py json.dumps(ensure_ascii=False, indent=2)+"\n" 逐字节等价（夹具实测）。
  const text = JSON.stringify(manifest, null, 2) + "\n";
  if (fs.existsSync(out) && fs.readFileSync(out, "utf-8") === text) {
    console.log(`manifest.json unchanged (${entries.length} genes)`);
    return 0;
  }
  fs.writeFileSync(out, text, "utf-8");
  console.log(`manifest.json written (${entries.length} genes)`);
  return 0;
}

process.exit(main());
