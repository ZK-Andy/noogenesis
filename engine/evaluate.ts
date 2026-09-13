// evaluate.ts — 保守评估（骨架 ADR D4）：gates.json 全集作为入档门槛；红即拒，无豁免。
// 入档条件 = 门禁全绿，仅此一条——文档域"前沿单调不降"的可执行形态。
// 改动面度量（批次 1 序 4）：blast-radius（文件 / 行 / 范围）与 constraints 同源于一次度量。

import { run, deriveSlots, blastRadius, pathUnder, EngineError, type BlastRadius } from './util.js';
import { loadGates, instantiate } from './gates.js';
import { scanGenes } from './gene.js';
import { resolveGeneRef } from './propose.js';

// 约束检查（schema ADR S1 constraints 字段）对照本次改动面度量：max_files 取度量文件数，
// forbidden_paths 走度量的同一路径集（批次 1 序 4 ADR B2——单源，不再各数一遍出账集）。
function checkConstraints(gene: any, blast: BlastRadius): string[] {
  const violations: string[] = [];
  const c = gene.constraints || {};
  if (c.max_files !== undefined && blast.files > c.max_files) {
    violations.push(`max_files ${c.max_files} exceeded: outgoing set has ${blast.files} files`);
  }
  for (const fp of c.forbidden_paths || []) {
    for (const p of blast.paths) {
      if (pathUnder(p, fp)) violations.push(`forbidden_paths: ${p} is under ${fp}/`);
    }
  }
  return violations;
}

// 失败报告只取尾部（门禁输出头部长且与根因无关；4 行/600 字符截断足够定位）。
const TAIL_LINES = 4;
const TAIL_CHARS = 600;

// 白名单子集检查单源在此：readGene/scanGenes 不再重复。
function evaluateGeneObj(repoRoot: string, engineRoot: string, gene: any, ref: string) {
  const gates = loadGates(engineRoot, repoRoot);
  if (Array.isArray(gene.validation)) {
    for (const v of gene.validation) {
      if (!gates.byName.has(v)) throw new EngineError(`validation entry '${v}' is not in the whitelist — fail-closed`);
    }
  }
  const slots = deriveSlots(repoRoot);
  const blast = blastRadius(repoRoot, slots);
  const violations = checkConstraints(gene, blast);

  const results: { name: any; code: number; tail: string }[] = [];
  for (const g of gates.gates) {
    const inst = instantiate(g, slots);
    const r = run(inst.cmd, inst.args, repoRoot);
    let out = (r.stderr || r.stdout).trim();
    // code = -1 = spawn 失败（二进制缺失等）——stderr 常为空，根因只在 spawnError；
    // 不并入报告则调用方只看到 exit -1 零诊断。
    if (r.code === -1 && r.spawnError) out = `${out ? `${out}\n` : ""}spawn error: ${r.spawnError}`;
    results.push({
      name: g.name,
      code: r.code,
      // 字符截断取尾部（slice(-N)）：根因行追加在输出末尾——保头会把要保的根因切掉。
      tail: out ? out.split('\n').slice(-TAIL_LINES).join('\n').slice(-TAIL_CHARS) : '',
    });
  }
  const ok = !violations.length && results.every((r) => r.code === 0);
  return { ok, gene, ref, violations, results, blast };
}

// 按 ref 评估已入档基因（loadGates 仅一次——在 evaluateGeneObj 内）。
// 评估恒以本仓 genes/ 为对象（P2 ADR D6）：缓存基因只读不可评估，cache 关闭。
function evaluateGene(repoRoot: string, engineRoot: string, geneRef: string) {
  const genes = scanGenes(repoRoot, { cache: false });
  const hit = resolveGeneRef(repoRoot, geneRef, genes);
  return evaluateGeneObj(repoRoot, engineRoot, hit.obj, hit.ref);
}

// blast-radius 一行：files / 行 churn（+added/-deleted）/ 顶层段分布；零变更时 scope 记 `-`。
function formatBlast(blast: BlastRadius): string {
  const scope = blast.scope.length ? blast.scope.map((s) => `${s.dir}(${s.files})`).join(', ') : '-';
  return `blast radius: files ${blast.files}, lines +${blast.added}/-${blast.deleted}, scope ${scope}`;
}

function formatReport(ev: ReturnType<typeof evaluateGeneObj>) {
  const lines: string[] = [];
  lines.push(`evaluate ${ev.ref}: ${ev.ok ? 'OK' : 'FAIL'}`);
  lines.push(formatBlast(ev.blast));
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

export { evaluateGene, evaluateGeneObj, checkConstraints, formatReport };
