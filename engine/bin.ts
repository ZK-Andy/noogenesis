// bin.ts — CLI 十命令合同面（骨架 ADR D1：select/propose/evaluate/solidify 为唯一合同面；P2 增 pull 只读消费；融合轮第一期增 observe 观测面写入；批次 1 序 1 增 capsule 写读、序 2 增 mutation 写读；批次 6 序 30 增 distill 蒸馏面；批次 9 序 44 增 list 只读盘点面）+ self-test 元评测。
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
    '  node dist/engine/bin.js solidify <candidate.json> --actor N [--mutation <ref>] [--capsule <ref>]',
    '      # 入档：evaluate 全绿 → genes/ + events/ 同一 commit；跨链旗标可选，指向本轮演化的声明与执行记录',
    '  node dist/engine/bin.js solidify --retire <domain>/<id> --actor N [--mutation <ref>] [--capsule <ref>]',
    '  node dist/engine/bin.js pull <bank-url> [--cache DIR]       # 只读消费：clone/pull 基因库进仓内缓存（P2）',
    '  node dist/engine/bin.js observe --signal S --gene <domain>/<id> --outcome ok|fail --actor N [--evidence TEXT]',
    '      # 观测输入面：append-only 写入 .noogenesis/observations/（写路径 fail-closed）',
    '  node dist/engine/bin.js capsule add <candidate.json> --actor N [--mutation <ref>]',
    '      # Capsule 入档：capsules/ + events/ 同一 commit；--mutation 指向兑现的声明（可选）',
    '  node dist/engine/bin.js capsule show <domain>/<id>                  # 读并渲染单条 Capsule（确定性输出）',
    '  node dist/engine/bin.js mutation add <candidate.json> --actor N     # Mutation 声明：mutations/ + events/ 同一 commit',
  '  node dist/engine/bin.js mutation show <domain>/<id>          # 读并渲染单条 Mutation（确定性输出）',
  '  node dist/engine/bin.js distill collect                      # 失败面汇编（events fail / capsules fail / genes avoid；只读）',
  '  node dist/engine/bin.js distill add <candidate.json>         # 候选落盘 candidates/（基因形；不发事件；压缩在宿主侧）',
  '  node dist/engine/bin.js distill show <domain>/<id>           # 读并渲染单条候选（确定性输出）',
  '  node dist/engine/bin.js list                                # 只读盘点：genes（含 cache 标记）/capsules/mutations（命令面 ADR）',
  '  node dist/engine/bin.js self-test                           # 元评测夹具（临时沙箱，不触碰真实仓）',
    '',
  ].join('\n');
}

function fail(msg: string, code = 2): never {
  process.stderr.write(`engine: ${msg}\n`);
  process.exit(code);
}

// 旗标取值（首个出现处）：缺值（含空串）由调用方 fail-loud，不静默当作缺席。
function flagValue(rest: string[], flag: string): { present: boolean; value: string | null } {
  const i = rest.indexOf(flag);
  return i < 0 ? { present: false, value: null } : { present: true, value: rest[i + 1] || null };
}

// 已被旗标消费的 token 下标（旗标自身 + 其后值）：位置参数筛选式用。
function consumedIndexes(rest: string[], flags: string[]): Set<number> {
  const out = new Set<number>();
  for (const flag of flags) {
    const i = rest.indexOf(flag);
    if (i >= 0) { out.add(i); out.add(i + 1); }
  }
  return out;
}

function gitRoot(start: string): string | null {
  const { execFileSync } = require('child_process');
  try {
    return execFileSync('git', ['-C', start, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch (e) {
    // 诊断分流（bug-fix ADR 2026-09-06-git-prerequisite-and-diagnosis）：
    // git 二进制缺失（spawn ENOENT）≠ cwd 不在 git 仓——无此分流时 git 没装会
    // 误报「not inside a git repository」；stderr 文案指名失败主体，exit 2 fail-closed。
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
      // 鸭子判据：EngineError 是唯一携带 .engine 真值的抛物 → CLI 层 exit 2；其余抛物向上重抛（→ exit 1）。
      if ((e as { engine?: unknown }).engine) return fail((e as Error).message, 2);
      throw e;
    }
    process.stdout.write(out.stdout);
    return out.code;
  }

  if (cmd === 'propose') {
    // 用法错误与 pull --cache / solidify --actor 同口径：旗标在末尾缺值（含空串值）→
    // exit 2 fail-loud，绝不无痕降级为 stdout 打印（显式 --out 被吞是调用方拿不到的失败）。
    const outIdx = rest.indexOf('--out');
    if (outIdx >= 0 && !rest[outIdx + 1]) fail('propose: --out needs a file path');
    const outFile: string | null = outIdx >= 0 ? rest[outIdx + 1]! : null;
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
    // 跨链旗标（批次 1 序 3 ADR E5）：值形与被引对象在场性由 engine 侧 fail-closed 判。
    const mutation = flagValue(rest, '--mutation');
    const capsule = flagValue(rest, '--capsule');
    if (mutation.present && !mutation.value) fail('solidify: --mutation needs a <domain>/<id> value');
    if (capsule.present && !capsule.value) fail('solidify: --capsule needs a <domain>/<id> value');
    const { solidify, retire } = require('./solidify.js');
    const flags = ['--actor', '--retire', '--mutation', '--capsule'];
    const skip = consumedIndexes(rest, flags);
    const candidate = retireIdx >= 0 ? undefined : rest.find((a, i) => !skip.has(i) && !flags.includes(a));
    if (retireIdx < 0 && !candidate) fail('solidify needs <candidate.json> or --retire <domain>/<id>');
    if (!actor) fail('solidify needs --actor <name>');
    const links = { mutation: mutation.value, capsule: capsule.value };
    let r;
    try {
      // `--retire` 收尾（旗标后无 ref token）按未捕获 TypeError 落 exit 1——不收窄为
      // EngineError（那会把该 token 序列从 exit 1 改写为 exit 2）。
      r = retireIdx >= 0
        ? retire(repoRoot, rest[retireIdx + 1] as string, actor, links)
        : solidify(repoRoot, engineRoot, path.resolve(candidate as string), actor, links);
    } catch (e) {
      if ((e as { engine?: unknown }).engine) return fail((e as Error).message, 2);
      throw e;
    }
    process.stdout.write(r.report);
    return r.ok ? 0 : 1;
  }

  if (cmd === 'pull') {
    // 解析：--cache <dir> 至多一次（缺值/重复 → exit 2）；
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
    // 上一行已保证恰一个——防御性窄化（noUncheckedIndexedAccess 不随数组长度收窄）。
    const bankUrl = rest2[0];
    if (bankUrl === undefined) fail('pull needs exactly one <bank-url>');
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

  if (cmd === 'observe') {
    // 观测输入面写入（融合立宪 D8/D10）：五旗标各至多一次、各需值；无位置参数。
    // 校验（封闭字段/形状/枚举/长度）全在 observe.js，违约 → exit 2 且不落盘。
    const flags = ['--signal', '--gene', '--outcome', '--actor', '--evidence'];
    const vals: Record<string, string> = {};
    for (let i = 0; i < rest.length; i++) {
      const flag = rest[i]!;
      if (!flags.includes(flag)) fail(`observe: unknown argument ${flag}`);
      const val = rest[i + 1];
      if (val === undefined) fail(`observe: ${flag} needs a value`);
      if (vals[flag] !== undefined) fail(`observe: ${flag} accepts at most once`);
      vals[flag] = val;
      i++;
    }
    for (const required of ['--signal', '--gene', '--outcome', '--actor']) {
      if (vals[required] === undefined) fail(`observe needs ${required} <value>`);
    }
    const { recordObservation } = require('./observe.js');
    let r;
    try {
      r = recordObservation(repoRoot, {
        signal: vals['--signal'], gene: vals['--gene'], outcome: vals['--outcome'],
        actor: vals['--actor'], evidence: vals['--evidence'],
      });
    } catch (e) {
      if ((e as { engine?: unknown }).engine) return fail((e as Error).message, 2);
      throw e;
    }
    process.stdout.write(r.report);
    return 0;
  }

  if (cmd === 'capsule') {
    // 子命令面：add（写，须 --actor）/ show（读）。未知子命令 → exit 2 用法错。
    const sub = rest[0];
    if (sub === 'add') {
      const actorIdx = rest.indexOf('--actor');
      const actor = actorIdx >= 0 ? rest[actorIdx + 1] : null;
      const mutation = flagValue(rest, '--mutation');
      if (mutation.present && !mutation.value) fail('capsule add: --mutation needs a <domain>/<id> value');
      const flags = ['--actor', '--mutation'];
      const skip = consumedIndexes(rest, flags);
      const candidate = rest.find((a, i) => i > 0 && !skip.has(i) && !flags.includes(a));
      if (!candidate) fail('capsule add needs <candidate.json>');
      if (!actor) fail('capsule add needs --actor <name>');
      const { recordCapsule } = require('./solidify.js');
      let r;
      try {
        r = recordCapsule(repoRoot, path.resolve(candidate), actor, { mutation: mutation.value });
      } catch (e) {
        if ((e as { engine?: unknown }).engine) return fail((e as Error).message, 2);
        throw e;
      }
      process.stdout.write(r.report);
      return 0;
    }
    if (sub === 'show') {
      const ref = rest[1];
      if (!ref) fail('capsule show needs <domain>/<id>');
      const { readCapsule, capsulePath, renderCapsule } = require('./capsule.js');
      let obj;
      try {
        const [domain, id] = ref.split('/');
        if (!domain || !id) fail('capsule show ref must be <domain>/<id>');
        obj = readCapsule(capsulePath(repoRoot, domain, id));
      } catch (e) {
        if ((e as { engine?: unknown }).engine) return fail((e as Error).message, 2);
        throw e;
      }
      process.stdout.write(renderCapsule(obj));
      return 0;
    }
    fail(sub ? `capsule: unknown subcommand ${sub}` : 'capsule needs a subcommand (add|show)');
  }

  if (cmd === 'mutation') {
    // 子命令面：add（写，须 --actor）/ show（读）。未知子命令 → exit 2 用法错。
    const sub = rest[0];
    if (sub === 'add') {
      const actorIdx = rest.indexOf('--actor');
      const actor = actorIdx >= 0 ? rest[actorIdx + 1] : null;
      const candidate = rest.find((a, i) => i > 0 && a !== '--actor' && i !== actorIdx + 1);
      if (!candidate) fail('mutation add needs <candidate.json>');
      if (!actor) fail('mutation add needs --actor <name>');
      const { recordMutation } = require('./solidify.js');
      let r;
      try {
        r = recordMutation(repoRoot, path.resolve(candidate), actor);
      } catch (e) {
        if ((e as { engine?: unknown }).engine) return fail((e as Error).message, 2);
        throw e;
      }
      process.stdout.write(r.report);
      return 0;
    }
    if (sub === 'show') {
      const ref = rest[1];
      if (!ref) fail('mutation show needs <domain>/<id>');
      const { readMutation, mutationPath, renderMutation } = require('./mutation.js');
      let obj;
      try {
        const [domain, id] = ref.split('/');
        if (!domain || !id) fail('mutation show ref must be <domain>/<id>');
        obj = readMutation(mutationPath(repoRoot, domain, id));
      } catch (e) {
        if ((e as { engine?: unknown }).engine) return fail((e as Error).message, 2);
        throw e;
      }
      process.stdout.write(renderMutation(obj));
      return 0;
    }
    fail(sub ? `mutation: unknown subcommand ${sub}` : 'mutation needs a subcommand (add|show)');
  }

  if (cmd === 'list') {
    // 只读盘点面（批次 9 序 44 命令面 ADR D1）：零参数、零写零事件；scanGenes
    // 的缓存坏件 warn-skip 照旧（stderr 一行，exit 不红）。
    if (rest.length) fail(`list accepts no arguments (got ${rest.join(' ')})`);
    const { runList } = require('./list.js');
    let r;
    try {
      r = runList(repoRoot);
    } catch (e) {
      if ((e as { engine?: unknown }).engine) return fail((e as Error).message, 2);
      throw e;
    }
    process.stdout.write(r.report);
    return 0;
  }

  if (cmd === 'distill') {
    // 子命令面：collect（只读汇编）/ add（候选落盘）/ show（读）。未知子命令 → exit 2 用法错。
    const sub = rest[0];
    if (sub === 'collect') {
      if (rest.length > 1) fail(`distill collect: unknown argument ${rest[1]}`);
      const { collect } = require('./distill.js');
      let out;
      try {
        out = collect(repoRoot);
      } catch (e) {
        if ((e as { engine?: unknown }).engine) return fail((e as Error).message, 2);
        throw e;
      }
      process.stdout.write(out);
      return 0;
    }
    if (sub === 'add') {
      const candidate = rest.find((a, i) => i > 0 && !a.startsWith('--'));
      if (!candidate) fail('distill add needs <candidate.json>');
      const { addCandidate } = require('./distill.js');
      let r;
      try {
        r = addCandidate(repoRoot, path.resolve(candidate));
      } catch (e) {
        if ((e as { engine?: unknown }).engine) return fail((e as Error).message, 2);
        throw e;
      }
      process.stdout.write(r.report);
      return 0;
    }
    if (sub === 'show') {
      const ref = rest[1];
      if (!ref) fail('distill show needs <domain>/<id>');
      const { showCandidate } = require('./distill.js');
      let out;
      try {
        const [domain, id] = ref.split('/');
        if (!domain || !id) fail('distill show ref must be <domain>/<id>');
        out = showCandidate(repoRoot, domain, id);
      } catch (e) {
        if ((e as { engine?: unknown }).engine) return fail((e as Error).message, 2);
        throw e;
      }
      process.stdout.write(out);
      return 0;
    }
    fail(sub ? `distill: unknown subcommand ${sub}` : 'distill needs a subcommand (collect|add|show)');
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
