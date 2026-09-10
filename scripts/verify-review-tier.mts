#!/usr/bin/env node
/**
 * verify-review-tier — 评审 tier 判级 + FULL 证据闸（tier 逃逸防护）。
 *
 * 判据（review.md §1 的路径可机械子集；语义判据——async/并发/跨边界契约/用户显式
 * 批量审核——仍留该处人工评审，单源 docs/method/review.md §1）。FULL-tier 路径触发集：
 *   gate-criteria     scripts/**（含共享门禁助手）、lefthook.yml（钩子面，B3 起）
 *   behavior-surface  engine/** 与 adapters/**（产品源码：引擎 + 随包插件本体，含
 *                     engine/gates.json 门禁白名单）、.github/** 下的 workflows、
 *                     templates/**、docs/method/**、任意深度的 AGENTS.md、
 *                     .agents/workflows/**
 * 另：.agents/notes 下 Status: proposed 的 ADR 正文自诺「三重审核」亦判 FULL——
 * ADR 自己承诺的 tier 优先于默认。触碰任一 FULL 路径的 diff 必须随变更携带评审证据
 * 才可 push：证据 = 同一变更集内一个 implemented ADR 的 `Review:
 * FULL/<yyyy-mm-dd>/R1=ok R2=ok R3=ok` 行（真实日历日；R1/R2/R3 严格取值，fail/abort
 * 不算），且该行须由本变更集**引入**（diff 内为新增行 / ADR 整文件新增）——同变更集
 * 触碰旧已评审 ADR 时其历史 Review 行不算本批证据（防搭车，2026-09-10）。
 * 格式与严格度规则单源 review.md §1。proposed ADR 不能自证。git 时刻不可解析
 * （坏 ref / git 失败）即违约，绝不静默按「无 FULL 变更」放行（fail-closed：
 * 逃逸防护闸不得把不可解析 diff 读成无变更）。
 *
 * diff 范围（调用方按 git 时刻选模式）：
 *   --staged            index vs HEAD            -> pre-commit（仅报告）
 *   --since <base-ref>  <base>..HEAD 提交         -> pre-push（--enforce）
 *   （默认）             工作树                    -> 本地 ad-hoc 检查
 * 默认仅报告（exit 0）；--enforce 时 FULL diff 缺证据 exit 1。
 *
 * 结构性例外：gates.json 中本件为非平跑例外——pre-push 以 per-ref merge-base 循环
 * 逐 ref enforce（新分支首推 fail-closed），CI 以 push 事件条件步承载，均非平面清单
 * 形态（机制单家见 scripts/gates.mts 头注），本件不进 `gates.mts --run` 平跑。消费契约：
 * verify-review-brief.mts 经同族 import `classify` 派生 lane——该 import 安全的
 * 前提是本模块除常量/正则定义外无顶层副作用（main 由入口 dispatch 把守），改判据时
 * 保持此形。任何对本件的改动按设计即 FULL-tier（scripts/** 触发）。
 *
 * 用法（仓库根运行，同其余 verify-*）：
 *   node scripts/verify-review-tier.mts [--repo ROOT] [--staged|--since BASE] [--enforce]
 *   node scripts/verify-review-tier.mts --self-test
 * 退出码：0 = PASS，1 = 违约（FULL diff 缺证据），2 = fail-closed 用法错（如
 * --staged 与 --since 互斥、未知参数）。
 *
 * Python→JS 语义对齐（对账批）：UTF-8 严格解码对齐 py read_text 的 strict 模式
 * （坏字节 → 视同读取失败，绝不按替换字符放行判据）；行切分对齐 py splitlines 的
 * 全集边界；排序对齐 py sorted 的 Unicode 码点序；git 子进程参数/cwd/退出码与
 * py subprocess 语义逐一对应（非零退出 / spawn 失败 / 解码失败均 fail-closed）。
 *
 * Provenance: distilled from dotnet-deepseek-harness-desktop scripts/verify-review-tier.py
 * (MIT, 2026-09-05). FULL 触发集按本仓评审面重写（scripts/** 含共享门禁助手、
 * .agents/workflows 流程卡、任意深度 AGENTS.md；无 .NET compose-root / ArchitectureTests
 * 判据）per ADR 2026-09-05-review-mechanical-gate；argparse --self-test 分流与
 * assert-with-message 夹具 per ADR 2026-09-05-consolidate-r1-simplification-candidates
 * Decision 2。B1 随族迁 TS（2026-09-08，
 * .agents/notes/implemented/architecture/2026-09-08-collab-rebuild-b1-gates-ts.md）。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { splitLines as pySplitlines, cmpPyStr, isLeap } from "./pypara.mts";

const NOTES_DIR = ".agents/notes";
// FULL/<date>/R1=ok R2=ok R3=ok — 值严格校验（fail/abort 不算数）。
// py re 的 \s（Unicode）与 JS \s 在 \x1c-\x1f/\x85/\ufeff 上有差，真实 Review 行
// 只含 ASCII 空白，语义等价（对账面已覆盖）。
const REVIEW_LINE_RE = /^Review:\s*FULL\s*\/\s*(\d{4}-\d{2}-\d{2})\s*\/\s*R1=ok\s+R2=ok\s+R3=ok$/;

// FULL-tier 路径触发集（单源；review.md §1 指向此处）。
// 判定入参：(路径字符串, 按 "/" 切分的 parts, 末段文件名)——与 py 的
// (rel, Path(rel)) 等价（Path.parts 的 POSIX 切分语义：丢弃空段与 "."）。
interface Trigger { label: string; pred: (rel: string, parts: string[], name: string) => boolean }

const FULL_TRIGGERS: readonly Trigger[] = [
  { label: "gate-criteria", pred: (_rel, parts, _name) => parts.includes("scripts") },
  { label: "gate-criteria", pred: (_rel, _parts, name) => name === "lefthook.yml" },
  // 产品源码 = 行为契约面（本仓即引擎与插件本体；顶层目录判据，非任意深度同名段）。
  { label: "behavior-surface", pred: (_rel, parts, _name) => parts[0] === "engine" },
  { label: "behavior-surface", pred: (_rel, parts, _name) => parts[0] === "adapters" },
  { label: "behavior-surface", pred: (_rel, parts, _name) => parts.includes(".github") && parts.includes("workflows") },
  { label: "behavior-surface", pred: (_rel, parts, _name) => parts.includes("templates") },
  { label: "behavior-surface", pred: (_rel, parts, _name) => parts.includes("docs") && parts.includes("method") },
  { label: "behavior-surface", pred: (_rel, _parts, name) => name === "AGENTS.md" },
  { label: "behavior-surface", pred: (_rel, parts, _name) => parts.includes(".agents") && parts.includes("workflows") },
];

// 正文自诺三重审核的 proposed ADR 强制 FULL——ADR 自己承诺的 tier 优先于默认。
// proposed 判定锚定行首 Status 行：整文件子串搜索会把「正文引用这两个词面」的
// implemented ADR 读成提案（2026-09-11 精度批的实例）。
const FULL_TIER_WORDS = ["三重审核"];

/** py print 的 stdout 直写（避免 console.log 的 % 格式化面）。 */
function out(s: string): void { process.stdout.write(s + "\n"); }
function errOut(s: string): void { process.stderr.write(s + "\n"); }

/** py read_text 的 universal-newlines 语义：\r\n 与 \r 归一为 \n。 */
function pyUniversalNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/** py open(..., encoding="utf-8")（strict）：坏字节即失败，调用方按读取失败处理。 */
function readTextStrict(file: string): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(fs.readFileSync(file));
  } catch {
    return null;
  }
}

/** py open(..., encoding="utf-8", errors="replace")：坏字节替换为 U+FFFD。 */
function readTextReplace(file: string): string | null {
  try {
    return pyUniversalNewlines(new TextDecoder("utf-8", { ignoreBOM: true }).decode(fs.readFileSync(file)));
  } catch {
    return null;
  }
}

/** 真实日历日（proleptic Gregorian，闰年规则与 py date.fromisoformat 一致；
 * 年 0000 拒绝——py MINYEAR=1）。 */
function validDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const y = Number(s.slice(0, 4));
  const mo = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  if (y < 1 || mo < 1 || mo > 12 || d < 1) return false;
  const daysInMonth = [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1]!;
  return d <= daysInMonth;
}

/** git 子进程：对齐 py subprocess.run(capture_output=True, text=True, check=False)。
 * 非零退出 / spawn 失败 / 输出非合法 UTF-8（py 解码抛错）一律 ok=false——fail-closed。 */
function runGit(args: string[], cwd: string): { ok: boolean; stdout: string } {
  const r = spawnSync("git", args, { cwd });
  // r.error 成功时运行时为 undefined（类型标注 null），用真值判断。
  if (r.error || r.status === null || r.status !== 0) return { ok: false, stdout: "" };
  try {
    return { ok: true, stdout: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(r.stdout) };
  } catch {
    return { ok: false, stdout: "" };
  }
}

/** 三态 git 时刻 → diff 面参数的单源映射：`repoChangedPaths` 与 `fileDiff` 的三态
 *  分支同构重复折叠于此，改模式语义只动本表。
 *  staged => index vs HEAD；since => <base>..HEAD；默认 => 工作树（paths 收集含
 *  untracked 面；逐文件 diff 用 HEAD 合并视图，staged 改动已含，无需双跑）。 */
interface DiffMoment {
  /** 路径收集命令组（--name-only）。 */
  pathsCmds: string[][];
  /** 逐文件 diff 参数（"diff" 之后的全部 token）。 */
  fileDiffArgs(rel: string): string[];
  /** untracked 收集命令；staged/since 模式无此面 = null。 */
  untrackedCmd: string[] | null;
}

function diffMoment(stagedOnly: boolean, since: string | null): DiffMoment {
  if (stagedOnly) {
    return {
      pathsCmds: [["diff", "--cached", "--name-only"]],
      fileDiffArgs: (rel) => ["diff", "--cached", "--", rel],
      untrackedCmd: null,
    };
  }
  if (since !== null) {
    return {
      pathsCmds: [["diff", "--name-only", `${since}..HEAD`]],
      fileDiffArgs: (rel) => ["diff", `${since}..HEAD`, "--", rel],
      untrackedCmd: null,
    };
  }
  return {
    // 双命令：HEAD 合并视图 + index 单视图（对账不变量）。
    pathsCmds: [["diff", "--name-only", "HEAD"], ["diff", "--cached", "--name-only"]],
    fileDiffArgs: (rel) => ["diff", "HEAD", "--", rel],
    untrackedCmd: ["ls-files", "--others", "--exclude-standard"],
  };
}

/** 所选 git 时刻的变更路径集 + untracked 集（默认模式单次收集，evidenceInChange
 *  复用）：
 *  --staged => index vs HEAD；--since => <base>..HEAD；默认 => 工作树。
 *  git 命令失败返回 null——fail-closed：不可解析的 diff 绝不读成「无 FULL 变更」。 */
function repoChangedPaths(repo: string, stagedOnly: boolean, since: string | null):
    { paths: string[]; untracked: Set<string> } | null {
  const moment = diffMoment(stagedOnly, since);
  const paths = new Set<string>();
  for (const cmd of moment.pathsCmds) {
    const r = runGit(cmd, repo);
    if (!r.ok) return null;
    for (const x of pySplitlines(r.stdout)) {
      if (x.trim() !== "") paths.add(x);
    }
  }
  const untracked = new Set<string>();
  if (moment.untrackedCmd !== null) {
    const r = runGit(moment.untrackedCmd, repo);
    if (!r.ok) return null;
    for (const x of pySplitlines(r.stdout)) {
      if (x.trim() !== "") {
        untracked.add(x);
        paths.add(x);
      }
    }
  }
  return { paths: Array.from(paths).sort(cmpPyStr), untracked };
}

/** 变更集中的 proposed ADR 正文自诺 full 评审 → 判 FULL。 */
function adrCommitsFull(rel: string, repo: string): boolean {
  if (!rel.endsWith(".md") || !rel.startsWith(NOTES_DIR + "/")) return false;
  const text = readTextStrict(path.join(repo, rel));
  if (text === null) return false;
  return /^Status:\s*proposed\b/m.test(text) && FULL_TIER_WORDS.some((w) => text.includes(w));
}

/** 返回 (is_full_tier, reasons)。无执行裁量。
 *  export：verify-review-brief.mts 经同族 import 消费（对齐 py 侧 importlib
 *  导 _classify 的消费契约）；入口分发带守卫，被 import 时不执行 main。 */
export function classify(paths: string[], repo: string): { full: boolean; reasons: string[] } {
  let full = false;
  const reasons: string[] = [];
  for (const rel of paths) {
    // POSIX Path.parts 等价：按 "/" 切分，丢弃空段与 "."（git 输出的相对路径不含两者）。
    const parts = rel.split("/").filter((s) => s !== "" && s !== ".");
    const name = parts.length > 0 ? parts[parts.length - 1]! : "";
    let matched = false;
    for (const { label, pred } of FULL_TRIGGERS) {
      let hit = false;
      try {
        hit = pred(rel, parts, name);
      } catch {
        hit = false;
      }
      if (hit) {
        if (!reasons.includes(label)) reasons.push(`${label}: ${rel}`);
        matched = true;
        full = true;
        break;
      }
    }
    if (!matched && adrCommitsFull(rel, repo)) {
      full = true;
      reasons.push(`adr-promises-full: ${rel}`);
    }
  }
  return { full, reasons };
}

/** 该 git 时刻下 <rel> 的变更 diff 文本；git 失败返回 null（fail-closed：
 *  证据判定依赖 diff，不可解析绝不当作证据成立）。
 *  参数形态由 diffMoment 单源给出（staged => index vs HEAD；since => <base>..HEAD；
 *  默认 => 工作树 vs HEAD，含 staged + unstaged 对已跟踪文件的全部改动，
 *  未跟踪文件由 untracked 集覆盖）。 */
function fileDiff(repo: string, rel: string, stagedOnly: boolean, since: string | null): string | null {
  const r = runGit(diffMoment(stagedOnly, since).fileDiffArgs(rel), repo);
  return r.ok ? r.stdout : null;
}

/** 变更集内一个 implemented ADR 的合法 Review 行若为新增行（ADR 整文件新增，
 *  或本变更集向既有 ADR 补加了 Review 行）→ 证据成立。旧 ADR 自带的历史 Review
 *  行不在本变更集 diff 内，不得给本批 FULL 变更搭车（HANDOFF-todos L45）。 */
function diffIntroducesReview(repo: string, rel: string, stagedOnly: boolean, since: string | null,
  untracked: ReadonlySet<string>): boolean {
  // 未跟踪 ADR = 整文件新增，Review 行即本变更引入
  if (untracked.has(rel)) return true;
  const d = fileDiff(repo, rel, stagedOnly, since);
  // fail-closed：diff 不可解析 → 证据不成立
  if (d === null) return false;
  for (const line of pySplitlines(d)) {
    // 只认新增行，跳过 diff 文件头
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    const m = REVIEW_LINE_RE.exec(line.slice(1).trim());
    if (m !== null && validDate(m[1]!)) return true;
  }
  return false;
}

/** 变更集缺合法评审证据时返回违约文案，否则 null。证据 = 变更集**引入**（新增行）
 * 的 implemented ADR Review: FULL/<date>/R1=ok R2=ok R3=ok 行（真实日历日）——
 * 同变更集触碰旧已评审 ADR 时其历史 Review 行不算本批证据。
 * untracked 集由 repoChangedPaths 单次收集传入（默认模式为实际集，staged/since
 * 模式为空集——其 diff 面只覆盖已跟踪文件，与「staged 态未 add 的 ADR 不算证据」
 * 判据一致）。 */
function evidenceInChange(paths: string[], repo: string, stagedOnly: boolean, since: string | null,
  untracked: ReadonlySet<string>): string | null {
  for (const rel of paths) {
    if (!rel.startsWith(NOTES_DIR + "/") || !rel.endsWith(".md")) continue;
    const adr = path.join(repo, rel);
    let st: fs.Stats;
    try {
      st = fs.statSync(adr);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    const text = readTextReplace(adr);
    if (text === null) continue;
    const head = pySplitlines(text).slice(0, 15);
    // proposed 不能自证
    if (!head.join("\n").includes("Status: implemented")) continue;
    const hasValidReview = head.some((line) => {
      const m = REVIEW_LINE_RE.exec(line.trim());
      return m !== null && validDate(m[1]!);
    });
    if (hasValidReview && diffIntroducesReview(repo, rel, stagedOnly, since, untracked)) return null;
  }
  return "no implemented ADR whose Review: FULL/<date>/R1=ok R2=ok R3=ok line is "
    + "introduced by this change set (an already-reviewed ADR's historical Review line "
    + "does not certify a new FULL change)";
}

function scan(repo: string, stagedOnly = false, since: string | null = null): string[] {
  const moment = repoChangedPaths(repo, stagedOnly, since);
  if (moment === null) {
    return ["review-tier: git moment failed (bad ref or git error) — "
      + "fail-closed, refusing to classify an unparsable diff"];
  }
  if (moment.paths.length === 0) return [];
  const { full, reasons } = classify(moment.paths, repo);
  if (!full) return [];
  const bad = evidenceInChange(moment.paths, repo, stagedOnly, since, moment.untracked);
  if (bad === null) return [];
  return [`FULL-tier change lacks review evidence (${reasons.length} trigger(s)): `
    + reasons.join("; ") + ` | ${bad}`];
}

/** 建一个带已提交基线的隔离夹具仓。 */
function newRepo(td: string, name: string): string {
  const repo = path.join(td, name);
  fs.mkdirSync(path.join(repo, NOTES_DIR, "implemented", "process"), { recursive: true });
  fs.mkdirSync(path.join(repo, "docs"));
  fs.writeFileSync(path.join(repo, "docs", "note.md"), "base\n");

  const git = (...args: string[]): void => {
    spawnSync("git", args, { cwd: repo, stdio: ["ignore", "ignore", "ignore"] });
  };
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  git("add", "-A");
  git("commit", "-qm", "init");
  return repo;
}

function writeIn(repo: string, rel: string, text: string): void {
  const p = path.join(repo, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
  spawnSync("git", ["add", rel], { cwd: repo, stdio: ["ignore", "ignore", "ignore"] });
}

function commitAll(repo: string, msg: string): void {
  spawnSync("git", ["add", "-A"], { cwd: repo, stdio: ["ignore", "ignore", "ignore"] });
  spawnSync("git", ["commit", "-qm", msg], { cwd: repo, stdio: ["ignore", "ignore", "ignore"] });
}

const EVIDENCE = "# Agent Note: x\n\nStatus: implemented\n\n"
  + "Review: FULL/2026-09-05/R1=ok R2=ok R3=ok\n\n"
  + "## Problem\n\nx\n\n## Decision\n\nx\n\n"
  + "## Alternatives considered\n\n- a\n\n## Consequences\n\nx\n";

/** 离线夹具仓；每组夹具真实走 _scan/_classify（不留碰不到主逻辑的孤立断言）。 */
function selfTest(): number {
  let failed = 0;
  const ok = (cond: boolean, msg: string): void => {
    if (cond) out(`  ok: ${msg}`);
    else {
      errOut(`  FAIL: ${msg}`);
      failed = 1;
    }
  };

  const td = fs.mkdtempSync(path.join(os.tmpdir(), "vrt-"));
  try {
    // 1) LIGHT 变更（docs/cookbook.md）无任何证据也放行
    let r = newRepo(td, "f1");
    writeIn(r, "docs/cookbook.md", "changed (LIGHT)\n");
    ok(scan(r).length === 0, "LIGHT change passes without evidence");

    // 2) FULL scripts/ 变更无证据被拦
    r = newRepo(td, "f2");
    writeIn(r, "scripts/verify-x.py", "# gate\n");
    let rows = scan(r);
    ok(rows.some((x) => x.includes("FULL-tier change lacks review evidence") && x.includes("gate-criteria")),
      "FULL scripts/ change blocked without evidence");

    // 2b) lefthook.yml（钩子面，B3 起取代 .githooks/）变更判 FULL
    r = newRepo(td, "f2b");
    writeIn(r, "lefthook.yml", "# hooks\n");
    ok(scan(r).some((x) => x.includes("gate-criteria")),
      "lefthook.yml change classifies FULL");

    // 2c) 产品源码（engine/**、adapters/**）变更判 FULL——含门禁白名单 engine/gates.json
    r = newRepo(td, "f2c");
    writeIn(r, "engine/gates.json", "{}\n");
    ok(scan(r).some((x) => x.includes("behavior-surface")),
      "engine/** change classifies FULL (gate whitelist included)");
    r = newRepo(td, "f2d");
    writeIn(r, "adapters/dsh/config.mts", "// plugin config\n");
    ok(scan(r).some((x) => x.includes("behavior-surface")),
      "adapters/** change classifies FULL");
    // 2e) 判据是顶层目录：深层同名段不触发
    r = newRepo(td, "f2e");
    writeIn(r, "docs/research/engine-notes.md", "# notes\n");
    ok(scan(r).length === 0,
      "a deeper path segment named engine/adapters does not classify FULL");

    // 3) 同一变更携带带合法 Review 行的 implemented ADR 时放行
    r = newRepo(td, "f3");
    writeIn(r, "scripts/verify-x.py", "# gate\n");
    writeIn(r, NOTES_DIR + "/implemented/process/2026-09-05-x.md", EVIDENCE);
    ok(scan(r).length === 0, "FULL change passes when change carries Review evidence");

    // 4) 流程卡变更（.agents/workflows）判 FULL
    r = newRepo(td, "f4");
    writeIn(r, ".agents/workflows/feature-flow.md", "# card\n");
    rows = scan(r);
    ok(rows.some((x) => x.includes("behavior-surface")), "flow-card change classifies FULL");

    // 5) 子树深度的 AGENTS.md 判 FULL
    r = newRepo(td, "f5");
    writeIn(r, ".agents/AGENTS.md", "# agents\n");
    ok(scan(r).some((x) => x.includes("behavior-surface")), "subtree AGENTS.md classifies FULL");

    // 6) 自诺三重审核的 proposed ADR 判 FULL，无证据被拦
    r = newRepo(td, "f6");
    writeIn(r, NOTES_DIR + "/proposed/process/2026-09-05-y.md",
      "# Agent Note: y\n\nStatus: proposed\n\n落地须三重审核确认零行为变更\n");
    rows = scan(r);
    ok(rows.some((x) => x.includes("adr-promises-full")),
      "proposed ADR promising 三重审核 classifies FULL");

    // 6b) implemented ADR 正文提及同一词面不判 FULL（自诺判定锚定行首 Status 行）
    r = newRepo(td, "f6b");
    writeIn(r, NOTES_DIR + "/implemented/process/2026-09-05-z.md",
      "# Agent Note: z\n\nStatus: implemented\n\n## Problem\n\n讨论 `Status: proposed` 与三重审核词面的判定\n\n## Decision\n\nx\n\n## Alternatives considered\n\n- a\n\n## Consequences\n\nx\n");
    ok(scan(r).length === 0,
      "implemented ADR quoting the words does not classify FULL");

    // 7) 已提交 + 干净树：--since 抓住外发 FULL 变更
    r = newRepo(td, "f7");
    commitAll(r, "base");
    writeIn(r, "scripts/verify-x.py", "# new gate\n");
    commitAll(r, "full change w/o evidence");
    rows = scan(r, false, "HEAD~1");
    ok(rows.some((x) => x.includes("FULL-tier change lacks review evidence")),
      "--since catches an outgoing FULL change on a clean tree");

    // 8) 已提交 + 干净树，同范围带证据 ADR：放行
    r = newRepo(td, "f8");
    commitAll(r, "base");
    writeIn(r, NOTES_DIR + "/implemented/process/2026-09-05-x.md", EVIDENCE);
    writeIn(r, "scripts/verify-x.py", "# new gate\n");
    commitAll(r, "full change w/ evidence");
    rows = scan(r, false, "HEAD~1");
    ok(rows.length === 0, "--since passes when the range carries Review evidence");

    // 9) review 值严格校验：R1=fail 不算证据
    r = newRepo(td, "f9");
    writeIn(r, "scripts/verify-x.py", "# gate\n");
    writeIn(r, NOTES_DIR + "/implemented/process/2026-09-05-x.md",
      EVIDENCE.replace("R1=ok", "R1=fail"));
    ok(scan(r).some((x) => x.includes("FULL-tier change lacks review evidence")),
      "R1=fail does not count as review evidence");

    // 10) proposed ADR 自加 Review 行不清除违约
    r = newRepo(td, "f10");
    writeIn(r, "scripts/verify-x.py", "# gate\n");
    writeIn(r, NOTES_DIR + "/proposed/process/2026-09-05-y.md",
      "# Agent Note: y\n\nStatus: proposed\n\n"
      + "Review: FULL/2026-09-05/R1=ok R2=ok R3=ok\n");
    ok(scan(r).some((x) => x.includes("FULL-tier change lacks review evidence")),
      "proposed ADR self-Review does not clear a FULL change");

    // 11) git 时刻失败即 fail-closed：--since 坏 ref 是违约，绝不静默放行
    r = newRepo(td, "f11");
    rows = scan(r, false, "no-such-ref");
    ok(rows.some((x) => x.includes("git moment failed")),
      "--since with an unparsable ref fails closed");

    // 12) 搭车防线：范围含已评审 ADR（Review 行历史引入）+ 本批新 FULL 变更
    //     ——旧 ADR 的 Review 行不在本变更集 diff 内，不得给新变更搭车（L45）。
    r = newRepo(td, "f12");
    writeIn(r, NOTES_DIR + "/implemented/process/2026-09-05-x.md", EVIDENCE);
    writeIn(r, "scripts/verify-x.py", "# gate v1\n");
    commitAll(r, "base w/ reviewed adr");
    // 本批：新 FULL 变更 + 仅「触碰」旧 ADR（改一行正文，不新增 Review 行）
    writeIn(r, NOTES_DIR + "/implemented/process/2026-09-05-x.md", EVIDENCE.replace("## Consequences\n\nx", "## Consequences\n\nx\n- touched by a new batch\n"));
    writeIn(r, "scripts/verify-x.py", "# gate v2\n");
    commitAll(r, "new FULL change touching old reviewed adr");
    rows = scan(r, false, "HEAD~1");
    ok(rows.some((x) => x.includes("FULL-tier change lacks review evidence")
      && x.includes("introduced by this change set")),
      "old ADR's historical Review line does not certify a new FULL change");

    // 13) --since 范围跨多 commit：本批新增 Review 行（即使与 ADR 翻转分 commit）
    //     仍算证据——diff 是范围的累积视图，非单 commit 粒度（对齐 d4b8aa2→1b6c25b）。
    r = newRepo(td, "f13");
    commitAll(r, "base");
    writeIn(r, NOTES_DIR + "/implemented/process/2026-09-05-x.md",
      "# Agent Note: x\n\nStatus: implemented\n\n## Problem\n\nx\n\n## Decision\n\nx\n\n## Alternatives considered\n\n- a\n\n## Consequences\n\nx\n");
    writeIn(r, "scripts/verify-x.py", "# new gate v1\n");
    commitAll(r, "flip ADR w/o review line (d4b8aa2 形态)");
    writeIn(r, NOTES_DIR + "/implemented/process/2026-09-05-x.md", EVIDENCE);
    writeIn(r, "scripts/verify-x.py", "# new gate v2\n");
    commitAll(r, "add review line in later commit (1b6c25b 形态)");
    rows = scan(r, false, "HEAD~2");
    ok(rows.length === 0, "--since range pass when the Review line is added anywhere in the range (not per-commit)");

    // 14) --staged 搭车防线（pre-commit 消费面）：staged 集含历史已评审 ADR（Review
    //     行非本次引入）+ 本批新 FULL 变更 → 必须拦（R2 评审补夹具，S1）。
    r = newRepo(td, "f14");
    writeIn(r, NOTES_DIR + "/implemented/process/2026-09-05-x.md", EVIDENCE);
    commitAll(r, "base w/ reviewed adr");
    writeIn(r, NOTES_DIR + "/implemented/process/2026-09-05-x.md", EVIDENCE.replace("## Consequences\n\nx", "## Consequences\n\nx\n- touched\n"));
    writeIn(r, "scripts/verify-x.py", "# gate v2\n");
    rows = scan(r, true);
    ok(rows.some((x) => x.includes("FULL-tier change lacks review evidence")
      && x.includes("introduced by this change set")),
      "--staged blocks when the staged set touches an already-reviewed ADR without introducing a Review line");

    // 15) --staged 新增（staged 前未跟踪→已 add 的 ADR）带 Review 行 → 放行（staged
    //     态 diff --cached 可见整文件新增行；untracked 兜底不适用于本态）。
    r = newRepo(td, "f15");
    commitAll(r, "base");
    writeIn(r, NOTES_DIR + "/implemented/process/2026-09-05-x.md", EVIDENCE);
    writeIn(r, "scripts/verify-x.py", "# gate\n");
    rows = scan(r, true);
    ok(rows.length === 0, "--staged passes when a newly-added implemented ADR in the index carries the Review line");

    // 16) --staged 排除 untracked：未 add 的 ADR（不进 staged 集）不算证据——即使其
    //     工作树文件带合法 Review 行，--staged 下也无从引入（R2 S1 场景 3）。
    r = newRepo(td, "f16");
    commitAll(r, "base");
    writeIn(r, "scripts/verify-x.py", "# gate\n");
    const strayAdr = path.join(r, NOTES_DIR, "implemented", "process", "2026-09-05-stray.md");
    fs.mkdirSync(path.dirname(strayAdr), { recursive: true });
    fs.writeFileSync(strayAdr, EVIDENCE); // 不 git add——保持 untracked
    rows = scan(r, true);
    ok(rows.some((x) => x.includes("FULL-tier change lacks review evidence")),
      "--staged ignores an untracked ADR (not in the index) as evidence");
  } finally {
    fs.rmSync(td, { recursive: true, force: true });
  }

  if (failed === 0) {
    out("verify-review-tier --self-test OK (21 fixtures: triggers/evidence/modes/fail-closed/ride-along/staged)");
  } else {
    errOut("verify-review-tier --self-test FAIL");
  }
  return failed;
}

// —— CLI 面：与 py argparse 行为对齐（usage/help 的自动排版按 80 列观测形态钉住；
// prog 名取 basename(argv[1])，与 py basename(sys.argv[0]) 同口径——程序名属允许差异）。 ——
const PROG = path.basename(process.argv[1] ?? "verify-review-tier.mts");
const USAGE = `usage: ${PROG} [-h] [--repo REPO] [--staged] [--since BASE]\n`
  + `${" ".repeat(PROG.length + 8)}[--enforce] [--self-test]`;
const HELP = `${USAGE}\n`
  + "\n"
  + "Review tier classification + evidence gate\n"
  + "\n"
  + "options:\n"
  + "  -h, --help    show this help message and exit\n"
  + "  --repo REPO   repo root (default cwd)\n"
  + "  --staged      scan only the index vs HEAD (pre-commit use)\n"
  + "  --since BASE  scan committed range BASE..HEAD (pre-push use)\n"
  + "  --enforce     exit 1 when a FULL-tier diff lacks review evidence\n"
  + "  --self-test   run offline fixtures\n";

/** argparse parser.error 等价：usage + error 两行入 stderr，exit 2。 */
function parserError(msg: string): never {
  errOut(USAGE);
  errOut(`${PROG}: error: ${msg}`);
  process.exit(2);
}

interface Args { repo: string; staged: boolean; since: string | null; enforce: boolean; selfTest: boolean }

/** argparse.parse_args 等价：长选项支持 =内联取值与前缀缩写（歧义即错），
 * 取值 token 若形如选项则报 expected one argument；-h/--help 遇到即打 help exit 0。 */
function parseArgs(argv: string[]): Args {
  const args: Args = { repo: ".", staged: false, since: null, enforce: false, selfTest: false };
  const longs = ["--repo", "--staged", "--since", "--enforce", "--self-test"];
  const unrecognized: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]!;
    if (tok === "-h" || tok === "--help") {
      process.stdout.write(HELP);
      process.exit(0);
    }
    if (tok.startsWith("--")) {
      const eq = tok.indexOf("=");
      const name = eq === -1 ? tok : tok.slice(0, eq);
      const inline = eq === -1 ? null : tok.slice(eq + 1);
      const matches = longs.filter((l) => l.startsWith(name));
      if (matches.length === 0) {
        unrecognized.push(tok);
        continue;
      }
      if (matches.length > 1) parserError(`ambiguous option: ${name} could match ${matches.join(", ")}`);
      const opt = matches[0]!;
      if (opt === "--repo" || opt === "--since") {
        let value: string;
        if (inline !== null) {
          value = inline;
        } else {
          const next = argv[i + 1];
          if (next === undefined || (next.length > 1 && next.startsWith("-") && !/^-(\d+|\d*\.\d+)$/.test(next))) {
            parserError(`argument ${opt}: expected one argument`);
          }
          value = next!;
          i += 1;
        }
        if (opt === "--repo") args.repo = value;
        else args.since = value;
      } else if (inline !== null) {
        parserError(`argument ${opt}: ignored explicit argument '${inline}'`);
      } else if (opt === "--staged") {
        args.staged = true;
      } else if (opt === "--enforce") {
        args.enforce = true;
      } else {
        args.selfTest = true;
      }
      continue;
    }
    unrecognized.push(tok);
  }
  if (unrecognized.length > 0) parserError(`unrecognized arguments: ${unrecognized.join(" ")}`);
  return args;
}

/** py Path(repo_arg).resolve()：逐段 realpath（可解析符号链接），缺失段保留词法绝对路径。 */
function resolveRepo(repoArg: string): string {
  const abs = path.resolve(repoArg);
  const parts = abs.split(path.sep).filter((s) => s !== "");
  let cur: string = path.sep;
  for (const part of parts) {
    const next = path.join(cur, part);
    try {
      cur = fs.realpathSync(next);
    } catch {
      cur = next;
    }
  }
  return cur;
}

function main(argv: string[]): number {
  const args = parseArgs(argv);
  if (args.selfTest) return selfTest();
  if (args.staged && args.since !== null) parserError("--staged and --since are mutually exclusive");

  const repo = resolveRepo(args.repo);
  const rows = scan(repo, args.staged, args.since);
  if (rows.length > 0) {
    out(`review-tier: ${rows.length} violation(s)`);
    for (const r of rows) out(r);
    if (args.enforce) return 1;
  } else {
    out("review-tier: OK");
  }
  return 0;
}

// 入口守卫：直接运行时才分发 main；被 verify-review-brief.mts import 时不执行。
// argv[1] 先 realpath 再比对——符号链接调用面 import.meta.url 已是真身（R2 评审收口）。
const invokedAsEntry = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href;
if (invokedAsEntry) process.exit(main(process.argv.slice(2)));
