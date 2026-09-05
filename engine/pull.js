'use strict';
// pull.js — 共享客户端（P2 ADR 2026-09-06-p2-shared-consumer D2/D4 + 实现轮拍板 A/A/A）：
// 只读消费基因库——git clone/pull 进仓内缓存，缓存并入读路径扫描根（select/propose）。
// 默认离线：不跑 pull 就没有缓存目录，引擎行为与 0.1.1 完全一致。
// 本仓基因优先：同名 ref（domain/id）缓存副本被遮蔽，不报错（本仓 = 策展活体，库 = 分发副本）。
// 零依赖纪律：git 以结构化子进程调用（util.run，参数数组直传、永不 shell、最小 env）。

const fs = require('fs');
const path = require('path');
const { EngineError, run } = require('./util');
const { scanGenes } = require('./gene');

// 仓内确定性缓存落点（实现轮拍板 A）：<repoRoot>/.noogenesis/genes-cache。
// select/propose 据此零额外合同即可发现缓存（目录在场即扫描）。
function defaultCacheDir(repoRoot) {
  return path.join(repoRoot, '.noogenesis', 'genes-cache');
}

function bankHead(cacheDir) {
  const r = run('git', ['rev-parse', 'HEAD'], cacheDir);
  return r.code === 0 ? r.stdout.trim() : '(unknown)';
}

// 缓存目录安全边界：绝不指向 repoRoot 本体或其 genes/（防误清仓资产）。
function assertCacheDirSafe(repoRoot, cacheDir) {
  const abs = path.resolve(cacheDir);
  if (abs === path.resolve(repoRoot)) throw new EngineError('cache dir must not be the repository root');
  if (abs === path.resolve(repoRoot, 'genes')) throw new EngineError('cache dir must not be the genes/ directory');
  return abs;
}

// 拉取基因库到仓内缓存。已有缓存 → --ff-only 更新；否则 shallow clone。
// 返回报告文本（stdout 合同面）。
function pullBank(repoRoot, url, cacheDir) {
  if (typeof url !== 'string' || !url.trim()) throw new EngineError('pull needs a non-empty bank URL');
  const target = assertCacheDirSafe(repoRoot, cacheDir || defaultCacheDir(repoRoot));
  let action;
  if (fs.existsSync(target)) {
    if (!fs.existsSync(path.join(target, '.git'))) {
      throw new EngineError(`cache dir exists but is not a git checkout: ${target} — remove it or pass --cache <dir>`);
    }
    const r = run('git', ['pull', '--ff-only'], target);
    if (r.code !== 0) throw new EngineError(`git pull failed: ${r.stderr.trim() || r.stdout.trim()}`);
    action = 'updated';
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const r = run('git', ['clone', '--depth', '1', url, target], repoRoot);
    if (r.code !== 0) throw new EngineError(`git clone failed: ${r.stderr.trim() || r.stdout.trim()}`);
    action = 'cloned';
  }
  const genes = scanGenes(target, { cache: false });
  const lines = [
    `pull: ${action} bank into ${target}`,
    `pull: genes available in cache: ${genes.length}`,
    `pull: HEAD ${bankHead(target)}`,
  ];
  return { action, cacheDir: target, count: genes.length, report: lines.join('\n') + '\n' };
}

module.exports = { pullBank, defaultCacheDir, assertCacheDirSafe };
