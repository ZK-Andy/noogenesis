// bin.ts — CLI 五命令合同面（骨架 ADR D1：select/propose/evaluate/solidify 为唯一合同面；P2 增 pull 只读消费）+ self-test 元评测。
// 零第三方依赖（Node 标准库 only）；退出码：0 成功 / 1 红（评估不绿、违规） / 2 用法或 fail-closed 错误。

import * as path from 'path';
import * as fs from 'fs';

const ENGINE_ROOT = __dirname;

function usage(): string {
  return [
    'usage:',
    '  node dist/engine/bin.js select <signal>... [--stdin]        # 信号 → 基因匹配（归一化字面匹配，多键并集）',
    '  node dist/engine/bin.js propose <domain>/<id> [--out FILE]  # 确定性渲染注入文本（stdout 或文件）',
    '  node dist/engine/bin.js evaluate <domain>/<id>              # gates.json 全集 + 约束；红即拒',
    '  node dist/engine/bin.js solidify <candidate.json> --actor N # 入档：evaluate 全绿 → genes/ + events/ 同一 commit',
    '  node dist/engine/bin.js solidify --retire <domain>/<id> --actor N',
    '  node dist/engine/bin.js pull <bank-url> [--cache DIR]       # 只读消费：clone/pull 基因库进仓内缓存（P2）',
    '  node dist/engine/bin.js self-test                           # 元评测夹具（临时沙箱，不触碰真实仓）',
    '',
  ].join('\n');
}

function fail(msg: string, code = 2): never {
  process.stderr.write(`engine: ${msg}\n`);
  process.exit(code);
}

function gitRoot(start: string): string | null {
  const { execFileSync } = require('child_process');
  try {
    return execFileSync('git', ['-C', start, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch (e) {
    // 诊断分流（bug-fix ADR 2026-09-06-git-prerequisite-and-diagnosis）：
    // git 二进制缺失（spawn ENOENT）≠ cwd 不在 git 仓——两者曾共用同一句
    // 「not inside a git repository」，git 没装时误导诊断。exit 2 fail-closed
    // 与退出码三档不变，仅 stderr 文案指名失败主体。
    if (e && (e as { code?: unknown }).code === 'ENOENT') fail('git binary not found — install git (the engine requires a git repository and the git CLI)');
    return null;
  }
}

function main(argv: string[]): number {
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
    const { runSelect } = require('./select.js');
    let out;
    try {
      out = runSelect(repoRoot, signals);
    } catch (e) {
      // 原 js 的鸭子判据（e.engine 真值）原样保留：EngineError 是唯一携带 .engine 的抛物。
      if ((e as { engine?: unknown }).engine) return fail((e as Error).message, 2);
      throw e;
    }
    process.stdout.write(out.stdout);
    return out.code;
  }

  if (cmd === 'propose') {
    const outIdx = rest.indexOf('--out');
    const outFile: string | null | undefined = outIdx >= 0 ? rest[outIdx + 1] : null;
    const ref = rest.find((a) => a !== '--out' && a !== outFile);
    if (!ref) fail('propose needs <domain>/<id>');
    const { scanGenes } = require('./gene.js');
    const { renderGene, resolveGeneRef } = require('./propose.js');
    let hit;
    try {
      const genes = scanGenes(repoRoot);
      hit = resolveGeneRef(repoRoot, ref, genes);
    } catch (e) {
      if ((e as { engine?: unknown }).engine) return fail((e as Error).message, 2);
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
    const { evaluateGene, formatReport } = require('./evaluate.js');
    let ev;
    try {
      ev = evaluateGene(repoRoot, engineRoot, ref);
    } catch (e) {
      if ((e as { engine?: unknown }).engine) return fail((e as Error).message, 2);
      throw e;
    }
    process.stdout.write(formatReport(ev));
    return ev.ok ? 0 : 1;
  }

  if (cmd === 'solidify') {
    const actorIdx = rest.indexOf('--actor');
    const actor = actorIdx >= 0 ? rest[actorIdx + 1] : null;
    const retireIdx = rest.indexOf('--retire');
    const { solidify, retire } = require('./solidify.js');
    const candidate = rest.find((a, i) => a !== '--actor' && i !== actorIdx + 1
      && (retireIdx < 0 || i !== retireIdx + 1));
    if (!candidate) fail('solidify needs <candidate.json> or --retire <domain>/<id>');
    if (!actor) fail('solidify needs --actor <name>');
    let r;
    try {
      // rest[retireIdx + 1] as string：保留原 js 的 undefined-ref 未捕获 TypeError（→ exit 1）路径——
      // 收窄为 EngineError 会改写这一极端 token 序列（如 `--actor t --retire` 收尾）的退出档位。
      r = retireIdx >= 0
        ? retire(repoRoot, engineRoot, rest[retireIdx + 1] as string, actor)
        : solidify(repoRoot, engineRoot, path.resolve(candidate), actor);
    } catch (e) {
      if ((e as { engine?: unknown }).engine) return fail((e as Error).message, 2);
      throw e;
    }
    process.stdout.write(r.report);
    return r.ok ? 0 : 1;
  }

  if (cmd === 'pull') {
    // 解析：--cache <dir> 至多一次（缺值/重复 → exit 2，评审 R2-S1/S2）；
    // 其余 token 必须恰为 <bank-url> 一个（未知旗标落进 url 计数 → 干净报错）。
    const cacheVals: string[] = [];
    const rest2: string[] = [];
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === '--cache') {
        const val = rest[i + 1];
        if (val === undefined) fail('pull needs --cache <dir>');
        cacheVals.push(val);
        i++;
        continue;
      }
      rest2.push(rest[i]!);
    }
    if (cacheVals.length > 1) fail('pull accepts --cache at most once');
    if (rest2.length !== 1) fail('pull needs exactly one <bank-url>');
    const bankUrl = rest2[0];
    if (bankUrl === undefined) fail('pull needs exactly one <bank-url>'); // 不可达窄化（上一行已保证恰一个）
    const { pullBank } = require('./pull.js');
    let r;
    try {
      r = pullBank(repoRoot, bankUrl, cacheVals[0] || null);
    } catch (e) {
      if ((e as { engine?: unknown }).engine) return fail((e as Error).message, 2);
      throw e;
    }
    process.stdout.write(r.report);
    return 0;
  }

  if (cmd === 'self-test') {
    const { selfTest } = require('./selftest.js');
    return selfTest();
  }

  process.stderr.write(usage());
  return 2;
}

if (require.main === module) {
  const code = main(process.argv.slice(2));
  process.exit(code);
}
