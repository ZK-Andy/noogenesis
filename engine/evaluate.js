'use strict';
// evaluate.js — 保守评估（骨架 ADR D4）：gates.json 全集作为入档门槛；红即拒，无豁免。
// 入档条件 = 门禁全绿，仅此一条——文档域"前沿单调不降"的可执行形态。

const { run, deriveSlots, changedPaths, pathUnder } = require('./util');
const { EngineError } = require('./util');
const { loadGates, instantiate } = require('./gates');
const { scanGenes } = require('./gene');
const { resolveGeneRef } = require('./propose');

// 约束检查（schema ADR S1 constraints 字段）对照当前出账变更面。
function checkConstraints(gene, changed) {
  const violations = [];
  const c = gene.constraints || {};
  if (c.max_files !== undefined && changed.length > c.max_files) {
    violations.push(`max_files ${c.max_files} exceeded: outgoing set has ${changed.length} files`);
  }
  for (const fp of c.forbidden_paths || []) {
    for (const p of changed) {
      if (pathUnder(p, fp)) violations.push(`forbidden_paths: ${p} is under ${fp}/`);
    }
  }
  return violations;
}

// 白名单子集检查单源在此（R1 收口）：readGene/scanGenes 不再重复。
function evaluateGeneObj(repoRoot, engineRoot, gene, ref) {
  const gates = loadGates(engineRoot, repoRoot);
  if (Array.isArray(gene.validation)) {
    for (const v of gene.validation) {
      if (!gates.byName.has(v)) throw new EngineError(`validation entry '${v}' is not in the whitelist — fail-closed`);
    }
  }
  const slots = deriveSlots(repoRoot);
  const changed = changedPaths(repoRoot, slots);
  const violations = checkConstraints(gene, changed);

  const results = [];
  for (const g of gates.gates) {
    const inst = instantiate(g, slots);
    const r = run(inst.cmd, inst.args, repoRoot);
    const out = (r.stderr || r.stdout).trim();
    results.push({
      name: g.name,
      code: r.code,
      tail: out ? out.split('\n').slice(-4).join('\n').slice(0, 600) : '',
    });
  }
  const ok = !violations.length && results.every((r) => r.code === 0);
  return { ok, gene, ref, violations, results, changedCount: changed.length };
}

// 按 ref 评估已入档基因（loadGates 仅一次——在 evaluateGeneObj 内）。
function evaluateGene(repoRoot, engineRoot, geneRef) {
  const genes = scanGenes(repoRoot);
  const hit = resolveGeneRef(repoRoot, geneRef, genes);
  return evaluateGeneObj(repoRoot, engineRoot, hit.obj, hit.ref);
}

function formatReport(ev) {
  const lines = [];
  lines.push(`evaluate ${ev.ref}: ${ev.ok ? 'OK' : 'FAIL'}`);
  lines.push(`outgoing files: ${ev.changedCount}`);
  if (ev.violations.length) {
    lines.push('constraints:');
    for (const v of ev.violations) lines.push(`  ✗ ${v}`);
  }
  lines.push('gates:');
  for (const r of ev.results) {
    lines.push(`  ${r.code === 0 ? 'ok' : '✗ FAIL'}  ${r.name}${r.code === 0 ? '' : ` (exit ${r.code})`}`);
    if (r.code !== 0 && r.tail) lines.push(r.tail.split('\n').map((l) => `      ${l}`).join('\n'));
  }
  return lines.join('\n') + '\n';
}

module.exports = { evaluateGene, evaluateGeneObj, checkConstraints, formatReport };
