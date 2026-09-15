// distill.ts — 蒸馏命令面（批次 6 序 30 ADR；边界单源 = [P1 D3 重拍 ADR] Decision 2/3）：
// 引擎只做确定性面——失败面汇编（collect，只读）与候选落盘（add/show）；「失败压缩成基因」
// 的归纳步在宿主侧（人/会话代理策展），引擎不产基因内容、不接 LLM。候选 = 基因形落
// candidates/，不发事件、不进 select 扫描；入档仍走既有 solidify 闸。

import * as fs from 'fs';
import * as path from 'path';
import { EngineError, KEBAB_RE } from './util.js';
import { readGene } from './gene.js';
import { renderGene } from './propose.js';
import { protocolPath, assertProtocolIdUnique } from './protocol.js';

const CANDIDATES_DIR = 'candidates';

// ---- collect：失败面汇编（只读） -------------------------------------------

// 三类面（序 30 ADR Decision 1/4，范围单源 = 重拍 ADR Decision 2 点名集）：
//   events/*.jsonl 的 outcome=fail 行（入档失败带拒因）；
//   capsules/ 的 outcome.status=fail；
//   genes/ 各基因的 avoid 字段（失败面压缩的既有家）。
// 观测面（.noogenesis/observations/）不进 collect——gitignored 可丢弃权重面，非失败档案。

function collectEventFails(repoRoot: string): { ref: string; evidence: string }[] {
  const dir = path.join(repoRoot, 'events');
  if (!fs.existsSync(dir)) return [];
  const out: { ref: string; evidence: string }[] = [];
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.endsWith('.jsonl')) continue;
    const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (!line) continue;
      let ev: any;
      try {
        ev = JSON.parse(line);
      } catch {
        throw new EngineError(`${f}:${i + 1}: not valid JSON`);
      }
      // 事件 outcome 形态 = "ok" | "fail: <reason>"（S2）——前缀判 fail，拒因取余串
      if (typeof ev.outcome === 'string' && ev.outcome.startsWith('fail')) {
        out.push({
          ref: `${f}:${i + 1}`,
          evidence: `kind=${ev.kind ?? '?'} target=${ev.gene ?? ev.capsule ?? ev.mutation ?? '?'} reason=${ev.outcome === 'fail' ? (ev.evidence ?? '(no reason)') : ev.outcome.slice('fail: '.length)}`,
        });
      }
    }
  }
  return out;
}

function collectCapsuleFails(repoRoot: string): { ref: string; evidence: string }[] {
  const root = path.join(repoRoot, 'capsules');
  if (!fs.existsSync(root)) return [];
  const out: { ref: string; evidence: string }[] = [];
  for (const ent of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
    if (!ent.isDirectory()) continue;
    for (const f of fs.readdirSync(path.join(root, ent.name)).sort()) {
      if (!f.endsWith('.json')) continue;
      const raw = fs.readFileSync(path.join(root, ent.name, f), 'utf8');
      let obj: any;
      try {
        obj = JSON.parse(raw);
      } catch {
        throw new EngineError(`capsules/${ent.name}/${f}: not valid JSON`);
      }
      if (obj?.outcome?.status === 'fail') {
        out.push({
          ref: `capsule ${ent.name}/${f.slice(0, -5)}`,
          evidence: `trigger=${obj.trigger ?? '?'} reason=${obj.outcome.reason ?? '(no reason)'}`,
        });
      }
    }
  }
  return out;
}

function collectGeneAvoids(repoRoot: string): { ref: string; evidence: string }[] {
  const root = path.join(repoRoot, 'genes');
  if (!fs.existsSync(root)) return [];
  const out: { ref: string; evidence: string }[] = [];
  for (const ent of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
    if (!ent.isDirectory()) continue;
    for (const f of fs.readdirSync(path.join(root, ent.name)).sort()) {
      if (!f.endsWith('.json')) continue;
      const raw = fs.readFileSync(path.join(root, ent.name, f), 'utf8');
      let obj: any;
      try {
        obj = JSON.parse(raw);
      } catch {
        throw new EngineError(`genes/${ent.name}/${f}: not valid JSON`);
      }
      if (Array.isArray(obj.avoid) && obj.avoid.length) {
        for (const a of obj.avoid) {
          out.push({ ref: `gene ${ent.name}/${f.slice(0, -5)}`, evidence: String(a) });
        }
      }
    }
  }
  return out;
}

// 汇编输出：按面分组、组内按落盘序（事件行 = 月卷内时间序、目录面 = 字典序），确定性逐字输出（self-test 金样）。
function collect(repoRoot: string): string {
  const groups: [string, { ref: string; evidence: string }[]][] = [
    ['events (outcome=fail)', collectEventFails(repoRoot)],
    ['capsules (outcome=fail)', collectCapsuleFails(repoRoot)],
    ['genes (avoid)', collectGeneAvoids(repoRoot)],
  ];
  const lines: string[] = [];
  for (const [title, rows] of groups) {
    lines.push(`== ${title} (${rows.length})`);
    for (const r of rows) lines.push(`- ${r.ref}: ${r.evidence}`);
    lines.push('');
  }
  lines.push('distill: compression happens on the host side — curate a gene-shaped candidate, then `distill add` it (archived later via solidify).');
  return lines.join('\n') + '\n';
}

// ---- add / show：候选落盘与读取 --------------------------------------------

function candidatePath(repoRoot: string, domain: string, id: string) {
  return protocolPath(repoRoot, CANDIDATES_DIR, domain, id);
}

// 候选落盘：读入即以 gene 校验器验形（八字段封闭 schema，skipDirAnchor——源文件可放
// staging 任意处），再校验 signals/strategy 与闸同判据，落 candidates/<domain>/<id>.json。
// 零事件、零 git commit——候选是草稿不是档案（序 30 ADR Decision 1）；重名拒覆盖
// （fail-closed，改稿 = 显式删后重加）。
function addCandidate(repoRoot: string, candidateFile: string): { report: string; ok: boolean } {
  const obj = readGene(candidateFile, { skipDirAnchor: true });
  // validateGene 对缺席数组宽松（引擎面可选）；候选要与 genes/ 闸同判据：
  // signals/strategy 缺席即拒（否则候选过不了 verify-gene-format，solidify 必红）。
  for (const field of ['signals', 'strategy']) {
    const v = obj[field];
    if (!Array.isArray(v) || !v.length || !v.every((s: unknown) => typeof s === 'string' && s.trim())) {
      throw new EngineError(`${candidateFile}: ${field} must be a non-empty string array (candidates mirror the genes/ gate)`);
    }
  }
  if (!KEBAB_RE.test(obj.domain)) throw new EngineError(`domain must be kebab-case, got ${JSON.stringify(obj.domain)}`);
  const dest = candidatePath(repoRoot, obj.domain, obj.id);
  if (fs.existsSync(dest)) {
    throw new EngineError(`candidate already exists: candidates/${obj.domain}/${obj.id}.json — delete it explicitly to re-add`);
  }
  assertProtocolIdUnique(repoRoot, CANDIDATES_DIR, 'candidate', obj.domain, obj.id);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  return {
    report: `distill: candidate staged at candidates/${obj.domain}/${obj.id}.json (not a gene — archive via solidify after curation)\n`,
    ok: true,
  };
}

function showCandidate(repoRoot: string, domain: string, id: string): string {
  return renderGene(readGene(candidatePath(repoRoot, domain, id)));
}

export { collect, addCandidate, showCandidate, candidatePath, CANDIDATES_DIR };
