#!/usr/bin/env node
/**
 * release-note.mts — 生成双语 GitHub Release 正文（对齐 DSH 上游 release 形态；
 * ADR .agents/notes/implemented/process/2026-09-09-release-shape-alignment.md）。
 *
 * 从 `git log <base-tag>..HEAD` 按 conventional commit 类型分节，输出借鉴上游
 * deepseek-ai/deepseek-harness Release（如 dsh-v0.1.5-alpha.1）的正文：
 *   [中文](#cn-<版本>) | [English](#en-<版本>)
 *   首分节标题带锚点：<h3 id="cn-…">新增功能</h3> / <h3 id="en-…">New Features</h3>
 *   后续分节：### 体验优化 / ### 问题修复 / ### 其他变更（锚点 id 保持唯一）
 *     中文每条：<说明> @<作者>；英文每条：<说明> by @<作者>
 *   Full Changelog: https://github.com/<owner>/<repo>/compare/<base-tag>...dsh-v<版本>
 *
 * 作者 = git author 经映射表转 GitHub login（@ 前缀）。映射表默认只有本仓唯一
 * 贡献者（git author 字符串 → login）；多人协作时在映射表补项即可。commit 标题
 * 剥离 conventional 前缀后即说明；英文节在 commit 标题为中文时逐字输出中文，脚本
 * 不硬编码翻译——输出顶部加一行提示发布者润色英文节（见下方 `EN-POLISH-HINT`）。
 *
 * 类型→分节映射（conventional commits；未知类型归末节）：
 *   feat → 新增功能 / New Features
 *   perf | refactor → 体验优化 / Improvements
 *   fix → 问题修复 / Bug Fixes
 *   其余（docs/chore/test/build/style/ci 等）→ 其他变更 / Chores
 *
 * 用法（仓库根运行）：
 *   node scripts/release/release-note.mts <base-tag> <new-version>   # 输出正文到 stdout
 * 零运行时依赖（node ≥22.18 原生直跑）；不写仓不建 tag。
 *
 * Provenance: original to Noogenesis（2026-09-09 release-shape-alignment）。
 */
import * as childProcess from "node:child_process";

/** git remote 读取失败时的兜底仓库（github 主仓写法）。 */
const GITHUB_REPO_FALLBACK = "ZK-Andy/noogenesis";

/** 英文节润色提示（commit 标题为中文时英文节需人工翻译，非逐字发布）。 */
const EN_POLISH_HINT = "> Note: English section mirrors commit titles verbatim; polish translation before publishing.";

/** 分节定义（title = 中文标题、en = 英文标题；types 命中该节，末节 catch-all）。 */
const SECTIONS = [
  { title: "新增功能", en: "New Features", types: new Set(["feat"]) },
  { title: "体验优化", en: "Improvements", types: new Set(["perf", "refactor"]) },
  { title: "问题修复", en: "Bug Fixes", types: new Set(["fix"]) },
  { title: "其他变更", en: "Chores", types: new Set() },
] as const;

/** conventional commit 前缀（type(scope)!: 或 type:）；剥离与分类共用单一口径。 */
const CONVENTION_RE = /^([a-z]+)(?:\([^)]*\))?!?:\s*/;

/** git author 字符串 → GitHub login 映射（当前唯一贡献者）。多人时在此补项。 */
const AUTHOR_LOGIN: Record<string, string> = {
  zhangkun: "ZK-Andy",
};

/** conventional commit 类型判定（未知类型归末节 catch-all）。 */
function sectionOf(subject: string): (typeof SECTIONS)[number] {
  const type = CONVENTION_RE.exec(subject)?.[1];
  if (type === undefined) return SECTIONS[3]!;
  return SECTIONS.find((s) => s.types.has(type)) ?? SECTIONS[3]!;
}

/** 剥离 conventional commit 前缀（`docs: …` / `feat(x): …` → `…`），留纯说明。 */
function bodyOf(subject: string): string {
  return subject.replace(CONVENTION_RE, "");
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

/** 仓库引用名（owner/repo）——读 remote.origin.url 推导，读不到用兜底。 */
function repoFromRemote(): string {
  const url = gitLines("config", "--get", "remote.origin.url")[0] ?? "";
  const m = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/.exec(url);
  return m?.[1] ?? GITHUB_REPO_FALLBACK;
}

/** 追加一个分节的条目（首节标题带锚点 id，后续节用 `###`；两种语言共用）。 */
function emitSection(
  lines: string[],
  section: (typeof SECTIONS)[number],
  title: string,
  anchorId: string | undefined,
  items: Array<{ body: string; author: string }>,
  suffix: "zh" | "en",
): void {
  if (items.length === 0) return;
  lines.push(
    anchorId === undefined
      ? `### ${title}`
      : `<h3 id="${anchorId}">${title}</h3>`,
    "",
  );
  const marker = suffix === "zh" ? "@" : "by @";
  for (const item of items) {
    lines.push(`- ${item.body} ${marker}${item.author}`);
  }
  lines.push("");
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

  // 中文节：首节（SECTIONS[0]）标题带锚点 id，后续节 `###`。
  for (const [index, section] of SECTIONS.entries()) {
    const items = entries.filter((e) => e.section === section);
    if (items.length === 0) continue;
    emitSection(
      lines,
      section,
      section.title,
      index === 0 ? `cn-${newVersion}` : undefined,
      items,
      "zh",
    );
  }

  // 英文节：结构同中文节，含润色提示（防逐字发布中文 commit 标题）。
  lines.push(EN_POLISH_HINT, "");
  for (const [index, section] of SECTIONS.entries()) {
    const items = entries.filter((e) => e.section === section);
    if (items.length === 0) continue;
    emitSection(
      lines,
      section,
      section.en,
      index === 0 ? `en-${newVersion}` : undefined,
      items,
      "en",
    );
  }

  if (baseTag !== "") {
    lines.push(
      `Full Changelog: https://github.com/${repoFromRemote()}/compare/${baseTag}...dsh-v${newVersion}`,
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