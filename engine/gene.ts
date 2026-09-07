// gene.ts — Gene 落盘协议（schema ADR S1）：八字段封闭 schema、目录锚点、ID=文件名、白名单子集。

import * as fs from 'fs';
import * as path from 'path';
import { EngineError, KEBAB_RE } from './util.js';

// S1 字段表：4 必选 + 3 可选（constraints/validation/avoid）+ 目录锚点 domain。
// 封闭 schema：未知顶层字段即违约。
// obj 保持 any（不可信 JSON 面，逐字段运行时守卫——机械移植原 js 的鸭子校验）。
function validateGene(obj: any, opts: { fileName: string; parentDir: string | null }) {
  const errors: string[] = [];
  const { fileName, parentDir } = opts;
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return ['gene must be a JSON object'];
  }
  const known = new Set(['id', 'domain', 'summary', 'signals', 'strategy', 'constraints', 'validation', 'avoid']);
  for (const k of Object.keys(obj)) {
    if (!known.has(k)) errors.push(`unknown field: ${k}`);
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
  if (typeof obj.summary !== 'string' || !obj.summary.trim()) errors.push('summary must be a non-empty string');

  // 数组字段同形校验；signals/strategy ≥1，validation/avoid 空即违约
  for (const [field, arr, minimum] of [['signals', obj.signals, 1], ['strategy', obj.strategy, 1],
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
      if (!KEBAB_RE.test(v)) errors.push(`validation entries must be kebab-case gate names`);
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

// 读入并校验单个基因文件。目录锚点（domain == 父目录）只约束 genes/ 内的落盘位置；
// solidify 的候选文件可放在 genes/ 之外（入档位置由 solidify 决定），故可关。
// validation ⊆ 白名单的检查单源在 evaluate.evaluateGeneObj，此处不重复。
function readGene(filePath: string, opts: { skipDirAnchor?: boolean } = {}) {
  const fileName = path.basename(filePath);
  const parentDir = opts.skipDirAnchor ? null : path.basename(path.dirname(filePath));
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    throw new EngineError(`cannot read gene file ${filePath}: ${(e as Error).message}`);
  }
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    throw new EngineError(`${filePath}: not valid JSON: ${(e as Error).message}`);
  }
  const errors = validateGene(obj, { fileName, parentDir });
  if (errors.length) throw new EngineError(`${filePath}: ${errors.join('; ')}`);
  return obj;
}

// P2 缓存落点单源（简化收口 R1-S4）：pull.js 与合并扫描共用此事实。
function defaultCacheDir(repoRoot: string) {
  return path.join(repoRoot, '.noogenesis', 'genes-cache');
}

// 扫描 genes/ 目录（P1 无 manifest——engine 直接扫目录，schema ADR S1）。
// 只认域子目录下一层；返回 [{ path, ref, obj }]，目录不存在或为空返回空数组。
// P2 合并扫描（A/A/A 拍板）：<repoRoot>/.noogenesis/genes-cache/genes（基因库缓存）
// 在场即并入扫描根——只读路径（select/propose）经此消费共享基因；同名 ref 本仓
// 优先（先扫本仓、缓存同 ref 丢弃，不报错）。写路径（solidify/evaluate）不走本函数
// 的缓存分支（evaluate 传 { cache: false }），仓库资产语义不变。
// 缓存侧坏 JSON → warn-skip（stderr 一行，exit 不红——缓存是分发副本，降级离线
// 姿态，P2 ADR D7）；本仓 genes/ 解析失败仍 fail-closed（D5 本仓优先语义）。
function scanGenes(repoRoot: string, opts: { cache?: boolean } = {}) {
  const roots = [path.join(repoRoot, 'genes')];
  if (opts.cache !== false) {
    const cache = path.join(defaultCacheDir(repoRoot), 'genes');
    if (fs.existsSync(cache)) roots.push(cache);
  }
  const out: { path: string; ref: string; obj: any }[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const ent of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      if (!ent.isDirectory()) continue; // genes/ 下只认域子目录；散文件无视（第十门禁拦其协议面）
      for (const f of fs.readdirSync(path.join(root, ent.name), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
        if (!f.isFile() || !f.name.endsWith('.json')) continue;
        const ref = `${ent.name}/${f.name.slice(0, -5)}`;
        if (seen.has(ref)) continue; // 本仓优先：缓存同名 ref 被遮蔽
        const p = path.join(root, ent.name, f.name);
        let obj;
        try {
          obj = readGene(p);
        } catch (e) {
          if (root === roots[0]) throw e; // 本仓侧 fail-closed
          process.stderr.write(`engine: cache gene skipped (unparseable): ${p}\n`);
          continue; // 缓存侧降级：跳过不红
        }
        seen.add(ref);
        out.push({ path: p, ref, obj });
      }
    }
  }
  return out;
}

function genePath(repoRoot: string, domain: string, id: string) {
  return path.join(repoRoot, 'genes', domain, `${id}.json`);
}

export { validateGene, readGene, scanGenes, genePath, defaultCacheDir };
