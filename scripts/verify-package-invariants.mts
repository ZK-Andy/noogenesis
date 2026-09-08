#!/usr/bin/env node
/**
 * verify-package-invariants — 发布面不变量闸（轨道 B-2；ADR
 * 2026-09-08-coding-enforcement-track-b）。
 *
 * 判据 = package.json 与 dist 发布面的结构一致性（JSON/AST 级，不跑 npm pack）：
 *   1. `main` / `exports`（含裸字符串、条件对象、嵌套条件）的每个字符串目标实存；
 *   2. 上述目标被 `files` 白名单覆盖（`package.json` 恒由 npm 附带，豁免），且
 *      `files` 显式收录契约件清单（engine/gates.json、两 README、cordis.patch.yml、
 *      README.md、LICENSE、THIRD-PARTY-NOTICES.md）；
 *   3. dist 关键件实存（适配层入口 / 引擎 CLI / 门禁清单）；
 *   4. `engines.node` 在场、`dsh.bundle.patch` 指向实存件、`peerDependencies`
 *      的 `@deepseek-ai/*` 两件（dsh-tools + dsh-llm）在场；
 *   5. `files` 不得收录白名单外目录（`src/` / `tests/` / `.cache/`）。
 *
 * 前置：`npm run build`（dist 由 tsc 产出）；缺 dist → fail-closed exit 2
 *（发布面不变量在缺件时无法判定，不得静默绿）。权威面 = CI（先构建再跑）；
 * pre-push/pre-commit 判定的是本地现存的 dist（陈旧 dist 可能假绿，见 ADR
 * Consequences）。
 *
 * 用法（仓库根运行）：node scripts/verify-package-invariants.mts [--self-test]
 * 退出码：0 = PASS，1 = 违约，2 = fail-closed（缺 dist / package.json 缺失或不可解析）。
 * 模块形态：显式 .mts（ESM），相对 import 带显式扩展，只依赖 node: 内建。
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const PROGRAM = "verify-package-invariants.mts";

/** dist 关键件：适配层入口（main/exports 目标）/ 引擎 CLI / 门禁清单资产。 */
const DIST_KEY_FILES = ["dist/adapters/dsh/index.mjs", "dist/engine/bin.js", "dist/engine/gates.json"];

/** files 白名单必须显式收录的契约件（npm 只自动附带 package.json/README/LICENSE）。 */
const REQUIRED_FILES_ENTRIES = [
	"engine/gates.json",
	"engine/README.md",
	"adapters/dsh/README.md",
	"cordis.patch.yml",
	"README.md",
	"LICENSE",
	"THIRD-PARTY-NOTICES.md",
];

/** 不得进发布白名单的目录前缀（源码/测试/本地缓存）。 */
const FORBIDDEN_FILES_PREFIXES = ["src/", "tests/", ".cache/"];

/** 宿主 peer 依赖允许集（与 adapter selftest 的 import 面断言同集）。 */
const REQUIRED_PEER_DEPENDENCIES = ["@deepseek-ai/dsh-llm", "@deepseek-ai/dsh-tools"];

/** package.json 中本闸消费的窄面。 */
interface PackageManifest {
	name?: string;
	main?: string;
	exports?: unknown;
	files?: string[];
	engines?: { node?: string };
	dsh?: { bundle?: { patch?: string } };
	peerDependencies?: Record<string, string>;
}

/** 归一化发布路径（去 `./` 前缀）。 */
function normalize(rel: string): string {
	return rel.replace(/^\.\//, "");
}

/** `files` 白名单是否覆盖目标路径（目录项以 `/` 结尾即前缀覆盖）。 */
function coveredBy(files: readonly string[], target: string): boolean {
	return files.some((entry) => {
		const normalized = normalize(entry);
		return normalized === target || (normalized.endsWith("/") && target.startsWith(normalized));
	});
}

/** 递归收集 `exports` 树里的全部字符串目标（裸字符串 / 条件对象 / 嵌套条件同覆盖）。 */
function collectExportTargets(value: unknown, label: string, out: Array<[string, string]>): void {
	if (typeof value === "string") {
		out.push([label, value]);
		return;
	}
	if (value === null || typeof value !== "object") return;
	for (const [key, child] of Object.entries(value)) {
		collectExportTargets(child, `${label}[${JSON.stringify(key)}]`, out);
	}
}

/** 读 package.json（坏 JSON / 不可读 → null，由调用方 fail-closed）。 */
function readManifest(repoRoot: string): PackageManifest | null {
	try {
		return JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf-8")) as PackageManifest;
	} catch {
		return null;
	}
}

/** 单仓判据：返回违约串（空即合规）。 */
function collectViolations(repoRoot: string, pkg: PackageManifest): string[] {
	const violations: string[] = [];
	const files = pkg.files ?? [];

	// 1) main / exports 指针实存 + 2) files 覆盖
	const targets: Array<[string, string]> = [];
	if (typeof pkg.main === "string") targets.push(["main", pkg.main]);
	if (typeof pkg.exports === "string") targets.push(["exports", pkg.exports]);
	else collectExportTargets(pkg.exports, "exports", targets);
	for (const [label, raw] of targets) {
		const target = normalize(raw);
		if (!fs.existsSync(path.join(repoRoot, target))) {
			violations.push(`${label} → ${raw} 不存在（发布面悬空指针）`);
		}
		if (target !== "package.json" && !coveredBy(files, target)) {
			violations.push(`${label} → ${raw} 未被 files 白名单覆盖`);
		}
	}

	// 2b) 契约件显式收录
	for (const required of REQUIRED_FILES_ENTRIES) {
		if (!coveredBy(files, required)) violations.push(`files 白名单缺契约件：${required}`);
	}

	// 3) dist 关键件实存
	for (const key of DIST_KEY_FILES) {
		if (!fs.existsSync(path.join(repoRoot, key))) violations.push(`dist 关键件缺失：${key}（先 npm run build）`);
	}

	// 4) engines / bundle patch / peer 依赖
	if (typeof pkg.engines?.node !== "string" || pkg.engines.node.length === 0) {
		violations.push("engines.node 缺失（消费者无法判定运行时下限）");
	}
	const patch = pkg.dsh?.bundle?.patch;
	if (typeof patch !== "string" || !fs.existsSync(path.join(repoRoot, normalize(patch)))) {
		violations.push(`dsh.bundle.patch 未指向实存件：${String(patch)}`);
	}
	for (const dependency of REQUIRED_PEER_DEPENDENCIES) {
		if (typeof pkg.peerDependencies?.[dependency] !== "string") violations.push(`peerDependencies 缺 ${dependency}`);
	}

	// 5) files 不得收录白名单外目录
	for (const entry of files) {
		const normalized = normalize(entry);
		if (FORBIDDEN_FILES_PREFIXES.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix))) {
			violations.push(`files 收录白名单外目录：${entry}`);
		}
	}
	return violations;
}

/** 判据主体（纯函数：CLI 与夹具共用）：退出码 + 输出行。 */
function evaluatePackage(repoRoot: string): { code: number; lines: string[] } {
	if (!fs.existsSync(path.join(repoRoot, "package.json"))) {
		return { code: 2, lines: [`${PROGRAM}: FAIL-CLOSED — 缺 package.json`] };
	}
	if (!fs.existsSync(path.join(repoRoot, "dist"))) {
		return { code: 2, lines: [`${PROGRAM}: FAIL-CLOSED — 缺 dist/（先 npm run build；发布面不变量无法判定）`] };
	}
	const pkg = readManifest(repoRoot);
	if (pkg === null) return { code: 2, lines: [`${PROGRAM}: FAIL-CLOSED — package.json 不可解析`] };
	const violations = collectViolations(repoRoot, pkg);
	if (violations.length === 0) {
		return { code: 0, lines: ["OK: 发布面不变量（main/exports 实存 · files 覆盖 · dist 关键件 · engines/peer/bundle）"] };
	}
	return { code: 1, lines: violations.map((violation) => `FAIL: ${violation}`) };
}

/** CLI 入口：打印判据结果并返回退出码。 */
function realRun(repoRoot: string): number {
	const { code, lines } = evaluatePackage(repoRoot);
	for (const line of lines) (code === 2 ? console.error : console.log)(line);
	return code;
}

/** 夹具自测：以真实 package.json 为基线合成临时包，违约样例必须 FAIL、合规必须 PASS。 */
function selfTest(repoRoot: string): number {
	const failures: string[] = [];
	const base = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf-8")) as PackageManifest;
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-package-invariants-"));
	/** 合成一个包：合规基线（真实 manifest + 判据面全实存件）按 mutate 改写，返回退出码。 */
	const codeOf = (label: string, mutate: (pkg: PackageManifest) => void, remove?: (root: string) => void): number => {
		const root = path.join(dir, label);
		fs.mkdirSync(root, { recursive: true });
		for (const rel of [...DIST_KEY_FILES, ...REQUIRED_FILES_ENTRIES]) {
			const abs = path.join(root, rel);
			fs.mkdirSync(path.dirname(abs), { recursive: true });
			fs.writeFileSync(abs, "");
		}
		const pkg = structuredClone(base);
		mutate(pkg);
		fs.writeFileSync(path.join(root, "package.json"), JSON.stringify(pkg, null, 2));
		remove?.(root);
		return evaluatePackage(root).code;
	};
	const expect = (label: string, want: number, mutate: (pkg: PackageManifest) => void, remove?: (root: string) => void): void => {
		const got = codeOf(label, mutate, remove);
		if (got !== want) failures.push(`${label}: 期望 exit ${want}，实得 ${got}`);
	};
	try {
		expect("ok", 0, () => {});
		expect("no-dist-bin", 1, () => {}, (root) => fs.rmSync(path.join(root, "dist/engine/bin.js")));
		expect("files-miss", 1, (pkg) => {
			pkg.files = (pkg.files ?? []).filter((f) => f !== "THIRD-PARTY-NOTICES.md");
		});
		expect("exports-dangling", 1, (pkg) => {
			pkg.exports = { ".": "./dist/adapters/dsh/missing.mjs", "./package.json": "./package.json" };
		});
		expect("exports-bare-string", 1, (pkg) => {
			pkg.exports = "./dist/adapters/dsh/missing.mjs";
		});
		expect("src-in-files", 1, (pkg) => {
			pkg.files = [...(pkg.files ?? []), "src/"];
		});
		expect("bare-src-in-files", 1, (pkg) => {
			pkg.files = [...(pkg.files ?? []), "src"];
		});
		expect("files-uncovered", 1, (pkg) => {
			pkg.files = (pkg.files ?? []).filter((f) => f !== "dist/");
		});
		expect("engines-missing", 1, (pkg) => {
			delete pkg.engines;
		});
		expect("bundle-dangling", 1, (pkg) => {
			pkg.dsh = { bundle: { patch: "./missing.yml" } };
		});
		expect("peer-missing", 1, (pkg) => {
			delete pkg.peerDependencies?.["@deepseek-ai/dsh-tools"];
		});
		expect("exports-conditions-positive", 0, (pkg) => {
			pkg.exports = { ".": { types: "./dist/adapters/dsh/index.mjs", default: "./dist/adapters/dsh/index.mjs" } };
		});
		// fail-closed 三档（缺 package.json / 缺 dist / 坏 JSON）——直跑判据主体。
		const empty = path.join(dir, "empty");
		fs.mkdirSync(empty, { recursive: true });
		if (evaluatePackage(empty).code !== 2) failures.push("empty: 缺 package.json 未被 fail-closed");
		const noDist = path.join(dir, "no-dist");
		fs.mkdirSync(noDist, { recursive: true });
		fs.writeFileSync(path.join(noDist, "package.json"), JSON.stringify(base, null, 2));
		if (evaluatePackage(noDist).code !== 2) failures.push("no-dist: 缺 dist 未被 fail-closed");
		const badJson = path.join(dir, "bad-json");
		fs.mkdirSync(path.join(badJson, "dist"), { recursive: true });
		fs.writeFileSync(path.join(badJson, "package.json"), "{ not json");
		if (evaluatePackage(badJson).code !== 2) failures.push("bad-json: 坏 package.json 未被 fail-closed");
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
	if (failures.length > 0) {
		for (const failure of failures) console.log(`SELF-TEST FAIL: ${failure}`);
		return 1;
	}
	console.log(`${PROGRAM} self-test: 15 fixtures passed`);
	return 0;
}

if (process.argv[2] === "--self-test") {
	process.exit(selfTest(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")));
}
process.exit(realRun(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")));
