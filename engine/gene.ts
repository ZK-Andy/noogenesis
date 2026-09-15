// gene.ts — Gene 落盘协议（schema ADR S1）：封闭字段 schema、目录锚点、ID=文件名、白名单子集。
// 字段表当前为 3 必选（summary/signals + 目录锚点 domain/id）+ 3 可选（constraints/validation/avoid），
// 口径 = .agents/notes/implemented/architecture/2026-09-16-state-root-under-noogenesis.md 决定 3。

import * as fs from 'fs';
import * as path from 'path';
import { KEBAB_RE } from './util.js';
import { protocolNonObject, protocolIdentityErrors, readProtocolFile } from './protocol.js';
import { genesDir, cacheDir, STATE_ROOT } from './state.js';

// 封闭 schema：未知顶层字段即违约。
const KNOWN_GENE_FIELDS = new Set(['id', 'domain', 'summary', 'signals', 'constraints', 'validation', 'avoid']);

// obj 保持 any：不可信 JSON 面，逐字段运行时守卫。身份面（未知字段 + id/domain 锚点）与另两
// 原语共用协议外壳，本函数只接 gene 的值域面。
function validateGene(obj: any, opts: { fileName: string; parentDir: string | null }) {
  const nonObject = protocolNonObject(obj, 'gene');
  if (nonObject) return nonObject;
  const errors = protocolIdentityErrors(obj, { fields: KNOWN_GENE_FIELDS, ...opts });
  if (typeof obj.summary !== 'string' || !obj.summary.trim()) errors.push('summary must be a non-empty string');

  // 数组字段同形校验；signals ≥1，validation/avoid 空即违约
  for (const [field, arr, minimum] of [['signals', obj.signals, 1],
                                       ['validation', obj.validation, 0], ['avoid', obj.avoid, 0]]) {
    if (arr === undefined) continue;
    if (!Array.isArray(arr) || !arr.every((s) => typeof s === 'string')) {
      errors.push(`${field} must be an array of strings`);
    } else if (minimum > 0 && arr.length < minimum) {
      errors.push(`${field} must have at least ${minimum} item(s)`);
    } else if (minimum === 0 && !arr.length) {
      errors.push(`${field} must not be empty (omit the field instead)`);
    }
  }
  if (Array.isArray(obj.validation)) {
    for (const v of obj.validation) {
      if (!KEBAB_RE.test(v)) errors.push('validation entries must be kebab-case gate names');
    }
  }

  if (obj.constraints !== undefined) {
    const c = obj.constraints;
    if (!c || typeof c !== 'object' || Array.isArray(c)) {
      errors.push('constraints must be an object');
    } else {
      const ck = Object.keys(c);
      if (!ck.length) errors.push('constraints must not be empty (omit the field instead)');
      for (const k of ck) {
        if (k === 'max_files') {
          if (!Number.isInteger(c[k]) || c[k] < 1) errors.push('constraints.max_files must be a positive integer');
        } else if (k === 'forbidden_paths') {
          if (!Array.isArray(c[k]) || !c[k].every((s) => typeof s === 'string' && s.trim())) {
            errors.push('constraints.forbidden_paths must be an array of non-empty strings');
          }
        } else {
          errors.push(`unknown constraints key: ${k}`);
        }
      }
    }
  }

  return errors;
}

// 读入并校验单个基因文件。目录锚点（domain == 父目录）只约束状态基因目录内的落盘位置；
// solidify 的候选文件可放在其外（入档位置由 solidify 决定），故可关。
// validation ⊆ 白名单的检查单源在 evaluate.evaluateGeneObj，此处不重复。
function readGene(filePath: string, opts: { skipDirAnchor?: boolean } = {}) {
  return readProtocolFile(filePath, { noun: 'gene', skipDirAnchor: opts.skipDirAnchor, validate: validateGene });
}

// 扫描基因目录（P1 无 manifest——engine 直接扫目录，schema ADR S1）。
// 只认域子目录下一层；返回 [{ path, ref, obj }]，目录不存在或为空返回空数组。
// P2 合并扫描：缓存 <repoRoot>/.noogenesis/genes-cache/.noogenesis/genes（银行仓浅克隆）
// 在场即并入扫描根——只读路径（select/propose）经此消费共享基因；同名 ref 本仓
// 优先（先扫本仓、缓存同 ref 丢弃，不报错）。写路径（solidify/evaluate）不走本函数
// 的缓存分支（evaluate 传 { cache: false }），仓库资产语义不变。
// 缓存侧坏 JSON → warn-skip（stderr 一行，exit 不红——缓存是分发副本，降级离线
// 姿态，P2 ADR D7）；本仓基因目录解析失败仍 fail-closed（D5 本仓优先语义）。
function scanGenes(repoRoot: string, opts: { cache?: boolean } = {}) {
  const roots = [genesDir(repoRoot)];
  if (opts.cache !== false) {
    // 缓存 = 银行仓的浅克隆，其状态面同样在 STATE_ROOT 下。
    const cache = path.join(cacheDir(repoRoot), STATE_ROOT, 'genes');
    if (fs.existsSync(cache)) roots.push(cache);
    else if (fs.existsSync(path.join(cacheDir(repoRoot), 'genes'))) {
      // 旧布局缓存（状态面搬家前克隆，基因在克隆根 genes/）：零诊断会让离线会话静默丢缓存命中。
      process.stderr.write('engine: cache uses the pre-.noogenesis layout; run engine pull to refresh it\n');
    }
  }
  const out: { path: string; ref: string; obj: any }[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const ent of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      // 基因目录下只认域子目录；散文件无视（入档闸拦其协议面）
      if (!ent.isDirectory()) continue;
      for (const f of fs.readdirSync(path.join(root, ent.name), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
        if (!f.isFile() || !f.name.endsWith('.json')) continue;
        const ref = `${ent.name}/${f.name.slice(0, -5)}`;
        if (seen.has(ref)) continue;
        const p = path.join(root, ent.name, f.name);
        let obj;
        try {
          obj = readGene(p);
        } catch (e) {
          if (root === roots[0]) throw e;
          process.stderr.write(`engine: cache gene skipped (unparseable): ${p}\n`);
          continue;
        }
        seen.add(ref);
        out.push({ path: p, ref, obj });
      }
    }
  }
  return out;
}

function genePath(repoRoot: string, domain: string, id: string) {
  return path.join(genesDir(repoRoot), domain, id + '.json');
}

export { validateGene, readGene, scanGenes, genePath };