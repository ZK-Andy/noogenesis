'use strict';
// gates.js — 验证白名单装载（fail-closed）。载体与安全模型：schema ADR S3。
// 白名单缺失 / 格式坏 / 条目脚本不存在 → 抛错拒跑，不静默退化。

const fs = require('fs');
const path = require('path');
const { EngineError, KEBAB_RE } = require('./util');

// 载入并结构校验 gates.json。repoRoot 用于条目脚本存在性校验（引用 scripts/** 的实存文件）。
function loadGates(engineRoot, repoRoot) {
  const p = path.join(engineRoot, 'gates.json');
  let raw;
  try {
    raw = fs.readFileSync(p, 'utf8');
  } catch (e) {
    throw new EngineError(`gates.json missing/unreadable (${p}) — fail-closed, refusing to evaluate`);
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (e) {
    throw new EngineError(`gates.json is not valid JSON — fail-closed: ${e.message}`);
  }
  const errors = [];
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) errors.push('root must be an object');
  if (doc && (!Number.isInteger(doc.version) || doc.version < 1)) errors.push('version must be a positive integer');
  const gates = doc && doc.gates;
  if (!Array.isArray(gates) || !gates.length) errors.push('gates must be a non-empty array');
  const byName = new Map();
  for (const g of Array.isArray(gates) ? gates : []) {
    if (!g || typeof g !== 'object') { errors.push('gate entry must be an object'); continue; }
    if (typeof g.name !== 'string' || !KEBAB_RE.test(g.name)) errors.push(`gate name not kebab-case: ${JSON.stringify(g.name)}`);
    if (byName.has(g.name)) errors.push(`duplicate gate name: ${g.name}`);
    if (typeof g.cmd !== 'string' || !g.cmd.trim()) errors.push(`gate ${g.name}: cmd must be a non-empty string`);
    if (!Array.isArray(g.args) || !g.args.every((a) => typeof a === 'string')) errors.push(`gate ${g.name}: args must be an array of strings`);
    byName.set(g.name, g);
    // 条目脚本存在性：args 中引用的 scripts/** 路径必须在仓根实存（防漂移）。
    for (const a of Array.isArray(g.args) ? g.args : []) {
      if (typeof a === 'string' && a.startsWith('scripts/') && !fs.existsSync(path.join(repoRoot, a))) {
        errors.push(`gate ${g.name}: referenced script does not exist: ${a}`);
      }
    }
  }
  if (errors.length) throw new EngineError(`gates.json invalid — fail-closed:\n  ${errors.join('\n  ')}`);
  return { version: doc.version, gates, byName };
}

// 参数槽替换（骨架 ADR D4：白名单条目允许上下文参数槽，取值仅由引擎注入）。
function instantiate(gate, slots) {
  return {
    name: gate.name,
    cmd: gate.cmd,
    args: gate.args.map((a) => a.replace(/\{\{\s*outgoing_base\s*\}\}/g, slots.outgoing_base)
                                  .replace(/\{\{\s*head\s*\}\}/g, slots.head)),
  };
}

module.exports = { loadGates, instantiate };
