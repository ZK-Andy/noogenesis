'use strict';
// util.js — 引擎共享件：信号归一化 / SHA-256 / 结构化 spawn（不走 shell、最小 env、cwd 锁仓根）/ git 封装。
// 安全模型五条的实现载体（schema ADR S3；单源 .agents/notes/implemented/architecture/2026-09-05-gene-event-schema.md）。

const crypto = require('crypto');
const { spawnSync } = require('child_process');

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

class EngineError extends Error {
  constructor(msg) { super(msg); this.engine = true; }
}

// 骨架 ADR D2 口径：trim → 小写化 → 内部连续空白折叠为单空格。
function normalizeSignal(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// 子进程最小 env：只透传 PATH/HOME（git 身份与 python 解释器定位所需）+ LANG。
function gateEnv() {
  const env = { PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin', LANG: 'C.UTF-8' };
  if (process.env.HOME) env.HOME = process.env.HOME;
  return env;
}

// 结构化 spawn：参数数组直传，永不 shell 拼接；工作目录锁死 repoRoot。
function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, env: gateEnv(), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return {
    code: r.status === null || r.status === undefined ? -1 : r.status,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    spawnError: r.error ? String(r.error && r.error.message || r.error) : null,
  };
}

function git(repoRoot, args) {
  return run('git', args, repoRoot);
}

// 槽值推导（骨架 ADR D4：取值仅由引擎从 git 事实推导，基因只引用不填值）。
//   {{outgoing_base}} — 与上游的 merge-base；无上游（临时仓/自举仓）回退根提交。
//   {{head}}          — HEAD 解析后的完整 oid。
function deriveSlots(repoRoot) {
  let base = null;
  const up = git(repoRoot, ['merge-base', 'HEAD', '@{upstream}']);
  if (up.code === 0 && up.stdout.trim()) {
    base = up.stdout.trim();
  } else {
    const root = git(repoRoot, ['rev-list', '--max-parents=0', 'HEAD']);
    if (root.code !== 0) throw new EngineError(`cannot derive outgoing_base: git rev-list failed (${root.stderr.trim()})`);
    const lines = root.stdout.trim().split('\n').filter(Boolean);
    if (!lines.length) throw new EngineError('cannot derive outgoing_base: repository has no commits');
    base = lines[lines.length - 1];
  }
  const head = git(repoRoot, ['rev-parse', 'HEAD']);
  if (head.code !== 0) throw new EngineError(`cannot resolve HEAD: ${head.stderr.trim()}`);
  return { outgoing_base: base, head: head.stdout.trim() };
}

// 出账变更面（与 scripts/change-scope.sh 同口径）：已提交 diff + 未暂存 diff + 未跟踪，dedupe 排序。
// -c core.quotePath=off：非 ASCII 文件名保持原样（默认八进制转义会让 forbidden_paths 前缀匹配失配）。
function changedPaths(repoRoot, slots) {
  const out = new Set();
  const cmds = [
    ['diff', '--name-only', `${slots.outgoing_base}...HEAD`],
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

function pathUnder(relPath, prefix) {
  const p = relPath.split('/');
  const q = prefix.split('/').filter(Boolean);
  if (!q.length) return true;
  if (q.length > p.length) return false;
  return q.every((seg, i) => p[i] === seg);
}

module.exports = {
  EngineError, KEBAB_RE,
  normalizeSignal, sha256Hex, run, git, deriveSlots, changedPaths, pathUnder,
};
