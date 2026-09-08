// select.ts — 信号 → 基因 机械匹配（骨架 ADR D2）：显式喂入、归一化后字面精确匹配、多键取并集。
// Detect 不进引擎：信号发现的判断在人/流程卡侧，引擎只做匹配。

import { normalizeSignal } from './util.js';
import { scanGenes } from './gene.js';

// 返回命中 [{ ref, gene }]；signals: 原始键数组（内部归一化）。
function selectGenes(repoRoot: string, signals: string[], opts: { cache?: boolean } = {}) {
  const keys = [...new Set(signals.map(normalizeSignal).filter((s) => s.length))];
  if (!keys.length) return { keys, hits: [] };
  const genes = scanGenes(repoRoot, opts);
  const hits = genes.filter((g) => {
    const sigSet = new Set(g.obj.signals.map(normalizeSignal));
    return keys.some((k) => sigSet.has(k));
  });
  return { keys, hits };
}

// stdout 面是宿主会话的唯一消费形态：每行 `<domain>/<id>  <summary>`。
function formatHits(hits: { path: string; ref: string; obj: any }[]) {
  return hits.map((h) => `${h.ref}  ${h.obj.summary}`);
}

function runSelect(repoRoot: string, argv: string[], opts: { cache?: boolean } = {}) {
  const { keys, hits } = selectGenes(repoRoot, argv, opts);
  const lines = hits.length ? formatHits(hits) : ['(no genes matched)'];
  return { code: 0, stdout: [`signals: ${keys.length ? keys.join(' | ') : '(none)'}`, ...lines].join('\n') + '\n', hits, keys };
}

export { selectGenes, formatHits, runSelect };
