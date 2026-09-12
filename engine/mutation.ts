// mutation.ts — Mutation 落盘协议（批次 1 序 2 ADR C1/C2）：封闭六字段 schema、目录锚点、
// ID=文件名。Mutation = 执行前的意图声明（主设计 §5.1：意图 + 风险），与 Capsule（执行后
// 的审计事实）是同一次演化的两端，不合并——声明而未执行是合法状态。
// 写路径（recordMutation）与基因/Capsule 共用 solidify.ts 的原子提交面。

import * as fs from 'fs';
import * as path from 'path';
import { EngineError, KEBAB_RE } from './util.js';

// risk_level 是设计 §5.1 明列的三值封闭集；category/target/expected_effect 无值域
// （taxonomy 未决，批次表序 23）——预设枚举即造分类法，故只校验非空。
const RISK_LEVELS = ['low', 'medium', 'high'];
const KNOWN_MUTATION_FIELDS = new Set(['id', 'domain', 'category', 'target', 'expected_effect', 'risk_level']);

// obj 保持 any：不可信 JSON 面，逐字段运行时守卫（与 gene.ts/capsule.ts 同姿态）。
function validateMutation(obj: any, opts: { fileName: string; parentDir: string | null }): string[] {
  const errors: string[] = [];
  const { fileName, parentDir } = opts;
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return ['mutation must be a JSON object'];
  }
  for (const k of Object.keys(obj)) {
    if (!KNOWN_MUTATION_FIELDS.has(k)) errors.push(`unknown field: ${k}`);
  }
  if (typeof obj.id !== 'string' || !KEBAB_RE.test(obj.id)) {
    errors.push(`id must be kebab-case string, got ${JSON.stringify(obj.id)}`);
  } else if (fileName !== `${obj.id}.json`) {
    errors.push(`id '${obj.id}' must equal filename (got ${fileName})`);
  }
  if (typeof obj.domain !== 'string' || !KEBAB_RE.test(obj.domain)) {
    errors.push(`domain must be kebab-case string, got ${JSON.stringify(obj.domain)}`);
  } else if (parentDir !== null && parentDir !== obj.domain) {
    errors.push(`domain '${obj.domain}' must equal its directory (${parentDir})`);
  }
  for (const field of ['category', 'target', 'expected_effect']) {
    const v = obj[field];
    if (typeof v !== 'string' || !v.trim()) errors.push(`${field} must be a non-empty string`);
  }
  if (!RISK_LEVELS.includes(obj.risk_level)) {
    errors.push(`risk_level must be one of ${RISK_LEVELS.join('|')}, got ${JSON.stringify(obj.risk_level)}`);
  }
  return errors;
}

// 读入并校验单个 Mutation 文件。目录锚点（domain == 父目录）只约束 mutations/ 内的
// 落盘位置；recordMutation 的候选文件可放在 mutations/ 之外，故可关。
function readMutation(filePath: string, opts: { skipDirAnchor?: boolean } = {}) {
  const fileName = path.basename(filePath);
  const parentDir = opts.skipDirAnchor ? null : path.basename(path.dirname(filePath));
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    throw new EngineError(`cannot read mutation file ${filePath}: ${(e as Error).message}`);
  }
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    throw new EngineError(`${filePath}: not valid JSON: ${(e as Error).message}`);
  }
  const errors = validateMutation(obj, { fileName, parentDir });
  if (errors.length) throw new EngineError(`${filePath}: ${errors.join('; ')}`);
  return obj;
}

// 跨树 id 唯一性：同一 id 不得在两个域并存（事件只记 id，引用必须无歧义）。
function assertMutationIdUnique(repoRoot: string, domain: string, id: string) {
  const root = path.join(repoRoot, 'mutations');
  if (!fs.existsSync(root)) return;
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name === domain) continue;
    if (fs.existsSync(path.join(root, ent.name, `${id}.json`))) {
      throw new EngineError(`mutation id '${id}' already exists in domain '${ent.name}' — refs must stay unambiguous`);
    }
  }
}

function mutationPath(repoRoot: string, domain: string, id: string) {
  return path.join(repoRoot, 'mutations', domain, `${id}.json`);
}

// 人读渲染（mutation show）：确定性输出，逐字断言见 engine self-test 的 GOLDEN 夹具。
function renderMutation(obj: any): string {
  const lines = [
    `[noo-mutation ${obj.domain}/${obj.id}]`,
    '',
    `category: ${obj.category}`,
    `risk: ${obj.risk_level}`,
    `target: ${obj.target}`,
    `expected effect: ${obj.expected_effect}`,
  ];
  return lines.join('\n') + '\n';
}

export {
  validateMutation, readMutation, mutationPath, assertMutationIdUnique, renderMutation,
};
