'use strict';
// pull.js — 共享客户端（P2 ADR 2026-09-06-p2-shared-consumer D2/D4 + 实现轮拍板 A/A/A）：
// 只读消费基因库——git clone/pull 进仓内缓存，缓存并入读路径扫描根（select/propose）。
// 默认离线：不跑 pull 就没有缓存目录，引擎行为与 0.1.1 完全一致。
// 本仓基因优先：同名 ref（domain/id）缓存副本被遮蔽，不报错（本仓 = 策展活体，库 = 分发副本）。
// 零依赖纪律：git 以结构化子进程调用（util.run，参数数组直传、永不 shell、最小 env）。

const fs = require('fs');
const path = require('path');
const { EngineError, run } = require('./util');
const { readGene, defaultCacheDir } = require('./gene');

function bankHead(cacheDir) {
  const r = run('git', ['rev-parse', 'HEAD'], cacheDir);
  return r.code === 0 ? r.stdout.trim() : '(unknown)';
}

function bankOrigin(cacheDir) {
  const r = run('git', ['remote', 'get-url', 'origin'], cacheDir);
  return r.code === 0 ? r.stdout.trim() : null;
}

// 报告面容错计数：缓存里可解析的基因数（坏文件静默跳过——报告行不该被分发
// 副本里的单个坏文件炸掉；消费面的降级语义在 scanGenes 缓存分支）。
function countCacheGenes(cacheRepo) {
  const root = path.join(cacheRepo, 'genes');
  if (!fs.existsSync(root)) return 0;
  let n = 0;
  for (const d of fs.readdirSync(root, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    for (const f of fs.readdirSync(path.join(root, d.name))) {
      if (!f.endsWith('.json')) continue;
      try { readGene(path.join(root, d.name, f), { skipDirAnchor: true }); n++; } catch (_) { /* 报告面容错 */ }
    }
  }
  return n;
}

// 缓存目录安全边界：绝不指向 repoRoot 本体、genes/ 本身或其子树（防误清仓
// 资产、防 git checkout 嵌进本仓扫描树——评审 R2-S5）。
function assertCacheDirSafe(repoRoot, cacheDir) {
  const abs = path.resolve(cacheDir);
  if (abs === path.resolve(repoRoot)) throw new EngineError('cache dir must not be the repository root');
  const genesAbs = path.resolve(repoRoot, 'genes');
  if (abs === genesAbs) throw new EngineError('cache dir must not be the genes/ directory');
  const rel = path.relative(genesAbs, abs);
  if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) {
    throw new EngineError(`cache dir must not be inside genes/: ${abs}`);
  }
  return abs;
}

// 拉取基因库到仓内缓存。已有缓存 → 校验 origin 一致（换库 URL 静默更新旧库
// 是评审 R2-S3 的指认：不一致即 fail-closed 并给出指引）→ --ff-only 更新；
// 否则 shallow clone。返回报告文本（stdout 合同面）。
function pullBank(repoRoot, url, cacheDir) {
  if (typeof url !== 'string' || !url.trim()) throw new EngineError('pull needs a non-empty bank URL');
  const target = assertCacheDirSafe(repoRoot, cacheDir || defaultCacheDir(repoRoot));
  let action;
  if (fs.existsSync(target)) {
    if (!fs.existsSync(path.join(target, '.git'))) {
      throw new EngineError(`cache dir exists but is not a git checkout: ${target} — remove it or pass --cache <dir>`);
    }
    const origin = bankOrigin(target);
    if (origin && origin !== url.trim()) {
      throw new EngineError(`cache already tracks a different bank (${origin}); remove ${target} or pass --cache <dir> to switch`);
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
  const count = countCacheGenes(target);
  const lines = [
    `pull: ${action} bank into ${target}`,
    `pull: genes available in cache: ${count}`,
    `pull: HEAD ${bankHead(target)}`,
  ];
  return { action, cacheDir: target, count, report: lines.join('\n') + '\n' };
}

module.exports = { pullBank, assertCacheDirSafe };
