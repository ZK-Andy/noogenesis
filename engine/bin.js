'use strict';
// bin.js — CLI 五命令合同面（骨架 ADR D1：select/propose/evaluate/solidify 为唯一合同面；P2 增 pull 只读消费）+ self-test 元评测。
// 零第三方依赖（Node 标准库 only）；退出码：0 成功 / 1 红（评估不绿、违规） / 2 用法或 fail-closed 错误。

const path = require('path');
const fs = require('fs');

const ENGINE_ROOT = __dirname;

function usage() {
  return [
    'usage:',
    '  node engine/bin.js select <signal>... [--stdin]        # 信号 → 基因匹配（归一化字面匹配，多键并集）',
    '  node engine/bin.js propose <domain>/<id> [--out FILE]  # 确定性渲染注入文本（stdout 或文件）',
    '  node engine/bin.js evaluate <domain>/<id>              # gates.json 全集 + 约束；红即拒',
    '  node engine/bin.js solidify <candidate.json> --actor N # 入档：evaluate 全绿 → genes/ + events/ 同一 commit',
    '  node engine/bin.js solidify --retire <domain>/<id> --actor N',
    '  node engine/bin.js pull <bank-url> [--cache DIR]       # 只读消费：clone/pull 基因库进仓内缓存（P2）',
    '  node engine/bin.js self-test                           # 元评测夹具（临时沙箱，不触碰真实仓）',
    '',
  ].join('\n');
}

function fail(msg, code = 2) {
  process.stderr.write(`engine: ${msg}\n`);
  process.exit(code);
}

function gitRoot(start) {
  const { execFileSync } = require('child_process');
  try {
    return execFileSync('git', ['-C', start, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch (e) {
    // 诊断分流（bug-fix ADR 2026-09-06-git-prerequisite-and-diagnosis）：
    // git 二进制缺失（spawn ENOENT）≠ cwd 不在 git 仓——两者曾共用同一句
    // 「not inside a git repository」，git 没装时误导诊断。exit 2 fail-closed
    // 与退出码三档不变，仅 stderr 文案指名失败主体。
    if (e && e.code === 'ENOENT') fail('git binary not found — install git (the engine requires a git repository and the git CLI)');
    return null;
  }
}

function main(argv) {
  const [cmd, ...rest] = argv;
  const repoRoot = gitRoot(process.cwd()) || fail('not inside a git repository');
  const engineRoot = ENGINE_ROOT;

  if (cmd === 'select') {
    const flags = rest.filter((a) => a === '--stdin');
    const signals = rest.filter((a) => a !== '--stdin');
    if (flags.length && !process.stdin.isTTY) {
      const stdin = fs.readFileSync(0, 'utf8');
      for (const line of stdin.split('\n')) if (line.trim()) signals.push(line.trim());
    }
    if (!signals.length) fail('select needs at least one signal (argv or --stdin)');
    const { runSelect } = require('./select');
    let out;
    try {
      out = runSelect(repoRoot, signals);
    } catch (e) {
      if (e.engine) return fail(e.message, 2);
      throw e;
    }
    process.stdout.write(out.stdout);
    return out.code;
  }

  if (cmd === 'propose') {
    const outIdx = rest.indexOf('--out');
    const outFile = outIdx >= 0 ? rest[outIdx + 1] : null;
    const ref = rest.find((a) => a !== '--out' && a !== outFile);
    if (!ref) fail('propose needs <domain>/<id>');
    const { scanGenes } = require('./gene');
    const { renderGene, resolveGeneRef } = require('./propose');
    let hit;
    try {
      const genes = scanGenes(repoRoot);
      hit = resolveGeneRef(repoRoot, ref, genes);
    } catch (e) {
      if (e.engine) return fail(e.message, 2);
      throw e;
    }
    const text = renderGene(hit.obj);
    if (outFile) {
      fs.writeFileSync(outFile, text, 'utf8');
      process.stdout.write(`propose: wrote ${outFile}\n`);
    } else {
      process.stdout.write(text);
    }
    return 0;
  }

  if (cmd === 'evaluate') {
    const ref = rest[0];
    if (!ref) fail('evaluate needs <domain>/<id>');
    const { evaluateGene, formatReport } = require('./evaluate');
    let ev;
    try {
      ev = evaluateGene(repoRoot, engineRoot, ref);
    } catch (e) {
      if (e.engine) return fail(e.message, 2);
      throw e;
    }
    process.stdout.write(formatReport(ev));
    return ev.ok ? 0 : 1;
  }

  if (cmd === 'solidify') {
    const actorIdx = rest.indexOf('--actor');
    const actor = actorIdx >= 0 ? rest[actorIdx + 1] : null;
    const retireIdx = rest.indexOf('--retire');
    const { solidify, retire } = require('./solidify');
    const candidate = rest.find((a, i) => a !== '--actor' && i !== actorIdx + 1
      && (retireIdx < 0 || i !== retireIdx + 1));
    if (!candidate) fail('solidify needs <candidate.json> or --retire <domain>/<id>');
    if (!actor) fail('solidify needs --actor <name>');
    let r;
    try {
      r = retireIdx >= 0
        ? retire(repoRoot, engineRoot, rest[retireIdx + 1], actor)
        : solidify(repoRoot, engineRoot, path.resolve(candidate), actor);
    } catch (e) {
      if (e.engine) return fail(e.message, 2);
      throw e;
    }
    process.stdout.write(r.report);
    return r.ok ? 0 : 1;
  }

  if (cmd === 'pull') {
    // 解析：--cache <dir> 至多一次（缺值/重复 → exit 2，评审 R2-S1/S2）；
    // 其余 token 必须恰为 <bank-url> 一个（未知旗标落进 url 计数 → 干净报错）。
    const cacheVals = [];
    const rest2 = [];
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === '--cache') {
        if (i + 1 >= rest.length) fail('pull needs --cache <dir>');
        cacheVals.push(rest[i + 1]);
        i++;
        continue;
      }
      rest2.push(rest[i]);
    }
    if (cacheVals.length > 1) fail('pull accepts --cache at most once');
    if (rest2.length !== 1) fail('pull needs exactly one <bank-url>');
    const { pullBank } = require('./pull');
    let r;
    try {
      r = pullBank(repoRoot, rest2[0], cacheVals[0] || null);
    } catch (e) {
      if (e.engine) return fail(e.message, 2);
      throw e;
    }
    process.stdout.write(r.report);
    return 0;
  }

  if (cmd === 'self-test') {
    const { selfTest } = require('./selftest');
    return selfTest();
  }

  process.stderr.write(usage());
  return 2;
}

if (require.main === module) {
  const code = main(process.argv.slice(2));
  process.exit(code);
}
