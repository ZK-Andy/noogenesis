#!/usr/bin/env node
/**
 * verify-gene-format — P1 基因/事件协议校验（schema ADR S1–S3 单源：
 * .agents/notes/implemented/architecture/2026-09-05-gene-event-schema.md）。
 *
 * 判据（仓库根，默认 cwd；--repo 可指根）：
 * - genes/<domain>/<id>.json（S1 — 封闭八字段 schema，镜像 engine/gene.js）：
 *   id/domain kebab-case 且分别等于文件名 stem 与父目录名；summary 非空；
 *   signals/strategy 为 ≥1 项字符串数组；constraints 可选非空对象（键封闭：
 *   max_files 正整数 / forbidden_paths 非空字符串数组）；validation 可选（kebab
 *   闸名且必须在 engine/gates.json 白名单内）；avoid 可选字符串数组（空数组违约，
 *   应省略字段）；id 全树唯一（引用不歧义）；布局封闭 genes/<domain>/<id>.json。
 * - engine/gates.json（S3 — 白名单载体，fail-closed）：version 为数字；gates 非空、
 *   name kebab 且唯一、cmd 非空、args 字符串数组；引用的 scripts/** 路径必须存在。
 * - events/<YYYY-MM>.jsonl（S2 — 追加式事件审计）：每行 JSON 对象键集按 kind 条件化
 *   —— 五键共通 {ts, actor, kind, outcome, evidence}，gene 面加 {gene, gene_sha}，
 *   capsule 面加 {capsule, capsule_sha}，mutation 面加 {mutation, mutation_sha}；
 *   kind ∈ 封闭集
 *   {gene.added, gene.updated, gene.retired, capsule.added, mutation.added}；ts 为
 *   ISO-8601、卷内升序且落在卷月份内（±1 天时区容差，对齐 verify-adr-format）；
 *   outcome 为 "ok" 或 "fail: <reason>"；三面的 sha 均为 64 位十六进制。
 * - capsules/<domain>/<id>.json（批次 1 序 1 — 封闭七字段 schema，镜像 engine/capsule.ts）：
 *   id/domain kebab-case 且分别等于文件名 stem 与父目录名；gene_ids 为 ≥1 项
 *   <domain>/<id> 引用；trigger 非空；steps/evidence 为 ≥1 项非空字符串数组；
 *   outcome 键封闭（status ∈ {ok, fail}，fail 必带 reason，ok 不得带）；id 全树唯一；
 *   布局封闭 capsules/<domain>/<id>.json。
 * - mutations/<domain>/<id>.json（批次 1 序 2 — 封闭六字段 schema，镜像 engine/mutation.ts）：
 *   id/domain kebab-case 且分别等于文件名 stem 与父目录名；category/target/expected_effect
 *   为非空字符串（无值域）；risk_level ∈ {low, medium, high}；id 全树唯一；
 *   布局封闭 mutations/<domain>/<id>.json。
 * - 工作树复算（S2 — 内容可寻址）：最近一次 added/updated(ok) 事件的 gene_sha
 *   必须等于文件字节的 sha256；最近 retired ⇒ 文件必须缺席；无事件轨的工作树
 *   基因违约（solidify 是唯一入口）；fail 事件只查结构不复算（被拒候选 ≠ 工作树）。
 *   capsules 同型：capsule.added(ok) 的 capsule_sha 必须等于文件字节 sha256，无事件轨的
 *   Capsule 违约（capsule add 是唯一入口）；gene_ids 须曾成功入档（工作树在场或事件轨上
 *   有过 ok 的 gene.added/gene.updated）——退役是历史事实，不追溯失效，且 Capsule append-only。
 *   mutations 同型：mutation.added(ok) 的 mutation_sha 必须等于文件字节 sha256，无事件轨的
 *   Mutation 违约（mutation add 是唯一入口）；Mutation 无 update/retire 面，故无分段。
 *
 * 结构性例外：白名单外独立件——本件消费 genes/ + capsules/ + mutations/ + events/ 复算
 * 治理自身，进 gates.json 白名单会让 solidify 入档中途复算自身（语义循环）；hooks/CI 保留
 * 显式调用行。
 *
 * 用法（仓库根运行）：node scripts/verify-gene-format.mts [--repo ROOT]
 *                     node scripts/verify-gene-format.mts --self-test  # 离线夹具自检
 * 退出码：0 = PASS，1 = 违约。
 * 模块形态：显式 .mts（ESM），node ≥22.18 原生 type stripping 直跑；py 兼容原语
 * （repr/path/json/iso 族）单源消费 scripts/pypara.mts，本件只留校验谓词与主体。
 *
 * Provenance: original to Noogenesis (2026-09-05, P1 implementation round),
 * protocol per the schema ADR above; JS-side mirror in engine/gene.js +
 * engine/solidify.js.
 * B1 随族迁 TS（2026-09-08，.agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md）。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";
import { pyStrip, splitLines, pyRepr, pyStr, pyNorm, pyJoin, segCompare, pyStem, readTextFatal, pyOsErrMsg, pyJSONParse, pyDumps, pyFromIso, MS_PER_DAY, KEBAB_RE } from "./pypara.mts";
import type { JSONVal } from "./pypara.mts";

const SHA_RE = /^[0-9a-f]{64}$/;
const VOL_RE = /^(\d{4}-\d{2})\.jsonl$/;
const KINDS = ["gene.added", "gene.updated", "gene.retired", "capsule.added", "mutation.added"];
const KINDS_REPR = `(${KINDS.map((k) => `'${k}'`).join(", ")})`;
// 事件键集按 kind 条件化（批次 1 序 1 ADR C5 + 序 2 ADR C4 两次重拍 S2）：共通五键 +
// gene 面 / capsule 面 / mutation 面各两键。键集与判据文案同源：repr 由键列表派生，
// 改键集即改文案（防两处漂移）。
const GENE_EVENT_KEY_LIST = ["actor", "evidence", "gene", "gene_sha", "kind", "outcome", "ts"];
const CAPSULE_EVENT_KEY_LIST = ["actor", "capsule", "capsule_sha", "evidence", "kind", "outcome", "ts"];
const MUTATION_EVENT_KEY_LIST = ["actor", "evidence", "kind", "mutation", "mutation_sha", "outcome", "ts"];
/** 判据文案里的键列表形态（py list repr，供违约行比对）。 */
function fieldsRepr(keys: string[]): string {
  return `[${keys.map((k) => `'${k}'`).join(", ")}]`;
}
/** kind → 事件键列表（三面条件化的单一事实源；未知 kind 已被封闭集判据拦下）。 */
function eventKeysFor(kind: string): string[] {
  if (kind === "capsule.added") return CAPSULE_EVENT_KEY_LIST;
  if (kind === "mutation.added") return MUTATION_EVENT_KEY_LIST;
  return GENE_EVENT_KEY_LIST;
}
const KNOWN_GENE_FIELDS = new Set([
  "id", "domain", "summary", "signals", "strategy", "constraints", "validation", "avoid",
]);
const KNOWN_CAPSULE_FIELDS = new Set([
  "id", "domain", "gene_ids", "trigger", "steps", "outcome", "evidence",
]);
const KNOWN_MUTATION_FIELDS = new Set([
  "id", "domain", "category", "target", "expected_effect", "risk_level",
]);
const RISK_LEVELS = ["low", "medium", "high"];
const GENE_REF_RE = /^[a-z0-9]+(-[a-z0-9]+)*\/[a-z0-9]+(-[a-z0-9]+)*$/;


function sha256Hex(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function isObj(v: unknown): v is { [key: string]: JSONVal } {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isPyInt(v: unknown): boolean {
  return typeof v === "bigint" || (typeof v === "number" && Number.isInteger(v));
}

function isKebab(v: unknown): boolean {
  return typeof v === "string" && KEBAB_RE.test(v);
}

// ---------- 校验主体 ----------

function checkGene(data: JSONVal, rel: string, stem: string, parent: string, whitelist: Set<JSONVal>): string[] {
  const errors: string[] = [];
  if (!isObj(data)) return [`${rel}: gene must be a JSON object`];
  for (const k of Object.keys(data)) {
    if (!KNOWN_GENE_FIELDS.has(k)) errors.push(`${rel}: unknown field: ${k}`);
  }
  const id = data.id;
  if (!isKebab(id)) errors.push(`${rel}: id must be kebab-case string`);
  else if (id !== stem) errors.push(`${rel}: id '${id}' must equal filename (${stem})`);
  const domain = data.domain;
  if (!isKebab(domain)) errors.push(`${rel}: domain must be kebab-case string`);
  else if (domain !== parent) errors.push(`${rel}: domain '${domain}' must equal its directory (${parent})`);
  const summary = data.summary;
  if (!(typeof summary === "string" && pyStrip(summary) !== "")) {
    errors.push(`${rel}: summary must be a non-empty string`);
  }
  for (const [field, minimum] of [["signals", 1], ["strategy", 1]] as const) {
    const v = data[field];
    if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
      errors.push(`${rel}: ${field} must be an array of strings`);
    } else if (v.length < minimum) {
      errors.push(`${rel}: ${field} must have at least ${minimum} item(s)`);
    }
  }
  for (const field of ["validation", "avoid"] as const) {
    if (field in data) {
      const v = data[field];
      if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
        errors.push(`${rel}: ${field} must be an array of strings`);
      } else if (v.length === 0) {
        errors.push(`${rel}: ${field} must not be empty (omit the field instead)`);
      }
    }
  }
  if ("validation" in data && Array.isArray(data.validation)) {
    for (const entry of data.validation) {
      if (!isKebab(entry)) errors.push(`${rel}: validation entries must be kebab-case gate names`);
      else if (!whitelist.has(entry)) errors.push(`${rel}: validation entry '${entry}' is not in the whitelist`);
    }
  }
  if ("constraints" in data) {
    const c = data.constraints;
    if (!isObj(c) || Object.keys(c).length === 0) {
      errors.push(`${rel}: constraints must be a non-empty object (omit the field instead)`);
    } else {
      for (const [k, v] of Object.entries(c)) {
        if (k === "max_files") {
          if (!isPyInt(v) || (typeof v === "bigint" ? v < 1n : (typeof v === "number" && v < 1))) {
            errors.push(`${rel}: constraints.max_files must be a positive integer`);
          }
        } else if (k === "forbidden_paths") {
          if (!Array.isArray(v) || !v.every((x) => typeof x === "string" && pyStrip(x) !== "")) {
            errors.push(`${rel}: constraints.forbidden_paths must be an array of non-empty strings`);
          }
        } else {
          errors.push(`${rel}: unknown constraints key: ${k}`);
        }
      }
    }
  }
  return errors;
}

// Capsule 协议（批次 1 序 1 ADR C2）：封闭七字段；outcome 二值且 fail 必带 reason；
// 元素级非空校验与 engine/capsule.ts 的 validateCapsule 镜像。
function checkCapsule(data: JSONVal, rel: string, stem: string, parent: string): string[] {
  const errors: string[] = [];
  if (!isObj(data)) return [`${rel}: capsule must be a JSON object`];
  for (const k of Object.keys(data)) {
    if (!KNOWN_CAPSULE_FIELDS.has(k)) errors.push(`${rel}: unknown field: ${k}`);
  }
  const id = data.id;
  if (!isKebab(id)) errors.push(`${rel}: id must be kebab-case string`);
  else if (id !== stem) errors.push(`${rel}: id '${id}' must equal filename (${stem})`);
  const domain = data.domain;
  if (!isKebab(domain)) errors.push(`${rel}: domain must be kebab-case string`);
  else if (domain !== parent) errors.push(`${rel}: domain '${domain}' must equal its directory (${parent})`);

  const geneIds = data.gene_ids;
  if (!Array.isArray(geneIds) || !geneIds.every((x) => typeof x === "string" && GENE_REF_RE.test(x))) {
    errors.push(`${rel}: gene_ids must be an array of <domain>/<id> refs`);
  } else if (geneIds.length < 1) {
    errors.push(`${rel}: gene_ids must have at least 1 item(s)`);
  }

  const trigger = data.trigger;
  if (!(typeof trigger === "string" && pyStrip(trigger) !== "")) {
    errors.push(`${rel}: trigger must be a non-empty string`);
  }
  for (const field of ["steps", "evidence"] as const) {
    const v = data[field];
    if (!Array.isArray(v) || !v.every((x) => typeof x === "string" && pyStrip(x) !== "")) {
      errors.push(`${rel}: ${field} must be a non-empty-string array`);
    } else if (v.length < 1) {
      errors.push(`${rel}: ${field} must have at least 1 item(s)`);
    }
  }

  const o = data.outcome;
  if (!isObj(o)) {
    errors.push(`${rel}: outcome must be an object`);
  } else {
    for (const k of Object.keys(o)) {
      if (k !== "status" && k !== "reason") errors.push(`${rel}: unknown outcome key: ${k}`);
    }
    if (o.status !== "ok" && o.status !== "fail") {
      errors.push(`${rel}: outcome.status must be 'ok' or 'fail'`);
    }
    if (o.status === "fail") {
      if (!(typeof o.reason === "string" && pyStrip(o.reason) !== "")) {
        errors.push(`${rel}: outcome.reason must be a non-empty string when status is fail`);
      }
    } else if (o.reason !== undefined) {
      errors.push(`${rel}: outcome.reason is only for status fail`);
    }
  }
  return errors;
}

// Mutation 协议（批次 1 序 2 ADR C2）：封闭六字段；risk_level 三值封闭，
// category/target/expected_effect 无值域但须非空；与 engine/mutation.ts 的 validateMutation 镜像。
function checkMutation(data: JSONVal, rel: string, stem: string, parent: string): string[] {
  const errors: string[] = [];
  if (!isObj(data)) return [`${rel}: mutation must be a JSON object`];
  for (const k of Object.keys(data)) {
    if (!KNOWN_MUTATION_FIELDS.has(k)) errors.push(`${rel}: unknown field: ${k}`);
  }
  const id = data.id;
  if (!isKebab(id)) errors.push(`${rel}: id must be kebab-case string`);
  else if (id !== stem) errors.push(`${rel}: id '${id}' must equal filename (${stem})`);
  const domain = data.domain;
  if (!isKebab(domain)) errors.push(`${rel}: domain must be kebab-case string`);
  else if (domain !== parent) errors.push(`${rel}: domain '${domain}' must equal its directory (${parent})`);

  for (const field of ["category", "target", "expected_effect"] as const) {
    const v = data[field];
    if (!(typeof v === "string" && pyStrip(v) !== "")) {
      errors.push(`${rel}: ${field} must be a non-empty string`);
    }
  }
  if (!(typeof data.risk_level === "string" && RISK_LEVELS.includes(data.risk_level))) {
    errors.push(`${rel}: risk_level must be one of ${RISK_LEVELS.join("|")}, got ${pyStr(data.risk_level)}`);
  }
  return errors;
}

function loadWhitelist(base: string): { names: Set<JSONVal>; errors: string[] } {
  const errors: string[] = [];
  const fsPath = pyJoin(base, ["engine", "gates.json"]);
  let raw: string;
  try {
    raw = readTextFatal(fsPath);
  } catch (e) {
    return { names: new Set(), errors: [`engine/gates.json unreadable — fail-closed: ${pyOsErrMsg(e, fsPath)}`] };
  }
  const parsed = pyJSONParse(raw);
  if (!parsed.ok) {
    return { names: new Set(), errors: [`engine/gates.json is not valid JSON — fail-closed: ${parsed.message}`] };
  }
  const doc = parsed.value;
  const names = new Set<JSONVal>();
  if (!isObj(doc) || !isPyInt(doc.version)) errors.push("engine/gates.json: version must be a number");
  const gates = isObj(doc) ? doc.gates : null;
  if (!Array.isArray(gates) || gates.length === 0) {
    errors.push("engine/gates.json: gates must be a non-empty array");
    return { names, errors };
  }
  for (const g of gates) {
    if (!isObj(g)) {
      errors.push("engine/gates.json: gate entry must be an object");
      continue;
    }
    const name = g.name as JSONVal; // 缺键 = undefined，pyRepr/pyStr/isKebab 均 None/False 兜底
    if (!isKebab(name)) errors.push(`engine/gates.json: gate name not kebab-case: ${pyRepr(name)}`);
    else if (names.has(name)) errors.push(`engine/gates.json: duplicate gate name: ${pyStr(name)}`);
    names.add(name);
    const cmd = g.cmd;
    if (!(typeof cmd === "string" && pyStrip(cmd) !== "")) {
      errors.push(`engine/gates.json: gate ${pyStr(name)}: cmd must be a non-empty string`);
    }
    const args = g.args;
    if (!Array.isArray(args) || !args.every((a) => typeof a === "string")) {
      errors.push(`engine/gates.json: gate ${pyStr(name)}: args must be an array of strings`);
      continue;
    }
    for (const a of args) {
      if ((a as string).startsWith("scripts/") && !fs.existsSync(pyJoin(base, [a as string]))) {
        errors.push(`engine/gates.json: gate ${pyStr(name)}: referenced script does not exist: ${a}`);
      }
    }
  }
  return { names, errors };
}

interface EventRow { ms: number; ev: { [key: string]: JSONVal } }

function checkEvents(display: string, fsPath: string, errors: string[]): EventRow[] {
  const m = VOL_RE.exec(display.replace(/.*\//, ""));
  if (m === null) {
    errors.push(`${display}: events volume must be named <YYYY-MM>.jsonl`);
    return [];
  }
  const ym = m[1]!;
  const vy = Number(ym.slice(0, 4));
  const vm = Number(ym.slice(5, 7));
  // py date.fromisoformat 未捕获崩溃路径
  if (vm < 1 || vm > 12) throw new Error(`ValueError parity: invalid volume month ${ym}`);
  const volFirstMs = Date.UTC(vy, vm - 1, 1);
  const lastDay = new Date(Date.UTC(vy, vm, 0)).getUTCDate();
  const winLo = volFirstMs - MS_PER_DAY;
  const winHi = volFirstMs + lastDay * MS_PER_DAY;
  const text = readTextFatal(fsPath);
  const rows: EventRow[] = [];
  let prev: number | null = null;
  const lines = splitLines(text);
  for (let idx = 0; idx < lines.length; idx++) {
    const lineno = idx + 1;
    const line = lines[idx]!;
    if (pyStrip(line) === "") {
      errors.push(`${display}:${lineno}: blank line (append-only JSONL)`);
      continue;
    }
    const parsed = pyJSONParse(line);
    if (!parsed.ok) {
      errors.push(`${display}:${lineno}: not valid JSON: ${parsed.message}`);
      continue;
    }
    const ev = parsed.value;
    if (!isObj(ev)) {
      errors.push(`${display}:${lineno}: event must be a JSON object`);
      continue;
    }
    const kind = ev.kind;
    if (!(typeof kind === "string" && KINDS.includes(kind))) {
      errors.push(`${display}:${lineno}: kind '${pyStr(kind)}' not in closed set ${KINDS_REPR}`);
      continue;
    }
    // 键集按 kind 条件化：gene / capsule / mutation 三面各记自己的主体键。
    const keyList = eventKeysFor(kind);
    if (Object.keys(ev).sort().join("|") !== keyList.join("|")) {
      errors.push(`${display}:${lineno}: event fields must be exactly ${fieldsRepr(keyList)}`);
      continue;
    }
    const dt = pyFromIso(ev.ts);
    if (dt === null) {
      errors.push(`${display}:${lineno}: ts must be ISO-8601`);
      continue;
    }
    if (prev !== null && dt.ms < prev) errors.push(`${display}:${lineno}: ts out of order within volume`);
    prev = dt.ms;
    // 月卷归属：ts 落在卷月份内；跨时区容差 +-1 天（对齐 verify-adr-format 口径）
    const tsDateMs = Date.UTC(Number(dt.dateStr.slice(0, 4)), Number(dt.dateStr.slice(5, 7)) - 1, Number(dt.dateStr.slice(8, 10)));
    if (tsDateMs < winLo || tsDateMs > winHi) {
      errors.push(`${display}:${lineno}: ts ${dt.dateStr} outside volume month ${ym}`);
    }
    // 主体锚点按 kind 条件化：三面各记自己的主体（镜像 S2 复算面）。
    if (kind === "capsule.added") {
      if (!isKebab(ev.capsule)) errors.push(`${display}:${lineno}: capsule must be a kebab-case id`);
      const csv = ev.capsule_sha ? ev.capsule_sha : "";
      // py 未捕获崩溃路径
      if (typeof csv !== "string") throw new Error("TypeError parity: re.match on non-string capsule_sha");
      if (!SHA_RE.test(csv)) errors.push(`${display}:${lineno}: capsule_sha must be 64-hex sha256`);
    } else if (kind === "mutation.added") {
      if (!isKebab(ev.mutation)) errors.push(`${display}:${lineno}: mutation must be a kebab-case id`);
      const msv = ev.mutation_sha ? ev.mutation_sha : "";
      // py 未捕获崩溃路径
      if (typeof msv !== "string") throw new Error("TypeError parity: re.match on non-string mutation_sha");
      if (!SHA_RE.test(msv)) errors.push(`${display}:${lineno}: mutation_sha must be 64-hex sha256`);
    } else {
      if (!isKebab(ev.gene)) errors.push(`${display}:${lineno}: gene must be a kebab-case id`);
      const gsv = ev.gene_sha ? ev.gene_sha : "";
      // py 未捕获崩溃路径
      if (typeof gsv !== "string") throw new Error("TypeError parity: re.match on non-string gene_sha");
      if (!SHA_RE.test(gsv)) errors.push(`${display}:${lineno}: gene_sha must be 64-hex sha256`);
    }
    const outcome = ev.outcome;
    if (outcome !== "ok" && !(typeof outcome === "string" && outcome.startsWith("fail: "))) {
      errors.push(`${display}:${lineno}: outcome must be 'ok' or 'fail: <reason>'`);
    }
    const actor = ev.actor;
    if (!(typeof actor === "string" && pyStrip(actor) !== "")) {
      errors.push(`${display}:${lineno}: actor must be a non-empty string`);
    }
    const evidence = ev.evidence;
    if (!(typeof evidence === "string" && pyStrip(evidence) !== "")) {
      errors.push(`${display}:${lineno}: evidence must be a non-empty string`);
    }
    rows.push({ ms: dt.ms, ev });
  }
  return rows;
}

function collectJson(dir: string, prefix: string[], out: string[][]): void {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const segs = [...prefix, ent.name];
    if (ent.isDirectory()) collectJson(path.join(dir, ent.name), segs, out);
    if (ent.name.endsWith(".json")) out.push(segs);
  }
}

function scan(base: string): { checked: number; errors: string[] } {
  const errors: string[] = [];
  const wl = loadWhitelist(base);
  errors.push(...wl.errors);
  let checked = 0;

  const genesPath = pyJoin(base, ["genes"]);
  const genesIsDir = fs.existsSync(genesPath) && fs.statSync(genesPath).isDirectory();
  const geneFiles = new Map<string, string[]>();
  if (genesIsDir) {
    const all: string[][] = [];
    collectJson(genesPath, ["genes"], all);
    all.sort(segCompare);
    for (const rel of all) {
      checked += 1;
      // 布局封闭：只认 genes/<domain>/<id>.json（与引擎 scanGenes 单层扫描镜像）
      if (rel.length !== 3 || rel[0] !== "genes") {
        errors.push(`${rel.join("/")}: gene files must be at genes/<domain>/<id>.json layout`);
        continue;
      }
      const fsPath = pyJoin(base, rel);
      const display = fsPath;
      const parsed = pyJSONParse(readTextFatal(fsPath));
      if (!parsed.ok) {
        errors.push(`${display}: not valid JSON: ${parsed.message}`);
        continue;
      }
      const data = parsed.value;
      errors.push(...checkGene(data, rel.join("/"), pyStem(rel[2]!), rel[1]!, wl.names));
      const gid = isObj(data) ? data.id : null;
      if (typeof gid === "string") {
        if (geneFiles.has(gid)) {
          errors.push(`${display}: duplicate gene id '${gid}' (also ${pyJoin(base, geneFiles.get(gid)!)})`);
        }
        geneFiles.set(gid, rel);
      }
    }
  }

  // capsules/：布局封闭 capsules/<domain>/<id>.json + 协议面 + 跨域 id 唯一
  const capsPath = pyJoin(base, ["capsules"]);
  const capsIsDir = fs.existsSync(capsPath) && fs.statSync(capsPath).isDirectory();
  const capsuleFiles = new Map<string, string[]>();
  if (capsIsDir) {
    const all: string[][] = [];
    collectJson(capsPath, ["capsules"], all);
    all.sort(segCompare);
    for (const rel of all) {
      checked += 1;
      if (rel.length !== 3 || rel[0] !== "capsules") {
        errors.push(`${rel.join("/")}: capsule files must be at capsules/<domain>/<id>.json layout`);
        continue;
      }
      const fsPath = pyJoin(base, rel);
      const parsed = pyJSONParse(readTextFatal(fsPath));
      if (!parsed.ok) {
        errors.push(`${fsPath}: not valid JSON: ${parsed.message}`);
        continue;
      }
      const data = parsed.value;
      errors.push(...checkCapsule(data, rel.join("/"), pyStem(rel[2]!), rel[1]!));
      const cid = isObj(data) ? data.id : null;
      if (typeof cid === "string") {
        if (capsuleFiles.has(cid)) {
          errors.push(`${fsPath}: duplicate capsule id '${cid}' (also ${pyJoin(base, capsuleFiles.get(cid)!)})`);
        }
        capsuleFiles.set(cid, rel);
      }
    }
  }

  // mutations/：布局封闭 mutations/<domain>/<id>.json + 协议面 + 跨域 id 唯一
  const mutsPath = pyJoin(base, ["mutations"]);
  const mutsIsDir = fs.existsSync(mutsPath) && fs.statSync(mutsPath).isDirectory();
  const mutationFiles = new Map<string, string[]>();
  if (mutsIsDir) {
    const all: string[][] = [];
    collectJson(mutsPath, ["mutations"], all);
    all.sort(segCompare);
    for (const rel of all) {
      checked += 1;
      if (rel.length !== 3 || rel[0] !== "mutations") {
        errors.push(`${rel.join("/")}: mutation files must be at mutations/<domain>/<id>.json layout`);
        continue;
      }
      const fsPath = pyJoin(base, rel);
      const parsed = pyJSONParse(readTextFatal(fsPath));
      if (!parsed.ok) {
        errors.push(`${fsPath}: not valid JSON: ${parsed.message}`);
        continue;
      }
      const data = parsed.value;
      errors.push(...checkMutation(data, rel.join("/"), pyStem(rel[2]!), rel[1]!));
      const mid = isObj(data) ? data.id : null;
      if (typeof mid === "string") {
        if (mutationFiles.has(mid)) {
          errors.push(`${fsPath}: duplicate mutation id '${mid}' (also ${pyJoin(base, mutationFiles.get(mid)!)})`);
        }
        mutationFiles.set(mid, rel);
      }
    }
  }

  // events/：结构 + 月卷 + 时间序；并按 id 聚出事件流（ts 稳定排序）
  const perGene = new Map<JSONVal, EventRow[]>();
  const perCapsule = new Map<JSONVal, EventRow[]>();
  const perMutation = new Map<JSONVal, EventRow[]>();
  const eventsPath = pyJoin(base, ["events"]);
  const eventsIsDir = fs.existsSync(eventsPath) && fs.statSync(eventsPath).isDirectory();
  const volumes: Array<[string, EventRow[]]> = [];
  if (eventsIsDir) {
    const volNames = fs.readdirSync(eventsPath).filter((n) => n.endsWith(".jsonl")).sort();
    for (const name of volNames) {
      const vol = pyJoin(base, ["events", name]);
      const rows = checkEvents(vol, vol, errors);
      checked += rows.length;
      volumes.push([vol, rows]);
      for (const r of rows) {
        // 缺键归一 null = py None 键（Map 键面与 py dict 一致）
        const g = r.ev.gene ?? null;
        // py dict 键崩溃路径
        if (typeof g === "object" && g !== null) throw new Error("TypeError parity: unhashable gene key");
        let arr = perGene.get(g);
        if (arr === undefined) {
          arr = [];
          perGene.set(g, arr);
        }
        arr.push(r);
        const c = r.ev.capsule ?? null;
        if (typeof c === "object" && c !== null) throw new Error("TypeError parity: unhashable capsule key");
        let carr = perCapsule.get(c);
        if (carr === undefined) {
          carr = [];
          perCapsule.set(c, carr);
        }
        carr.push(r);
        const mu = r.ev.mutation ?? null;
        if (typeof mu === "object" && mu !== null) throw new Error("TypeError parity: unhashable mutation key");
        let marr = perMutation.get(mu);
        if (marr === undefined) {
          marr = [];
          perMutation.set(mu, marr);
        }
        marr.push(r);
      }
    }
  }
  // 跨卷 ts 接续：前卷最大 ts ≤ 后卷最小 ts（月界 ±1 天容差下仍可辨乱序）
  for (let i = 0; i + 1 < volumes.length; i++) {
    const [v1, r1] = volumes[i]!;
    const [v2, r2] = volumes[i + 1]!;
    if (r1.length > 0 && r2.length > 0 && r1[r1.length - 1]!.ms > r2[0]!.ms) {
      errors.push(`${v2}: first ts precedes last ts of ${v1.replace(/.*\//, "")} — cross-volume disorder`);
    }
  }
  // 每 id 的 latest 选择按 ts 稳定排序（同 ts 保持卷内行序），防月界容差把复算对象选错
  for (const arr of perGene.values()) arr.sort((a, b) => a.ms - b.ms);

  // 复算规则分型（S2）：retired 划段；段内 ok 的 added/updated 对工作树复算；
  // fail 事件只查结构不作复算（被拒候选内容 ≠ 工作树状态）
  for (const [gid, evs] of perGene) {
    const candidates: string[][] = [];
    if (genesIsDir) {
      for (const ent of fs.readdirSync(genesPath, { withFileTypes: true })) {
        if (fs.existsSync(pyJoin(genesPath, [ent.name, `${pyStr(gid)}.json`]))) {
          candidates.push(["genes", ent.name, `${pyStr(gid)}.json`]);
        }
      }
      candidates.sort(segCompare);
    }
    if (candidates.length > 1) {
      errors.push(`gene id '${pyStr(gid)}' present in multiple domains: ${candidates.map((c) => c.join("/")).join(", ")}`);
    }
    const target = candidates.length > 0 ? candidates[0]! : null;
    let lastRetired = -1;
    for (let i = 0; i < evs.length; i++) {
      if (evs[i]!.ev.kind === "gene.retired") lastRetired = i;
    }
    if (lastRetired === evs.length - 1) {
      if (target !== null) errors.push(`${pyJoin(base, target)}: latest event is gene.retired but the file still exists`);
      continue;
    }
    // 最后一次 retire 之后的事件决定工作树期望
    const post = evs.slice(lastRetired + 1);
    const okAdds = post.filter((e) => e.ev.outcome === "ok" && (e.ev.kind === "gene.added" || e.ev.kind === "gene.updated"));
    if (okAdds.length > 0) {
      const latestOk = okAdds[okAdds.length - 1]!;
      if (target === null) {
        errors.push(`gene '${pyStr(gid)}': latest accepted event is ${pyStr(latestOk.ev.kind)} but no worktree file exists`);
      } else {
        const digest = sha256Hex(fs.readFileSync(pyJoin(base, target)));
        if (digest !== latestOk.ev.gene_sha) {
          errors.push(`${pyJoin(base, target)}: gene_sha mismatch (event ${pyStr(latestOk.ev.gene_sha).slice(0, 12)}… vs file ${digest.slice(0, 12)}…) — genes/ changes must go through solidify`);
        }
      }
    } else {
      // 分段内只有 fail：候选从未被（或自退役后未被）接受，工作树不应有该基因
      if (target !== null) errors.push(`${pyJoin(base, target)}: no accepted event after last rejection/retire but the file exists`);
    }
  }

  // 工作树基因必须有事件轨（solidify 是唯一入口）
  for (const [gid, rel] of geneFiles) {
    if (!perGene.has(gid)) errors.push(`${pyJoin(base, rel)}: gene has no event trail — place genes only via solidify`);
  }

  // 复算规则（批次 1 序 1 ADR C4）：capsule.added(ok) 的 capsule_sha 必须等于文件字节 sha256；
  // 工作树 Capsule 必须有事件轨（recordCapsule 是唯一入口）。Capsule append-only，无 retire/update 段。
  for (const arr of perCapsule.values()) arr.sort((a, b) => a.ms - b.ms);
  for (const [cid, evs] of perCapsule) {
    const candidates: string[][] = [];
    if (capsIsDir) {
      for (const ent of fs.readdirSync(capsPath, { withFileTypes: true })) {
        if (fs.existsSync(pyJoin(capsPath, [ent.name, `${pyStr(cid)}.json`]))) {
          candidates.push(["capsules", ent.name, `${pyStr(cid)}.json`]);
        }
      }
      candidates.sort(segCompare);
    }
    if (candidates.length > 1) {
      errors.push(`capsule id '${pyStr(cid)}' present in multiple domains: ${candidates.map((c) => c.join("/")).join(", ")}`);
    }
    const okAdds = evs.filter((e) => e.ev.outcome === "ok" && e.ev.kind === "capsule.added");
    if (candidates.length === 0) {
      if (okAdds.length > 0) errors.push(`capsule '${pyStr(cid)}': accepted event but no worktree file exists`);
      continue;
    }
    const target = candidates[0]!;
    if (okAdds.length === 0) {
      errors.push(`${pyJoin(base, target)}: no accepted capsule.added event but the file exists`);
      continue;
    }
    const digest = sha256Hex(fs.readFileSync(pyJoin(base, target)));
    const latestOk = okAdds[okAdds.length - 1]!;
    if (digest !== latestOk.ev.capsule_sha) {
      errors.push(`${pyJoin(base, target)}: capsule_sha mismatch (event ${pyStr(latestOk.ev.capsule_sha).slice(0, 12)}… vs file ${digest.slice(0, 12)}…) — capsules/ changes must go through capsule add`);
    }
  }
  for (const [cid, rel] of capsuleFiles) {
    if (!perCapsule.has(cid)) errors.push(`${pyJoin(base, rel)}: capsule has no event trail — record capsules only via capsule add`);
  }

  // 复算规则（批次 1 序 2 ADR C4）：mutation.added(ok) 的 mutation_sha 必须等于文件字节
  // sha256；工作树 Mutation 必须有事件轨（recordMutation 是唯一入口）。声明 append-only，
  // 无 update/retire 段。
  for (const arr of perMutation.values()) arr.sort((a, b) => a.ms - b.ms);
  for (const [mid, evs] of perMutation) {
    const candidates: string[][] = [];
    if (mutsIsDir) {
      for (const ent of fs.readdirSync(mutsPath, { withFileTypes: true })) {
        if (fs.existsSync(pyJoin(mutsPath, [ent.name, `${pyStr(mid)}.json`]))) {
          candidates.push(["mutations", ent.name, `${pyStr(mid)}.json`]);
        }
      }
      candidates.sort(segCompare);
    }
    if (candidates.length > 1) {
      errors.push(`mutation id '${pyStr(mid)}' present in multiple domains: ${candidates.map((c) => c.join("/")).join(", ")}`);
    }
    const okAdds = evs.filter((e) => e.ev.outcome === "ok" && e.ev.kind === "mutation.added");
    if (candidates.length === 0) {
      if (okAdds.length > 0) errors.push(`mutation '${pyStr(mid)}': accepted event but no worktree file exists`);
      continue;
    }
    const target = candidates[0]!;
    if (okAdds.length === 0) {
      errors.push(`${pyJoin(base, target)}: no accepted mutation.added event but the file exists`);
      continue;
    }
    const digest = sha256Hex(fs.readFileSync(pyJoin(base, target)));
    const latestOk = okAdds[okAdds.length - 1]!;
    if (digest !== latestOk.ev.mutation_sha) {
      errors.push(`${pyJoin(base, target)}: mutation_sha mismatch (event ${pyStr(latestOk.ev.mutation_sha).slice(0, 12)}… vs file ${digest.slice(0, 12)}…) — mutations/ changes must go through mutation add`);
    }
  }
  for (const [mid, rel] of mutationFiles) {
    if (!perMutation.has(mid)) errors.push(`${pyJoin(base, rel)}: mutation has no event trail — declare mutations only via mutation add`);
  }

  // 引用可解析（复算规则 2）：gene_ids 须曾成功入档——工作树在场，或事件轨上有过 ok 的
  // gene.added/updated。retire 只删工作树文件（git 历史仍可溯），Capsule 又是 append-only，
  // 故退役不使既有引用追溯失效；真正的违约 = 引一个从未入档过的 id。
  const everPlaced = new Set<string>();
  for (const [gid, evs] of perGene) {
    if (typeof gid !== "string") continue;
    if (evs.some((e) => e.ev.outcome === "ok" && (e.ev.kind === "gene.added" || e.ev.kind === "gene.updated"))) {
      everPlaced.add(gid);
    }
  }
  for (const [, rel] of capsuleFiles) {
    const parsed = pyJSONParse(readTextFatal(pyJoin(base, rel)));
    if (!parsed.ok || !isObj(parsed.value)) continue;
    const refs = parsed.value.gene_ids;
    if (!Array.isArray(refs)) continue;
    for (const ref of refs) {
      if (typeof ref !== "string") continue;
      const [rd, ri] = ref.split("/");
      const live = fs.existsSync(pyJoin(base, ["genes", rd ?? "", `${ri ?? ""}.json`]));
      if (!live && !everPlaced.has(ri ?? "")) {
        errors.push(`${pyJoin(base, rel)}: capsule references gene '${ref}' never placed in genes/`);
      }
    }
  }

  return { checked, errors };
}

// --- self-test 夹具（与 py 逐组同迁；违约夹具 FAIL、合规夹具 PASS） ---

function mk(t: string, rel: string, content: string): void {
  const p = path.join(t, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

function geneDoc(gid = "sample-gene", domain = "process", over: { [key: string]: JSONVal } = {}): string {
  const doc: { [key: string]: JSONVal } = {
    id: gid,
    domain,
    summary: "one-line",
    signals: ["push"],
    strategy: ["step"],
  };
  Object.assign(doc, over);
  return `${pyDumps(doc, 2)}\n`;
}

function eventLine(kind = "gene.added", gid = "sample-gene", sha: string | null = null, outcome = "ok", ts = "2026-09-05T01:00:00Z"): string {
  return pyDumps({
    ts,
    actor: "t",
    kind,
    gene: gid,
    gene_sha: sha || "a".repeat(64),
    outcome,
    evidence: "e",
  }, null);
}

function capsuleDoc(cid = "sample-capsule", domain = "process", over: { [key: string]: JSONVal } = {}): string {
  const doc: { [key: string]: JSONVal } = {
    id: cid,
    domain,
    gene_ids: ["process/sample-gene"],
    trigger: "push force",
    steps: ["step"],
    outcome: { status: "ok" },
    evidence: ["evaluate ok"],
  };
  Object.assign(doc, over);
  return `${pyDumps(doc, 2)}\n`;
}

function capsuleEventLine(cid = "sample-capsule", sha: string | null = null, outcome = "ok", ts = "2026-09-05T02:00:00Z"): string {
  return pyDumps({
    ts,
    actor: "t",
    kind: "capsule.added",
    capsule: cid,
    capsule_sha: sha || "a".repeat(64),
    outcome,
    evidence: "e",
  }, null);
}

function mutationDoc(mid = "sample-mutation", domain = "process", over: { [key: string]: JSONVal } = {}): string {
  const doc: { [key: string]: JSONVal } = {
    id: mid,
    domain,
    category: "refactor",
    target: "engine/bin.ts",
    expected_effect: "dispatch stays byte-identical",
    risk_level: "low",
  };
  Object.assign(doc, over);
  return `${pyDumps(doc, 2)}\n`;
}

function mutationEventLine(mid = "sample-mutation", sha: string | null = null, outcome = "ok", ts = "2026-09-05T02:00:00Z"): string {
  return pyDumps({
    ts,
    actor: "t",
    kind: "mutation.added",
    mutation: mid,
    mutation_sha: sha || "a".repeat(64),
    outcome,
    evidence: "e",
  }, null);
}

function shaOf(t: string, rel: string): string {
  return sha256Hex(fs.readFileSync(path.join(t, rel)));
}

function selfTest(): number {
  const WHITELIST = '{"version": 1, "gates": [{"name": "stub", "cmd": "python3", "args": ["scripts/stub.py"]}]}';
  const fileSha = (t: string): string => shaOf(t, "genes/process/sample-gene.json");
  // [tree-builder, expected_violation_substrings, desc]
  const cases: Array<[(t: string) => void, string[], string]> = [];

  const conforming = (t: string): void => {
    mk(t, "engine/gates.json", WHITELIST);
    mk(t, "scripts/stub.py", "print('ok')\n");
    mk(t, "genes/process/sample-gene.json", geneDoc("sample-gene", "process", { validation: ["stub"] }));
    // sha 占位，下方替换为真值
    mk(t, "events/2026-09.jsonl", `${eventLine()}\n`);
  };
  const fixSha = (t: string): void => {
    // 让事件 sha 与文件一致（conforming 用）
    fs.writeFileSync(
      path.join(t, "events", "2026-09.jsonl"),
      `${eventLine("gene.added", "sample-gene", shaOf(t, "genes/process/sample-gene.json"))}\n`,
    );
  };

  cases.push([conforming, [], "conforming tree -> pass"]);

  cases.push([
    (t) => {
      conforming(t); fixSha(t);
      mk(t, "genes/process/other-name.json", geneDoc()); // id 与文件名不一致
    },
    ["must equal filename"], "id != filename -> fail",
  ]);

  cases.push([
    (t) => {
      conforming(t); fixSha(t);
      fs.unlinkSync(path.join(t, "genes", "process", "sample-gene.json"));
      mk(t, "genes/doc/sample-gene.json", geneDoc("sample-gene", "process"));
      fs.unlinkSync(path.join(t, "events", "2026-09.jsonl"));
      // doc 域文件 + 无事件 → 事件轨缺失亦报；只断言域锚点违约出现
    },
    ["must equal its directory"], "domain != dir -> fail",
  ]);

  cases.push([
    (t) => {
      conforming(t); fixSha(t);
      mk(t, "genes/process/sample-gene.json", geneDoc("sample-gene", "process", { mutation_id: "m1" }));
    },
    ["unknown field: mutation_id"], "unknown field -> fail",
  ]);

  cases.push([
    (t) => {
      conforming(t); fixSha(t);
      mk(t, "genes/process/sample-gene.json", geneDoc("sample-gene", "process", { validation: ["ghost"] }));
    },
    ["not in the whitelist"], "validation outside whitelist -> fail",
  ]);

  cases.push([
    (t) => {
      mk(t, "engine/gates.json", '{"version": 1, "gates": [{"name": "stub", "cmd": "python3", "args": ["scripts/ghost.py"]}]}');
      mk(t, "genes/process/sample-gene.json", geneDoc());
    },
    ["referenced script does not exist"], "whitelist script missing -> fail",
  ]);

  cases.push([
    (t) => {
      conforming(t); fixSha(t);
      mk(t, "events/2026-09.jsonl",
        `${eventLine("gene.added", "sample-gene", fileSha(t))}\n`
        + `${eventLine("gene.mutated", "sample-gene", "b".repeat(64))}\n`);
    },
    ["not in closed set"], "event kind outside closed set -> fail",
  ]);

  cases.push([
    (t) => {
      conforming(t); fixSha(t);
      mk(t, "genes/process/sample-gene.json", geneDoc("sample-gene", "process", { summary: "edited by hand" }));
    },
    ["gene_sha mismatch"], "worktree edit without solidify -> fail",
  ]);

  cases.push([
    (t) => {
      conforming(t); fixSha(t);
      mk(t, "events/2026-09.jsonl",
        `${eventLine("gene.added", "sample-gene", fileSha(t))}\n`
        + `${eventLine("gene.retired", "sample-gene", "c".repeat(64))}\n`);
    },
    ["latest event is gene.retired but the file still exists"], "retired but file exists -> fail",
  ]);

  cases.push([
    (t) => {
      conforming(t); fixSha(t);
      mk(t, "events/2026-09.jsonl",
        `${eventLine("gene.added", "sample-gene", fileSha(t))}\n`
        + `${eventLine("gene.added", "sample-gene", fileSha(t), "ok", "2026-09-05T00:00:00Z")}\n`);
    },
    ["ts out of order"], "ts descending within volume -> fail",
  ]);

  cases.push([
    (t) => {
      mk(t, "engine/gates.json", WHITELIST);
      mk(t, "scripts/stub.py", "print('ok')\n");
      mk(t, "genes/process/sample-gene.json", geneDoc());
    },
    ["no event trail"], "gene without events -> fail",
  ]);

  cases.push([
    (t) => {
      conforming(t); fixSha(t);
      mk(t, "events/2026-09.jsonl", `${eventLine("gene.added", "sample-gene", null, "rejected")}\n`);
    },
    ["outcome must be"], "outcome neither ok nor fail: -> fail",
  ]);

  cases.push([
    (t) => {
      conforming(t); fixSha(t);
      mk(t, "events/2026-08.jsonl",
        `${eventLine("gene.added", "sample-gene", fileSha(t), "ok", "2026-07-01T00:00:00Z")}\n`);
    },
    ["outside volume month"], "ts far outside volume month -> fail",
  ]);

  // 夹具：合法红闸拒绝不得打红门禁
  cases.push([
    (t) => {
      conforming(t); fixSha(t);
      mk(t, "events/2026-09.jsonl",
        `${eventLine("gene.added", "sample-gene", fileSha(t))}\n`
        + `${eventLine("gene.updated", "sample-gene", "d".repeat(64), "fail: stub-fail exit 1")}\n`);
    },
    [], "ok added + trailing rejected update -> pass",
  ]);

  cases.push([
    (t) => {
      mk(t, "engine/gates.json", WHITELIST);
      mk(t, "scripts/stub.py", "print('ok')\n");
      mk(t, "events/2026-09.jsonl",
        `${eventLine("gene.added", "never-kept", "e".repeat(64), "fail: stub-fail exit 1")}\n`);
    },
    [], "rejected-only candidate (no file) -> pass",
  ]);

  // 夹具：布局封闭
  cases.push([
    (t) => {
      mk(t, "engine/gates.json", WHITELIST);
      mk(t, "scripts/stub.py", "print('ok')\n");
      mk(t, "genes/loose.json", geneDoc("sample-gene", "genes"));
    },
    ["genes/<domain>/<id>.json layout"], "flat gene file -> fail",
  ]);

  // 夹具：跨卷 ts 乱序（月界 ±1 天容差内仍须可辨）
  cases.push([
    (t) => {
      conforming(t); fixSha(t);
      const sha = fileSha(t);
      mk(t, "events/2026-09.jsonl", `${eventLine("gene.added", "sample-gene", sha, "ok", "2026-10-01T00:00:00Z")}\n`);
      mk(t, "events/2026-10.jsonl", `${eventLine("gene.added", "sample-gene", sha, "ok", "2026-09-30T00:00:00Z")}\n`);
    },
    ["cross-volume disorder"], "next volume starts before previous ends -> fail",
  ]);

  // --- Capsule 协议面（批次 1 序 1）：合规树 + 违约夹具 ---
  const capsuleTree = (t: string): void => {
    mk(t, "engine/gates.json", WHITELIST);
    mk(t, "scripts/stub.py", "print('ok')\n");
    mk(t, "genes/process/sample-gene.json", geneDoc());
    mk(t, "capsules/process/sample-capsule.json", capsuleDoc());
    mk(t, "events/2026-09.jsonl",
      `${eventLine("gene.added", "sample-gene", shaOf(t, "genes/process/sample-gene.json"))}\n`
      + `${capsuleEventLine("sample-capsule", shaOf(t, "capsules/process/sample-capsule.json"))}\n`);
  };
  const capsuleSha = (t: string): string => shaOf(t, "capsules/process/sample-capsule.json");

  cases.push([capsuleTree, [], "capsule conforming tree -> pass"]);

  cases.push([
    (t) => {
      capsuleTree(t);
      mk(t, "capsules/process/sample-capsule.json", capsuleDoc("sample-capsule", "process", { mutation_id: "m1" }));
      mk(t, "events/2026-09.jsonl", `${capsuleEventLine("sample-capsule")}\n`);
    },
    ["unknown field: mutation_id"], "capsule unknown field -> fail",
  ]);

  cases.push([
    (t) => {
      capsuleTree(t);
      mk(t, "capsules/process/sample-capsule.json", capsuleDoc("sample-capsule", "process", { outcome: { status: "fail" } }));
      mk(t, "events/2026-09.jsonl", `${capsuleEventLine("sample-capsule")}\n`);
    },
    ["outcome.reason must be a non-empty string"], "capsule fail without reason -> fail",
  ]);

  cases.push([
    (t) => {
      capsuleTree(t);
      mk(t, "capsules/process/sample-capsule.json", capsuleDoc("sample-capsule", "process", { gene_ids: ["process/no-such-gene"] }));
      mk(t, "events/2026-09.jsonl", `${capsuleEventLine("sample-capsule")}\n`);
    },
    ["capsule references gene 'process/no-such-gene' never placed in genes/"], "capsule dangling gene ref -> fail",
  ]);

  // gene 退役后既有引用仍合法（历史事实，不追溯失效）
  cases.push([
    (t) => {
      capsuleTree(t);
      const geneSha = shaOf(t, "genes/process/sample-gene.json");
      fs.unlinkSync(path.join(t, "genes", "process", "sample-gene.json"));
      mk(t, "events/2026-09.jsonl",
        `${eventLine("gene.added", "sample-gene", geneSha)}\n`
        + `${capsuleEventLine("sample-capsule", capsuleSha(t))}\n`
        + `${eventLine("gene.retired", "sample-gene", geneSha, "ok", "2026-09-05T03:00:00Z")}\n`);
    },
    [], "capsule citing a retired gene -> pass",
  ]);

  cases.push([
    (t) => {
      capsuleTree(t);
      fs.unlinkSync(path.join(t, "capsules", "process", "sample-capsule.json"));
    },
    ["accepted event but no worktree file"], "capsule event without file -> fail",
  ]);

  cases.push([
    (t) => {
      capsuleTree(t);
      mk(t, "events/2026-09.jsonl",
        `${eventLine("gene.added", "sample-gene", shaOf(t, "genes/process/sample-gene.json"))}\n`
        + `${capsuleEventLine("sample-capsule", capsuleSha(t), "fail: gates red")}\n`);
    },
    ["no accepted capsule.added event but the file exists"], "capsule file without ok event -> fail",
  ]);

  cases.push([
    (t) => {
      capsuleTree(t);
      mk(t, "capsules/doc/sample-capsule.json", capsuleDoc("sample-capsule", "doc"));
      mk(t, "events/2026-09.jsonl",
        `${eventLine("gene.added", "sample-gene", shaOf(t, "genes/process/sample-gene.json"))}\n`
        + `${capsuleEventLine("sample-capsule", capsuleSha(t))}\n`
        + `${capsuleEventLine("sample-capsule", "f".repeat(64), "ok", "2026-09-05T03:00:00Z")}\n`);
    },
    ["present in multiple domains", "duplicate capsule id"], "capsule id in two domains -> fail",
  ]);

  cases.push([
    (t) => {
      capsuleTree(t);
      mk(t, "capsules/process/sample-capsule.json", capsuleDoc("sample-capsule", "process", { gene_ids: [] }));
      mk(t, "events/2026-09.jsonl", `${capsuleEventLine("sample-capsule")}\n`);
    },
    ["gene_ids must have at least 1 item(s)"], "capsule empty gene_ids -> fail",
  ]);

  cases.push([
    (t) => {
      capsuleTree(t);
      mk(t, "capsules/process/sample-capsule.json", capsuleDoc("sample-capsule", "process", { outcome: { status: "ok", reason: "why" } }));
      mk(t, "events/2026-09.jsonl", `${capsuleEventLine("sample-capsule")}\n`);
    },
    ["outcome.reason is only for status fail"], "capsule ok carrying reason -> fail",
  ]);

  cases.push([
    (t) => {
      mk(t, "engine/gates.json", WHITELIST);
      mk(t, "scripts/stub.py", "print('ok')\n");
      mk(t, "genes/process/sample-gene.json", geneDoc());
      mk(t, "capsules/loose.json", capsuleDoc());
    },
    ["capsules/<domain>/<id>.json layout"], "flat capsule file -> fail",
  ]);

  cases.push([
    (t) => {
      capsuleTree(t);
      mk(t, "capsules/process/Bad_ID.json", capsuleDoc("Bad_ID", "process"));
    },
    ["id must be kebab-case string"], "capsule id non-kebab -> fail",
  ]);

  cases.push([
    (t) => {
      capsuleTree(t);
      mk(t, "capsules/process/sample-capsule.json", capsuleDoc("sample-capsule", "process", { evidence: ["edited by hand"] }));
    },
    ["capsule_sha mismatch"], "capsule worktree edit without capsule add -> fail",
  ]);

  cases.push([
    (t) => {
      mk(t, "engine/gates.json", WHITELIST);
      mk(t, "scripts/stub.py", "print('ok')\n");
      mk(t, "genes/process/sample-gene.json", geneDoc());
      mk(t, "capsules/process/sample-capsule.json", capsuleDoc());
    },
    ["capsule has no event trail"], "capsule without events -> fail",
  ]);

  cases.push([
    (t) => {
      capsuleTree(t);
      mk(t, "events/2026-09.jsonl",
        `${eventLine("gene.added", "sample-gene", shaOf(t, "genes/process/sample-gene.json"))}\n`
        + `${eventLine("capsule.added", "sample-capsule", capsuleSha(t), "ok", "2026-09-05T02:00:00Z")}\n`);
    },
    ["event fields must be exactly"], "capsule event carrying gene keys -> fail",
  ]);

  cases.push([
    (t) => {
      capsuleTree(t);
      mk(t, "capsules/process/sample-capsule.json", capsuleDoc("sample-capsule", "doc"));
    },
    ["must equal its directory"], "capsule domain != dir -> fail",
  ]);

  // --- Mutation 协议面（批次 1 序 2）：合规树 + 违约夹具 ---
  const mutationTree = (t: string): void => {
    mk(t, "engine/gates.json", WHITELIST);
    mk(t, "scripts/stub.py", "print('ok')\n");
    mk(t, "mutations/process/sample-mutation.json", mutationDoc());
    mk(t, "events/2026-09.jsonl",
      `${mutationEventLine("sample-mutation", shaOf(t, "mutations/process/sample-mutation.json"))}\n`);
  };
  const mutationSha = (t: string): string => shaOf(t, "mutations/process/sample-mutation.json");

  cases.push([mutationTree, [], "mutation conforming tree -> pass"]);

  cases.push([
    (t) => {
      mutationTree(t);
      mk(t, "mutations/process/sample-mutation.json", mutationDoc("sample-mutation", "process", { gene_ids: ["process/sample-gene"] }));
      mk(t, "events/2026-09.jsonl", `${mutationEventLine("sample-mutation")}\n`);
    },
    ["unknown field: gene_ids"], "mutation unknown field -> fail",
  ]);

  cases.push([
    (t) => {
      mutationTree(t);
      mk(t, "mutations/process/sample-mutation.json", mutationDoc("sample-mutation", "process", { risk_level: "catastrophic" }));
      mk(t, "events/2026-09.jsonl", `${mutationEventLine("sample-mutation")}\n`);
    },
    ["risk_level must be one of low|medium|high"], "mutation risk_level outside closed set -> fail",
  ]);

  cases.push([
    (t) => {
      mutationTree(t);
      mk(t, "mutations/process/sample-mutation.json", mutationDoc("sample-mutation", "process", { category: "  " }));
      mk(t, "events/2026-09.jsonl", `${mutationEventLine("sample-mutation")}\n`);
    },
    ["category must be a non-empty string"], "mutation blank category -> fail",
  ]);

  cases.push([
    (t) => {
      mutationTree(t);
      mk(t, "mutations/process/sample-mutation.json",
        `${pyDumps({ id: "sample-mutation", domain: "process", category: "refactor", target: "engine/bin.ts", risk_level: "low" }, 2)}\n`);
      mk(t, "events/2026-09.jsonl", `${mutationEventLine("sample-mutation")}\n`);
    },
    ["expected_effect must be a non-empty string"], "mutation missing expected_effect -> fail",
  ]);

  cases.push([
    (t) => {
      mutationTree(t);
      fs.unlinkSync(path.join(t, "mutations", "process", "sample-mutation.json"));
    },
    ["accepted event but no worktree file"], "mutation event without file -> fail",
  ]);

  cases.push([
    (t) => {
      mutationTree(t);
      mk(t, "events/2026-09.jsonl", `${mutationEventLine("sample-mutation", mutationSha(t), "fail: superseded")}\n`);
    },
    ["no accepted mutation.added event but the file exists"], "mutation file without ok event -> fail",
  ]);

  cases.push([
    (t) => {
      mutationTree(t);
      mk(t, "events/2026-09.jsonl",
        `${mutationEventLine("sample-mutation", mutationSha(t))}\n`
        + `${mutationEventLine("sample-mutation", "f".repeat(64), "ok", "2026-09-05T03:00:00Z")}\n`);
    },
    ["mutation_sha mismatch"], "mutation worktree edit without mutation add -> fail",
  ]);

  cases.push([
    (t) => {
      mk(t, "engine/gates.json", WHITELIST);
      mk(t, "scripts/stub.py", "print('ok')\n");
      mk(t, "mutations/process/sample-mutation.json", mutationDoc());
    },
    ["mutation has no event trail"], "mutation without events -> fail",
  ]);

  cases.push([
    (t) => {
      mutationTree(t);
      mk(t, "mutations/doc/sample-mutation.json", mutationDoc("sample-mutation", "doc"));
      mk(t, "events/2026-09.jsonl",
        `${mutationEventLine("sample-mutation", mutationSha(t))}\n`
        + `${mutationEventLine("sample-mutation", "f".repeat(64), "ok", "2026-09-05T03:00:00Z")}\n`);
    },
    ["present in multiple domains", "duplicate mutation id"], "mutation id in two domains -> fail",
  ]);

  cases.push([
    (t) => {
      mk(t, "engine/gates.json", WHITELIST);
      mk(t, "scripts/stub.py", "print('ok')\n");
      mk(t, "mutations/loose.json", mutationDoc());
    },
    ["mutations/<domain>/<id>.json layout"], "flat mutation file -> fail",
  ]);

  cases.push([
    (t) => {
      mutationTree(t);
      mk(t, "mutations/process/Bad_ID.json", mutationDoc("Bad_ID", "process"));
    },
    ["id must be kebab-case string"], "mutation id non-kebab -> fail",
  ]);

  cases.push([
    (t) => {
      mutationTree(t);
      mk(t, "mutations/process/sample-mutation.json", mutationDoc("sample-mutation", "doc"));
    },
    ["must equal its directory"], "mutation domain != dir -> fail",
  ]);

  cases.push([
    (t) => {
      mutationTree(t);
      mk(t, "events/2026-09.jsonl",
        `${eventLine("mutation.added", "sample-mutation", mutationSha(t))}\n`);
    },
    ["event fields must be exactly"], "mutation event carrying gene keys -> fail",
  ]);

  cases.push([
    (t) => {
      mutationTree(t);
      mk(t, "events/2026-09.jsonl",
        `${mutationEventLine("sample-mutation", mutationSha(t))}\n`
        + `${mutationEventLine("sample-mutation", "not-a-sha", "ok", "2026-09-05T03:00:00Z")}\n`);
    },
    ["mutation_sha must be 64-hex sha256"], "mutation event sha not 64-hex -> fail",
  ]);

  cases.push([
    (t) => {
      mutationTree(t);
      mk(t, "events/2026-09.jsonl",
        `${mutationEventLine("sample-mutation", mutationSha(t))}\n`
        + `${mutationEventLine("Bad_ID", "f".repeat(64), "ok", "2026-09-05T03:00:00Z")}\n`);
    },
    ["mutation must be a kebab-case id"], "mutation event id non-kebab -> fail",
  ]);

  let failed = 0;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tmp"));
  try {
    cases.forEach(([builder, expected, desc], i) => {
      const t = path.join(root, `case${i}`);
      fs.mkdirSync(t);
      builder(t);
      if (t.replace(/.*\//, "").startsWith("case0")) fixSha(t);
      const { errors } = scan(t);
      const actualOk = errors.length === 0;
      const wantOk = expected.length === 0;
      if (wantOk && actualOk) {
        console.log(`  ok: ${desc}`);
      } else if (!wantOk && !actualOk && errors.some((e) => expected.some((sub) => e.includes(sub)))) {
        console.log(`  ok: ${desc}`);
      } else {
        console.error(`  FAIL ${desc}: expected ${wantOk ? "pass" : pyRepr(expected)}, got ${actualOk ? "pass" : pyRepr(errors)}`);
        failed = 1;
      }
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  if (failed === 0) {
    console.log("== verify-gene-format self-test passed ==");
  } else {
    console.error("== verify-gene-format self-test failed ==");
  }
  return failed;
}

function main(argv: string[]): number {
  if (argv.includes("--self-test")) return selfTest();
  let base = ".";
  const idx = argv.indexOf("--repo");
  if (idx !== -1) {
    // py 未捕获崩溃路径
    if (idx + 1 >= argv.length) throw new Error("IndexError parity: --repo requires a value");
    base = pyNorm(argv[idx + 1]!);
  }
  const { checked, errors } = scan(base);
  console.log(`Checked ${checked} gene/event items`);
  if (errors.length > 0) {
    for (const e of errors) console.log(`FAIL: ${e}`);
    return 1;
  }
  console.log("OK");
  return 0;
}

process.exit(main(process.argv.slice(2)));
