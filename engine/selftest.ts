// selftest.ts — 元评测夹具（schema ADR S3）：对齐 verify-* self-test 惯例，违约样例必须 FAIL。
// 自托管纪律：全程临时目录/沙箱，不触碰真实仓（引擎测试自己不污染被演化对象）。

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';

import { normalizeSignal, sha256Hex, EngineError } from './util.js';
import { loadGates } from './gates.js';
import { selectGenes } from './select.js';
import { renderGene } from './propose.js';
import { evaluateGeneObj, checkConstraints } from './evaluate.js';
import { solidify, retire } from './solidify.js';
import { genePath, scanGenes, defaultCacheDir } from './gene.js';

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
      git(td, ['config', '--unset', 'core.hooksPath']);
    }
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
