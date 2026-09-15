// mutation.ts — Mutation 落盘协议（批次 1 序 2 ADR C1/C2）：封闭六字段 schema、目录锚点、
// ID=文件名。Mutation = 执行前的意图声明（主设计 §5.1：意图 + 风险），与 Capsule（执行后
// 的审计事实）是同一次演化的两端，不合并——声明而未执行是合法状态。
// 写路径（recordMutation）与基因/Capsule 共用 solidify.ts 的原子提交面。

import { protocolNonObject, protocolIdentityErrors, readProtocolFile, assertProtocolIdUnique, protocolPath } from './protocol.js';

// risk_level 是设计 §5.1 明列的三值封闭集；category/target/expected_effect 无值域
// （taxonomy 未决，批次表序 23）——预设枚举即造分类法，故只校验非空。
const RISK_LEVELS = ['low', 'medium', 'high'];
const KNOWN_MUTATION_FIELDS = new Set(['id', 'domain', 'category', 'target', 'expected_effect', 'risk_level']);

// obj 保持 any：不可信 JSON 面，逐字段运行时守卫（与 gene.ts/capsule.ts 同姿态）。身份面
// （未知字段 + id/domain 锚点）与另两原语共用协议外壳，本函数只接 Mutation 的值域面。
function validateMutation(obj: any, opts: { fileName: string; parentDir: string | null }): string[] {
  const nonObject = protocolNonObject(obj, 'mutation');
  if (nonObject) return nonObject;
  const errors = protocolIdentityErrors(obj, { fields: KNOWN_MUTATION_FIELDS, ...opts });
  for (const field of ['category', 'target', 'expected_effect']) {
    const v = obj[field];
    if (typeof v !== 'string' || !v.trim()) errors.push(`${field} must be a non-empty string`);
  }
  if (!RISK_LEVELS.includes(obj.risk_level)) {
    errors.push(`risk_level must be one of ${RISK_LEVELS.join('|')}, got ${JSON.stringify(obj.risk_level)}`);
  }
  return errors;
}

// 读入并校验单个 Mutation 文件。目录锚点（domain == 父目录）只约束 mutations/ 内的
// 落盘位置；recordMutation 的候选文件可放在 mutations/ 之外，故可关。
function readMutation(filePath: string, opts: { skipDirAnchor?: boolean } = {}) {
  return readProtocolFile(filePath, { noun: 'mutation', skipDirAnchor: opts.skipDirAnchor, validate: validateMutation });
}

// 跨树 id 唯一性：同一 id 不得在两个域并存（事件只记 id，引用必须无歧义）。
function assertMutationIdUnique(repoRoot: string, domain: string, id: string) {
  assertProtocolIdUnique(repoRoot, 'mutations', 'mutation', domain, id);
}

function mutationPath(repoRoot: string, domain: string, id: string) {
  return protocolPath(repoRoot, 'mutations', domain, id);
}

// 人读渲染（mutation show）：确定性输出，逐字断言见 engine self-test 的 GOLDEN 夹具。
function renderMutation(obj: any): string {
  const lines = [
    `[noo-mutation ${obj.domain}/${obj.id}]`,
    '',
    `category: ${obj.category}`,
    `risk: ${obj.risk_level}`,
    `target: ${obj.target}`,
    `expected effect: ${obj.expected_effect}`,
  ];
  return lines.join('\n') + '\n';
}

export {
  validateMutation, readMutation, mutationPath, assertMutationIdUnique, renderMutation,
};
