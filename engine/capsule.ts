// capsule.ts — Capsule 落盘协议（批次 1 序 1 ADR C1/C2）：封闭七字段 schema、目录锚点、
// ID=文件名、基因引用可解析。Capsule = 一次真实执行的审计记录（主设计 §5.1），其
// gene_ids/steps/evidence 面同时是共享层稿 §6.2 的可复现路径——一份 schema 两用。
// 写路径（recordCapsule）与基因共用 solidify.ts 的原子提交面。

import * as fs from 'fs';
import * as path from 'path';
import { EngineError, KEBAB_REF_RE } from './util.js';
import { protocolNonObject, protocolIdentityErrors, readProtocolFile, assertProtocolIdUnique } from './protocol.js';
import { genesDir, capsulesDir } from './state.js';

const KNOWN_CAPSULE_FIELDS = new Set(['id', 'domain', 'gene_ids', 'trigger', 'steps', 'outcome', 'evidence']);

// 非空字符串数组：元素须为字符串且 strip 后非空（空数组违约，应省略字段）。
function requireNonEmptyStringArray(field: string, v: unknown, errors: string[]): void {
  if (!Array.isArray(v) || !v.every((s) => typeof s === 'string' && s.trim())) {
    errors.push(`${field} must be a non-empty-string array`);
  } else if (!v.length) {
    errors.push(`${field} must have at least 1 item(s)`);
  }
}

// obj 保持 any：不可信 JSON 面，逐字段运行时守卫（与 gene.ts 同姿态）。身份面（未知字段 +
// id/domain 锚点）与另两原语共用协议外壳，本函数只接 Capsule 的值域面。
function validateCapsule(obj: any, opts: { fileName: string; parentDir: string | null }): string[] {
  const nonObject = protocolNonObject(obj, 'capsule');
  if (nonObject) return nonObject;
  const errors = protocolIdentityErrors(obj, { fields: KNOWN_CAPSULE_FIELDS, ...opts });

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

// 读入并校验单个 Capsule 文件。目录锚点（domain == 父目录）只约束状态 Capsule 目录内的
// 落盘位置；recordCapsule 的候选文件可放在其外，故可关。
function readCapsule(filePath: string, opts: { skipDirAnchor?: boolean } = {}) {
  return readProtocolFile(filePath, { noun: 'capsule', skipDirAnchor: opts.skipDirAnchor, validate: validateCapsule });
}

// Capsule 引用的基因必须命中本仓状态基因目录（复算规则 2）：缓存面是分发副本、可丢弃，
// 引用缓存基因的 Capsule 在缓存退场后即悬空，故不作可解析面。
function assertGeneRefsResolvable(repoRoot: string, geneIds: string[]) {
  for (const ref of geneIds) {
    const [domain, id] = ref.split('/') as [string, string];
    if (!fs.existsSync(path.join(genesDir(repoRoot), domain, `${id}.json`))) {
      throw new EngineError(`capsule references gene '${ref}' not in the state gene dir (cache copies do not count)`);
    }
  }
}

// 跨树 id 唯一性：同一 id 不得在两个域并存（事件只记 id，引用必须无歧义）。
function assertCapsuleIdUnique(repoRoot: string, domain: string, id: string) {
  assertProtocolIdUnique(capsulesDir(repoRoot), 'capsule', domain, id);
}

function capsulePath(repoRoot: string, domain: string, id: string) {
  return path.join(capsulesDir(repoRoot), domain, id + '.json');
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