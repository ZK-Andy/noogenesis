// propose.ts — 确定性渲染器（骨架 ADR D3）：gene → 注入文本，同输入必同输出。
// 边界写死：propose 永不产生新基因、不触 LLM、零网络——只把已入档基因渲染为紧凑控制信号块。

import { EngineError } from './util.js';

// 金样渲染（self-test 以精确字符串断言锁定；改这里必须同轮改金样）。
function renderGene(gene: any) {
  const L: string[] = [];
  L.push(`[noo-gene ${gene.domain}/${gene.id}] ${gene.summary}`);
  L.push('');
  L.push('strategy:');
  gene.strategy.forEach((s: string, i: number) => L.push(`${i + 1}. ${s}`));
  if (gene.constraints) {
    L.push('');
    L.push('constraints:');
    if (gene.constraints.max_files !== undefined) L.push(`- max_files: ${gene.constraints.max_files}`);
    if (gene.constraints.forbidden_paths) L.push(`- forbidden_paths: ${gene.constraints.forbidden_paths.join(', ')}`);
  }
  if (gene.avoid && gene.avoid.length) {
    L.push('');
    L.push('avoid:');
    for (const a of gene.avoid) L.push(`- ${a}`);
  }
  return L.join('\n') + '\n';
}

function resolveGeneRef(repoRoot: string, ref: string, genes: { path: string; ref: string; obj: any }[]) {
  let hit: { path: string; ref: string; obj: any } | null = null;
  if (ref.includes('/')) {
    hit = genes.find((g) => g.ref === ref) || null;
  } else {
    const matches = genes.filter((g) => g.ref.split('/')[1] === ref);
    if (matches.length > 1) {
      throw new EngineError(`ambiguous gene id '${ref}': ${matches.map((m) => m.ref).join(', ')} — use domain/id`);
    }
    hit = matches[0] || null;
  }
  if (!hit) throw new EngineError(`gene not found: ${ref}`);
  return hit;
}

export { renderGene, resolveGeneRef };
