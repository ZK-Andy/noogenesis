// pull.ts — 共享客户端（P2 ADR 2026-09-06-p2-shared-consumer D2/D4 + 实现轮拍板 A/A/A）：
// 只读消费基因库——git clone/pull 进仓内缓存，缓存并入读路径扫描根（select/propose）。
// 默认离线：不跑 pull 就没有缓存目录，引擎行为与无共享层时完全一致。
// 本仓基因优先：同名 ref（domain/id）缓存副本被遮蔽，不报错（本仓 = 策展活体，库 = 分发副本）。
// 零依赖纪律：git 以结构化子进程调用（util.run，参数数组直传、永不 shell、最小 env）。

import * as fs from 'fs';
import * as path from 'path';
import { EngineError, run } from './util.js';
import { readGene } from './gene.js';
import { cacheDir as defaultCacheDir, STATE_ROOT } from './state.js';

function bankHead(dir: string) {
  const r = run('git', ['rev-parse', 'HEAD'], dir);
  return r.code === 0 ? r.stdout.trim() : '(unknown)';
}

function bankOrigin(dir: string): string | null {
  const r = run('git', ['remote', 'get-url', 'origin'], dir);
  return r.code === 0 ? r.stdout.trim() : null;
}

// 报告面容错计数：缓存里可解析的基因数（坏文件静默跳过——报告行不该被分发
// 副本里的单个坏文件炸掉；消费面的降级语义在 scanGenes 缓存分支）。
function countCacheGenes(cacheRepo: string) {
  // 缓存 = 银行仓的浅克隆，其状态面同样在 STATE_ROOT 下。
  const root = path.join(cacheRepo, STATE_ROOT, 'genes');
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

// 缓存目录安全边界（两段式：先定落点、后按实存校验）：
// - 落点不得是仓根本体（防误清仓资产）。
// - 落点若落在状态面 .noogenesis/ 内，只允许默认缓存子目录一个位置——状态面其余部分是
//   被跟踪的演化资产（genes/events/capsules/…），clone 进去会让 git 检出嵌进扫描树、
//   且与待提交面混叠（本批之前该防护面对 genes/ 子树，状态面搬家后同义重述为状态树约束）。
// - 仓外路径允许（历史用法）；仅在**实存**后校验：仓外的非空目录须是 git 检出，否则会
//   被 git 拒绝/半应用。校验点因而在两处（实存前定落点、实存后按现场判）。
function assertCacheDirForRepo(repoRoot: string, target: string) {
  const abs = path.resolve(target);
  const root = path.resolve(repoRoot);
  if (abs === root) throw new EngineError('cache dir must not be the repository root');
  const stateAbs = path.resolve(path.join(root, STATE_ROOT));
  const stateRel = path.relative(stateAbs, abs);
  const underState = stateRel !== '' && !stateRel.startsWith('..') && !path.isAbsolute(stateRel);
  if (underState && abs !== path.resolve(defaultCacheDir(root))) {
    throw new EngineError(`cache dir must not be inside the state tree: ${abs}`);
  }
  return abs;
}

// 实存后的现场校验：仓外的非空目录必须是 git 检出（仓内落点由调用方的 .git 检查覆盖）。
function assertCacheLookupSafe(repoRoot: string, abs: string) {
  const root = path.resolve(repoRoot);
  const rel = path.relative(root, abs);
  const inside = rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  if (!inside && path.dirname(abs) === abs) {
    throw new EngineError(`cache dir must not be the filesystem root: ${abs}`);
  }
  return abs;
}

// 拉取基因库到仓内缓存。已有缓存 → 校验 origin 一致（换库 URL 静默更新旧库
// 是不一致即 fail-closed 的既有口径：给出指引）→ --ff-only 更新；否则 shallow clone。
// 返回报告文本（stdout 合同面）。
function pullBank(repoRoot: string, url: string, cacheOverride: string | null) {
  if (typeof url !== 'string' || !url.trim()) throw new EngineError('pull needs a non-empty bank URL');
  const target = assertCacheDirForRepo(repoRoot, cacheOverride || defaultCacheDir(repoRoot));
  assertCacheLookupSafe(repoRoot, target);
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

export { pullBank, assertCacheDirForRepo, assertCacheLookupSafe };