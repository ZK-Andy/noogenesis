#!/usr/bin/env node
/**
 * pypara — verify-* 门禁的 py 兼容原语单源（import 消费，非独立工具）。
 *
 * 六族原语（与 CPython 对应行为逐字对齐，体不得随手改写——错误文案被各门禁
 * 夹具钉死）：
 *   str      splitLines / pyStrip / pyReprStr / pyRepr / pyStr
 *   path     normPyPath / pyNorm / pyJoin / segCompare / pyStem
 *   cmp      cmpPyStr（Python str 排序语义 = 码点序）
 *   json     pyJSONParse（CPython json 错误文案逐字镜像）/ pyDumps / jsonDumpStr
 *   datetime pyFromIso（3.11+ 全量口径实用子集）
 *   常量     KEBAB_RE / MS_PER_DAY / MS_PER_HOUR / MS_PER_MINUTE
 *
 * 判别式（归口纪律）：语义逐字相同的副本才归口本件；语义有意的变体（如 pyNorm
 * 保 `//` 前缀 vs normPyPath 折叠、verify-manifest 的标量近似 pyRepr vs 本件容器
 * 版）各自保留并在头注写明差异，绝不静默统一。
 *
 * 单源沿革：splitLines/pyStrip 原单源 = mdref（ADR 2026-09-10-mdref-py-primitives-fold，
 * 已被本件取代——mdref 收窄回链接/锚点域）；repr/path/json/iso 族原散在
 * verify-gene-format 单件内（2026-09-10 职责下分批归口）。行为由消费方
 * --self-test 覆盖（本件无 CLI、无自有夹具）。
 *
 * 用法：消费方 import 消费；node ≥22.18 原生 type stripping 直跑，零依赖。
 *
 * Provenance: original to Noogenesis（原语体逐字迁自 verify-gene-format.mts 与
 * mdref.mts 的既有实现，2026-09-10 归口批；语义合同随体携带）。
 */
import * as fs from "node:fs";

// ---------- str：Python 字符串语义 ----------

/** Python str.splitlines() 等价：按行拆分，结尾终结符不产生空尾行。 */
export function splitLines(text: string): string[] {
  // oxlint-disable-next-line no-control-regex -- py str.splitlines 边界集含控制字符（有意匹配）
  const parts = text.split(/\r\n|[\n\v\f\r\x1c\x1d\x1e\x85\u2028\u2029]/);
  if (parts[parts.length - 1] === "") parts.pop();
  return parts;
}

// Python str.strip() 的空白集（与 JS trim 的差集仅 \x1c-\x1f 与 \x85——ECMAScript
// WhiteSpace+LineTerminator 已含 \u00a0 \u1680 \u2000-\u200a \u2028\u2029 \u202f
// \u205f \u3000；且 JS trim 会去掉 \ufeff 而 Python strip 保留之——按 Python 口径对齐）。
const PY_STRIP_RE =
  // oxlint-disable-next-line no-control-regex -- py str.strip 空白集含控制字符（有意匹配）
  /^[ \t\n\r\v\f\x1c\x1d\x1e\x1f\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[ \t\n\r\v\f\x1c\x1d\x1e\x1f\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/g;

/** Python str.strip() 等价：掐头去尾的 Python 空白字符集（非 JS trim 集）。 */
export function pyStrip(s: string): string {
  return s.replace(PY_STRIP_RE, "");
}

/** py repr(str)：默认单引号；含 `'` 无 `"` 时换双引号；控制字符 \xHH / \uNNNN。 */
export function pyReprStr(s: string): string {
  const hasS = s.includes("'");
  const hasD = s.includes('"');
  const q = hasS && !hasD ? '"' : "'";
  let out = q;
  for (const ch of s) {
    if (ch === "\\") out += "\\\\";
    else if (ch === q) out += "\\" + q;
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else {
      const cp = ch.codePointAt(0)!;
      if (cp < 0x20 || cp === 0x7f || cp === 0x85 || cp === 0xa0) {
        out += `\\x${cp.toString(16).padStart(2, "0")}`;
      } else if (cp === 0x2028 || cp === 0x2029 || (cp > 0x2029 && !isPrintableCp(cp))) {
        out += `\\u${cp.toString(16).padStart(4, "0")}`;
      } else out += ch;
    }
  }
  return out + q;
}

function isPrintableCp(cp: number): boolean {
  // 近似 py str.isprintable：CJK/字母数字等保留原样；\u2000-\u200a、\u202f、\u205f、\u3000 类空格转义
  if (cp === 0x1680 || (cp >= 0x2000 && cp <= 0x200a) || cp === 0x202f || cp === 0x205f || cp === 0x3000) return false;
  return cp >= 0x20 && cp !== 0x7f;
}

/** py repr 标量/容器（错误文案里的 !r 与列表 repr）。 */
export function pyRepr(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") {
    if (Number.isNaN(v)) return "nan";
    if (v === Infinity) return "inf";
    if (v === -Infinity) return "-inf";
    return String(v);
  }
  if (typeof v === "bigint") return String(v);
  if (typeof v === "string") return pyReprStr(v);
  if (Array.isArray(v)) return `[${v.map((x) => pyRepr(x)).join(", ")}]`;
  const rec = v as { [k: string]: unknown };
  return `{${Object.entries(rec).map(([k, val]) => `${pyReprStr(k)}: ${pyRepr(val)}`).join(", ")}}`;
}

/** py str() 的 JSON 值面（f-string 内插）。 */
export function pyStr(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (typeof v === "string") return v;
  return pyRepr(v);
}

// ---------- path：pathlib / posixpath 口径 ----------

/** Python PurePosixPath 字符串规范化（折叠 // 与 /./，保绝对标记）。 */
export function normPyPath(p: string): string {
  if (p === "") return ".";
  const absolute = p.startsWith("/");
  const parts = p.split("/").filter((s) => s !== "" && s !== ".");
  const joined = parts.join("/");
  if (joined === "") return absolute ? "/" : ".";
  return (absolute ? "/" : "") + joined;
}

/** pathlib 口径的路径归一（去 ./ 与重复 /，保 .. 与绝对标记；与 normPyPath 的
 *  有意差异：保留 `//` 前缀——POSIX 双斜杠是实现定义路径，pathlib 不折叠）。 */
export function pyNorm(s: string): string {
  if (s === "") return ".";
  const dslash = s.startsWith("//");
  const abs = s.startsWith("/");
  const parts: string[] = [];
  for (const seg of s.split("/")) {
    if (seg !== "" && seg !== ".") parts.push(seg);
  }
  if (parts.length === 0) return abs ? "/" : ".";
  return (dslash ? "//" : abs ? "/" : "") + parts.join("/");
}

/** repo 前缀 + 相对段 -> py Path 字符串（同时用作 fs 路径与文案显示）。 */
export function pyJoin(base: string, segs: string[]): string {
  const tail = segs.join("/");
  if (base === ".") return tail;
  if (base === "/") return "/" + tail;
  return base + "/" + tail;
}

/** pathlib 元组序（逐段比较，前缀短者在前）——与字符串序在 `a.json` vs `a/x.json` 类情形不同。 */
export function segCompare(a: string[], b: string[]): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return a[i]! < b[i]! ? -1 : 1;
  }
  return a.length - b.length;
}

/** pathlib Path.stem 等价：去最后一个扩展名（前导点名文件不视作扩展名）。 */
export function pyStem(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

// ---------- 文件读取：py read_text / OSError 语义 ----------

/** py read_text 语义：OSError/UnicodeDecodeError 均为未捕获崩溃路径（fatal 解码、保留 BOM）。 */
export function readTextFatal(fsPath: string): string {
  const buf = fs.readFileSync(fsPath);
  // fatal：非法 UTF-8 抛错（未捕获 → 退出码 1，与 py UnicodeDecodeError 崩溃同码）；
  // ignoreBOM：保留 \ufeff（py read_text 不去 BOM，后续 JSON 解析报 "Unexpected UTF-8 BOM"）
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buf);
}

/** py OSError str 的常见 errno 文案（白名单 unreadable 文案逐字对齐用）。 */
export function pyOsErrMsg(e: unknown, displayPath: string): string {
  const code = (e as NodeJS.ErrnoException | null)?.code;
  if (code === "ENOENT") return `[Errno 2] No such file or directory: '${displayPath}'`;
  if (code === "EISDIR") return `[Errno 21] Is a directory: '${displayPath}'`;
  if (code === "EACCES") return `[Errno 13] Permission denied: '${displayPath}'`;
  if (code === "ENOTDIR") return `[Errno 20] Not a directory: '${displayPath}'`;
  return String((e as Error | null)?.message ?? e);
}

// ---------- cmp：Python 字符串排序语义 ----------

/** Python str 比较的码点序（JS 默认 sort 是 UTF-16 码元序，增补平面字符不同序）。 */
export function cmpPyStr(a: string, b: string): number {
  if (a === b) return 0;
  const A = Array.from(a);
  const B = Array.from(b);
  const n = Math.min(A.length, B.length);
  for (let i = 0; i < n; i++) {
    const ca = A[i]!.codePointAt(0)!;
    const cb = B[i]!.codePointAt(0)!;
    if (ca !== cb) return ca < cb ? -1 : 1;
  }
  return A.length < B.length ? -1 : A.length > B.length ? 1 : 0;
}

// ---------- json：CPython json 兼容解析/序列化 ----------

export type JSONVal = null | boolean | number | bigint | string | JSONVal[] | { [key: string]: JSONVal };

/** py json.JSONDecodeError 的 message 形态载体（调用方按需 catch）。 */
export class PyJSONError extends Error {}

function jsonPosMsg(text: string, msg: string, pos: number): string {
  let line = 1;
  let lastNl = -1;
  for (let i = 0; i < pos; i++) {
    if (text[i] === "\n") {
      line++;
      lastNl = i;
    }
  }
  return `${msg}: line ${line} column ${pos - lastNl} (char ${pos})`;
}

const NUM_RE = /(-?(?:0|[1-9][0-9]*))(\.[0-9]+)?([eE][+-]?[0-9]+)?/y;

/** CPython json 模块同款错误语义与文案（含 3.14 起的 trailing-comma 专文案、
 *  NaN/Infinity 接受、\ufeff BOM 报错）；message 形同 py str(JSONDecodeError)。 */
export function pyJSONParse(text: string): { ok: true; value: JSONVal } | { ok: false; message: string } {
  try {
    return { ok: true, value: parseTop(text) };
  } catch (e) {
    if (e instanceof PyJSONError) return { ok: false, message: e.message };
    throw e;
  }
}

function fail(text: string, msg: string, pos: number): never {
  throw new PyJSONError(jsonPosMsg(text, msg, pos));
}

function skipWs(s: string, i: number): number {
  while (i < s.length && (s[i] === " " || s[i] === "\t" || s[i] === "\n" || s[i] === "\r")) i++;
  return i;
}

function parseTop(s: string): JSONVal {
  if (s.startsWith("\uFEFF")) fail(s, "Unexpected UTF-8 BOM (decode using utf-8-sig)", 0);
  const [val, next] = parseValue(s, skipWs(s, 0));
  const end = skipWs(s, next);
  if (end < s.length) fail(s, "Extra data", end);
  return val;
}

function parseValue(s: string, i: number): [JSONVal, number] {
  if (i >= s.length) fail(s, "Expecting value", i);
  const c = s[i]!;
  if (c === '"') return parseString(s, i);
  if (c === "{") return parseObject(s, i);
  if (c === "[") return parseArray(s, i);
  if (c === "-" || (c >= "0" && c <= "9")) {
    if (c === "-" && s.startsWith("-Infinity", i)) return [-Infinity, i + 9];
    NUM_RE.lastIndex = i;
    const m = NUM_RE.exec(s);
    if (m === null) fail(s, "Expecting value", i);
    const next = i + m[0].length;
    if (m[2] === undefined && m[3] === undefined) {
      // 整数分支下组 1 必在（m[2]/m[3] 均未参与）
      const big = BigInt(m[1]!);
      if (big >= BigInt(Number.MIN_SAFE_INTEGER) && big <= BigInt(Number.MAX_SAFE_INTEGER)) {
        return [Number(big), next];
      }
      return [big, next];
    }
    // 溢出 → ±Infinity（py float 同为 inf）
    return [Number(m[0]), next];
  }
  if (s.startsWith("NaN", i)) return [NaN, i + 3];
  if (s.startsWith("Infinity", i)) return [Infinity, i + 8];
  if (s.startsWith("true", i)) return [true, i + 4];
  if (s.startsWith("false", i)) return [false, i + 5];
  if (s.startsWith("null", i)) return [null, i + 4];
  fail(s, "Expecting value", i);
}

function parseString(s: string, start: number): [string, number] {
  let i = start + 1;
  const parts: string[] = [];
  for (;;) {
    if (i >= s.length) fail(s, "Unterminated string starting at", start);
    const c = s[i]!;
    if (c === '"') return [parts.join(""), i + 1];
    if (c === "\\") {
      if (i + 1 >= s.length) fail(s, "Unterminated string starting at", start);
      const e = s[i + 1]!;
      if (e === '"') { parts.push('"'); i += 2; }
      else if (e === "\\") { parts.push("\\"); i += 2; }
      else if (e === "/") { parts.push("/"); i += 2; }
      else if (e === "b") { parts.push("\b"); i += 2; }
      else if (e === "f") { parts.push("\f"); i += 2; }
      else if (e === "n") { parts.push("\n"); i += 2; }
      else if (e === "r") { parts.push("\r"); i += 2; }
      else if (e === "t") { parts.push("\t"); i += 2; }
      else if (e === "u") {
        const hex = s.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail(s, "Invalid \\uXXXX escape", i + 1);
        parts.push(String.fromCharCode(parseInt(hex, 16)));
        i += 6;
      } else fail(s, "Invalid \\escape", i);
      continue;
    }
    if (s.charCodeAt(i) < 0x20) fail(s, "Invalid control character at", i);
    parts.push(c);
    i++;
  }
}

function parseObject(s: string, i: number): [{ [k: string]: JSONVal }, number] {
  i = skipWs(s, i + 1);
  const obj: { [k: string]: JSONVal } = {};
  if (s[i] === "}") return [obj, i + 1];
  for (;;) {
    if (i >= s.length || s[i] !== '"') fail(s, "Expecting property name enclosed in double quotes", i);
    const [key, kNext] = parseString(s, i);
    i = skipWs(s, kNext);
    if (i >= s.length || s[i] !== ":") fail(s, "Expecting ':' delimiter", i);
    i = skipWs(s, i + 1);
    const [val, vNext] = parseValue(s, i);
    obj[key] = val;
    i = skipWs(s, vNext);
    if (i >= s.length) fail(s, "Expecting ',' delimiter", i);
    if (s[i] === "}") return [obj, i + 1];
    if (s[i] !== ",") fail(s, "Expecting ',' delimiter", i);
    const comma = i;
    i = skipWs(s, i + 1);
    if (s[i] === "}") fail(s, "Illegal trailing comma before end of object", comma);
  }
}

function parseArray(s: string, i: number): [JSONVal[], number] {
  i = skipWs(s, i + 1);
  const arr: JSONVal[] = [];
  if (s[i] === "]") return [arr, i + 1];
  for (;;) {
    const [val, vNext] = parseValue(s, i);
    arr.push(val);
    i = skipWs(s, vNext);
    if (i >= s.length) fail(s, "Expecting ',' delimiter", i);
    if (s[i] === "]") return [arr, i + 1];
    if (s[i] !== ",") fail(s, "Expecting ',' delimiter", i);
    const comma = i;
    i = skipWs(s, i + 1);
    if (s[i] === "]") fail(s, "Illegal trailing comma before end of array", comma);
  }
}

/** py json.dumps 兼容字符串转义（夹具构造与 pyDumps 共用）。 */
export function jsonDumpStr(s: string): string {
  let out = '"';
  for (const ch of s) {
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\t") out += "\\t";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\b") out += "\\b";
    else if (ch === "\f") out += "\\f";
    else {
      const cp = ch.codePointAt(0)!;
      if (cp < 0x20) out += `\\u${cp.toString(16).padStart(4, "0")}`;
      else out += ch;
    }
  }
  return out + '"';
}

/** py json.dumps 兼容序列化（indent=2 / 紧凑两种形态；NaN/Infinity 按 py 字面）。 */
export function pyDumps(v: JSONVal, indent: number | null): string {
  const dump = (val: JSONVal, ind: number): string => {
    if (val === null) return "null";
    if (typeof val === "boolean") return val ? "true" : "false";
    if (typeof val === "number") {
      if (Number.isNaN(val)) return "NaN";
      if (val === Infinity) return "Infinity";
      if (val === -Infinity) return "-Infinity";
      return String(val);
    }
    if (typeof val === "bigint") return String(val);
    if (typeof val === "string") return jsonDumpStr(val);
    if (Array.isArray(val)) {
      if (val.length === 0) return "[]";
      if (indent === null) return `[${val.map((x) => dump(x, ind)).join(", ")}]`;
      const inner = " ".repeat(ind + indent);
      return `[\n${val.map((x) => inner + dump(x, ind + indent)).join(",\n")}\n${" ".repeat(ind)}]`;
    }
    const keys = Object.keys(val);
    if (keys.length === 0) return "{}";
    if (indent === null) return `{${keys.map((k) => `${jsonDumpStr(k)}: ${dump(val[k]!, ind)}`).join(", ")}}`;
    const inner = " ".repeat(ind + indent);
    return `{\n${keys.map((k) => `${inner}${jsonDumpStr(k)}: ${dump(val[k]!, ind + indent)}`).join(",\n")}\n${" ".repeat(ind)}}`;
  };
  return dump(v, 0);
}

// ---------- datetime：py datetime.fromisoformat 兼容（3.11+ 实用子集） ----------

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MS_PER_HOUR = 60 * 60 * 1000;
export const MS_PER_MINUTE = 60 * 1000;

export interface PyDT { ms: number; dateStr: string }

/** py 闰年判据（calendar.isleap 等价：四年一闰、百年不闰、四百年再闰）。 */
export function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** 该年是否含 ISO 8601 第 53 周（平年首日周四或闰年首日周三才可能有 W53）。 */
export function hasIsoWeek53(y: number): boolean {
  const j1 = new Date(Date.UTC(y, 0, 1));
  // ISO 平日序：1 = 周一
  const dw = ((j1.getUTCDay() + 6) % 7) + 1;
  return dw === 4 || (dw === 3 && isLeap(y));
}

/** 真日历日的月天数（py calendar.monthrange 的 days 面；mo = 1–12）。 */
export function daysInMonth(y: number, mo: number): number {
  return new Date(Date.UTC(y, mo, 0)).getUTCDate();
}

function parseFrac(s: string, j: number): { us: number; next: number } | null {
  if (s[j] !== "." && s[j] !== ",") return null;
  const m = /^\d+/.exec(s.slice(j + 1));
  if (m === null) return null;
  // py：截断到微秒
  const us = Number(((m[0].slice(0, 6) + "000000").slice(0, 6)));
  return { us, next: j + 1 + m[0].length };
}

function parseIsoTime(s: string, j: number): { hh: number; mm: number; ss: number; us: number; next: number } | null {
  if (!/^\d{2}/.test(s.slice(j, j + 2))) return null;
  const hh = Number(s.slice(j, j + 2));
  j += 2;
  let mm = 0;
  let ss = 0;
  let us = 0;
  if (s[j] === ":") {
    const m1 = /^:(\d{2})/.exec(s.slice(j));
    if (m1 === null) return null;
    mm = Number(m1[1]);
    j += 3;
    if (s[j] === ":") {
      const m2 = /^:(\d{2})/.exec(s.slice(j));
      if (m2 === null) return null;
      ss = Number(m2[1]);
      j += 3;
      const fr = parseFrac(s, j);
      if (fr !== null) {
        us = fr.us;
        j = fr.next;
      }
    }
  } else if (j + 1 < s.length && /^\d{2}/.test(s.slice(j, j + 2))) {
    mm = Number(s.slice(j, j + 2));
    j += 2;
    if (j + 1 < s.length && /^\d{2}/.test(s.slice(j, j + 2))) {
      ss = Number(s.slice(j, j + 2));
      j += 2;
      const fr = parseFrac(s, j);
      if (fr !== null) {
        us = fr.us;
        j = fr.next;
      }
    }
  }
  return { hh, mm, ss, us, next: j };
}

function parseIsoOffset(s: string, j: number): { ms: number; next: number } | null {
  const sign = s[j] === "+" ? 1 : -1;
  let k = j + 1;
  if (!/^\d{2}/.test(s.slice(k, k + 2))) return null;
  const oh = Number(s.slice(k, k + 2));
  k += 2;
  let om = 0;
  let offsetSec = 0;
  let ous = 0;
  if (s[k] === ":") {
    const m1 = /^:(\d{2})/.exec(s.slice(k));
    if (m1 === null) return null;
    om = Number(m1[1]);
    k += 3;
    if (s[k] === ":") {
      const m2 = /^:(\d{2})/.exec(s.slice(k));
      if (m2 === null) return null;
      offsetSec = Number(m2[1]);
      k += 3;
      const fr = parseFrac(s, k);
      if (fr !== null) {
        ous = fr.us;
        k = fr.next;
      }
    }
  } else if (k + 1 < s.length && /^\d{2}/.test(s.slice(k, k + 2))) {
    om = Number(s.slice(k, k + 2));
    k += 2;
    if (k + 1 < s.length && /^\d{2}/.test(s.slice(k, k + 2))) {
      offsetSec = Number(s.slice(k, k + 2));
      k += 2;
      const fr = parseFrac(s, k);
      if (fr !== null) {
        ous = fr.us;
        k = fr.next;
      }
    }
  }
  if (oh > 23 || om > 59 || offsetSec > 59) return null;
  return { ms: sign * (oh * MS_PER_HOUR + om * MS_PER_MINUTE + offsetSec * 1000 + ous / 1000), next: k };
}

/** py datetime.fromisoformat(ts.replace("Z", "+00:00")) 的等价实现；naive 视为 UTC。 */
export function pyFromIso(ts: unknown): PyDT | null {
  if (typeof ts !== "string") return null;
  const s = ts.split("Z").join("+00:00");
  let y = 0;
  let mo = 0;
  let d = 0;
  let i = 0;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m !== null) {
    y = Number(m[1]);
    mo = Number(m[2]);
    d = Number(m[3]);
    i = m[0].length;
  } else if ((m = /^(\d{4})(\d{2})(\d{2})/.exec(s)) !== null) {
    y = Number(m[1]);
    mo = Number(m[2]);
    d = Number(m[3]);
    i = m[0].length;
  } else if ((m = /^(\d{4})-W(\d{2})-(\d)/.exec(s)) !== null || (m = /^(\d{4})-W(\d{2})$/.exec(s)) !== null || (m = /^(\d{4})W(\d{2})(\d)?/.exec(s)) !== null) {
    y = Number(m[1]);
    const wk = Number(m[2]);
    const wd = m[3] === undefined ? 1 : Number(m[3]);
    if (wk < 1 || wk > 53 || (wk === 53 && !hasIsoWeek53(y)) || wd < 1 || wd > 7) return null;
    const dowJan4 = ((new Date(Date.UTC(y, 0, 4)).getUTCDay() + 6) % 7) + 1;
    const target = Date.UTC(y, 0, 4) - (dowJan4 - 1) * MS_PER_DAY + (wk - 1) * 7 * MS_PER_DAY + (wd - 1) * MS_PER_DAY;
    const td = new Date(target);
    y = td.getUTCFullYear();
    mo = td.getUTCMonth() + 1;
    d = td.getUTCDate();
    i = m[0].length;
  } else return null;
  if (y < 1 || mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;

  let hh = 0;
  let mm = 0;
  let ss = 0;
  let us = 0;
  let offMs = 0;
  let isRollover = false;
  if (i < s.length) {
    // py 3.11+：日期与时刻间的分隔符可为任意单字符
    i += 1;
    const t = parseIsoTime(s, i);
    if (t === null) return null;
    hh = t.hh;
    mm = t.mm;
    ss = t.ss;
    us = t.us;
    i = t.next;
    if (hh === 24) {
      if (mm !== 0 || ss !== 0 || us !== 0) return null;
      isRollover = true;
      // 24:00 → 次日 00:00，baseDay 已翻日，时刻归零
      hh = 0;
    } else if (hh > 23) return null;
    if (mm > 59 || ss > 59) return null;
    if (i < s.length && (s[i] === "+" || s[i] === "-")) {
      const o = parseIsoOffset(s, i);
      if (o === null) return null;
      offMs = o.ms;
      i = o.next;
    }
    // 未消费尾段
    if (i < s.length) return null;
  }
  let baseDay = Date.UTC(y, mo - 1, d);
  if (isRollover) baseDay += MS_PER_DAY;
  const ms = baseDay + hh * MS_PER_HOUR + mm * MS_PER_MINUTE + ss * 1000 + us / 1000 - offMs;
  const dd = new Date(baseDay);
  const dateStr = `${String(dd.getUTCFullYear()).padStart(4, "0")}-${String(dd.getUTCMonth() + 1).padStart(2, "0")}-${String(dd.getUTCDate()).padStart(2, "0")}`;
  return { ms, dateStr };
}

// ---------- 常量：协议校验共用 ----------

export const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
