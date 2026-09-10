// observe.ts — 观测输入面（融合立宪 ADR D8/D10；实现 ADR 2026-09-11）：
// 事实在 git（events/ 轨，只有写得复算规则的才进），观测在本面
// （.noogenesis/observations/，gitignored、append-only、可丢弃）。
// 记忆图的边 (signal::gene)→{ok,fail,last_ts} 在读路径现算，不落盘、不进 git；
// 现算只读本面——边的事实侧身份（命中 ref 与 signal）来自本次 genes/ 扫描，
// events/ 轨不参与边计算。
// 姿态分面：写路径 fail-closed（坏记录写不进），读路径 warn-skip（坏行/坏面只丢
// 自身权重，不让 select 变红）——与 P2「缓存侧 warn-skip / 本仓 fail-closed」同构。

import * as fs from 'fs';
import * as path from 'path';
import { EngineError, normalizeSignal } from './util.js';

// 落点与 P2 缓存同属 .noogenesis/（.gitignore 整目录忽略）；月卷节奏与 events/ 同。
const OBS_SUBDIR = '.noogenesis/observations';
// evidence 是单行说明而非落盘正文：上限防单条记录失控（观测面必须保持可丢可扫）。
const EVIDENCE_MAX_CHARS = 200;
const OUTCOMES = new Set(['ok', 'fail']);
const GENE_REF_RE = /^[a-z0-9]+(-[a-z0-9]+)*\/[a-z0-9]+(-[a-z0-9]+)*$/;
const KNOWN_FIELDS = new Set(['ts', 'actor', 'signal', 'gene', 'outcome', 'evidence']);
// ts 严格限定 ISO 8601 UTC（写入端恒 `new Date().toISOString()`）：ts 会被原样
// 拼进 select 的 advice 行（stdout 契约面），宽松形状（如含空白/换行的可解析串）
// 会把一行拆成两行，让非 `advice:` 行被适配层当命中行注入常驻节。
const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function observationsDir(repoRoot: string): string {
  return path.join(repoRoot, OBS_SUBDIR);
}

// 月卷文件名 = 写入时刻的 YYYY-MM（与 events/ 月卷同切法）。
function observationPath(repoRoot: string, ts: string): string {
  return path.join(observationsDir(repoRoot), `${ts.slice(0, 7)}.jsonl`);
}

// 一条观测的校验（写路径与读路径共用单源）：返回违约清单，空即合规。
// signal 须已归一（写入端归一；读路径不替它归一——非归一键永不与查询键 join，
// 静默惰性比显式跳过更坏）。
function validateObservation(rec: any): string[] {
  const errors: string[] = [];
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return ['observation must be a JSON object'];
  for (const k of Object.keys(rec)) {
    if (!KNOWN_FIELDS.has(k)) errors.push(`unknown field: ${k}`);
  }
  if (typeof rec.ts !== 'string' || !TS_RE.test(rec.ts) || Number.isNaN(Date.parse(rec.ts))) {
    errors.push('ts must be an ISO 8601 UTC timestamp (YYYY-MM-DDTHH:MM:SS[.sss]Z)');
  }
  if (typeof rec.actor !== 'string' || !rec.actor.trim()) errors.push('actor must be a non-empty string (audit trail)');
  if (typeof rec.signal !== 'string' || !rec.signal.trim()) errors.push('signal must be a non-empty string');
  else if (rec.signal !== normalizeSignal(rec.signal)) errors.push('signal must be normalized (trimmed, lowercase, single spaces)');
  if (typeof rec.gene !== 'string' || !GENE_REF_RE.test(rec.gene)) errors.push(`gene must be a <domain>/<id> ref, got ${JSON.stringify(rec.gene)}`);
  if (typeof rec.outcome !== 'string' || !OUTCOMES.has(rec.outcome)) errors.push(`outcome must be one of ${[...OUTCOMES].join(' | ')}, got ${JSON.stringify(rec.outcome)}`);
  if (rec.evidence !== undefined) {
    if (typeof rec.evidence !== 'string' || !rec.evidence.trim()) errors.push('evidence must be a non-empty string (omit the field instead)');
    else if (rec.evidence.includes('\n')) errors.push('evidence must be a single line');
    else if (rec.evidence.length > EVIDENCE_MAX_CHARS) errors.push(`evidence must be at most ${EVIDENCE_MAX_CHARS} chars (got ${rec.evidence.length})`);
  }
  return errors;
}

// 写路径输入 → 记录：signal 在此归一（键口径单源 = normalizeSignal，派生端直接按字面 join）。
function buildObservation(input: { signal?: unknown; gene?: unknown; outcome?: unknown; actor?: unknown; evidence?: unknown; ts?: string }) {
  const rec: any = {
    ts: input.ts || new Date().toISOString(),
    actor: typeof input.actor === 'string' ? input.actor.trim() : input.actor,
    signal: normalizeSignal(input.signal),
    gene: typeof input.gene === 'string' ? input.gene.trim() : input.gene,
    outcome: input.outcome,
  };
  if (input.evidence !== undefined) rec.evidence = input.evidence;
  const errors = validateObservation(rec);
  if (errors.length) throw new EngineError(`observation rejected — fail-closed: ${errors.join('; ')}`);
  return rec;
}

// 追加一条观测（append-only；目录按需建）。落盘失败（EACCES / ENOSPC 等）转
// EngineError：observe 无红态，退出码空间恒 0/2——裸 fs 错会以崩溃形态落 exit 1，
// 而 1 在本仓合同里留给「红 / 拒入档」。
function recordObservation(repoRoot: string, input: Parameters<typeof buildObservation>[0]) {
  const rec = buildObservation(input);
  const p = observationPath(repoRoot, rec.ts);
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.appendFileSync(p, JSON.stringify(rec) + '\n', 'utf8');
  } catch (e) {
    throw new EngineError(`cannot append observation to ${path.relative(repoRoot, p)}: ${(e as Error).message}`);
  }
  return { record: rec, path: p, report: `observe: recorded ${rec.signal} :: ${rec.gene} ${rec.outcome} → ${path.relative(repoRoot, p)}\n` };
}

// 读全部观测（缺席 = 空集 = 默认零成本）。坏行跳过：每个文件至多一行 stderr 汇总，
// 不做逐行 warn（读路径每模型步都可能被 select 调用，逐行输出会刷屏）。
function readObservations(repoRoot: string) {
  const dir = observationsDir(repoRoot);
  const records: any[] = [];
  if (!fs.existsSync(dir)) return { records, skipped: 0 };
  let skipped = 0;
  let names: string[];
  try {
    // 面存在但不可列举（观测面被同名文件占位 / 无读权限）是一态降级，不是失败：
    // 读路径的第三态（裸 fs 错 → select 崩溃 exit 1 + 空 stdout）会让宿主把整个
    // 命中节静默清空，且与「读路径 warn-skip」口径矛盾。
    names = fs.readdirSync(dir).sort();
  } catch (e) {
    process.stderr.write(`engine: observation face unreadable, skipped: ${path.relative(repoRoot, dir)} (${(e as Error).message})\n`);
    return { records, skipped: 0 };
  }
  for (const name of names) {
    if (!name.endsWith('.jsonl')) continue;
    const p = path.join(dir, name);
    let text: string;
    try {
      text = fs.readFileSync(p, 'utf8');
    } catch (e) {
      skipped += 1;
      process.stderr.write(`engine: observation file unreadable, skipped: ${path.relative(repoRoot, p)} (${(e as Error).message})\n`);
      continue;
    }
    let bad = 0;
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      let parsed: any;
      try {
        parsed = JSON.parse(line);
      } catch {
        bad += 1;
        continue;
      }
      if (validateObservation(parsed).length) { bad += 1; continue; }
      records.push(parsed);
    }
    if (bad) {
      skipped += bad;
      process.stderr.write(`engine: observation file skipped ${bad} invalid line(s): ${path.relative(repoRoot, p)}\n`);
    }
  }
  return { records, skipped };
}

// 派生：只取「本次查询键 ∩ 本次命中基因」的边，按命中顺序 × 查询键顺序发射建议行。
// 排序/禁用/阈值/衰减本期判不立（无对象：命中数远低于 maxGenes 上限、样本 O(1)）——
// 判决单源 = 实现 ADR 2026-09-11 Alternatives。
function deriveAdvice(repoRoot: string, keys: string[], hits: { ref: string }[]) {
  if (!hits.length || !keys.length) return [];
  const { records } = readObservations(repoRoot);
  if (!records.length) return [];
  const wanted = new Set(keys);
  const hitRefs = new Set(hits.map((h) => h.ref));
  const edges = new Map<string, { ok: number; fail: number; last: string }>();
  for (const r of records) {
    if (!wanted.has(r.signal) || !hitRefs.has(r.gene)) continue;
    const edgeKey = `${r.signal}\u0000${r.gene}`;
    const edge = edges.get(edgeKey) || { ok: 0, fail: 0, last: '' };
    if (r.outcome === 'ok') edge.ok += 1;
    else edge.fail += 1;
    if (!edge.last || Date.parse(r.ts) > Date.parse(edge.last)) edge.last = r.ts;
    edges.set(edgeKey, edge);
  }
  if (!edges.size) return [];
  const lines: string[] = [];
  for (const h of hits) {
    for (const k of keys) {
      const edge = edges.get(`${k}\u0000${h.ref}`);
      if (edge) lines.push(`advice: ${k} :: ${h.ref}  ok=${edge.ok} fail=${edge.fail} last=${edge.last.slice(0, 10)}`);
    }
  }
  return lines;
}

export {
  validateObservation, buildObservation, recordObservation, readObservations, deriveAdvice,
  EVIDENCE_MAX_CHARS,
};
