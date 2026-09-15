/**
 * scripts/state.ts — 演化状态面路径归口（脚本面）。
 * 与 engine/state.ts 同源同布局（ADR .agents/notes/implemented/architecture/2026-09-16-state-root-under-noogenesis.md）：
 * 所有状态路径由本件派生，脚本侧不得手拼 ".noogenesis/..." 字面量。
 * 两侧各持一份是为了守住三族相对 import 互斥（engine/ 与 scripts/ 不互相 import）。
 */
import * as path from "node:path";

/** 状态根目录名（仓根下一层）。 */
const STATE_ROOT = ".noogenesis";

/** 状态基因目录（tracked；solidify 唯一入口）。 */
function stateGenesDir(repo: string): string {
  return path.join(repo, STATE_ROOT, "genes");
}

/** 基因检索索引落点（tracked；gen-manifest 生成、verify-manifest 对账）。 */
function stateManifest(repo: string): string {
  return path.join(repo, STATE_ROOT, "manifest.json");
}

export { STATE_ROOT, stateGenesDir, stateManifest };
