// list.ts — 只读盘点面（批次 9 序 44 命令面 ADR D1）：状态 genes / capsules / mutations
// 三资产面的一次性确定性枚举，stdout 纯文本、字典序；读路径零写零事件（运行不记
// 事件与 select 同款纪律）。缓存基因行带 (cache) 后缀标记（pull 的只读分发副本，
// 与本仓可入档基因分野口径同 engine/AGENTS「缓存只读」条）。
import * as fs from 'fs';
import * as path from 'path';
import { scanGenes } from './gene.js';
import { cacheDir, capsulesDir, mutationsDir, STATE_ROOT } from './state.js';

// 单行格式：<kind> <domain>/<id>[(cache)]——机器可 Split 的稳定两列，供
// 适配层 /evolve list 与人读共用；列语义改动即改合同面 README 节。
function runList(repoRoot: string): { code: 0; report: string } {
  const cacheRoot = path.join(cacheDir(repoRoot), STATE_ROOT, 'genes');
  const lines: string[] = [];
  const genes = scanGenes(repoRoot);
  lines.push(`genes: ${genes.length}`);
  for (const gene of genes) lines.push(`gene ${gene.ref}${gene.path.startsWith(cacheRoot) ? ' (cache)' : ''}`);
  for (const [kind, root] of [['capsule', capsulesDir(repoRoot)], ['mutation', mutationsDir(repoRoot)]] as const) {
    const ids: string[] = [];
    if (fs.existsSync(root)) {
      for (const ent of fs.readdirSync(root, { withFileTypes: true }).sort((a: any, b: any) => a.name < b.name ? -1 : 1)) {
        if (!ent.isDirectory()) continue;
        for (const f of fs.readdirSync(path.join(root, ent.name), { withFileTypes: true }).sort((a: any, b: any) => a.name < b.name ? -1 : 1)) {
          if (f.isFile() && f.name.endsWith('.json')) ids.push(path.join(ent.name, f.name.slice(0, -5)));
        }
      }
    }
    lines.push(`${kind}s: ${ids.length}`);
    for (const id of ids) lines.push(`${kind} ${id.replace(path.sep, '/')}`);
  }
  return { code: 0, report: lines.join('\n') + '\n' };
}

export { runList };