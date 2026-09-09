#!/usr/bin/env node
/**
 * release-note.mts — 生成双语 GitHub Release 正文（对齐 DSH 上游 release 形态；
 * ADR .agents/notes/proposed/process/2026-09-09-release-shape-alignment.md）。
 *
 * 从 `git log <base-tag>..HEAD` 按 conventional commit 类型分节，输出与上游
 * deepseek-ai/deepseek-harness Release（如 dsh-v0.1.5-alpha.1）同构的正文：
 *   [中文](#cn-<版本>) | [English](#en-<版本>)
 *   <h3 id="cn-…">…</h3> 中文分节（新增功能 / 体验优化 / 问题修复 / 其他变更）
 *     每条：<说明> @<作者>
 *   <h3 id="en-…">…</h3> 英文分节（New Features / Improvements / Bug Fixes / Other Changes）
 *     每条：<说明> by @<作者>
 *   Full Changelog: https://github.com/<owner>/<repo>/compare/<base-tag>...dsh-v<版本>
 *
 * 作者 = git author 经映射表转 GitHub login（@ 前缀）。映射表默认只有本仓唯一
 * 贡献者（git author 字符串 → login）；多人协作时在映射表补项即可。commit 标题
 * 即说明（conventional commits 的 scope 剔除后保留正文）；英文说明 = 标题原文，
 * 中文说明 = 标题本身（本仓 commit 标题已中文——中英两节的措辞分工：中文节用
 * commit 标题，英文节标注需发布者润色，脚本不硬编码翻译）。
 *
 * 类型→分节映射（conventional commits）：
 *   feat → 新增功能 / New Features
 *   fix → 问题修复 / Bug Fixes
 *   perf | refactor → 体验优化 / Improvements
 *   docs | chore | test | build | style | ci | release 等 → 其他变更 / Other Changes
 *
 * 用法（仓库根运行）：
 *   node scripts/release/release-note.mts <base-tag> <new-version>   # 输出正文到 stdout
 * 零运行时依赖（node ≥22.18 原生直跑）；不写仓不建 tag。
 *
 * Provenance: original to Noogenesis（2026-09-09 release-shape-alignment）。
 */
import * as childProcess from "node:child_process";

const GITHUB_REPO = "ZK-Andy/noogenesis";

/** 分节标题（中 / 英）——与上游 dsh release body 分节同名。 */
const SECTIONS = [
  { types: new Set(["feat"]), cn: "新增功能", en: "New Features" },
  { types: new Set(["perf", "refactor"]), cn: "体验优化", en: "Improvements" },
  { types: new Set(["fix"]), cn: "问题修复", en: "Bug Fixes" },
  { types: new Set(), cn: "其他变更", en: "Other Changes" },
] as const;

/** git author 字符串 → GitHub login 映射（当前唯一贡献者）。多人时在此补项。 */
const AUTHOR_LOGIN: Record<string, string> = {
  zhangkun: "ZK-Andy",
};

/** conventional commit 类型判定（默认归其他变更）。 */
function sectionOf(subject: string): (typeof SECTIONS)[number] {
  const match = /^([a-z]+)(?:\([^)]*\))?!?:/.exec(subject);
  const type = match?.[1];
  if (type === undefined) return SECTIONS[3]!;
  return SECTIONS.find((s) => s.types.has(type)) ?? SECTIONS[3]!;
}

/** 剥离 conventional commit 前缀（`docs: …` / `feat(x): …` → `…`），留纯说明。 */
function bodyOf(subject: string): string {
  return subject.replace(/^[a-z]+(?:\([^)]*\))?!?:\s*/, "");
}

/** 取 commit 作者 login（映射表缺失时退化为 git author 名）。 */
function loginOf(authorName: string): string {
  return AUTHOR_LOGIN[authorName] ?? authorName;
}

/** git 输出行清理（结尾空行剔除）。 */
function gitLines(...args: string[]): string[] {
  const out = childProcess.spawnSync("git", args, { encoding: "utf8" });
  if (out.status !== 0) {
    const err = out.stderr.trim();
    throw new Error(`git ${args[0]} failed: ${err || `exit ${out.status}`}`);
  }
  return out.stdout.split("\n").filter((line) => line !== "");
}

/**
 * 生成 Release 正文骨架。
 * @param baseTag - 上一 tag（compare 起点；无则传空串，compare 尾段省略）。
 * @param newVersion - 本版版本号（锚点与 compare 用）。
 */
export function buildReleaseNote(baseTag: string, newVersion: string): string {
  const range = baseTag === "" ? "HEAD" : `${baseTag}..HEAD`;
  const log = gitLines("log", `--format=%s%x00%an`, range);
  const entries: Array<{ section: (typeof SECTIONS)[number]; body: string; author: string }> = [];
  for (const line of log) {
    const [subject, authorName] = line.split("\u0000");
    if (subject === undefined || authorName === undefined) continue;
    // 跳过 release commit 自身（避免把 bump 提交列进变更）。
    if (/^chore\(release\)/.test(subject)) continue;
    entries.push({ section: sectionOf(subject), body: bodyOf(subject), author: loginOf(authorName) });
  }

  const lines: string[] = [];
  lines.push(`[中文](#cn-${newVersion}) | [English](#en-${newVersion})`, "");

  const cnAnchor = `<h3 id="cn-${newVersion}">`;
  const enAnchor = `<h3 id="en-${newVersion}">`;

  // 中文节
  for (const section of SECTIONS) {
    const items = entries.filter((e) => e.section === section);
    if (items.length === 0) continue;
    lines.push(`${cnAnchor}${section.cn}</h3>`, "");
    for (const item of items) {
      lines.push(`- ${item.body} @${item.author}`);
    }
    lines.push("");
  }

  // 英文节
  for (const section of SECTIONS) {
    const items = entries.filter((e) => e.section === section);
    if (items.length === 0) continue;
    lines.push(`${enAnchor}${section.en}</h3>`, "");
    for (const item of items) {
      // 英文措辞 = commit 标题正文；commit 标题为中文时需发布者润色英文（脚本不硬编码翻译）。
      lines.push(`- ${item.body} by @${item.author}`);
    }
    lines.push("");
  }

  if (baseTag !== "") {
    lines.push(
      `Full Changelog: https://github.com/${GITHUB_REPO}/compare/${baseTag}...dsh-v${newVersion}`,
    );
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** CLI 入口：node scripts/release/release-note.mts <base-tag> <new-version> */
function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("usage: node scripts/release/release-note.mts <base-tag> <new-version>");
    process.exit(1);
  }
  const [baseTag, newVersion] = args as [string, string];
  process.stdout.write(buildReleaseNote(baseTag, newVersion));
}

if (process.argv[1]?.endsWith("release-note.mts")) {
  main();
}
