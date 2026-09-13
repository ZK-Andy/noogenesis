// capsule.ts — Capsule 落盘协议（批次 1 序 1 ADR C1/C2）：封闭七字段 schema、目录锚点、
// ID=文件名、基因引用可解析。Capsule = 一次真实执行的审计记录（主设计 §5.1），其
// gene_ids/steps/evidence 面同时是共享层稿 §6.2 的可复现路径——一份 schema 两用。
// 写路径（recordCapsule）与基因共用 solidify.ts 的原子提交面。

import * as fs from 'fs';
import * as path from 'path';
import { EngineError, KEBAB_RE, KEBAB_REF_RE } from './util.js';

const KNOWN_CAPSULE_FIELDS = new Set(['id', 'domain', 'gene_ids', 'trigger', 'steps', 'outcome', 'evidence']);

// 非空字符串数组：元素须为字符串且 strip 后非空（空数组违约，应省略字段）。
function requireNonEmptyStringArray(field: string, v: unknown, errors: string[]): void {
  if (!Array.isArray(v) || !v.every((s) => typeof s === 'string' && s.trim())) {
    errors.push(`${field} must be a non-empty-string array`);
  } else if (!v.length) {
    errors.push(`${field} must have at least 1 item(s)`);
  }
}

// obj 保持 any：不可信 JSON 面，逐字段运行时守卫（与 gene.ts 同姿态）。
function validateCapsule(obj: any, opts: { fileName: string; parentDir: string | null }): string[] {
  const errors: string[] = [];
  const { fileName, parentDir } = opts;
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return ['capsule must be a JSON object'];
  }
  for (const k of Object.keys(obj)) {
    if (!KNOWN_CAPSULE_FIELDS.has(k)) errors.push(`unknown field: ${k}`);
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

  // gene_ids：至少一条 <domain>/<id> 引用（内容寻址面在事件 capsule_sha，不在引用串）。
  if (!Array.isArray(obj.gene_ids) || !obj.gene_ids.every((s: unknown) => typeof s === 'string' && KEBAB_REF_RE.test(s))) {
    errors.push('gene_ids must be an array of <domain>/<id> refs');
  } else if (!obj.gene_ids.length) {
    errors.push('gene_ids must have at least 1 item(s)');
  }

  if (typeof obj.trigger !== 'string' || !obj.trigger.trim()) {
    errors.push('trigger must be a non-empty string');
  }
  requireNonEmptyStringArray('steps', obj.steps, errors);
  requireNonEmptyStringArray('evidence', obj.evidence, errors);

  // outcome：二值（骨架 ADR D4 已拍文档域无可信改进分数，不设 score）；fail 必带 reason。
  const o = obj.outcome;
  if (!o || typeof o !== 'object' || Array.isArray(o)) {
    errors.push('outcome must be an object');
  } else {
    const ok = new Set(['status', 'reason']);
    for (const k of Object.keys(o)) {
      if (!ok.has(k)) errors.push(`unknown outcome key: ${k}`);
    }
    if (o.status !== 'ok' && o.status !== 'fail') errors.push(`outcome.status must be 'ok' or 'fail', got ${JSON.stringify(o.status)}`);
    if (o.status === 'fail') {
      if (typeof o.reason !== 'string' || !o.reason.trim()) errors.push('outcome.reason must be a non-empty string when status is fail');
    } else if (o.reason !== undefined) {
      errors.push('outcome.reason is only for status fail');
    }
  }

  return errors;
}

// 读入并校验单个 Capsule 文件。目录锚点（domain == 父目录）只约束 capsules/ 内的落盘位置；
// recordCapsule 的候选文件可放在 capsules/ 之外，故可关。
function readCapsule(filePath: string, opts: { skipDirAnchor?: boolean } = {}) {
  const fileName = path.basename(filePath);
  const parentDir = opts.skipDirAnchor ? null : path.basename(path.dirname(filePath));
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    throw new EngineError(`cannot read capsule file ${filePath}: ${(e as Error).message}`);
  }
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    throw new EngineError(`${filePath}: not valid JSON: ${(e as Error).message}`);
  }
  const errors = validateCapsule(obj, { fileName, parentDir });
  if (errors.length) throw new EngineError(`${filePath}: ${errors.join('; ')}`);
  return obj;
}

// Capsule 引用的基因必须命中本仓 genes/（复算规则 2）：缓存面是分发副本、可丢弃，
// 引用缓存基因的 Capsule 在缓存退场后即悬空，故不作可解析面。
function assertGeneRefsResolvable(repoRoot: string, geneIds: string[]) {
  for (const ref of geneIds) {
    const [domain, id] = ref.split('/') as [string, string];
    if (!fs.existsSync(path.join(repoRoot, 'genes', domain, `${id}.json`))) {
      throw new EngineError(`capsule references gene '${ref}' not in genes/ (cache copies do not count)`);
    }
  }
}

// 跨树 id 唯一性：同一 id 不得在两个域并存（事件只记 id，引用必须无歧义）。
function assertCapsuleIdUnique(repoRoot: string, domain: string, id: string) {
  const root = path.join(repoRoot, 'capsules');
  if (!fs.existsSync(root)) return;
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name === domain) continue;
    if (fs.existsSync(path.join(root, ent.name, `${id}.json`))) {
      throw new EngineError(`capsule id '${id}' already exists in domain '${ent.name}' — refs must stay unambiguous`);
    }
  }
}

function capsulePath(repoRoot: string, domain: string, id: string) {
  return path.join(repoRoot, 'capsules', domain, `${id}.json`);
}

// 人读渲染（capsule show）：确定性输出，逐字断言见 engine self-test 的 GOLDEN 夹具。
function renderCapsule(obj: any): string {
  const lines = [
    `[noo-capsule ${obj.domain}/${obj.id}]`,
    '',
    `trigger: ${obj.trigger}`,
    `outcome: ${obj.outcome.status}${obj.outcome.reason ? ` (${obj.outcome.reason})` : ''}`,
    `genes: ${obj.gene_ids.join(', ')}`,
    '',
    'steps:',
    ...obj.steps.map((s: string, i: number) => `${i + 1}. ${s}`),
    '',
    'evidence:',
    ...obj.evidence.map((s: string) => `- ${s}`),
  ];
  return lines.join('\n') + '\n';
}

export {
  validateCapsule, readCapsule, capsulePath,
  assertGeneRefsResolvable, assertCapsuleIdUnique, renderCapsule,
};
