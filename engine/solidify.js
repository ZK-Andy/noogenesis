'use strict';
// solidify.js — 入档闸（骨架 ADR D4 + schema ADR S2）：evaluate 全绿才落 genes/，
// genes/ 变更与 events/ 追加行放同一 commit（原子证据：基因更替与审计记录不可分离）。
// gene_sha = 基因文件字节内容的 SHA-256（内容寻址锚点，落 Event 不进文件名）。

const fs = require('fs');
const path = require('path');
const { EngineError, sha256Hex, git } = require('./util');
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

// 提交指定路径；失败时回滚本函数组已做的写面，不留半应用状态。
function commitPaths(repoRoot, paths, msg) {
  const r1 = git(repoRoot, ['add', '--', ...paths]);
  if (r1.code !== 0) throw new EngineError(`git add failed: ${r1.stderr.trim()}`);
  const r2 = git(repoRoot, ['commit', '-m', msg, '--', ...paths]);
  if (r2.code !== 0) throw new EngineError(`git commit failed: ${r2.stderr.trim()}`);
}

// 回滚 appendEvent：仅当文件以本行结尾时移除（不触碰并发追加的未知行）。
function rollbackAppend(p, line) {
  try {
    const text = fs.readFileSync(p, 'utf8');
    if (text.endsWith(line)) fs.writeFileSync(p, text.slice(0, -line.length), 'utf8');
  } catch (_) { /* 事件文件本就不存在则无残面 */ }
}

function redReason(ev) {
  const parts = [];
  if (ev.violations.length) parts.push(`constraints: ${ev.violations.join('; ')}`);
  for (const r of ev.results) {
    if (r.code !== 0) parts.push(`${r.name} exit ${r.code}`);
  }
  return parts.join('; ') || 'unknown';
}

// 跨树 id 唯一性：同一 id 不得在两个域并存（refs 必须无歧义）。
function assertIdUnique(repoRoot, domain, id) {
  const root = path.join(repoRoot, 'genes');
  if (!fs.existsSync(root)) return;
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name === domain) continue;
    if (fs.existsSync(path.join(root, ent.name, `${id}.json`))) {
      throw new EngineError(`gene id '${id}' already exists in domain '${ent.name}' — refs must stay unambiguous`);
    }
  }
}

// add/update：候选文件须以 <id>.json 命名（ID=文件名锚点对候选同样生效）。
function solidify(repoRoot, engineRoot, candidatePath, actor) {
  if (!actor || !actor.trim()) throw new EngineError('solidify requires --actor <name> (audit trail)');
  actor = actor.trim();

  const gene = readGene(candidatePath, { skipDirAnchor: true });
  assertIdUnique(repoRoot, gene.domain, gene.id);
  const target = genePath(repoRoot, gene.domain, gene.id);
  const kind = fs.existsSync(target) ? 'gene.updated' : 'gene.added';

  // 候选未落盘：直接评估候选对象（约束对照出账变更面，与文件位置无关）；
  // validation ⊆ 白名单的 fail-closed 检查单源在 evaluateGeneObj。
  const ref = `${gene.domain}/${gene.id}`;
  const ev = evaluateGeneObj(repoRoot, engineRoot, gene, ref);
  if (!ev.ok) {
    const ts = new Date().toISOString();
    const line = JSON.stringify({
      ts, actor, kind, gene: gene.id,
      gene_sha: sha256Hex(fs.readFileSync(candidatePath)),
      outcome: `fail: ${redReason(ev)}`,
      evidence: `rejected candidate ${candidatePath}; not placed into genes/`,
    }) + '\n';
    const p = appendEvent(repoRoot, JSON.parse(line));
    try {
      commitPaths(repoRoot, [p], `gene(${gene.domain}): reject ${gene.id} — evaluate red`);
    } catch (e) {
      rollbackAppend(p, line);
      throw e;
    }
    return {
      ok: false,
      report: formatReport(ev) + `solidify: REJECTED — fail event appended to ${path.relative(repoRoot, p)}; candidate NOT placed\n`,
    };
  }

  const content = Buffer.from(JSON.stringify(gene, null, 2) + '\n', 'utf8');
  const previous = fs.existsSync(target) ? fs.readFileSync(target) : null;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  const sha = sha256Hex(content);

  const ts = new Date().toISOString();
  const line = JSON.stringify({
    ts, actor, kind, gene: gene.id, gene_sha: sha, outcome: 'ok',
    evidence: `evaluate ok: all ${ev.results.length} gates green`,
  }) + '\n';
  const evp = appendEvent(repoRoot, JSON.parse(line));
  try {
    commitPaths(repoRoot, [target, evp], `gene(${gene.domain}): ${kind === 'gene.added' ? 'add' : 'update'} ${gene.id}`);
  } catch (e) {
    // 回滚写面：新入档删文件、更新恢复原字节、事件行移除
    if (previous === null) fs.rmSync(target, { force: true });
    else fs.writeFileSync(target, previous);
    rollbackAppend(evp, line);
    throw e;
  }
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
  const previous = fs.readFileSync(target);
  fs.unlinkSync(target);
  const ts = new Date().toISOString();
  const line = JSON.stringify({
    ts, actor: actor.trim(), kind: 'gene.retired', gene: id, gene_sha: sha, outcome: 'ok',
    evidence: 'retired from genes/; content recoverable from git history',
  }) + '\n';
  const evp = appendEvent(repoRoot, JSON.parse(line));
  try {
    commitPaths(repoRoot, [target, evp], `gene(${domain}): retire ${id}`);
  } catch (e) {
    fs.writeFileSync(target, previous);
    rollbackAppend(evp, line);
    throw e;
  }
  return { ok: true, report: `retire: gene.retired ${ref} (last sha ${sha.slice(0, 12)}…)\n` };
}

module.exports = { solidify, retire, appendEvent, eventsPath };
