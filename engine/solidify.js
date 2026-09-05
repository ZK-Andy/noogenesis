'use strict';
// solidify.js — 入档闸（骨架 ADR D4 + schema ADR S2）：evaluate 全绿才落 genes/，
// genes/ 变更与 events/ 追加行放同一 commit（原子证据：基因更替与审计记录不可分离）。
// gene_sha = 基因文件字节内容的 SHA-256（内容寻址锚点，落 Event 不进文件名）。

const fs = require('fs');
const path = require('path');
const { EngineError, EVENT_KINDS, sha256Hex, git } = require('./util');
const { loadGates } = require('./gates');
const { readGene, genePath } = require('./gene');
const { evaluateGeneObj, formatReport } = require('./evaluate');

function eventsPath(repoRoot, ts) {
  const vol = ts.slice(0, 7); // YYYY-MM，月卷与 journal 同节奏
  return path.join(repoRoot, 'events', `${vol}.jsonl`);
}

function appendEvent(repoRoot, ev) {
  const p = eventsPath(repoRoot, ev.ts);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, JSON.stringify(ev) + '\n', 'utf8');
  return p;
}

function commitPaths(repoRoot, paths, msg) {
  const r1 = git(repoRoot, ['add', '--', ...paths]);
  if (r1.code !== 0) throw new EngineError(`git add failed: ${r1.stderr.trim()}`);
  const r2 = git(repoRoot, ['commit', '-m', msg, '--', ...paths]);
  if (r2.code !== 0) throw new EngineError(`git commit failed: ${r2.stderr.trim()}`);
}

function redReason(ev) {
  const parts = [];
  if (ev.violations.length) parts.push(`constraints: ${ev.violations.join('; ')}`);
  for (const r of ev.results) {
    if (r.code !== 0) parts.push(`${r.name} exit ${r.code}`);
  }
  return parts.join('; ') || 'unknown';
}

// add/update：候选文件须以 <id>.json 命名（ID=文件名锚点对候选同样生效）。
function solidify(repoRoot, engineRoot, candidatePath, actor) {
  if (!actor || !actor.trim()) throw new EngineError('solidify requires --actor <name> (audit trail)');
  actor = actor.trim();

  const gates = loadGates(engineRoot, repoRoot); // fail-closed 先行
  const gene = readGene(candidatePath, { gateNames: new Set(gates.byName.keys()), skipDirAnchor: true });
  const target = genePath(repoRoot, gene.domain, gene.id);
  const kind = fs.existsSync(target) ? 'gene.updated' : 'gene.added';

  // 候选未落盘：直接评估候选对象（约束对照出账变更面，与文件位置无关）。
  const ref = `${gene.domain}/${gene.id}`;
  const ev = evaluateGeneObj(repoRoot, engineRoot, gene, ref);
  if (!ev.ok) {
    const ts = new Date().toISOString();
    const p = appendEvent(repoRoot, {
      ts, actor, kind, gene: gene.id,
      gene_sha: sha256Hex(fs.readFileSync(candidatePath)),
      outcome: `fail: ${redReason(ev)}`,
      evidence: `rejected candidate ${candidatePath}; not placed into genes/`,
    });
    commitPaths(repoRoot, [p], `gene(${gene.domain}): reject ${gene.id} — evaluate red`);
    return {
      ok: false,
      report: formatReport(ev) + `solidify: REJECTED — fail event appended to ${path.relative(repoRoot, p)}; candidate NOT placed\n`,
    };
  }

  const content = Buffer.from(JSON.stringify(gene, null, 2) + '\n', 'utf8');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  const sha = sha256Hex(content);

  const ts = new Date().toISOString();
  const evp = appendEvent(repoRoot, {
    ts, actor, kind, gene: gene.id, gene_sha: sha, outcome: 'ok',
    evidence: `evaluate ok: ${ev.results.length}/${ev.results.length} gates green`,
  });
  commitPaths(repoRoot, [target, evp], `gene(${gene.domain}): ${kind === 'gene.added' ? 'add' : 'update'} ${gene.id}`);
  return { ok: true, report: formatReport(ev) + `solidify: ${kind} ${gene.domain}/${gene.id} (sha ${sha.slice(0, 12)}…)\n` };
}

// retire：从 genes/ 删除 + gene.retired 事件（gene_sha = 退役时最后内容 SHA）；git 历史仍可溯。
// 退役不引入前沿内容，无需 evaluate（入档闸只守新增/更新）。
function retire(repoRoot, engineRoot, ref, actor) {
  if (!actor || !actor.trim()) throw new EngineError('retire requires --actor <name> (audit trail)');
  const [domain, id] = ref.split('/');
  if (!domain || !id) throw new EngineError('retire ref must be <domain>/<id>');
  const target = genePath(repoRoot, domain, id);
  if (!fs.existsSync(target)) throw new EngineError(`cannot retire: ${ref} not in genes/`);
  const sha = sha256Hex(fs.readFileSync(target));
  fs.unlinkSync(target);
  const ts = new Date().toISOString();
  const evp = appendEvent(repoRoot, {
    ts, actor: actor.trim(), kind: 'gene.retired', gene: id, gene_sha: sha, outcome: 'ok',
    evidence: `retired from genes/; content recoverable from git history`,
  });
  commitPaths(repoRoot, [target, evp], `gene(${domain}): retire ${id}`);
  return { ok: true, report: `retire: gene.retired ${ref} (last sha ${sha.slice(0, 12)}…)\n` };
}

module.exports = { solidify, retire, appendEvent, eventsPath };
