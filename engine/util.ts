// util.ts — 引擎共享件：信号归一化 / SHA-256 / 结构化 spawn（不走 shell、最小 env、cwd 锁仓根）/ git 封装 / 改动面度量。
// 安全模型五条的实现载体（schema ADR S3；单源 .agents/notes/implemented/architecture/2026-09-05-gene-event-schema.md）。

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// `<domain>/<id>` 引用形（两个 kebab 段）：Capsule 的 gene_ids、观测记录与事件跨链键共用一份。
const KEBAB_REF_RE = /^[a-z0-9]+(-[a-z0-9]+)*\/[a-z0-9]+(-[a-z0-9]+)*$/;

class EngineError extends Error {
  // engine 真值 = CLI 层 exit 2 分流判据（bin.ts 捕获后 fail(msg, 2)）；面向调用方的失败一律抛此类型。
  engine: boolean;
  constructor(msg: string) { super(msg); this.engine = true; }
}

// 骨架 ADR D2 口径：trim → 小写化 → 内部连续空白折叠为单空格。
function normalizeSignal(s: unknown): string {
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

function sha256Hex(buf: Buffer | string): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// 事件记录环境指纹（批次 1 序 3 ADR E3）：引擎进程运行时三元的可读规范串
// `node<major.minor.patch>[-<prerelease>]/<platform>/<arch>`。强度上限 = 标识写事件的
// 运行时，不是完整工具链冻结；闸件的形状正则与本函数同批（scripts/verify-gene-format.mts）。
function envFingerprint(): string {
  return `node${process.version.replace(/^v/, '')}/${process.platform}/${process.arch}`;
}

// 子进程最小 env：只透传 PATH/HOME（git 身份与 python 解释器定位所需）+ LANG。
function gateEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin', LANG: 'C.UTF-8' };
  if (process.env.HOME) env.HOME = process.env.HOME;
  return env;
}

// gate 输出上限：256 MiB——门禁输出超限时 spawnSync 以 error/返回空收场，不致引擎内存失控。
const SPAWN_MAX_BUFFER = 256 * 1024 * 1024;

// 结构化 spawn：参数数组直传，永不 shell 拼接；工作目录锁死 repoRoot。
function run(cmd: string, args: string[], cwd: string) {
  const r = spawnSync(cmd, args, { cwd, env: gateEnv(), encoding: 'utf8', maxBuffer: SPAWN_MAX_BUFFER });
  return {
    code: r.status === null || r.status === undefined ? -1 : r.status,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    spawnError: r.error ? String(r.error && r.error.message || r.error) : null,
  };
}

function git(repoRoot: string, args: string[]) {
  return run('git', args, repoRoot);
}

// 槽值推导（骨架 ADR D4：取值仅由引擎从 git 事实推导，基因只引用不填值）。
//   {{outgoing_base}} — 与上游的 merge-base；无上游（临时仓/自举仓）回退根提交。
//   {{head}}          — HEAD 解析后的完整 oid。
function deriveSlots(repoRoot: string) {
  let base: string | null = null;
  const up = git(repoRoot, ['merge-base', 'HEAD', '@{upstream}']);
  if (up.code === 0 && up.stdout.trim()) {
    base = up.stdout.trim();
  } else {
    const root = git(repoRoot, ['rev-list', '--max-parents=0', 'HEAD']);
    if (root.code !== 0) throw new EngineError(`cannot derive outgoing_base: git rev-list failed (${root.stderr.trim()})`);
    const lines = root.stdout.trim().split('\n').filter(Boolean);
    const last = lines[lines.length - 1];
    // 空集（含过滤后）取尾必 undefined——显式 guard 防 undefined 溜进槽值。
    if (last === undefined) throw new EngineError('cannot derive outgoing_base: repository has no commits');
    base = last;
  }
  const head = git(repoRoot, ['rev-parse', 'HEAD']);
  if (head.code !== 0) throw new EngineError(`cannot resolve HEAD: ${head.stderr.trim()}`);
  return { outgoing_base: base, head: head.stdout.trim() };
}

// 出账变更面（与 scripts/change-scope.mts 同口径）：已提交 diff + index 未提交 diff + 未暂存 diff + 未跟踪，dedupe 排序。
// -c core.quotePath=off：非 ASCII 文件名保持原样（默认八进制转义会让 forbidden_paths 前缀匹配失配）。
// index 面无则「暂存后未提交」读成空集（批次 1 序 4 ADR B4）：`diff --name-only` 是 worktree→index，
// 覆盖不到 index→HEAD。
function changedPaths(repoRoot: string, slots: { outgoing_base: string; head: string }) {
  const out = new Set<string>();
  const cmds = [
    ['diff', '--name-only', `${slots.outgoing_base}...HEAD`],
    ['diff', '--cached', '--name-only'],
    ['diff', '--name-only'],
    ['ls-files', '--others', '--exclude-standard'],
  ];
  for (const c of cmds) {
    const r = git(repoRoot, ['-c', 'core.quotePath=off', ...c]);
    if (r.code !== 0) throw new EngineError(`git ${c[0]} failed: ${r.stderr.trim()}`);
    for (const line of r.stdout.split('\n')) if (line.trim()) out.add(line.trim());
  }
  return [...out].sort();
}

// 改动面度量（批次 1 序 4 ADR B1）：文件数 / 行 churn / 顶层段分布同源返回，
// 计量面 = base→工作区（已提交区间 + index + 未暂存 + 未跟踪）。单源 .agents/notes/implemented/architecture/2026-09-13-evaluate-blast-radius.md。
interface BlastRadius {
  files: number;
  added: number;
  deleted: number;
  scope: { dir: string; files: number }[];
  paths: string[];
}
export type { BlastRadius };

// 顶层路径段分布：文件数降序、同数按段名码点序（确定性输出面）。
function scopeOf(paths: string[]): { dir: string; files: number }[] {
  const counts = new Map<string, number>();
  for (const p of paths) {
    const seg = p.split('/')[0] ?? p;
    counts.set(seg, (counts.get(seg) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([dir, files]) => ({ dir, files }))
    .sort((a, b) => (b.files - a.files) || (a.dir < b.dir ? -1 : a.dir > b.dir ? 1 : 0));
}

// numstat 行的增删合计：三列制表分隔；二进制位为 `-`（Number → NaN），非数即跳过不计行。
function numstatTotals(repoRoot: string, args: string[]): { added: number; deleted: number } {
  const r = git(repoRoot, ['-c', 'core.quotePath=off', ...args]);
  if (r.code !== 0) throw new EngineError(`git ${args.join(' ')} failed: ${r.stderr.trim()}`);
  let added = 0;
  let deleted = 0;
  for (const line of r.stdout.split('\n')) {
    const [a, d] = line.split('\t');
    if (a === undefined || d === undefined) continue;
    const an = Number(a);
    const dn = Number(d);
    if (Number.isFinite(an)) added += an;
    if (Number.isFinite(dn)) deleted += dn;
  }
  return { added, deleted };
}

// 未跟踪文件行数：无基线可 diff，唯一可复算读数即整文件行数；二进制（含 NUL）与不可读文件计 0 行。
function untrackedLines(repoRoot: string, rels: string[]): number {
  let total = 0;
  for (const rel of rels) {
    let buf: Buffer;
    try { buf = fs.readFileSync(path.join(repoRoot, rel)); } catch { continue; }
    if (buf.includes(0)) continue;
    const text = buf.toString('utf8');
    if (!text) continue;
    total += text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
  }
  return total;
}

function blastRadius(repoRoot: string, slots: { outgoing_base: string; head: string }): BlastRadius {
  const paths = changedPaths(repoRoot, slots);
  const committed = numstatTotals(repoRoot, ['diff', '--numstat', `${slots.outgoing_base}...HEAD`]);
  const index = numstatTotals(repoRoot, ['diff', '--cached', '--numstat']);
  const unstaged = numstatTotals(repoRoot, ['diff', '--numstat']);
  const untracked = git(repoRoot, ['-c', 'core.quotePath=off', 'ls-files', '--others', '--exclude-standard']);
  if (untracked.code !== 0) throw new EngineError(`git ls-files --others failed: ${untracked.stderr.trim()}`);
  const untrackedAdded = untrackedLines(repoRoot, untracked.stdout.split('\n').map((s) => s.trim()).filter(Boolean));
  return {
    files: paths.length,
    added: committed.added + index.added + unstaged.added + untrackedAdded,
    deleted: committed.deleted + index.deleted + unstaged.deleted,
    scope: scopeOf(paths),
    paths,
  };
}

function pathUnder(relPath: string, prefix: string): boolean {
  const p = relPath.split('/');
  const q = prefix.split('/').filter(Boolean);
  if (!q.length) return true;
  if (q.length > p.length) return false;
  return q.every((seg, i) => p[i] === seg);
}

export {
  EngineError, KEBAB_RE, KEBAB_REF_RE,
  normalizeSignal, sha256Hex, envFingerprint, run, git, deriveSlots, changedPaths, pathUnder,
  blastRadius,
};
