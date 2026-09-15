// solidify.ts — 入档闸（骨架 ADR D4 + schema ADR S2）：evaluate 全绿才落 genes/，
// genes/ 变更与 events/ 追加行放同一 commit（原子证据：基因更替与审计记录不可分离）。
// gene_sha = 基因文件字节内容的 SHA-256（内容寻址锚点，落 Event 不进文件名）。

import * as fs from 'fs';
import * as path from 'path';
import { EngineError, sha256Hex, git, envFingerprint, KEBAB_REF_RE } from './util.js';
import { readGene, genePath } from './gene.js';
import { readCapsule, capsulePath, assertGeneRefsResolvable, assertCapsuleIdUnique } from './capsule.js';
import { readMutation, mutationPath, assertMutationIdUnique } from './mutation.js';
import { assertProtocolIdUnique } from './protocol.js';
import { evaluateGeneObj, formatReport } from './evaluate.js';

function eventsPath(repoRoot: string, ts: string) {
  // YYYY-MM，月卷与 journal 同节奏
  const vol = ts.slice(0, 7);
  return path.join(repoRoot, 'events', `${vol}.jsonl`);
}

// 可选跨链引用（批次 1 序 3 ADR E2/E5）：旗标取 `<domain>/<id>`，落进事件取裸 id。
interface LinkRefs { mutation?: string | null; capsule?: string | null }
// Capsule 入档只接受声明链接——`capsule.added` 不写 `capsule_id`（自身即 `capsule` 键）。
interface MutationLink { mutation?: string | null }

// 被引对象须当下在场——mutations/ 与 capsules/ 都 append-only、无退役面，
// 故无 Capsule `gene_ids` 那种「历史成立 vs 当下在场」差集；缺席即拒写（exit 2）。
function resolveLinkRef(repoRoot: string, kind: 'mutation' | 'capsule', ref: string): string {
  if (!KEBAB_REF_RE.test(ref)) {
    throw new EngineError(`${kind} ref must be <domain>/<id>, got '${ref}'`);
  }
  const [domain, id] = ref.split('/') as [string, string];
  const p = kind === 'mutation' ? mutationPath(repoRoot, domain, id) : capsulePath(repoRoot, domain, id);
  if (!fs.existsSync(p)) {
    throw new EngineError(`${kind} ref '${ref}' not found — ${kind === 'mutation' ? 'declare' : 'record'} it first`);
  }
  return id;
}

// 缺席即不写键（可选键是封闭集，不是空值位）。
function linkKeys(repoRoot: string, refs: LinkRefs) {
  const out: { mutation_id?: string; capsule_id?: string } = {};
  if (refs.mutation) out.mutation_id = resolveLinkRef(repoRoot, 'mutation', refs.mutation);
  if (refs.capsule) out.capsule_id = resolveLinkRef(repoRoot, 'capsule', refs.capsule);
  return out;
}

function appendEvent(repoRoot: string, ev: any) {
  const p = eventsPath(repoRoot, ev.ts);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, JSON.stringify(ev) + '\n', 'utf8');
  return p;
}

// 提交指定路径；失败时回滚本函数组已做的写面，不留半应用状态。
// commit 失败须同时退回索引：`git add` 已把 paths 写进 index，只清工作树会让它们
// 以暂存态残留，下一次 `git commit` 会把刚回滚的变更扫进来。reset 只作用于本函数的
// paths，不碰调用方自己的暂存面。
function commitPaths(repoRoot: string, paths: string[], msg: string) {
  const r1 = git(repoRoot, ['add', '--', ...paths]);
  if (r1.code !== 0) throw new EngineError(`git add failed: ${r1.stderr.trim()}`);
  const r2 = git(repoRoot, ['commit', '-m', msg, '--', ...paths]);
  if (r2.code !== 0) {
    git(repoRoot, ['reset', '-q', '--', ...paths]);
    throw new EngineError(`git commit failed: ${r2.stderr.trim()}`);
  }
}

// 回滚 appendEvent：仅当文件以本行结尾时移除（不触碰并发追加的未知行）。
function rollbackAppend(p: string, line: string) {
  try {
    const text = fs.readFileSync(p, 'utf8');
    if (text.endsWith(line)) fs.writeFileSync(p, text.slice(0, -line.length), 'utf8');
  } catch (_) { /* 事件文件本就不存在则无残面 */ }
}

function redReason(ev: ReturnType<typeof evaluateGeneObj>) {
  const parts: string[] = [];
  if (ev.violations.length) parts.push(`constraints: ${ev.violations.join('; ')}`);
  for (const r of ev.results) {
    if (r.code !== 0) parts.push(`${r.name} exit ${r.code}`);
  }
  return parts.join('; ') || 'unknown';
}

// add/update：候选文件须以 <id>.json 命名（ID=文件名锚点对候选同样生效）。
function solidify(repoRoot: string, engineRoot: string, candidatePath: string, actor: string, links: LinkRefs = {}) {
  if (!actor || !actor.trim()) throw new EngineError('solidify requires --actor <name> (audit trail)');
  actor = actor.trim();
  // 跨链引用先于任何写面/评估解析：旗标坏或指向不存在的对象 = 用法错，不留半个事件。
  const link = linkKeys(repoRoot, links);

  const gene = readGene(candidatePath, { skipDirAnchor: true });
  assertProtocolIdUnique(repoRoot, 'genes', 'gene', gene.domain, gene.id);
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
      env_fingerprint: envFingerprint(),
      ...link,
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
    env_fingerprint: envFingerprint(),
    ...link,
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
function retire(repoRoot: string, ref: string, actor: string, links: LinkRefs = {}) {
  if (!actor || !actor.trim()) throw new EngineError('retire requires --actor <name> (audit trail)');
  const link = linkKeys(repoRoot, links);
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
    env_fingerprint: envFingerprint(),
    ...link,
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

// recordCapsule — Capsule 入档（批次 1 序 1 ADR C3）：结构闸 + 基因引用可解析 → 落
// capsules/ + capsule.added 事件同一 commit（原子证据同基因入档）。Capsule 是 append-only
// 审计记录：同 id 重复记录拒收（无 capsule.updated/retired 面）。引擎不重跑门禁——
// 证据由调用方在真实执行后给出，自动复跑归批次表序 43。
function recordCapsule(repoRoot: string, candidatePath: string, actor: string, links: MutationLink = {}) {
  if (!actor || !actor.trim()) throw new EngineError('capsule add requires --actor <name> (audit trail)');
  actor = actor.trim();
  const link = linkKeys(repoRoot, links);

  const cap = readCapsule(candidatePath, { skipDirAnchor: true });
  assertGeneRefsResolvable(repoRoot, cap.gene_ids);
  assertCapsuleIdUnique(repoRoot, cap.domain, cap.id);
  const target = capsulePath(repoRoot, cap.domain, cap.id);
  if (fs.existsSync(target)) {
    throw new EngineError(`capsule ${cap.domain}/${cap.id} already recorded — capsules are append-only`);
  }

  const content = Buffer.from(JSON.stringify(cap, null, 2) + '\n', 'utf8');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  const sha = sha256Hex(content);

  const ts = new Date().toISOString();
  const line = JSON.stringify({
    ts, actor, kind: 'capsule.added', capsule: cap.id, capsule_sha: sha, outcome: 'ok',
    evidence: `recorded ${cap.domain}/${cap.id}: ${cap.gene_ids.length} gene ref(s), outcome ${cap.outcome.status}`,
    env_fingerprint: envFingerprint(),
    ...link,
  }) + '\n';
  const evp = appendEvent(repoRoot, JSON.parse(line));
  try {
    commitPaths(repoRoot, [target, evp], `capsule(${cap.domain}): add ${cap.id}`);
  } catch (e) {
    fs.rmSync(target, { force: true });
    rollbackAppend(evp, line);
    throw e;
  }
  return {
    ok: true,
    report: `capsule: capsule.added ${cap.domain}/${cap.id} (sha ${sha.slice(0, 12)}…, ${cap.gene_ids.length} gene ref(s))\n`,
  };
}

// recordMutation — Mutation 入档（批次 1 序 2 ADR C3）：结构闸 → 落 mutations/ +
// mutation.added 事件同一 commit（原子证据同基因/Capsule 入档）。Mutation 是执行前的
// 意图声明，append-only：同 id 重复声明拒收（无 mutation.updated/retired 面）。
// 引擎不构造声明内容、不跑门禁——声明由调用方在动改动面之前显式给出。
function recordMutation(repoRoot: string, candidatePath: string, actor: string) {
  if (!actor || !actor.trim()) throw new EngineError('mutation add requires --actor <name> (audit trail)');
  actor = actor.trim();

  const mut = readMutation(candidatePath, { skipDirAnchor: true });
  assertMutationIdUnique(repoRoot, mut.domain, mut.id);
  const target = mutationPath(repoRoot, mut.domain, mut.id);
  if (fs.existsSync(target)) {
    throw new EngineError(`mutation ${mut.domain}/${mut.id} already declared — mutations are append-only`);
  }

  const content = Buffer.from(JSON.stringify(mut, null, 2) + '\n', 'utf8');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  const sha = sha256Hex(content);

  const ts = new Date().toISOString();
  const line = JSON.stringify({
    ts, actor, kind: 'mutation.added', mutation: mut.id, mutation_sha: sha, outcome: 'ok',
    evidence: `declared ${mut.domain}/${mut.id}: ${mut.category}, risk ${mut.risk_level}`,
    env_fingerprint: envFingerprint(),
  }) + '\n';
  const evp = appendEvent(repoRoot, JSON.parse(line));
  try {
    commitPaths(repoRoot, [target, evp], `mutation(${mut.domain}): add ${mut.id}`);
  } catch (e) {
    fs.rmSync(target, { force: true });
    rollbackAppend(evp, line);
    throw e;
  }
  return {
    ok: true,
    report: `mutation: mutation.added ${mut.domain}/${mut.id} (sha ${sha.slice(0, 12)}…, risk ${mut.risk_level})\n`,
  };
}

export { solidify, retire, recordCapsule, recordMutation, appendEvent, eventsPath };
