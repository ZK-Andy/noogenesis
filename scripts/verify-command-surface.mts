#!/usr/bin/env node
/**
 * verify-command-surface — 引擎命令面 ↔ 声明面一致性闸（评审发现的机械化；ADR
 * 2026-09-11-review-finding-mechanization）。
 *
 * 事实源 = `engine/bin.ts` 的命令分支（`cmd === '…'`）。判据三类：
 *   1. `bin.ts` 的 `usage()` 行命令集 == 分支集（含 `self-test`）；
 *   2. `engine/README.md`「合同面」代码块命令集 == 分支集；
 *   3. 活声明面的「N 命令 / N commands」计数 == 核心命令数（分支集去 `self-test`）。
 *
 * 扫描面是**白名单**（活声明面：bin.ts / engine README+AGENTS / 两 README /
 * code-standards）；历史叙事面（journal / ADR / HANDOFF 滚动窗）不扫——它们
 * 合法地记载当时的命令数。命令名清单的散文写法（非 `N 命令` 计数句）不在
 * 机器面：那是评审的语义面。
 *
 * 用法（仓库根运行）：node scripts/verify-command-surface.mts [--self-test]
 * 退出码：0 = PASS，1 = 声明面与事实源不一致，2 = fail-closed（事实源不可读 /
 * 读不出任何命令分支——读不出不等于一致）。
 * 模块形态：显式 .mts（ESM），相对 import 带显式扩展，只依赖 node: 内建。
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const PROGRAM = "verify-command-surface.mts";

/** 命令分支的事实源（唯一）。 */
const SOURCE = "engine/bin.ts";
/** 命令集须逐字一致的两处结构化声明面。 */
const SET_SURFACES = ["engine/bin.ts", "engine/README.md"];
/** 计数声明的活声明面。 */
const COUNT_SURFACES = [
	"engine/bin.ts",
	"engine/AGENTS.md",
	"engine/README.md",
	"README.md",
	"README.zh.md",
	"docs/method/code-standards.md",
];
/** 命令名出现形态：`node dist/engine/bin.js <cmd>`。 */
const INVOCATION_RE = /node dist\/engine\/bin\.js ([a-z][a-z-]*)/g;
/** 分支形态：`cmd === '<name>'`。 */
const BRANCH_RE = /cmd === '([a-z][a-z-]*)'/g;
/** 计数声明：数字（CJK / 阿拉伯 / 英文词）+「命令 / commands」。 */
const COUNT_RE = /([一二三四五六七八九十]|\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:命令|commands?)/gi;
/** 不计数的合法形态：「五命令各一」描述的是命令件个数，不是 CLI 命令数。 */
const COUNT_EXCLUDE_SUFFIX = "各一";
const CJK_NUM: Record<string, number> = {
	一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
};
const WORD_NUM: Record<string, number> = {
	one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

/** 读文件；不存在/不可读返回 null（调用方决定 fail-closed 还是跳过）。 */
function readOrNull(abs: string): string | null {
	try {
		return fs.readFileSync(abs, "utf-8");
	} catch {
		return null;
	}
}

/** 收集文本里所有匹配（含 1-based 行号），便于报告定位。 */
function matches(text: string, re: RegExp): { value: string; line: number }[] {
	const out: { value: string; line: number }[] = [];
	const lines = text.split("\n");
	for (let i = 0; i < lines.length; i += 1) {
		const line = lines[i] ?? "";
		for (const m of line.matchAll(new RegExp(re.source, re.flags))) {
			out.push({ value: m[1] ?? "", line: i + 1 });
		}
	}
	return out;
}

/** 数字字面 → 数值；无法识别返回 null。 */
function toNumber(raw: string): number | null {
	const lower = raw.toLowerCase();
	if (CJK_NUM[raw] !== undefined) return CJK_NUM[raw] ?? null;
	if (WORD_NUM[lower] !== undefined) return WORD_NUM[lower] ?? null;
	if (/^\d+$/.test(raw)) return Number(raw);
	return null;
}

/**
 * 计数声明扫描：返回每条声明的行号、数值与其**后随文本**（例外判定要看
 * 「N 命令」整短语之后是什么，而不是数字之后是什么）。
 */
function countClaims(text: string): { line: number; raw: string; claimed: number | null; following: string }[] {
	const out: { line: number; raw: string; claimed: number | null; following: string }[] = [];
	const lines = text.split("\n");
	for (let i = 0; i < lines.length; i += 1) {
		const line = lines[i] ?? "";
		for (const m of line.matchAll(new RegExp(COUNT_RE.source, COUNT_RE.flags))) {
			const raw = m[1] ?? "";
			out.push({
				line: i + 1,
				raw,
				claimed: toNumber(raw),
				following: line.slice((m.index ?? 0) + m[0].length),
			});
		}
	}
	return out;
}

/** 判据主体：返回 `{code, report}`（0 PASS / 1 不一致 / 2 fail-closed）。 */
function evaluateCommandSurface(repoRoot: string): { code: number; report: string } {
	const sourceText = readOrNull(path.join(repoRoot, SOURCE));
	if (sourceText === null) {
		return { code: 2, report: `${PROGRAM}: FAIL-CLOSED — cannot read command source: ${SOURCE}\n` };
	}
	const branchNames = [...new Set(matches(sourceText, BRANCH_RE).map((m) => m.value))].sort();
	if (!branchNames.length) {
		return { code: 2, report: `${PROGRAM}: FAIL-CLOSED — no command branches found in ${SOURCE} (unreadable shape is not "consistent")\n` };
	}
	const coreNames = branchNames.filter((n) => n !== "self-test");
	const problems: string[] = [];

	// 判据 1/2：结构化声明面的命令集必须与分支集逐字一致。
	for (const surface of SET_SURFACES) {
		const text = readOrNull(path.join(repoRoot, surface));
		if (text === null) {
			problems.push(`${surface}: unreadable (declaration surface must exist)`);
			continue;
		}
		const declared = [...new Set(matches(text, INVOCATION_RE).map((m) => m.value))].sort();
		const missing = branchNames.filter((n) => !declared.includes(n));
		const extra = declared.filter((n) => !branchNames.includes(n));
		if (missing.length) problems.push(`${surface}: missing command(s) declared nowhere: ${missing.join(", ")}`);
		if (extra.length) problems.push(`${surface}: declares command(s) absent from ${SOURCE}: ${extra.join(", ")}`);
	}

	// 判据 3：活声明面的计数声明必须等于核心命令数。
	for (const surface of COUNT_SURFACES) {
		const text = readOrNull(path.join(repoRoot, surface));
		if (text === null) {
			problems.push(`${surface}: unreadable (count surface must exist)`);
			continue;
		}
		for (const hit of countClaims(text)) {
			if (hit.raw.length === 0) continue;
			// 合法例外：「N 命令各一」描述命令件个数，与 CLI 命令数无关。
			if (hit.following.startsWith(COUNT_EXCLUDE_SUFFIX)) continue;
			if (hit.claimed === null || hit.claimed === coreNames.length) continue;
			problems.push(`${surface}:${hit.line}: claims ${hit.raw} 命令/commands, actual core command count is ${coreNames.length}`);
		}
	}

	if (problems.length) {
		return {
			code: 1,
			report: [`${PROGRAM}: FAIL — command surface drift (source of truth = ${SOURCE}):`, ...problems.map((p) => `  ${p}`), ""].join("\n"),
		};
	}
	return {
		code: 0,
		report: `${PROGRAM}: OK (${coreNames.length} core commands + self-test; ${SET_SURFACES.length} set surfaces + ${COUNT_SURFACES.length} count surfaces in sync)\n`,
	};
}

/** 最小夹具仓：合成一个命令面自洽的仓库，供变异用例比对。 */
function fixtureRepo(label: string): string {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), `verify-command-surface-${label}-`));
	const write = (rel: string, body: string): void => {
		const abs = path.join(root, rel);
		fs.mkdirSync(path.dirname(abs), { recursive: true });
		fs.writeFileSync(abs, body);
	};
	write(
		"engine/bin.ts",
		[
			"function usage(): string {",
			"  return [",
			"    '  node dist/engine/bin.js alpha',",
			"    '  node dist/engine/bin.js beta',",
			"    '  node dist/engine/bin.js self-test',",
			"  ].join('\\n');",
			"}",
			"function main(cmd: string) {",
			"  if (cmd === 'alpha') return 0;",
			"  if (cmd === 'beta') return 0;",
			"  if (cmd === 'self-test') return 0;",
			"  return 2;",
			"}",
			"",
		].join("\n"),
	);
	write(
		"engine/README.md",
		["```sh", "node dist/engine/bin.js alpha", "node dist/engine/bin.js beta", "node dist/engine/bin.js self-test", "```", ""].join("\n"),
	);
	write("engine/AGENTS.md", "- **CLI 二命令（alpha/beta）+ self-test 是唯一合同面**\n");
	write("README.md", "- engine exposes two commands (`alpha` / `beta`) with zero dependencies.\n");
	write("README.zh.md", "- 演化发动机——`engine/` 二命令（`alpha` / `beta`）。\n");
	write("docs/method/code-standards.md", "- 实例：`engine/bin.ts` 头注声明 CLI 合同面（二命令 + 退出码三档）。\n");
	return root;
}

/**
 * 离线夹具自测：同一夹具仓按类变异，违约样例必须 FAIL、合规样例必须 PASS，
 * 且事实源不可读 / 读不出分支两态必须 fail-closed(2)。
 * 返回退出码（0 全过 / 1 有夹具违约）。
 */
function selfTest(): number {
	const failures: string[] = [];
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-command-surface-selftest-"));
	let fixtures = 0;
	const expect = (label: string, want: number, mutate: (root: string) => void): void => {
		fixtures += 1;
		const root = fixtureRepo(label);
		mutate(root);
		const got = evaluateCommandSurface(root).code;
		if (got !== want) failures.push(`${label}: 期望 exit ${want}，实得 ${got}`);
		fs.rmSync(root, { recursive: true, force: true });
	};
	try {
		expect("clean", 0, () => {});
		// 判据 1：usage 缺一条命令
		expect("usage-missing-command", 1, (root) => {
			const p = path.join(root, "engine/bin.ts");
			fs.writeFileSync(p, fs.readFileSync(p, "utf-8").replace("    '  node dist/engine/bin.js beta',\n", ""));
		});
		// 判据 2：README 代码块缺一条命令
		expect("readme-missing-command", 1, (root) => {
			const p = path.join(root, "engine/README.md");
			fs.writeFileSync(p, fs.readFileSync(p, "utf-8").replace("node dist/engine/bin.js beta\n", ""));
		});
		// 判据 3：计数漂移（两 README 与 AGENTS 同步漂移才只报计数一处；此处只改一方）
		expect("count-drift-zh", 1, (root) => {
			const p = path.join(root, "README.zh.md");
			fs.writeFileSync(p, fs.readFileSync(p, "utf-8").replace("二命令", "三命令"));
		});
		// 判据 3 的英文词形同样覆盖
		expect("count-drift-en-word", 1, (root) => {
			const p = path.join(root, "README.md");
			fs.writeFileSync(p, fs.readFileSync(p, "utf-8").replace("two commands", "five commands"));
		});
		// 合法例外：「N 命令各一」描述命令件个数——数量故意写错，仍必须 PASS
		expect("count-exclude-geyi", 0, (root) => {
			const p = path.join(root, "engine/README.md");
			fs.writeFileSync(p, fs.readFileSync(p, "utf-8") + "\n| `alpha.ts` / `beta.ts` | 五命令各一 |\n");
		});
		// fail-closed 两态：事实源缺失 / 读不出任何分支
		expect("source-missing", 2, (root) => fs.rmSync(path.join(root, "engine/bin.ts")));
		expect("no-branches", 2, (root) => fs.writeFileSync(path.join(root, "engine/bin.ts"), "// no branches here\n"));
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
	if (failures.length > 0) {
		for (const failure of failures) console.log(`SELF-TEST FAIL: ${failure}`);
		return 1;
	}
	console.log(`${PROGRAM} self-test: ${fixtures} fixtures passed`);
	return 0;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (process.argv.includes("--self-test")) {
	process.exit(selfTest());
}
const result = evaluateCommandSurface(repoRoot);
process.stdout.write(result.report);
process.exit(result.code);
