#!/usr/bin/env node
/**
 * verify-self-test-surface — CI self-test 清单 ↔ scripts/*.mts 自检入口 对账面。
 *
 * 判据（两侧互为全集）：
 *   1. 声明侧：.github/workflows/validate.yml 的「self-test 抽查」步骤 run 块里逐行
 *      \`node scripts/<file>.mts …\`——每个 <file> 必须实存且支持 \`--self-test\`；
 *   2. 实态侧：scripts/*.mts 中支持 \`--self-test\` 的件必须都在声明侧清单里。
 *
 * 判据 2 拦的形态：新 verify-* 件自带夹具但漏登 CI——pre-push 只跑 \`gates.mts --run\`
 * 平跑、不跑任何 \`--self-test\`，漏登即该件夹具在任何消费者里都不执行（评审在
 * host-service-reads 上实测的 Blocker）。判据 1 拦反向漂移（清单点名不存在的件 /
 * 不支持自检的件）。
 *
 * 自检支持判定 = 注释剥离后源码仍含 \`--self-test\` 字面量的行（字符串保留，故派发用
 * 的 \`process.argv[2] === "--self-test"\` 计入；纯注释提及不计——共享件 mdref / pypara /
 * srctree 即靠此排除）。无自检入口的 scripts 件（change-scope / pre-push /
 * pre-push-selftest）自然不入集。
 *
 * 用法（仓库根运行）：node scripts/verify-self-test-surface.mts [--self-test]
 * 退出码：0 = PASS，1 = 违约，2 = fail-closed（validate.yml 缺失或「self-test 抽查」
 * 步骤结构不可识别——判不了即拒跑）。
 * 模块形态：显式 .mts（ESM），相对 import 带显式扩展，只依赖 node: 内建。
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const PROGRAM = "verify-self-test-surface.mts";
const WORKFLOW_REL = path.join(".github", "workflows", "validate.yml");
const SELF_TEST_STEP = "self-test 抽查";
const SCRIPTS_DIR = "scripts";
const CI_SCRIPT_RE = /node\s+(scripts\/[A-Za-z0-9_.-]+\.mts)/g;

/** 剥掉 // 与 /* *​/ 注释、保留字符串字面量（派发用的 "--self-test" 在字符串里）。 */
function stripComments(src: string): string {
	let out = "";
	let i = 0;
	while (i < src.length) {
		const c = src[i]!;
		if (c === '"' || c === "'" || c === "`") {
			out += c;
			i += 1;
			while (i < src.length) {
				const d = src[i]!;
				out += d;
				if (d === "\\") {
					i += 1;
					if (i < src.length) out += src[i]!;
					i += 1;
					continue;
				}
				i += 1;
				if (d === c) break;
			}
			continue;
		}
		if (c === "/" && src[i + 1] === "/") {
			while (i < src.length && src[i] !== "\n") i += 1;
			continue;
		}
		if (c === "/" && src[i + 1] === "*") {
			i += 2;
			while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i += 1;
			i += 2;
			continue;
		}
		out += c;
		i += 1;
	}
	return out;
}

/** 源码是否声明自检入口（注释剥离后仍含 --self-test 字面量）。 */
function supportsSelfTest(src: string): boolean {
	return stripComments(src).includes("--self-test");
}

/** 盘面：scripts/*.mts 中支持 --self-test 的件（文件名，含扩展名）。 */
function localSelfTestScripts(repoRoot: string): string[] {
	const dir = path.join(repoRoot, SCRIPTS_DIR);
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(".mts"))
		.map((entry) => entry.name)
		.filter((name) => supportsSelfTest(fs.readFileSync(path.join(dir, name), "utf-8")))
		.sort();
}

/** 抽出「self-test 抽查」步骤 run 块里声明的 scripts/*.mts 集（去重保序）。 */
function declaredCiScripts(workflow: string): string[] | null {
	const stepIdx = workflow.indexOf(`- name: ${SELF_TEST_STEP}`);
	if (stepIdx === -1) return null;
	const runIdx = workflow.indexOf("run: |", stepIdx);
	if (runIdx === -1) return null;
	const runIndent = workflow.slice(workflow.lastIndexOf("\n", runIdx) + 1, runIdx).match(/^\s*/)![0].length;
	const rest = workflow.slice(workflow.indexOf("\n", runIdx) + 1);
	const names: string[] = [];
	for (const line of rest.split("\n")) {
		if (line.trim() === "") continue;
		const indent = line.match(/^\s*/)![0].length;
		if (indent <= runIndent) break;
		for (const match of line.matchAll(new RegExp(CI_SCRIPT_RE.source, "g"))) names.push(match[1]!);
	}
	return [...new Set(names)];
}

/** 判据主体（纯函数：CLI 与夹具共用）。 */
function evaluateSurface(repoRoot: string): { code: number; lines: string[] } {
	const workflowPath = path.join(repoRoot, WORKFLOW_REL);
	if (!fs.existsSync(workflowPath)) return { code: 2, lines: [`${PROGRAM}: FAIL-CLOSED — 缺 ${WORKFLOW_REL}`] };
	const declared = declaredCiScripts(fs.readFileSync(workflowPath, "utf-8"));
	if (declared === null) {
		return { code: 2, lines: [`${PROGRAM}: FAIL-CLOSED — 认不出「${SELF_TEST_STEP}」步骤的 run 内容`] };
	}
	const violations: string[] = [];
	const declaredSet = new Set(declared.map((rel) => path.basename(rel)));
	for (const rel of declared) {
		const abs = path.join(repoRoot, rel);
		if (!fs.existsSync(abs)) {
			violations.push(`self-test 清单点名不存在的件：${rel}`);
			continue;
		}
		if (!supportsSelfTest(fs.readFileSync(abs, "utf-8"))) violations.push(`self-test 清单条目不支持 --self-test：${rel}`);
	}
	for (const name of localSelfTestScripts(repoRoot)) {
		if (!declaredSet.has(name)) violations.push(`${SCRIPTS_DIR}/${name} 有 --self-test 但未登记 CI「${SELF_TEST_STEP}」清单`);
	}
	if (violations.length > 0) return { code: 1, lines: violations.map((violation) => `FAIL: ${violation}`) };
	return { code: 0, lines: [`OK: self-test 面（${declared.length} 条 CI 声明 ↔ ${localSelfTestScripts(repoRoot).length} 件盘面自检入口）`] };
}

/** CLI 入口：打印判据结果并返回退出码。 */
function realRun(repoRoot: string): number {
	const { code, lines } = evaluateSurface(repoRoot);
	for (const line of lines) (code === 2 ? console.error : console.log)(line);
	return code;
}

/** 夹具自测：合成临时仓（scripts/ + validate.yml），违约样例必须 FAIL/PASS 分明。 */
function selfTest(): number {
	const failures: string[] = [];
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "verify-self-test-surface-"));
	/** 造一个合成仓：scripts 文件名 → 源码，workflow 为 null 表示不写。 */
	const mkRepo = (label: string, scripts: Record<string, string>, workflow: string | null): string => {
		const repo = path.join(root, label);
		fs.mkdirSync(path.join(repo, SCRIPTS_DIR), { recursive: true });
		for (const [name, src] of Object.entries(scripts)) fs.writeFileSync(path.join(repo, SCRIPTS_DIR, name), src);
		if (workflow !== null) {
			fs.mkdirSync(path.join(repo, ".github", "workflows"), { recursive: true });
			fs.writeFileSync(path.join(repo, WORKFLOW_REL), workflow);
		}
		return repo;
	};
	const WF = (lines: string[]): string => `jobs:\n  gates:\n    steps:\n      - name: ${SELF_TEST_STEP}\n        run: |\n${lines.map((l) => `          ${l}`).join("\n")}\n      - name: engine self-test\n        run: node dist/engine/bin.js self-test\n`;
	const GATE = (): string => 'if (process.argv[2] === "--self-test") process.exit(0);\n';
	let fixtures = 0;
	const expect = (label: string, want: number, scripts: Record<string, string>, workflow: string | null): void => {
		fixtures += 1;
		const got = evaluateSurface(mkRepo(label, scripts, workflow)).code;
		if (got !== want) failures.push(`${label}: 期望 exit ${want}，实得 ${got}`);
	};
	try {
		const base = { "verify-a.mts": GATE(), "gates.mts": GATE(), "pre-push.mts": "console.log(1)\n" };
		expect("ok", 0, base, WF(["node scripts/gates.mts --self-test", "node scripts/verify-a.mts --self-test"]));
		// 有自检入口但漏登 CI → 违约（判据 2）
		expect("missing-registration", 1, base, WF(["node scripts/gates.mts --self-test"]));
		// 清单点名盘面不存在的件 → 违约（判据 1）
		expect("stale-entry", 1, base, WF(["node scripts/gates.mts --self-test", "node scripts/verify-a.mts --self-test", "node scripts/verify-ghost.mts --self-test"]));
		// 清单点名不支持自检的既有件（仅注释提及的不算支持）→ 违约（判据 1）
		expect("entry-without-selftest", 1, { ...base, "verify-comment.mts": "// --self-test in a comment only\n" }, WF(["node scripts/gates.mts --self-test", "node scripts/verify-a.mts --self-test", "node scripts/verify-comment.mts --self-test"]));
		// 纯注释提及不算自检入口 → 不入集，CI 不列也 PASS
		expect("comment-only-not-a-gate", 0, { "mdref.mts": "// consumers cover --self-test\n", "gates.mts": GATE() }, WF(["node scripts/gates.mts --self-test"]));
		// 缺 workflow / 认不出步骤 → fail-closed(2)
		expect("missing-workflow", 2, base, null);
		expect("unrecognized-step", 2, base, "jobs:\n  gates:\n    steps:\n      - name: 别的步骤\n        run: node scripts/verify-a.mts --self-test\n");
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
	if (failures.length > 0) {
		for (const failure of failures) console.log(`SELF-TEST FAIL: ${failure}`);
		return 1;
	}
	console.log(`${PROGRAM} self-test: ${fixtures} fixtures passed`);
	return 0;
}

if (process.argv[2] === "--self-test") {
	process.exit(selfTest());
}
process.exit(realRun(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")));
