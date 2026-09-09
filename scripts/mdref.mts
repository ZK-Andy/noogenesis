#!/usr/bin/env node
/**
 * mdref — verify-* 门禁的共享 Markdown 链接原语库（import 消费，非独立工具）。
 *
 * 单源（ADR 2026-09-05-consolidate-r1-simplification-candidates）：链接/锚点定义与
 * 相对链接解析循环，供 verify-md-links.mts 与 verify-skill-format.mts 共用；本库
 * 无 CLI，行为由消费方的 --self-test 覆盖（verify-skill-format --self-test 经
 * check_skill 走死链路径）。
 * 2026-09-10 起亦为 py 兼容小件（splitLines / pyStrip）的共享单源——原散在
 * verify-adr-format / verify-cookbook / verify-gene-format / verify-handoff-structure
 * 的手搓副本经行为等价差分（n=23 边界用例）归口本件（ADR
 * 2026-09-10-mdref-py-primitives-fold）；新增导出须同时更新消费方与夹具。
 *
 * checkRelativeLinks 合同：
 *   - 相对目标以其所属文件父目录解析；前导 `/` 目标以 root（扫描根）解析；
 *   - 目标文件必须存在，否则追加 `{path}: missing target '{target}'`；
 *   - 带 `#frag` 时 frag 必须命中目标文件的标题 slug（GitHub 风格：小写、空白→
 *     连字符、去标点；Python `\w` 为 unicode 词字符，JS `\w` 只匹配 ASCII，故以
 *     `\p{L}\p{N}_` + u flag 等价展开，CJK 行为实测一致）或显式 `<a id="...">` 锚，
 *     否则追加 `{path}: dead anchor '#{frag}' in '{target}'`；
 *   - 外链（http(s)/mailto/含 `://`）、尖括号目标、同页（`#...`）目标跳过；
 *     返回目标文件存在的 target 计数。
 *   - 错误信息模板与 Python 版逐字一致（`{path}` 为调用方传入的路径字符串形式）。
 *
 * Python→JS 语义陷阱面：headingSlugs 按行解析经 splitLines（Python
 * str.splitlines() 等价——\v\f\r\x1c-\x1e\x85\u2028\u2029 亦断行，结尾终结符不
 * 产生空尾行），非 split("\n")。
 *
 * 用法：消费方以 `node scripts/verify-*.mts` 自仓库根运行，路径字符串与扫描根由
 * 消费方传入；退出码语义由消费方定义（0=PASS / 1=违约 / 2=fail-closed）。
 *
 * Provenance: distilled from dotnet-deepseek-harness-desktop
 * scripts/verify-md-links.py + verify-skill-format.py (MIT, 2026-09-05)；
 * 共享件单源 = 本件（原 py 版 scripts/mdref.py 随 B5 切换批退役）。
 * B1 随族迁 TS（2026-09-08，.agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md）。
 */
import * as fs from "node:fs";
import * as path from "node:path";

const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;
const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/u;
const ANCHOR_RE = /<a\s+id="([^"]+)"/;

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

/** GitHub 风格标题 slug：小写、去标点（保 unicode 词字符与 CJK）、空白折叠为连字符。 */
export function slugify(text: string): string {
  text = text.trim().toLowerCase();
  // Python `[^\w\u4e00-\u9fff \-]`：\w 是 unicode 词字符（\p{L}\p{N}_），JS \w
  // 只匹配 ASCII——以此等价展开并经夹具实测 CJK 一致。
  text = text.replace(/[^\p{L}\p{N}_ \u4e00-\u9fff-]+/gu, "");
  text = text.replace(/\s+/gu, "-");
  return text;
}

/** 收集文件内全部标题 slug 与显式 `<a id="...">` 锚；文件不可读（如目标不存在）返回空集。 */
function headingSlugs(p: string): Set<string> {
  const slugs = new Set<string>();
  let text: string;
  try {
    text = fs.readFileSync(p, "utf-8");
  } catch {
    return slugs; // Python: OSError -> 空集
  }
  for (const line of splitLines(text)) {
    const hm = line.match(HEADING_RE);
    if (hm) slugs.add(slugify(hm[2]!));
    const am = line.match(ANCHOR_RE);
    if (am) slugs.add(am[1]!);
  }
  return slugs;
}

function isFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/** 解析 `text` 中的相对 Markdown 链接并校验锚点（合同见文件头）。 */
export function checkRelativeLinks(
  text: string,
  p: string,
  root: string,
  errors: string[]
): number {
  let checked = 0;
  for (let target of Array.from(text.matchAll(LINK_RE), (m) => m[1]!)) {
    target = target.trim();
    if (
      ["http://", "https://", "mailto:", "#", "<"].some((pre) =>
        target.startsWith(pre)
      )
    ) {
      continue;
    }
    if (target.includes("://")) {
      continue;
    }
    let resolved: string;
    if (target.startsWith("/")) {
      // 仓库根绝对路径：以 root 解析
      resolved = path.resolve(root, target.replace(/^\/+/, ""));
    } else {
      resolved = path.resolve(path.dirname(p), target.split("#")[0]!);
    }
    if (!isFile(resolved)) {
      errors.push(`${p}: missing target '${target}'`);
      continue;
    }
    checked += 1;
    if (target.includes("#")) {
      const frag = target.slice(target.indexOf("#") + 1);
      if (frag && !headingSlugs(resolved).has(frag)) {
        errors.push(`${p}: dead anchor '#${frag}' in '${target}'`);
      }
    }
  }
  return checked;
}
