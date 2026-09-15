// state.ts — 演化状态面路径归口（单源）：所有状态路径由此派生，别处不得手拼。
// 布局 ADR = .agents/notes/implemented/architecture/2026-09-16-state-root-under-noogenesis.md。
//
//   <repo>/.noogenesis/genes/        tracked  基因本体（solidify 唯一入口）
//   <repo>/.noogenesis/events/       tracked  事件审计（与 genes 同 commit 原子）
//   <repo>/.noogenesis/capsules/     tracked  Capsule（capsule add 唯一入口）
//   <repo>/.noogenesis/mutations/    tracked  Mutation（mutation add 唯一入口）
//   <repo>/.noogenesis/candidates/   tracked  distill 候选暂存
//   <repo>/.noogenesis/manifest.json tracked  基因检索索引（gen-manifest 生成）
//   <repo>/.noogenesis/genes-cache/  ignored  pull 的只读缓存（可丢弃）
//   <repo>/.noogenesis/observations/ ignored  observe 的观测输入面（可丢弃）

import * as path from 'path';

// 状态根目录名（仓根下一层；.gitignore 只忽略可再生子目录，根仍被 git 遍历）。
const STATE_ROOT = '.noogenesis';

// 状态根绝对路径。所有状态落点 = 本函数 + 一个子目录名。
function stateRoot(repoRoot: string) {
  return path.join(repoRoot, STATE_ROOT);
}

function genesDir(repoRoot: string) {
  return path.join(stateRoot(repoRoot), 'genes');
}

function eventsDir(repoRoot: string) {
  return path.join(stateRoot(repoRoot), 'events');
}

function capsulesDir(repoRoot: string) {
  return path.join(stateRoot(repoRoot), 'capsules');
}

function mutationsDir(repoRoot: string) {
  return path.join(stateRoot(repoRoot), 'mutations');
}

function candidatesDir(repoRoot: string) {
  return path.join(stateRoot(repoRoot), 'candidates');
}

// 基因检索索引（tracked 产物，gen-manifest 生成、verify-manifest 对账）。
function manifestPath(repoRoot: string) {
  return path.join(stateRoot(repoRoot), 'manifest.json');
}

// P2 缓存落点单源：pull 与合并扫描共用此事实。
function cacheDir(repoRoot: string) {
  return path.join(stateRoot(repoRoot), 'genes-cache');
}

// 观测面落点单源：observe 写、记忆线读。
function observationsDir(repoRoot: string) {
  return path.join(stateRoot(repoRoot), 'observations');
}

export { STATE_ROOT, stateRoot, genesDir, eventsDir, capsulesDir, mutationsDir, candidatesDir, manifestPath, cacheDir, observationsDir };
