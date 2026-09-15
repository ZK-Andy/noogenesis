// protocol.ts — 同族原语落盘协议的共享外壳：封闭字段面 + id/domain 双锚点 + 读入抛物 +
// 跨域 id 唯一 + 落盘路径。gene/capsule/mutation 三件共用（协议单源仍是各原语 ADR）；
// 各原语的字段值域校验留在本家。

import * as fs from 'fs';
import * as path from 'path';
import { EngineError, KEBAB_RE } from './util.js';

// 非对象面早退：返回错误集即调用方直接返回该集（面名由调用方给，如 'gene'）。
function protocolNonObject(obj: any, noun: string): string[] | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [`${noun} must be a JSON object`];
  return null;
}

// 封闭 schema 外壳：未知顶层字段 + id/domain 双锚点（id = 文件名、domain = 父目录名）。
// parentDir 为 null 时跳过目录锚点——候选文件可落在正式目录之外（入档位置由写路径决定）。
function protocolIdentityErrors(obj: any, opts: { fields: Set<string>; fileName: string; parentDir: string | null }): string[] {
  const errors: string[] = [];
  for (const k of Object.keys(obj)) {
    if (!opts.fields.has(k)) errors.push(`unknown field: ${k}`);
  }
  if (typeof obj.id !== 'string' || !KEBAB_RE.test(obj.id)) {
    errors.push(`id must be kebab-case string, got ${JSON.stringify(obj.id)}`);
  } else if (opts.fileName !== `${obj.id}.json`) {
    errors.push(`id '${obj.id}' must equal filename (got ${opts.fileName})`);
  }
  if (typeof obj.domain !== 'string' || !KEBAB_RE.test(obj.domain)) {
    errors.push(`domain must be kebab-case string, got ${JSON.stringify(obj.domain)}`);
  } else if (opts.parentDir !== null && opts.parentDir !== obj.domain) {
    errors.push(`domain '${obj.domain}' must equal its directory (${opts.parentDir})`);
  }
  return errors;
}

// 读入 + JSON 解析 + 校验抛物：三段失败都是 EngineError（fail-closed）；校验器由原语注入，
// 错误集合并为一条消息（多字段违约一次报全，不首次即停）。
function readProtocolFile(filePath: string, opts: { noun: string; skipDirAnchor?: boolean; validate: (obj: any, anchors: { fileName: string; parentDir: string | null }) => string[] }) {
  const fileName = path.basename(filePath);
  const parentDir = opts.skipDirAnchor ? null : path.basename(path.dirname(filePath));
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    throw new EngineError(`cannot read ${opts.noun} file ${filePath}: ${(e as Error).message}`);
  }
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    throw new EngineError(`${filePath}: not valid JSON: ${(e as Error).message}`);
  }
  const errors = opts.validate(obj, { fileName, parentDir });
  if (errors.length) throw new EngineError(`${filePath}: ${errors.join('; ')}`);
  return obj;
}

// 跨树 id 唯一性：同一 id 不得在两个域并存（事件只记 id，引用必须无歧义）。
function assertProtocolIdUnique(repoRoot: string, dir: string, noun: string, domain: string, id: string) {
  const root = path.join(repoRoot, dir);
  if (!fs.existsSync(root)) return;
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name === domain) continue;
    if (fs.existsSync(path.join(root, ent.name, `${id}.json`))) {
      throw new EngineError(`${noun} id '${id}' already exists in domain '${ent.name}' — refs must stay unambiguous`);
    }
  }
}

function protocolPath(repoRoot: string, dir: string, domain: string, id: string) {
  return path.join(repoRoot, dir, domain, `${id}.json`);
}

export { protocolNonObject, protocolIdentityErrors, readProtocolFile, assertProtocolIdUnique, protocolPath };
