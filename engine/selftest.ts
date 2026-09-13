// selftest.ts — 元评测夹具（schema ADR S3）：对齐 verify-* self-test 惯例，违约样例必须 FAIL。
// 自托管纪律：全程临时目录/沙箱，不触碰真实仓（引擎测试自己不污染被演化对象）。

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';

import { normalizeSignal, sha256Hex, EngineError, envFingerprint } from './util.js';
import { loadGates } from './gates.js';
import { selectGenes, runSelect } from './select.js';
import { validateObservation, buildObservation, recordObservation, readObservations, EVIDENCE_MAX_CHARS } from './observe.js';
import { renderGene } from './propose.js';
import { evaluateGeneObj, checkConstraints } from './evaluate.js';
import { solidify, retire, recordCapsule, recordMutation } from './solidify.js';
import { genePath, scanGenes, defaultCacheDir } from './gene.js';
import { capsulePath, readCapsule, renderCapsule } from './capsule.js';
import { mutationPath, readMutation, renderMutation } from './mutation.js';

let hasFailure = false;
function ok(cond: unknown, msg: string) {
  if (cond) { console.log(`  ok: ${msg}`); }
  else { console.error(`  FAIL: ${msg}`); hasFailure = true; }
}

function throwsEngine(fn: () => unknown): boolean {
  try { fn(); } catch (e) { return e instanceof EngineError; }
  return false;
}

// CLI 级退码断言助手：execFileSync 非 0 退出抛错，取抛物的 .status 透传为退出码。
function spawnCode(nodeArgs: string[], cwd: string): number | null {
  try {
    execFileSync('node', nodeArgs, { cwd, encoding: 'utf8', stdio: 'pipe' });
    return 0;
  } catch (e) {
    // execFileSync 的失败抛物携带 .status（number | null）。
    return (e as { status?: number | null }).status ?? null;
  }
}

function mkTemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'noo-engine-selftest-'));
}

function git(root: string, args: string[]): string {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' });
}

function mkRepo(root: string) {
  fs.mkdirSync(root, { recursive: true });
  git(root, ['init', '-q']);
  git(root, ['config', 'user.email', 't@t']);
  git(root, ['config', 'user.name', 't']);
  fs.writeFileSync(path.join(root, 'base.txt'), 'base\n');
  git(root, ['add', '-A']);
  git(root, ['commit', '-qm', 'base']);
  return root;
}

function writeGene(root: string, domain: string, obj: any, fileName?: string) {
  const dir = path.join(root, 'genes', domain);
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, fileName || `${obj.id}.json`);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
  return p;
}

function writeGates(dir: string, gates: any[]) {
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, 'gates.json');
  fs.writeFileSync(p, JSON.stringify({ version: 1, gates }, null, 2) + '\n');
  return p;
}

function stubScript(root: string) {
  const dir = path.join(root, 'scripts');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'stub-pass.py'), 'print("ok")\n');
  fs.writeFileSync(path.join(dir, 'stub-fail.py'), 'raise SystemExit(1)\n');
  return dir;
}

function readEvents(root: string): any[] {
  const dir = path.join(root, 'events');
  if (!fs.existsSync(dir)) return [];
  const out: any[] = [];
  for (const f of fs.readdirSync(dir).sort()) {
    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
      if (line.trim()) out.push(JSON.parse(line));
    }
  }
  return out;
}

function selfTest() {
  console.log('== engine self-test ==');

  // --- 1) 归一化规则（骨架 ADR D2：trim → 小写 → 连续空白折叠单空格）---
  ok(normalizeSignal('  PUSH   Force ') === 'push force', 'normalize: trim+lowercase+collapse');
  ok(normalizeSignal('push\tforce') === 'push force', 'normalize: tab counts as whitespace');

  // --- 2) select：命中 / 未命中 / 多信号并集 / 归一化匹配 ---
  {
    const td = mkTemp();
    writeGene(td, 'process', {
      id: 'gene-a', domain: 'process', summary: 'A', signals: ['push force', 'review'],
      strategy: ['s1'],
    });
    writeGene(td, 'doc', {
      id: 'gene-b', domain: 'doc', summary: 'B', signals: ['doc budget'],
      strategy: ['s1'],
    });
    ok(selectGenes(td, ['push force']).hits.length === 1, 'select: exact hit');
    ok(selectGenes(td, ['  PUSH   force ']).hits.length === 1, 'select: normalized hit (case/space)');
    ok(selectGenes(td, ['no such key']).hits.length === 0, 'select: miss');
    ok(selectGenes(td, ['review', 'doc budget']).hits.length === 2, 'select: multi-signal union');
  }

  // --- 2.5) 观测输入面（融合立宪 D8/D10；实现 ADR 2026-09-11）：写路径 fail-closed、
  //          读路径 warn-skip、零观测时 select 输出逐字节不变 ---
  {
    const td = mkTemp();
    writeGene(td, 'process', {
      id: 'gene-a', domain: 'process', summary: 'A', signals: ['push force', 'review'],
      strategy: ['s1'],
    });
    writeGene(td, 'doc', {
      id: 'gene-b', domain: 'doc', summary: 'B', signals: ['push force'],
      strategy: ['s1'],
    });

    // 零观测 = 默认零成本：stdout 与无观测面时逐字节相同，且不发射 advice 行
    // （命中顺序 = 扫描顺序：域目录名排序，doc 先于 process）
    const base = runSelect(td, ['push force']);
    ok(base.stdout === 'signals: push force\ndoc/gene-b  B\nprocess/gene-a  A\n',
      'observe: zero-observation select output byte-identical');
    ok(base.advice.length === 0, 'observe: zero observations -> no advice lines');

    // 写路径：signal 归一（键口径单源）+ 落月卷 + append
    const w1 = recordObservation(td, { signal: '  PUSH   Force ', gene: 'process/gene-a', outcome: 'ok', actor: 't' });
    ok(w1.record.signal === 'push force', 'observe: signal normalized at write');
    ok(fs.existsSync(w1.path) && w1.path.endsWith('.jsonl') && w1.path.includes('.noogenesis')
      && path.basename(w1.path) === `${w1.record.ts.slice(0, 7)}.jsonl`,
      'observe: record appended to .noogenesis/observations/<YYYY-MM>.jsonl');
    recordObservation(td, { signal: 'push force', gene: 'process/gene-a', outcome: 'fail', actor: 't' });
    recordObservation(td, { signal: 'push force', gene: 'doc/gene-b', outcome: 'ok', actor: 't' });
    recordObservation(td, { signal: 'review', gene: 'process/gene-a', outcome: 'ok', actor: 't' });

    // 写路径违约：fail-closed（EngineError，不落盘）
    ok(throwsEngine(() => buildObservation({ signal: 's', gene: 'process/gene-a', outcome: 'maybe', actor: 't' })),
      'observe: bad outcome rejected (fail-closed)');
    ok(throwsEngine(() => buildObservation({ signal: 's', gene: 'bad-ref', outcome: 'ok', actor: 't' })),
      'observe: bad gene ref rejected');
    ok(throwsEngine(() => buildObservation({ signal: 's', gene: 'process/gene-a', outcome: 'ok', actor: '   ' })),
      'observe: blank actor rejected');
    ok(throwsEngine(() => buildObservation({ signal: '   ', gene: 'process/gene-a', outcome: 'ok', actor: 't' })),
      'observe: blank signal rejected');
    ok(throwsEngine(() => buildObservation({ signal: 's', gene: 'process/gene-a', outcome: 'ok', actor: 't', evidence: 'a\nb' })),
      'observe: multiline evidence rejected');
    ok(throwsEngine(() => buildObservation({ signal: 's', gene: 'process/gene-a', outcome: 'ok', actor: 't', evidence: 'x'.repeat(EVIDENCE_MAX_CHARS + 1) })),
      'observe: over-long evidence rejected');
    ok(validateObservation({ ts: w1.record.ts, actor: 't', signal: 's', gene: 'process/gene-a', outcome: 'ok', extra: 1 })
      .some((e) => e.includes('unknown field')), 'observe: unknown field rejected');
    // ts 会被原样拼进 advice 行（stdout 契约面）：可解析但形状宽松的串（含空白/换行）
    // 必须是违约——否则它会拆出第二个不以 `advice:` 开头的行。
    ok(throwsEngine(() => buildObservation({ signal: 's', gene: 'process/gene-a', outcome: 'ok', actor: 't', ts: '\n2026-09-10' })),
      'observe: whitespace-padded ts rejected (stdout line contract)');
    ok(throwsEngine(() => buildObservation({ signal: 's', gene: 'process/gene-a', outcome: 'ok', actor: 't', ts: '2026-9-1' })),
      'observe: non-ISO ts rejected');
    // 键口径：非归一 signal 不得落盘（写路径归一；校验器兜住直写面）
    ok(validateObservation({ ts: w1.record.ts, actor: 't', signal: 'Push  Force', gene: 'process/gene-a', outcome: 'ok' })
      .some((e) => e.includes('normalized')), 'observe: non-normalized signal rejected');

    // 派生：命中行不变 + advice 追加在全部命中行之后
    const adv = runSelect(td, ['push force']);
    const advLines = adv.stdout.split('\n').filter((l) => l.length);
    ok(advLines[1] === 'doc/gene-b  B' && advLines[2] === 'process/gene-a  A',
      'observe: hit lines unchanged when advice present');
    ok(/^advice: push force :: doc\/gene-b {2}ok=1 fail=0 last=\d{4}-\d{2}-\d{2}$/.test(advLines[3] || '')
      && /^advice: push force :: process\/gene-a {2}ok=1 fail=1 last=\d{4}-\d{2}-\d{2}$/.test(advLines[4] || ''),
      'observe: advice keyed (signal::gene) in hit order');

    // 边分辨：命中顺序 × 查询键顺序；非查询键/非命中基因的观测不参与
    const multi = runSelect(td, ['review', 'push force']);
    ok(multi.advice.length === 3 && multi.advice[0]!.startsWith('advice: push force :: doc/gene-b')
      && multi.advice.filter((l: string) => l.includes('process/gene-a')).length === 2,
      'observe: per-edge advice in hit-then-key order');

    // 读路径：坏行 warn-skip（不抛、不进派生），好行保留。
    // 三态各一条夹具：JSON 截断（parse 失败）、良构 JSON 但 schema 违约、非归一键。
    fs.appendFileSync(w1.path, '{"ts":"not-a-date"\n');
    fs.appendFileSync(w1.path, `${JSON.stringify({ ts: '2026-09-10T00:00:00.000Z', actor: 't', signal: 'push force', gene: 'process/gene-a', outcome: 'maybe' })}\n`);
    fs.appendFileSync(w1.path, `${JSON.stringify({ ts: '2026-09-10T00:00:00.000Z', actor: 't', signal: 'Push  Force', gene: 'process/gene-a', outcome: 'ok' })}\n`);
    const read = readObservations(td);
    ok(read.records.length === 4 && read.skipped === 3, 'observe: parse/schema/non-normalized lines all skipped, valid siblings kept');
    ok(runSelect(td, ['push force']).advice.length === 2, 'observe: corrupt lines do not break select derivation');

    // 读路径面级降级：观测面被同名文件占位（ENOTDIR）→ 空集 + warn，绝不是红/崩溃
    const bd = mkTemp();
    writeGene(bd, 'process', { id: 'gene-a', domain: 'process', summary: 'A', signals: ['k'], strategy: ['s1'] });
    fs.mkdirSync(path.join(bd, '.noogenesis'), { recursive: true });
    fs.writeFileSync(path.join(bd, '.noogenesis', 'observations'), 'not a directory\n');
    ok(readObservations(bd).records.length === 0, 'observe: unlistable face degrades to empty (no throw)');
    ok(runSelect(bd, ['k']).stdout === 'signals: k\nprocess/gene-a  A\n',
      'observe: unlistable face does not break select (hits intact, no advice)');

    // CLI 面：observe 命令分派 + 退出码三档（fail-closed 与用法错都是 exit 2）
    const ce = mkRepo(mkTemp());
    writeGene(ce, 'process', { id: 'gene-a', domain: 'process', summary: 'A', signals: ['review'], strategy: ['s1'] });
    const bin = path.join(__dirname, 'bin.js');
    ok(spawnCode([bin, 'observe', '--signal', 'review', '--gene', 'process/gene-a', '--outcome', 'ok', '--actor', 't'], ce) === 0,
      'bin: observe valid record -> exit 0');
    ok(readObservations(ce).records.length === 1, 'bin: observe wrote exactly one record');
    ok(spawnCode([bin, 'observe', '--signal', 'review', '--gene', 'process/gene-a', '--outcome', 'nope', '--actor', 't'], ce) === 2,
      'bin: observe bad outcome -> exit 2');
    ok(spawnCode([bin, 'observe', '--signal', 'review', '--signal', 'x', '--gene', 'process/gene-a', '--outcome', 'ok', '--actor', 't'], ce) === 2,
      'bin: observe duplicate flag -> exit 2');
    ok(spawnCode([bin, 'observe', '--signal', 'review', '--outcome', 'ok', '--actor', 't'], ce) === 2,
      'bin: observe missing --gene -> exit 2');
    ok(readObservations(ce).records.length === 1, 'bin: rejected observe attempts wrote nothing');
  }

  // --- 3) propose 金样渲染（确定性：同输入必同输出）---
  {
    const gene = {
      id: 'sample-gene', domain: 'process', summary: 'one-line summary',
      signals: ['sample signal'],
      strategy: ['step one', 'step two'],
      constraints: { max_files: 3, forbidden_paths: ['engine/', 'docs/'] },
      avoid: ['do not do x'],
    };
    const GOLDEN =
      '[noo-gene process/sample-gene] one-line summary\n' +
      '\n' +
      'strategy:\n' +
      '1. step one\n' +
      '2. step two\n' +
      '\n' +
      'constraints:\n' +
      '- max_files: 3\n' +
      '- forbidden_paths: engine/, docs/\n' +
      '\n' +
      'avoid:\n' +
      '- do not do x\n';
    ok(renderGene(gene) === GOLDEN, 'propose: golden render exact match');
    ok(renderGene(gene) === renderGene(JSON.parse(JSON.stringify(gene))), 'propose: deterministic across parses');
  }

  // --- 4) evaluate：白名单外命令拒 / fail-closed / 约束违约 ---
  {
    const td = mkTemp();
    mkRepo(td);
    stubScript(td);
    const gatesDir = path.join(td, 'tmp-gates');
    const gatesDoc = [
      { name: 'stub-pass-1', cmd: 'python3', args: ['scripts/stub-pass.py'] },
      { name: 'stub-pass-2', cmd: 'python3', args: ['scripts/stub-pass.py'] },
    ];
    writeGates(gatesDir, gatesDoc);
    const gene = {
      id: 'ev-gene', domain: 'process', summary: 'evaluate fixture',
      signals: ['x'], strategy: ['s'], validation: ['stub-pass-1'],
    };
    const ev = evaluateGeneObj(td, gatesDir, gene, 'process/ev-gene');
    ok(ev.ok === true, 'evaluate: all stub gates green -> ok');
    ok(ev.results.length === 2, 'evaluate: whitelist full set executed');

    // 白名单外 validation → fail-closed 拒跑
    ok(throwsEngine(() => evaluateGeneObj(td, gatesDir,
      { ...gene, validation: ['no-such-gate'] }, 'x')), 'evaluate: validation outside whitelist refused');

    // 白名单载体 fail-closed 三样：缺失 / 坏 JSON / 条目脚本不存在
    ok(throwsEngine(() => loadGates(path.join(td, 'no-such-dir'), td)), 'gates: missing gates.json refused');
    {
      const bad = path.join(td, 'bad-gates');
      fs.mkdirSync(bad);
      fs.writeFileSync(path.join(bad, 'gates.json'), '{not json');
      ok(throwsEngine(() => loadGates(bad, td)), 'gates: malformed JSON refused');
      writeGates(path.join(bad), [{ name: 'ghost', cmd: 'python3', args: ['scripts/no-such-script.py'] }]);
      ok(throwsEngine(() => loadGates(bad, td)), 'gates: referenced script missing refused');
    }

    // 约束违约必须 FAIL（max_files / forbidden_paths）
    fs.writeFileSync(path.join(td, 'c1.txt'), 'x\n');
    fs.writeFileSync(path.join(td, 'c2.txt'), 'x\n');
    git(td, ['add', '-A']);
    git(td, ['commit', '-qm', 'two files']);
    const tight = { ...gene, constraints: { max_files: 1 } };
    let ev2 = evaluateGeneObj(td, gatesDir, tight, 'x');
    ok(ev2.ok === false, 'evaluate: max_files violation -> FAIL');
    ok(ev2.violations.some((v) => v.includes('max_files')), 'evaluate: max_files reason reported');
    const forb = { ...gene, constraints: { forbidden_paths: ['engine/'] } };
    fs.mkdirSync(path.join(td, 'engine'));
    fs.writeFileSync(path.join(td, 'engine', 'x.js'), '// x\n');
    git(td, ['add', '-A']);
    git(td, ['commit', '-qm', 'engine file']);
    ev2 = evaluateGeneObj(td, gatesDir, forb, 'x');
    ok(ev2.ok === false && ev2.violations.some((v) => v.includes('forbidden_paths')),
      'evaluate: forbidden_paths violation -> FAIL');
    ok(checkConstraints({ constraints: {} }, ['a.txt']).length === 0, 'constraints: none set -> no violation');

    // spawn 失败根因并入 tail（code=-1 时 stderr 常空——二进制缺失只在此可见）
    writeGates(gatesDir, [{ name: 'ghost-bin', cmd: 'no-such-binary-xyz', args: ['--version'] }]);
    const evGhost = evaluateGeneObj(td, gatesDir, { ...gene, validation: ['ghost-bin'] }, 'x');
    ok(evGhost.ok === false, 'evaluate: unspawnable gate -> FAIL');
    ok((evGhost.results[0]?.tail ?? '').includes('spawn error'), 'evaluate: spawn error root cause surfaced in tail');
  }

  // --- 5) solidify：原子提交（genes/ + events/ 同 commit）与 gene_sha 可复算 ---
  {
    const td = mkTemp();
    mkRepo(td);
    stubScript(td);
    const gatesDir = path.join(td, 'tmp-gates');
    writeGates(gatesDir, [{ name: 'stub-pass', cmd: 'python3', args: ['scripts/stub-pass.py'] }]);
    const gene = {
      id: 'sol-gene', domain: 'process', summary: 'solidify fixture',
      signals: ['sol'], strategy: ['s'],
    };
    const staging = path.join(td, 'candidates');
    fs.mkdirSync(staging);
    const candPath = path.join(staging, 'sol-gene.json');
    fs.writeFileSync(candPath, JSON.stringify(gene, null, 2) + '\n');

    const r = solidify(td, gatesDir, candPath, 'tester');
    ok(r.ok === true, 'solidify: add accepted when gates green');
    const target = genePath(td, 'process', 'sol-gene');
    ok(fs.existsSync(target), 'solidify: gene placed in genes/<domain>/');
    const events = readEvents(td);
    ok(events.length === 1 && events[0].kind === 'gene.added' && events[0].outcome === 'ok',
      'solidify: gene.added event appended');
    const fileSha = sha256Hex(fs.readFileSync(target));
    ok(events[0].gene_sha === fileSha, 'solidify: gene_sha recomputes from file bytes');
    // 原子证据：同一 commit 同时含 genes/ 与 events/ 两个路径
    const files = git(td, ['show', '--name-only', '--format=', 'HEAD']).trim().split('\n').sort();
    ok(files.length === 2 && files.some((f) => f.startsWith('genes/')) && files.some((f) => f.startsWith('events/')),
      'solidify: genes/ + events/ in the SAME commit');
    ok(git(td, ['rev-list', '--count', 'HEAD']).trim() === '2', 'solidify: exactly one extra commit');

    // update
    const gene2 = { ...gene, summary: 'updated summary' };
    fs.writeFileSync(candPath, JSON.stringify(gene2, null, 2) + '\n');
    solidify(td, gatesDir, candPath, 'tester');
    const ev2 = readEvents(td);
    ok(ev2.length === 2 && ev2[1].kind === 'gene.updated', 'solidify: update appends gene.updated');
    ok(ev2[1].gene_sha === sha256Hex(fs.readFileSync(target)), 'solidify: updated sha recomputes');

    // reject：红闸 → fail 事件 + 候选不入档
    writeGates(gatesDir, [{ name: 'stub-pass', cmd: 'python3', args: ['scripts/stub-pass.py'] },
                          { name: 'stub-fail', cmd: 'python3', args: ['scripts/stub-fail.py'] }]);
    const gene3 = { ...gene, id: 'bad-gene', summary: 'should be rejected' };
    const badPath = path.join(staging, 'bad-gene.json');
    fs.writeFileSync(badPath, JSON.stringify(gene3, null, 2) + '\n');
    const r3 = solidify(td, gatesDir, badPath, 'tester');
    ok(r3.ok === false, 'solidify: red gate -> REJECTED');
    ok(!fs.existsSync(genePath(td, 'process', 'bad-gene')), 'solidify: rejected candidate NOT placed in genes/');
    const ev3 = readEvents(td);
    const last = ev3[ev3.length - 1];
    ok(last.kind === 'gene.added' && last.outcome.startsWith('fail:') && last.gene === 'bad-gene',
      'solidify: fail event carries kind + 拒因');

    // retire：删除 + retired 事件（gene_sha = 最后内容 SHA）
    const beforeSha = sha256Hex(fs.readFileSync(target));
    retire(td, 'process/sol-gene', 'tester');
    ok(!fs.existsSync(target), 'retire: gene removed from genes/');
    const ev4 = readEvents(td);
    const last4 = ev4[ev4.length - 1];
    ok(last4.kind === 'gene.retired' && last4.gene_sha === beforeSha && last4.outcome === 'ok',
      'retire: gene.retired event records last content sha');
    ok(throwsEngine(() => retire(td, 'process/sol-gene', 'tester')),
      'retire: retiring a missing gene refused');

    // 夹具：跨树 id 唯一性（同 id 异域拒入档）
    const dupGene = { ...gene, id: 'dup-id', domain: 'doc' };
    const dupPath = path.join(staging, 'dup-id.json');
    fs.writeFileSync(dupPath, JSON.stringify(dupGene, null, 2) + '\n');
    {
      // 先入档 doc/dup-id，再尝试 process/dup-id → 必须拒
      writeGates(gatesDir, [{ name: 'stub-pass', cmd: 'python3', args: ['scripts/stub-pass.py'] }]);
      const r5 = solidify(td, gatesDir, dupPath, 'tester');
      ok(r5.ok === true, 'solidify: cross-domain first placement accepted');
      const dup2 = { ...dupGene, domain: 'process' };
      const dup2Path = path.join(staging, 'dup-id.json');
      fs.writeFileSync(dup2Path, JSON.stringify(dup2, null, 2) + '\n');
      ok(throwsEngine(() => solidify(td, gatesDir, dup2Path, 'tester')),
        'solidify: same id in another domain refused (refs stay unambiguous)');
    }

    // 夹具：无关暂存件不捎带（pathspec 隔离）
    {
      writeGates(gatesDir, [{ name: 'stub-pass', cmd: 'python3', args: ['scripts/stub-pass.py'] }]);
      fs.writeFileSync(path.join(td, 'unrelated.txt'), 'unrelated\n');
      git(td, ['add', 'unrelated.txt']);
      const uGene = { ...gene, id: 'iso-gene' };
      const isoPath = path.join(staging, 'iso-gene.json');
      fs.writeFileSync(isoPath, JSON.stringify(uGene, null, 2) + '\n');
      const r6 = solidify(td, gatesDir, isoPath, 'tester');
      ok(r6.ok === true, 'solidify: with unrelated staged file, add succeeds');
      const files6 = git(td, ['show', '--name-only', '--format=', 'HEAD']).trim().split('\n').sort();
      ok(files6.length === 2 && !files6.includes('unrelated.txt'),
        'solidify: pathspec commit excludes unrelated staged file');
      ok(git(td, ['diff', '--cached', '--name-only']).trim() === 'unrelated.txt',
        'solidify: unrelated file remains staged for its own commit');
    }

    // 夹具：commit 失败 → 写面回滚（不留半应用状态）
    {
      const hooksDir = path.join(td, 'failing-hooks');
      fs.mkdirSync(hooksDir);
      fs.writeFileSync(path.join(hooksDir, 'pre-commit'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
      git(td, ['config', 'core.hooksPath', 'failing-hooks']);
      const rGene = { ...gene, id: 'rollback-gene' };
      const rPath = path.join(staging, 'rollback-gene.json');
      fs.writeFileSync(rPath, JSON.stringify(rGene, null, 2) + '\n');
      const evFilesBefore = fs.readdirSync(path.join(td, 'events')).sort();
      const eventsBefore = fs.readFileSync(path.join(td, 'events', evFilesBefore[evFilesBefore.length - 1] ?? ''), 'utf8');
      let threw = false;
      try { solidify(td, gatesDir, rPath, 'tester'); } catch (e) { threw = e instanceof EngineError; }
      ok(threw, 'solidify: commit failure raises EngineError');
      ok(!fs.existsSync(genePath(td, 'process', 'rollback-gene')), 'solidify: rollback removes placed gene');
      const evFilesAfter = fs.readdirSync(path.join(td, 'events')).sort();
      const eventsAfter = fs.readFileSync(path.join(td, 'events', evFilesAfter[evFilesAfter.length - 1] ?? ''), 'utf8');
      ok(eventsAfter === eventsBefore, 'solidify: rollback removes appended event line');
      ok(git(td, ['diff', '--cached', '--name-only']).trim().split('\n').filter((l) => l.includes('rollback-gene')).length === 0,
        'solidify: rollback leaves no staged residue');
      git(td, ['config', '--unset', 'core.hooksPath']);
    }
  }

  // --- 5.7) Capsule 原语（批次 1 序 1）：原子提交、复算、append-only、引用可解析 ---
  {
    const td = mkTemp();
    mkRepo(td);
    writeGene(td, 'process', {
      id: 'cap-gene', domain: 'process', summary: 'capsule fixture',
      signals: ['cap'], strategy: ['s'],
    });
    const staging = path.join(td, 'candidates');
    fs.mkdirSync(staging);
    const cap = {
      id: 'cap-1', domain: 'process', gene_ids: ['process/cap-gene'],
      trigger: 'cap', steps: ['s1'], outcome: { status: 'ok' }, evidence: ['gate green'],
    };
    const cand = path.join(staging, 'cap-1.json');
    fs.writeFileSync(cand, JSON.stringify(cap, null, 2) + '\n');

    const r = recordCapsule(td, cand, 'tester');
    ok(r.ok === true, 'capsule: record accepted');
    const target = capsulePath(td, 'process', 'cap-1');
    ok(fs.existsSync(target), 'capsule: placed in capsules/<domain>/');
    const capEv = readEvents(td).find((e) => e.kind === 'capsule.added');
    ok(capEv !== undefined && capEv.capsule === 'cap-1' && capEv.outcome === 'ok',
      'capsule: capsule.added event appended');
    ok(capEv?.capsule_sha === sha256Hex(fs.readFileSync(target)),
      'capsule: capsule_sha recomputes from file bytes');
    const files = git(td, ['show', '--name-only', '--format=', 'HEAD']).trim().split('\n').sort();
    ok(files.length === 2 && files.some((f) => f.startsWith('capsules/')) && files.some((f) => f.startsWith('events/')),
      'capsule: capsules/ + events/ in the SAME commit');

    // append-only：同 id 重复记录拒收（无 capsule.updated 面）
    ok(throwsEngine(() => recordCapsule(td, cand, 'tester')), 'capsule: re-recording same id refused (append-only)');
    // 引用可解析：悬空基因引用拒收
    const dPath = path.join(staging, 'cap-2.json');
    fs.writeFileSync(dPath, JSON.stringify({ ...cap, id: 'cap-2', gene_ids: ['process/no-such-gene'] }, null, 2) + '\n');
    ok(throwsEngine(() => recordCapsule(td, dPath, 'tester')), 'capsule: dangling gene ref refused');
    ok(throwsEngine(() => recordCapsule(td, cand, '   ')), 'capsule: blank actor refused');

    // 读命令：确定性渲染（逐字金样，抓输出格式漂移而非仅抓非确定性）
    const GOLDEN_CAPSULE =
      '[noo-capsule process/cap-1]\n' +
      '\n' +
      'trigger: cap\n' +
      'outcome: ok\n' +
      'genes: process/cap-gene\n' +
      '\n' +
      'steps:\n' +
      '1. s1\n' +
      '\n' +
      'evidence:\n' +
      '- gate green\n';
    ok(renderCapsule(readCapsule(target)) === GOLDEN_CAPSULE, 'capsule: golden render exact match');

    // CLI 面：add / show 与用法错三档
    const bin = path.join(__dirname, 'bin.js');
    fs.writeFileSync(path.join(staging, 'cap-3.json'), JSON.stringify({ ...cap, id: 'cap-3' }, null, 2) + '\n');
    ok(spawnCode([bin, 'capsule', 'add', path.join(staging, 'cap-3.json'), '--actor', 't'], td) === 0,
      'bin: capsule add -> exit 0');
    const shown = execFileSync('node', [bin, 'capsule', 'show', 'process/cap-3'], { cwd: td, encoding: 'utf8', stdio: 'pipe' });
    ok(shown.includes('[noo-capsule process/cap-3]'), 'bin: capsule show renders');
    ok(spawnCode([bin, 'capsule', 'show', 'process/missing'], td) === 2, 'bin: capsule show missing -> exit 2');
    ok(spawnCode([bin, 'capsule', 'add', cand], td) === 2, 'bin: capsule add without --actor -> exit 2');
    ok(spawnCode([bin, 'capsule', 'bogus'], td) === 2, 'bin: unknown capsule subcommand -> exit 2');

    // commit 失败 → 写面与索引都回滚（只清工作树会让回滚的记录以暂存态残留）
    {
      const hooksDir = path.join(td, 'failing-hooks');
      fs.mkdirSync(hooksDir);
      fs.writeFileSync(path.join(hooksDir, 'pre-commit'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
      git(td, ['config', 'core.hooksPath', 'failing-hooks']);
      const rb = path.join(staging, 'cap-rb.json');
      fs.writeFileSync(rb, JSON.stringify({ ...cap, id: 'cap-rb' }, null, 2) + '\n');
      let threw = false;
      try { recordCapsule(td, rb, 'tester'); } catch (e) { threw = e instanceof EngineError; }
      ok(threw, 'capsule: commit failure raises EngineError');
      ok(!fs.existsSync(capsulePath(td, 'process', 'cap-rb')), 'capsule: rollback removes placed capsule');
      ok(git(td, ['diff', '--cached', '--name-only']).trim().split('\n').filter((l) => l.includes('cap-rb')).length === 0,
        'capsule: rollback leaves no staged residue');
      git(td, ['config', '--unset', 'core.hooksPath']);
    }
  }

  // --- 5.8) Mutation 原语（批次 1 序 2）：原子提交、复算、append-only、schema 封闭 ---
  {
    const td = mkTemp();
    mkRepo(td);
    const staging = path.join(td, 'candidates');
    fs.mkdirSync(staging);
    const mut = {
      id: 'mut-1', domain: 'process', category: 'refactor', target: 'engine/bin.ts',
      expected_effect: 'command dispatch stays byte-identical', risk_level: 'low',
    };
    const cand = path.join(staging, 'mut-1.json');
    fs.writeFileSync(cand, JSON.stringify(mut, null, 2) + '\n');

    const r = recordMutation(td, cand, 'tester');
    ok(r.ok === true, 'mutation: declaration accepted');
    const target = mutationPath(td, 'process', 'mut-1');
    ok(fs.existsSync(target), 'mutation: placed in mutations/<domain>/');
    const mutEv = readEvents(td).find((e) => e.kind === 'mutation.added');
    ok(mutEv !== undefined && mutEv.mutation === 'mut-1' && mutEv.outcome === 'ok',
      'mutation: mutation.added event appended');
    ok(mutEv?.mutation_sha === sha256Hex(fs.readFileSync(target)),
      'mutation: mutation_sha recomputes from file bytes');
    const files = git(td, ['show', '--name-only', '--format=', 'HEAD']).trim().split('\n').sort();
    ok(files.length === 2 && files.some((f) => f.startsWith('mutations/')) && files.some((f) => f.startsWith('events/')),
      'mutation: mutations/ + events/ in the SAME commit');

    // append-only：同 id 重复声明拒收（无 mutation.updated 面）
    ok(throwsEngine(() => recordMutation(td, cand, 'tester')), 'mutation: re-declaring same id refused (append-only)');
    // schema 封闭：risk_level 三值封闭（设计 §5.1）
    const badRisk = path.join(staging, 'mut-2.json');
    fs.writeFileSync(badRisk, JSON.stringify({ ...mut, id: 'mut-2', risk_level: 'catastrophic' }, null, 2) + '\n');
    ok(throwsEngine(() => recordMutation(td, badRisk, 'tester')), 'mutation: risk_level outside low|medium|high refused');
    // category/target/expected_effect 无值域但须非空
    const badCat = path.join(staging, 'mut-3.json');
    fs.writeFileSync(badCat, JSON.stringify({ ...mut, id: 'mut-3', category: '  ' }, null, 2) + '\n');
    ok(throwsEngine(() => recordMutation(td, badCat, 'tester')), 'mutation: blank category refused');
    // actor 守卫须用「尚未声明」的 id：用已入档的 cand 会被 append-only 分支先拒，
    // 断言恒真（删掉 actor 守卫仍绿）。
    const blankActor = path.join(staging, 'mut-actor.json');
    fs.writeFileSync(blankActor, JSON.stringify({ ...mut, id: 'mut-actor' }, null, 2) + '\n');
    ok(throwsEngine(() => recordMutation(td, blankActor, '   ')), 'mutation: blank actor refused');
    ok(!fs.existsSync(mutationPath(td, 'process', 'mut-actor')), 'mutation: blank actor wrote nothing');
    // 跨域 id 唯一：同 id 不得在第二个域再声明（事件只记 id，引用必须无歧义）
    const crossDomain = path.join(staging, 'mut-1.json');
    fs.writeFileSync(crossDomain, JSON.stringify({ ...mut, id: 'mut-1', domain: 'doc' }, null, 2) + '\n');
    ok(throwsEngine(() => recordMutation(td, crossDomain, 'tester')),
      'mutation: same id in another domain refused');

    // 读命令：确定性渲染（逐字金样，抓输出格式漂移而非仅抓非确定性）
    const GOLDEN_MUTATION =
      '[noo-mutation process/mut-1]\n' +
      '\n' +
      'category: refactor\n' +
      'risk: low\n' +
      'target: engine/bin.ts\n' +
      'expected effect: command dispatch stays byte-identical\n';
    ok(renderMutation(readMutation(target)) === GOLDEN_MUTATION, 'mutation: golden render exact match');

    // CLI 面：add / show 与用法错三档
    const bin = path.join(__dirname, 'bin.js');
    fs.writeFileSync(path.join(staging, 'mut-4.json'), JSON.stringify({ ...mut, id: 'mut-4' }, null, 2) + '\n');
    ok(spawnCode([bin, 'mutation', 'add', path.join(staging, 'mut-4.json'), '--actor', 't'], td) === 0,
      'bin: mutation add -> exit 0');
    const shown = execFileSync('node', [bin, 'mutation', 'show', 'process/mut-4'], { cwd: td, encoding: 'utf8', stdio: 'pipe' });
    ok(shown.includes('[noo-mutation process/mut-4]'), 'bin: mutation show renders');
    ok(spawnCode([bin, 'mutation', 'show', 'process/missing'], td) === 2, 'bin: mutation show missing -> exit 2');
    ok(spawnCode([bin, 'mutation', 'add', cand], td) === 2, 'bin: mutation add without --actor -> exit 2');
    ok(spawnCode([bin, 'mutation', 'bogus'], td) === 2, 'bin: unknown mutation subcommand -> exit 2');

    // commit 失败 → 写面与索引都回滚（只清工作树会让回滚的记录以暂存态残留）
    {
      const hooksDir = path.join(td, 'failing-hooks');
      fs.mkdirSync(hooksDir);
      fs.writeFileSync(path.join(hooksDir, 'pre-commit'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
      git(td, ['config', 'core.hooksPath', 'failing-hooks']);
      const rb = path.join(staging, 'mut-rb.json');
      fs.writeFileSync(rb, JSON.stringify({ ...mut, id: 'mut-rb' }, null, 2) + '\n');
      let threw = false;
      try { recordMutation(td, rb, 'tester'); } catch (e) { threw = e instanceof EngineError; }
      ok(threw, 'mutation: commit failure raises EngineError');
      ok(!fs.existsSync(mutationPath(td, 'process', 'mut-rb')), 'mutation: rollback removes placed mutation');
      ok(git(td, ['diff', '--cached', '--name-only']).trim().split('\n').filter((l) => l.includes('mut-rb')).length === 0,
        'mutation: rollback leaves no staged residue');
      // rollbackAppend：事件行也必须消失（只删文件会留下无事件轨的幽灵记录）
      ok(!readEvents(td).some((e) => e.mutation === 'mut-rb'), 'mutation: rollback removes appended event line');
      git(td, ['config', '--unset', 'core.hooksPath']);
    }
  }

  // --- 5.9) Event 扩字段（批次 1 序 3）：五 kind 恒带 env_fingerprint，跨链键可选且可解析 ---
  {
    const td = mkTemp();
    mkRepo(td);
    const gatesDir = path.join(td, 'gates');
    writeGates(gatesDir, [{ name: 'stub-pass', cmd: 'python3', args: ['scripts/stub-pass.py'] }]);
    stubScript(td);
    writeGene(td, 'process', {
      id: 'link-gene', domain: 'process', summary: 'event field fixture',
      signals: ['link'], strategy: ['s'],
    });
    const staging = path.join(td, 'candidates');
    fs.mkdirSync(staging);

    // 先造被引两端：mutation 声明（执行前）+ capsule 记录（执行后）
    const mutCand = path.join(staging, 'link-mut.json');
    fs.writeFileSync(mutCand, JSON.stringify({
      id: 'link-mut', domain: 'process', category: 'refactor', target: 'engine/util.ts',
      expected_effect: 'fingerprint helper lands', risk_level: 'low',
    }, null, 2) + '\n');
    recordMutation(td, mutCand, 'tester');
    const capCand = path.join(staging, 'link-cap.json');
    fs.writeFileSync(capCand, JSON.stringify({
      id: 'link-cap', domain: 'process', gene_ids: ['process/link-gene'],
      trigger: 'link', steps: ['s1'], outcome: { status: 'ok' }, evidence: ['gate green'],
    }, null, 2) + '\n');
    recordCapsule(td, capCand, 'tester');

    // 写入面：无跨链键的两 kind 也必须带指纹
    const seeded = readEvents(td);
    ok(seeded.length === 2 && seeded.every((e) => e.env_fingerprint === envFingerprint()),
      'event: mutation.added / capsule.added carry env_fingerprint');

    // gene 三 kind 逐一落：新增（工作树无此 id）与更新（工作树已有）都带跨链键与指纹
    const freshCand = path.join(staging, 'fresh-gene.json');
    fs.writeFileSync(freshCand, JSON.stringify({
      id: 'fresh-gene', domain: 'process', summary: 'event field fixture',
      signals: ['link'], strategy: ['s'],
    }, null, 2) + '\n');
    ok(solidify(td, gatesDir, freshCand, 'tester', { mutation: 'process/link-mut', capsule: 'process/link-cap' }).ok === true,
      'event: solidify add with cross-links accepted');
    const geneCand = path.join(staging, 'link-gene.json');
    fs.writeFileSync(geneCand, JSON.stringify({
      id: 'link-gene', domain: 'process', summary: 'event field fixture',
      signals: ['link'], strategy: ['s'],
    }, null, 2) + '\n');
    const r = solidify(td, gatesDir, geneCand, 'tester', { mutation: 'process/link-mut', capsule: 'process/link-cap' });
    ok(r.ok === true, 'event: solidify update with cross-links accepted');
    const freshEv = readEvents(td).find((e) => e.gene === 'fresh-gene');
    const updatedEv = readEvents(td).find((e) => e.gene === 'link-gene' && e.kind === 'gene.updated');
    ok(freshEv?.kind === 'gene.added' && updatedEv?.kind === 'gene.updated',
      'event: both gene.added and gene.updated produced');
    ok([freshEv, updatedEv].every((e) => e?.mutation_id === 'link-mut' && e?.capsule_id === 'link-cap'),
      'event: cross-links recorded as bare ids');

    // 悬空 / 形错引用拒写：不留文件、不留事件
    const dangling = path.join(staging, 'dangling-gene.json');
    fs.writeFileSync(dangling, JSON.stringify({
      id: 'dangling-gene', domain: 'process', summary: 'x', signals: ['x'], strategy: ['s'],
    }, null, 2) + '\n');
    ok(throwsEngine(() => solidify(td, gatesDir, dangling, 'tester', { mutation: 'process/no-such-mut' })),
      'event: dangling mutation ref refused');
    ok(throwsEngine(() => solidify(td, gatesDir, dangling, 'tester', { capsule: 'not-a-ref' })),
      'event: malformed capsule ref refused');
    ok(!fs.existsSync(genePath(td, 'process', 'dangling-gene')) && !readEvents(td).some((e) => e.gene === 'dangling-gene'),
      'event: refused cross-link wrote no file and no event');

    // capsule.added 只链声明，不链自身（自身即 `capsule` 键）
    const cap2 = path.join(staging, 'link-cap-2.json');
    fs.writeFileSync(cap2, JSON.stringify({
      id: 'link-cap-2', domain: 'process', gene_ids: ['process/link-gene'],
      trigger: 'link', steps: ['s1'], outcome: { status: 'ok' }, evidence: ['gate green'],
    }, null, 2) + '\n');
    recordCapsule(td, cap2, 'tester', { mutation: 'process/link-mut' });
    const capEv = readEvents(td).find((e) => e.capsule === 'link-cap-2');
    ok(capEv?.mutation_id === 'link-mut' && capEv?.capsule_id === undefined,
      'event: capsule.added links the declaration, never itself');
    ok(throwsEngine(() => recordCapsule(td, cap2, 'tester', { mutation: 'process/no-such-mut' })),
      'event: capsule add refuses dangling mutation ref');

    // gene.retired 同样带跨链键（五 kind 收齐后统一断言指纹全覆盖）
    ok(retire(td, 'process/link-gene', 'tester', { mutation: 'process/link-mut', capsule: 'process/link-cap' }).ok === true,
      'event: retire with cross-links accepted');
    const retiredEv = readEvents(td).find((e) => e.kind === 'gene.retired');
    ok(retiredEv?.gene === 'link-gene' && retiredEv?.mutation_id === 'link-mut' && retiredEv?.capsule_id === 'link-cap',
      'event: gene.retired carries cross-links');
    const finalEvs = readEvents(td);
    ok(new Set(finalEvs.map((e) => e.kind)).size === 5 && finalEvs.every((e) => e.env_fingerprint === envFingerprint()),
      'event: all 5 kinds carry env_fingerprint');

    // CLI 端到端：旗标落事件；缺值 fail-loud（exit 2）。引擎目录复制进沙箱以换 stub 白名单
    const engineCopy = path.join(td, 'engine-copy');
    fs.cpSync(__dirname, engineCopy, { recursive: true });
    writeGates(engineCopy, [{ name: 'stub-pass', cmd: 'python3', args: ['scripts/stub-pass.py'] }]);
    const bin = path.join(engineCopy, 'bin.js');
    const cliGene = path.join(staging, 'cli-gene.json');
    fs.writeFileSync(cliGene, JSON.stringify({
      id: 'cli-gene', domain: 'process', summary: 'x', signals: ['x'], strategy: ['s'],
    }, null, 2) + '\n');
    ok(spawnCode([bin, 'solidify', cliGene, '--actor', 't', '--mutation', 'process/link-mut', '--capsule', 'process/link-cap'], td) === 0,
      'bin: solidify with cross-link flags -> exit 0');
    const cliEv = readEvents(td).find((e) => e.gene === 'cli-gene');
    ok(cliEv?.mutation_id === 'link-mut' && cliEv?.capsule_id === 'link-cap',
      'bin: cross-link flags reach the event line');
    ok(spawnCode([bin, 'solidify', cliGene, '--actor', 't', '--mutation'], td) === 2,
      'bin: valueless --mutation -> exit 2');
    ok(spawnCode([bin, 'capsule', 'add', cap2, '--actor', 't', '--mutation'], td) === 2,
      'bin: capsule add valueless --mutation -> exit 2');
  }

  // --- 5.5) bin.js 退出码三档端到端（fail-closed = exit 2，非堆栈 exit 1）---
  {
    const td = mkTemp();
    mkRepo(td);
    fs.mkdirSync(path.join(td, 'genes', 'process'), { recursive: true });
    fs.writeFileSync(path.join(td, 'genes', 'process', 'broken.json'), '{not json');
    const bin = path.join(__dirname, 'bin.js');
    ok(spawnCode([bin, 'select', 'anything'], td) === 2,
      'bin: malformed gene + select -> exit 2 (fail-closed, no stack)');
    ok(spawnCode([bin, 'propose', 'process/missing'], td) === 2,
      'bin: propose missing gene -> exit 2');

    // 诊断分流（bug-fix ADR 2026-09-06-git-prerequisite-and-diagnosis）：
    // git 二进制缺失（PATH 清空 → 子进程内 spawn 'git' ENOENT）必须指名 git，
    // 不得误报「not inside a git repository」；exit 2 fail-closed 与非 git 仓
    // 同档。node 必须以 process.execPath 绝对路径 spawn——裸名 'node' 也按被
    // 清空的 PATH 解析，引擎根本不会启动。
    const tdNoGit = mkTemp();
    mkRepo(tdNoGit);
    let gitMissingMsg = '';
    let gitMissingStatus: number | null = null;
    try {
      execFileSync(process.execPath, [bin, 'select', 'anything'], {
        cwd: tdNoGit, encoding: 'utf8', stdio: 'pipe',
        env: { ...process.env, PATH: '' },
      });
    } catch (e) {
      // execFileSync 的失败抛物携带 .status/.stderr/.stdout（encoding utf8 → string 面）。
      const err = e as { status?: number | null; stderr?: string; stdout?: string };
      gitMissingStatus = err.status ?? null;
      gitMissingMsg = `${err.stderr || ''}${err.stdout || ''}`;
    }
    ok(gitMissingStatus === 2 && gitMissingMsg.includes('git binary not found') && !gitMissingMsg.includes('not inside a git repository'),
      'bin: git missing -> exit 2 with git-not-found diagnosis (not misread as non-repo)');
  }

  // --- 5.6) bin.js e2e 装配夹具（CLI 参数分派 + 真实 spawn 路径；直调函数盖不到的面）---
  {
    const td = mkTemp();
    mkRepo(td);
    // select / propose happy path：真 bin、真基因、真 spawn
    writeGene(td, 'process', {
      id: 'e2e-gene', domain: 'process', summary: 'e2e fixture',
      signals: ['e2e signal'], strategy: ['step'],
    });
    const bin = path.join(__dirname, 'bin.js');
    const out = execFileSync('node', [bin, 'select', 'E2E  Signal'], { cwd: td, encoding: 'utf8', stdio: 'pipe' });
    ok(out.includes('process/e2e-gene'), 'bin e2e: select happy path exits 0 and matches (normalized)');
    const pout = execFileSync('node', [bin, 'propose', 'process/e2e-gene'], { cwd: td, encoding: 'utf8', stdio: 'pipe' });
    ok(pout.includes('[noo-gene process/e2e-gene] e2e fixture'),
      'bin e2e: propose happy path renders injection text via real CLI wiring');

    // propose --out 用法错误钉 exit 2（缺值/空串值同档——空串不防会静默降级 stdout 回潮）
    ok(spawnCode([bin, 'propose', 'process/e2e-gene', '--out'], td) === 2, 'bin: --out without value -> exit 2 (usage)');
    ok(spawnCode([bin, 'propose', 'process/e2e-gene', '--out', ''], td) === 2, 'bin: --out with empty value -> exit 2 (usage)');
    // --out 正常路径：写文件且报告，stdout 不承载注入文本
    const renderedPath = path.join(td, 'rendered.txt');
    const wcode = spawnCode([bin, 'propose', 'process/e2e-gene', '--out', renderedPath], td);
    ok(wcode === 0 && fs.readFileSync(renderedPath, 'utf8').includes('[noo-gene process/e2e-gene]'),
      'bin: propose --out writes injection text to file');

    // solidify 全链 e2e：引擎目录复制到沙箱（gates.json 可换成 stub），CLI 真装配
    const engineCopy = path.join(td, 'engine-copy');
    fs.cpSync(__dirname, engineCopy, { recursive: true });
    stubScript(td);
    writeGates(engineCopy, [{ name: 'stub-pass', cmd: 'python3', args: ['scripts/stub-pass.py'] }]);
    const staging = path.join(td, 'candidates');
    fs.mkdirSync(staging);
    const cand = path.join(staging, 'e2e-solid.json');
    fs.writeFileSync(cand, JSON.stringify({
      id: 'e2e-solid', domain: 'gates', summary: 'solidify e2e',
      signals: ['sol'], strategy: ['s'],
    }, null, 2) + '\n');
    execFileSync('node', [path.join(engineCopy, 'bin.js'), 'solidify', cand, '--actor', 't'],
      { cwd: td, encoding: 'utf8', stdio: 'pipe' });
    ok(fs.existsSync(genePath(td, 'gates', 'e2e-solid')), 'bin e2e: solidify places gene via real CLI wiring');
    ok(readEvents(td).some((e) => e.gene === 'e2e-solid' && e.kind === 'gene.added'),
      'bin e2e: solidify appends event via real CLI wiring');

    // 红档 exit 1：stub 闸挂红 → 评估红（D6 第三档的 CLI 级断言）
    writeGates(engineCopy, [{ name: 'stub-pass', cmd: 'python3', args: ['scripts/stub-pass.py'] },
                            { name: 'stub-fail', cmd: 'python3', args: ['scripts/stub-fail.py'] }]);
    ok(spawnCode([path.join(engineCopy, 'bin.js'), 'evaluate', 'gates/e2e-solid'], td) === 1,
      'bin e2e: evaluate red gate -> exit 1');

    // fail-closed exit 2，根因钉死：gates.json 引用缺失脚本（engineCopy 沙箱，不耦合真实 gates.json）
    writeGates(engineCopy, [{ name: 'ghost', cmd: 'python3', args: ['scripts/no-such-script.py'] }]);
    ok(spawnCode([path.join(engineCopy, 'bin.js'), 'evaluate', 'gates/e2e-solid'], td) === 2,
      'bin e2e: evaluate fail-closed (referenced script missing) -> exit 2');
  }

  // --- 6) P2 共享客户端：pull + 合并扫描（本仓优先遮蔽 / 读路径合并）---
  {
    const bank = mkTemp();
    mkRepo(bank);
    writeGene(bank, 'doc', {
      id: 'bank-gene', domain: 'doc', summary: 'bank copy',
      signals: ['bank signal'], strategy: ['bank step'],
    });
    git(bank, ['add', '-A']);
    git(bank, ['commit', '-qm', 'bank gene']);

    const td = mkTemp();
    mkRepo(td);
    writeGene(td, 'process', {
      id: 'local-gene', domain: 'process', summary: 'local copy',
      signals: ['local signal'], strategy: ['local step'],
    });

    const { pullBank } = require('./pull.js');
    const r1 = pullBank(td, bank);
    ok(r1.action === 'cloned' && r1.count === 1, 'pull: clone into default cache (<repoRoot>/.noogenesis/genes-cache)');
    ok(fs.existsSync(defaultCacheDir(td)), 'pull: default cache dir in place');

    // 合并扫描：缓存基因进 select 命中面
    const merged = selectGenes(td, ['bank signal', 'local signal']);
    ok(merged.hits.length === 2, 'select: cache genes merged into scan roots');
    ok(merged.hits.some((h) => h.ref === 'doc/bank-gene'), 'select: cache gene selectable');

    // 本仓优先：同 ref 双份 → 本仓版本胜出（缓存副本被遮蔽，不报错）
    writeGene(td, 'doc', {
      id: 'bank-gene', domain: 'doc', summary: 'local wins',
      signals: ['bank signal'], strategy: ['local step'],
    });
    const hit = scanGenes(td).find((g) => g.ref === 'doc/bank-gene');
    ok(hit && hit.obj.summary === 'local wins' && hit.path.startsWith(td),
      'merge: repo gene shadows same-ref cache copy (repo-first)');

    // 缓存侧坏 JSON → warn-skip（降级不红）；本仓坏 JSON 仍 fail-closed。
    fs.writeFileSync(path.join(defaultCacheDir(td), 'genes', 'doc', 'broken.json'), '{not json');
    const withBad = selectGenes(td, ['bank signal']);
    ok(withBad.hits.length === 1 && withBad.hits[0]?.ref === 'doc/bank-gene',
      'merge: unparseable CACHE gene skipped (degrade, not red)');

    // 换库 URL 撞已有缓存 → fail-closed 指引
    const bank2 = mkTemp();
    mkRepo(bank2);
    ok(throwsEngine(() => pullBank(td, bank2)), 'pull: different bank URL on existing cache refused');

    // 更新：bank 新增基因 → --ff-only 更新 + 计数（报告面容错：坏文件不计入）
    writeGene(bank, 'gates', {
      id: 'bank-gene-2', domain: 'gates', summary: 'second',
      signals: ['bank2'], strategy: ['s'],
    });
    git(bank, ['add', '-A']);
    git(bank, ['commit', '-qm', 'second gene']);
    const r2 = pullBank(td, bank);
    ok(r2.action === 'updated' && r2.count === 2, 'pull: ff-only update refreshes cache (broken cache file not counted)');

    // fail-closed：非 git 缓存目录 / 空 URL / 缓存 = 仓根本体 / 缓存入 genes/ 子树
    const bad = mkTemp();
    mkRepo(bad);
    fs.mkdirSync(defaultCacheDir(bad), { recursive: true });
    ok(throwsEngine(() => pullBank(bad, bank)), 'pull: non-git cache dir refused (fail-closed)');
    ok(throwsEngine(() => pullBank(bad, '')), 'pull: empty URL refused');
    ok(throwsEngine(() => pullBank(bad, bank, bad)), 'pull: cache dir = repo root refused');
    ok(throwsEngine(() => pullBank(bad, bank, path.join(bad, 'genes', 'sub'))), 'pull: cache dir inside genes/ subtree refused');
    const bin = path.join(__dirname, 'bin.js');
    ok(spawnCode([bin, 'pull'], bad) === 2, 'bin: pull without URL -> exit 2 (usage)');
    ok(spawnCode([bin, 'pull', 'x', '--cache'], bad) === 2, 'bin: --cache without value -> exit 2 (usage)');
    ok(spawnCode([bin, 'pull', '--cache', 'a', '--cache', 'b', 'url'], bad) === 2, 'bin: duplicate --cache -> exit 2 (usage)');

    // CLI 级：缓存-only ref 不可 evaluate（exit 2 gene not found）且缓存坏 JSON 不打红 select
    const out2 = execFileSync('node', [bin, 'select', 'bank2'], { cwd: td, encoding: 'utf8', stdio: 'pipe' });
    ok(out2.includes('gates/bank-gene-2'), 'bin: select still hits good cache gene with broken sibling present');
    ok(spawnCode([bin, 'evaluate', 'gates/bank-gene-2'], td) === 2,
      'bin: evaluate refuses cache-only ref (D6 read/write isolation)');

    // 默认离线：无缓存目录 → 扫描与 0.1.1 行为一致
    const clean = mkTemp();
    mkRepo(clean);
    ok(scanGenes(clean).length === 0, 'merge: no cache dir → scan identical to offline (default)');
  }

  if (hasFailure === false) {
    console.log('== engine self-test passed ==');
    return 0;
  }
  console.error('== engine self-test failed ==');
  return 1;
}

export { selfTest };
