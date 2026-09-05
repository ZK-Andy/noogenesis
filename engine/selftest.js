'use strict';
// selftest.js — 元评测夹具（schema ADR S3）：对齐 verify-* self-test 惯例，违约样例必须 FAIL。
// 自托管纪律：全程临时目录/沙箱，不触碰真实仓（引擎测试自己不污染被演化对象）。

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const crypto = require('crypto');

const { normalizeSignal, sha256Hex, EngineError } = require('./util');
const { loadGates } = require('./gates');
const { selectGenes } = require('./select');
const { renderGene } = require('./propose');
const { evaluateGeneObj, checkConstraints } = require('./evaluate');
const { solidify, retire } = require('./solidify');
const { genePath } = require('./gene');

let failed = 0;
function ok(cond, msg) {
  if (cond) { console.log(`  ok: ${msg}`); }
  else { console.error(`  FAIL: ${msg}`); failed = 1; }
}

function throwsEngine(fn, msg) {
  try { fn(); } catch (e) { return e instanceof EngineError; }
  return false;
}

function mkTemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'noo-engine-selftest-'));
}

function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' });
}

function mkRepo(root) {
  fs.mkdirSync(root, { recursive: true });
  git(root, ['init', '-q']);
  git(root, ['config', 'user.email', 't@t']);
  git(root, ['config', 'user.name', 't']);
  fs.writeFileSync(path.join(root, 'base.txt'), 'base\n');
  git(root, ['add', '-A']);
  git(root, ['commit', '-qm', 'base']);
  return root;
}

function writeGene(root, domain, obj, fileName) {
  const dir = path.join(root, 'genes', domain);
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, fileName || `${obj.id}.json`);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
  return p;
}

function writeGates(dir, gates) {
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, 'gates.json');
  fs.writeFileSync(p, JSON.stringify({ version: 1, gates }, null, 2) + '\n');
  return p;
}

function stubScript(root) {
  const dir = path.join(root, 'scripts');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'stub-pass.py'), 'print("ok")\n');
  fs.writeFileSync(path.join(dir, 'stub-fail.py'), 'raise SystemExit(1)\n');
  return dir;
}

function readEvents(root) {
  const dir = path.join(root, 'events');
  if (!fs.existsSync(dir)) return [];
  const out = [];
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
    retire(td, gatesDir, 'process/sol-gene', 'tester');
    ok(!fs.existsSync(target), 'retire: gene removed from genes/');
    const ev4 = readEvents(td);
    const last4 = ev4[ev4.length - 1];
    ok(last4.kind === 'gene.retired' && last4.gene_sha === beforeSha && last4.outcome === 'ok',
      'retire: gene.retired event records last content sha');
    ok(throwsEngine(() => retire(td, gatesDir, 'process/sol-gene', 'tester')),
      'retire: retiring a missing gene refused');
  }

  if (failed === 0) {
    console.log('== engine self-test passed ==');
    return 0;
  }
  console.error('== engine self-test failed ==');
  return 1;
}

module.exports = { selfTest };
