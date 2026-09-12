#!/usr/bin/env node
/**
 * srctree — verify-* 门禁的源树扫描原语单源（import 消费，非独立工具）。
 *
 * 原语 = 源码扩展名过滤 + 递归列举；域根与判据语义留各闸自持（域表一改即
 * 漏判静默的责任面在消费方）。消费方 = verify-export-docs.mts（导出面契约
 * 注释闸）+ verify-host-service-reads.mts（宿主服务读取面闸）。本库无 CLI，
 * 行为由消费方的 --self-test 覆盖（export-docs 的 `data.json` 过滤夹具 +
 * 新闸的源根缺失/零源码件夹具）。
 */
import * as fs from "node:fs";
import * as path from "node:path";

/** 源码扩展名过滤（TS 源 `.ts` / `.mts`；dist 产物与数据文件不在扫描域）。 */
export const SOURCE_EXT_RE = /\.(ts|mts)$/;

/** 递归列举 `root` 下的 `.ts`/`.mts`（目录缺失记为空集，由调用方判 fail-closed）。 */
export function listSources(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, ent.name);
    if (ent.isDirectory()) out.push(...listSources(p));
    else if (SOURCE_EXT_RE.test(ent.name)) out.push(p);
  }
  return out;
}
