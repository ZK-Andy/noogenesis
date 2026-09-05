'use strict';
// gene.js — Gene 落盘协议（schema ADR S1）：八字段封闭 schema、目录锚点、ID=文件名、白名单子集。

const fs = require('fs');
const path = require('path');
const { EngineError, KEBAB_RE } = require('./util');

// S1 字段表：4 必选 + 3 可选（constraints/validation/avoid）+ 目录锚点 domain。
// 封闭 schema：未知顶层字段即违约。
function validateGene(obj, opts) {
  const errors = [];
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

  if (!Array.isArray(obj.signals) || !obj.signals.every((s) => typeof s === 'string')) {
    errors.push('signals must be an array of strings');
  } else if (obj.signals.length < 1) {
    errors.push('signals must have at least one key (an unselectable gene is dead weight)');
  }

  if (!Array.isArray(obj.strategy) || !obj.strategy.every((s) => typeof s === 'string')) {
    errors.push('strategy must be an array of strings');
  } else if (obj.strategy.length < 1) {
    errors.push('strategy must have at least one step');
  }

  for (const [field, arr] of [['validation', obj.validation], ['avoid', obj.avoid]]) {
    if (arr === undefined) continue;
    if (!Array.isArray(arr) || !arr.every((s) => typeof s === 'string')) {
      errors.push(`${field} must be an array of strings`);
    } else if (!arr.length) {
      errors.push(`${field} must not be empty (omit the field instead)`);
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

// 读入并校验单个基因文件；gatesNames 用于 validation ⊆ 白名单检查（骨架 ADR D4）。
function readGene(filePath, opts = {}) {
  const fileName = path.basename(filePath);
  // 目录锚点（domain == 父目录）只约束 genes/ 内的落盘位置；
  // solidify 的候选文件可放在 genes/ 之外（入档位置由 solidify 决定），故可关闭。
  const parentDir = opts.skipDirAnchor ? null : path.basename(path.dirname(filePath));
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    throw new EngineError(`cannot read gene file ${filePath}: ${e.message}`);
  }
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    throw new EngineError(`${filePath}: not valid JSON: ${e.message}`);
  }
  const errors = validateGene(obj, { fileName, parentDir });
  if (obj && Array.isArray(obj.validation) && opts.gateNames) {
    for (const v of obj.validation) {
      if (!opts.gateNames.has(v)) errors.push(`validation entry '${v}' is not in the whitelist`);
    }
  }
  if (errors.length) throw new EngineError(`${filePath}: ${errors.join('; ')}`);
  return obj;
}

// 扫描 genes/ 目录（P1 无 manifest——engine 直接扫目录，schema ADR S1）。
// 返回 [{ path, obj }]；目录不存在或为空返回空数组（调用方决定是否视为错误）。
function scanGenes(repoRoot, opts = {}) {
  const root = path.join(repoRoot, 'genes');
  const out = [];
  if (!fs.existsSync(root)) return out;
  const gateNames = opts.gateNames || null;
  for (const ent of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
    if (!ent.isDirectory()) continue; // genes/ 下只认域子目录；散文件无视
    for (const f of fs.readdirSync(path.join(root, ent.name), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      if (!f.isFile() || !f.name.endsWith('.json')) continue;
      const p = path.join(root, ent.name, f.name);
      out.push({ path: p, ref: `${ent.name}/${f.name.slice(0, -5)}`, obj: readGene(p, { gateNames }) });
    }
  }
  return out;
}

function genePath(repoRoot, domain, id) {
  return path.join(repoRoot, 'genes', domain, `${id}.json`);
}

module.exports = { validateGene, readGene, scanGenes, genePath };
