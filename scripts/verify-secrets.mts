#!/usr/bin/env node
/**
 * verify-secrets — 凭据绊线（融合立宪 D3/D10；实现 ADR
 * 2026-09-11-memory-line-phase1-observation-face）。
 *
 * 判据 = 三个资产面上的凭据形状扫描：
 *   1. `genes/**\/*.json`                      基因字段面（入 git）
 *   2. `events/**\/*.jsonl`                    事件轨，含 `evidence`（入 git）
 *   3. `.noogenesis/observations/**\/*.jsonl`  观测输入面（非 git；在场才扫）
 *
 * **强度上限（写死在件）：best-effort 绊线，不是安全属性——净过 ≠ 无凭据。**
 * 模式集 = provider token 形状 + 凭据赋值（`=` 与 `:`、带引号与不带）+ JWT +
 * URL 内嵌凭据 + 连接串凭据；后四类正是旧引擎 `secretLeakReason` 的已知盲区
 *（它只认带引号赋值、只覆盖其全局写入路径）。已知盲区同样写死在件：分片/拼接
 * 构造的凭据、非 ASCII 变体、以及不落上述三面的任何文本。
 *
 * 用法（仓库根运行）：node scripts/verify-secrets.mts [--self-test]
 * 退出码：0 = PASS，1 = 命中（违约），2 = fail-closed（面存在但不可读 / 仓根不可用）。
 * 模块形态：显式 .mts（ESM），相对 import 带显式扩展，只依赖 node: 内建。
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const PROGRAM = "verify-secrets.mts";

/** 扫描面（相对仓根）：符号链接不跟随（`withFileTypes` 的目录判定已排除）。 */
const SCAN_ROOTS = ["genes", "events", path.join(".noogenesis", "observations")];

/** 命中明细输出上限（一份文件被批量污染时不刷屏；尾行报剩余条数）。 */
const MAX_REPORTED = 20;

/** 凭据名（赋值启发式的左侧）：与旧引擎同族，去引号限制后覆盖 `:` 与 `=` 两种写法。 */
const CREDENTIAL_NAME = "[a-z0-9_]*(?:api[_-]?key|access[_-]?key|secret|token|password|passwd|pwd|credential)[a-z0-9_]*";

/** 一条扫描模式：`valueGroup` 指敏感值所在捕获组（默认整段匹配）。 */
interface SecretPattern {
	/** 命中标签（人面可读的凭据家族名）。 */
	label: string;
	/** 形状判据。 */
	regex: RegExp;
	/** 敏感值所在捕获组下标（默认 0 = 整段匹配）。 */
	valueGroup?: number;
	/** 值级否决（占位符/环境变量引用不算凭据）。 */
	reject?: (value: string) => boolean;
}

/**
 * 占位符与环境变量引用否决：全大写占位词（`YOUR_KEY_HERE`）、常见占位词根、
 * 模板/环境引用（`{{…}}` / `<…>` / `$VAR`）——旧引擎靠正则 lookahead 表达同一意图，
 * 此处拆成显式函数以便夹具逐条钉死正/负样例。
 */
function isPlaceholder(value: string): boolean {
	if (/^[A-Z0-9_]+$/.test(value)) return true;
	if (/^(?:your|my|the|some|example|sample|dummy|fake|test|changeme|placeholder|redacted|none|null|todo)/i.test(value)) return true;
	if (/^\$/.test(value) || value.includes("{") || value.includes("<")) return true;
	return false;
}

/** 模式集（顺序即报告顺序；provider 形状在前，启发式在后）。 */
const SECRET_PATTERNS: readonly SecretPattern[] = [
	{ label: "AnySearch API key", regex: /\bas_sk_[A-Za-z0-9]{8,}\b/ },
	{ label: "Anthropic API key", regex: /\bsk-ant-[A-Za-z0-9_-]{16,}\b/ },
	{ label: "OpenAI-style API key", regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/ },
	{ label: "GitHub token", regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/ },
	{ label: "GitHub fine-grained PAT", regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
	{ label: "AWS access key", regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
	{ label: "Google API key", regex: /\bAIza[0-9A-Za-z_-]{35}\b/ },
	{ label: "Slack token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
	{ label: "npm grant token", regex: /\bnpm_[A-Za-z0-9]{36}\b/ },
	{ label: "private key block", regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/ },
	{ label: "JWT", regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/ },
	{
		label: "credential assignment",
		regex: new RegExp(`(?:^|[^a-z0-9_])(${CREDENTIAL_NAME})["']?\\s*[:=]\\s*["']?([A-Za-z0-9+/_=.~-]{16,})["']?`, "i"),
		valueGroup: 2,
		reject: isPlaceholder,
	},
	{
		label: "credential in URL",
		// 口令自成一捕获组：reject 吃的是口令而非整段匹配（整段以 scheme 开头，
		// 永远不可能以 `$` 开头——环境变量式口令会漏过占位符否决而被误报）。
		regex: /\b[a-z][a-z0-9+.-]{1,15}:\/\/([^\s/:@]{1,64}):([^\s/:@]{3,})@/i,
		valueGroup: 2,
		reject: isPlaceholder,
	},
	{ label: "connection-string credential", regex: /\b(?:Password|Pwd)\s*=\s*([^;\s"']{6,})/i, valueGroup: 1, reject: isPlaceholder },
];

/** 命中脱敏：够定位凭据家族，永不回显全值（报告会进 CI 日志与评审材料）。 */
function redact(value: string): string {
	if (value.length <= 10) return `${value.slice(0, 3)}…`;
	return `${value.slice(0, 6)}…${value.slice(-3)}`;
}

/** 单行扫描：返回首个命中的 `{label, value}`，无命中返回 null（一行一报足够定位修复）。 */
function scanLine(line: string): { label: string; value: string } | null {
	for (const pattern of SECRET_PATTERNS) {
		const match = pattern.regex.exec(line);
		if (!match) continue;
		const value = match[pattern.valueGroup ?? 0] ?? "";
		if (!value || pattern.reject?.(value)) continue;
		return { label: pattern.label, value };
	}
	return null;
}

/** 递归收集扫描面内的目标文件（面缺席 = 空集，不是错误：观测目录本就允许不存在）。 */
function collectTargets(repoRoot: string): { files: string[]; unreadable: string[] } {
	const files: string[] = [];
	const unreadable: string[] = [];
	const walk = (abs: string, rel: string): void => {
		if (!fs.existsSync(abs)) return;
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(abs, { withFileTypes: true });
		} catch (e) {
			unreadable.push(`${rel} (${(e as Error).message})`);
			return;
		}
		for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
			const childAbs = path.join(abs, entry.name);
			const childRel = path.join(rel, entry.name);
			if (entry.isDirectory()) walk(childAbs, childRel);
			else if (entry.isFile() && (entry.name.endsWith(".json") || entry.name.endsWith(".jsonl"))) files.push(childRel);
		}
	};
	for (const root of SCAN_ROOTS) walk(path.join(repoRoot, root), root);
	return { files, unreadable };
}

/** 判据主体：返回 `{code, report}`（0 PASS / 1 命中 / 2 fail-closed）。 */
function evaluateSecrets(repoRoot: string): { code: number; report: string } {
	if (!fs.existsSync(repoRoot) || !fs.statSync(repoRoot).isDirectory()) {
		return { code: 2, report: `${PROGRAM}: FAIL-CLOSED — repo root not usable: ${repoRoot}\n` };
	}
	const { files, unreadable } = collectTargets(repoRoot);
	if (unreadable.length) {
		return { code: 2, report: `${PROGRAM}: FAIL-CLOSED — scan root unreadable:\n${unreadable.map((u) => `  ${u}`).join("\n")}\n` };
	}
	const findings: string[] = [];
	const bad: string[] = [];
	for (const rel of files) {
		let text: string;
		try {
			text = fs.readFileSync(path.join(repoRoot, rel), "utf-8");
		} catch (e) {
			bad.push(`${rel} (${(e as Error).message})`);
			continue;
		}
		const lines = text.split("\n");
		for (let i = 0; i < lines.length; i += 1) {
			const hit = scanLine(lines[i] ?? "");
			if (hit) findings.push(`  ${rel}:${i + 1} possible ${hit.label} ("${redact(hit.value)}")`);
		}
	}
	if (bad.length) {
		return { code: 2, report: `${PROGRAM}: FAIL-CLOSED — scanned file unreadable:\n${bad.map((b) => `  ${b}`).join("\n")}\n` };
	}
	if (findings.length) {
		const shown = findings.slice(0, MAX_REPORTED);
		const hidden = findings.length - shown.length;
		return {
			code: 1,
			report: [
				`${PROGRAM}: FAIL — possible credential literal(s) in git-facing assets (best-effort screen, not a security property):`,
				...shown,
				...(hidden > 0 ? [`  (+${hidden} more)`] : []),
				"  rotate the credential and keep it out of genes/events/observations.",
				"",
			].join("\n"),
		};
	}
	return { code: 0, report: `${PROGRAM}: OK (${files.length} file(s) scanned across ${SCAN_ROOTS.length} surface(s))\n` };
}

/**
 * 分片拼接凭据样例：源码里不留完整可匹配模式，运行期仍是完整样例。
 * 外部扫描器（GitHub secret scanning）对无校验位的 provider 形状只能报不能验，
 * 夹具留字面量必被误报——见 .agents/notes/implemented/process/2026-09-12-secret-fixture-fragment-encoding.md。
 */
function credentialSample(...parts: string[]): string {
	return parts.join("");
}

/**
 * 离线夹具自测，四类断言：
 *   1. **模式双向覆盖（元断言）**：`SECRET_PATTERNS` 每条必须有一条绑定它的正样例
 *      （命中且 label 相符——按序扫描，落在更早模式上即判不合格），带 `reject` 的
 *      还必须有一条绑定它的「匹配后被 reject 否决」负样例。这是本件自身盲区的机械
 *      化（判据来源 = ADR 2026-09-11-review-finding-mechanization）。
 *   2. 上游即挡的负样例：不得被任何模式命中。
 *   3. 扫描面：genes/events/observations 三面 + 面缺席 + 仓根不可用。
 *   4. **源码自洁（元断言）**：本件源码不得含无校验位 provider 形状的完整字面量——
 *      外部扫描器对这类形状只能报不能验，夹具留字面量必被误报（判据只判结果，样例经
 *      `credentialSample` 分片拼接是满足它的形态；形状 label 命不中模式表即违约）。
 * 返回退出码（0 全过 / 1 有夹具违约 / 2 fail-closed：自身源码不可读）。
 */
function selfTest(): number {
	const failures: string[] = [];
	let surfaceFixtures = 0;
	const expect = (label: string, want: number, root: string): void => {
		surfaceFixtures += 1;
		const got = evaluateSecrets(root).code;
		if (got !== want) failures.push(`${label}: 期望 exit ${want}，实得 ${got}`);
	};
	// 正样例：**绑定模式 label**（元断言 1 据此判定覆盖）。含旧引擎盲区：env 式赋值 / JWT / URL / 连接串。
	// 模式表按序扫描：≥16 字符的口令先被「凭据赋值」族命中，连接串族的独有覆盖是短口令
	// （赋值族值类下限 16、连接串族下限 6）——长口令归赋值族是正常归属，不是漏报。
	const positives: [string, string][] = [
		["AnySearch API key", "note as_sk_ABCDEFGH12345678"],
		["Anthropic API key", 'note "sk-ant-api03-AAAABBBBCCCCDDDDEEEE"'],
		["OpenAI-style API key", "const k = 'sk-proj-AAAABBBBCCCCDDDDEEEE'"],
		["GitHub token", "token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"],
		["GitHub fine-grained PAT", "token github_pat_ABCDEFGHIJKLMNOPQRSTUVWX"],
		["AWS access key", '{"key":"AKIAIOSFODNN7EXAMPLE"}'],
		["Google API key", "key " + credentialSample("AIzaSyABCDEFGHIJ", "KLMNOPQRSTUVWXYZ0123456")],
		["Slack token", "token xoxb-1234567890-abcdefghij"],
		["npm grant token", "npm_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"],
		["private key block", "-----BEGIN OPENSSH PRIVATE KEY-----"],
		["JWT", 'h "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk"'],
		["credential assignment", "DB_PASSWORD=hunter2hunter2xy"],
		["credential assignment", '"apiKey": "abcdef1234567890abcd"'],
		["credential in URL", '"postgres://appuser:s3cretpw@db.example.com:5432/app"'],
		["connection-string credential", '"Server=db;Password=abc123;Database=app"'],
	];
	// 元断言 1（正）：每条模式都有绑定样例，且命中它的正是它自己。
	for (const pattern of SECRET_PATTERNS) {
		const bound = positives.filter(([label]) => label === pattern.label);
		if (!bound.length) {
			failures.push(`pattern has no positive fixture: ${pattern.label}`);
			continue;
		}
		for (const [, line] of bound) {
			const hit = scanLine(line);
			if (!hit) failures.push(`positive fixture missed: ${pattern.label} (${line})`);
			else if (hit.label !== pattern.label) failures.push(`positive fixture hit wrong pattern (${hit.label}, expected ${pattern.label}): ${line}`);
		}
	}
	// 负样例：绑定模式 label，且必须**由该模式匹配后被 reject 否决**（不是靠上游正则挡住）。
	const rejected: [string, string][] = [
		["credential assignment", '{"dbPassword": "YOUR_PLACEHOLDER_VALUE"}'],
		["credential in URL", "postgres://appuser:$PGPASS@db.example.com:5432/app"],
		["credential in URL", "postgres://appuser:{{token}}@db.example.com:5432/app"],
		["connection-string credential", "Server=db;Password=YOUR_PASSWORD_HERE;Database=app"],
		["connection-string credential", "Server=db;Password=changeme;Database=app"],
		["connection-string credential", "Server=db;Password=<your-password>;Database=app"],
	];
	// 上报判据与生产扫描**同一实现**（折叠而非重写）：重写一份会让元断言在生产路径
	// 变更后变盲——那正是本批要机械化掉的「夹具自身盲区」形态。
	const owner = (line: string): string | null => scanLine(line)?.label ?? null;
	// 元断言 1（负）：带 reject 的模式必有「匹配且被否决」的绑定样例。
	for (const pattern of SECRET_PATTERNS) {
		if (!pattern.reject) continue;
		const bound = rejected.filter(([label]) => label === pattern.label);
		if (!bound.length) {
			failures.push(`reject-bearing pattern has no rejected fixture: ${pattern.label}`);
			continue;
		}
		for (const [, line] of bound) {
			const m = pattern.regex.exec(line);
			if (!m) {
				failures.push(`rejected fixture does not even match its pattern: ${pattern.label} (${line})`);
				continue;
			}
			const value = m[pattern.valueGroup ?? 0] ?? "";
			if (!pattern.reject(value)) failures.push(`rejected fixture not vetoed by reject: ${pattern.label} (${line})`);
			if (owner(line) !== null) failures.push(`rejected fixture still reported by ${String(owner(line))}: ${line}`);
		}
	}
	// 上游即挡的负样例（值类不含 `$`/`{`/`<`，或长度不足）——不得被任何模式命中。
	const unmatchable: [string, string][] = [
		["assign-allcaps", "API_KEY=YOUR_API_KEY_HERE"],
		["assign-env-ref", "API_KEY=$OPENAI_API_KEY"],
		["assign-template-ref", '"token": "{{token}}"'],
		["assign-angle-ref", "PASSWORD=<your-password>"],
		["assign-too-short", 'apiKey: "abc123"'],
		["plain-prose", "evidence: evaluate ok: all 16 gates green"],
	];
	for (const [label, line] of unmatchable) {
		const hit = scanLine(line);
		if (hit) failures.push(`pattern negative matched (${hit.label}): ${label}`);
	}

	// 元断言 4（源码自洁）：外部扫描器无法自校验的 provider 形状，不得以完整字面量留在本件
	// 源码里——它们只能被报、不能被验，本件夹具因此必被误报；形状取自模式表（单一事实源），
	// 此处只列"无校验位"的 label，新增此类形状即加行；label 命不中模式表即违约（防拼写漂移
	// 静默解除本闸）。
	const unverifiableShapes = ["Google API key"];
	let selfSource: string;
	try {
		selfSource = fs.readFileSync(selfPath, "utf8");
	} catch (error: unknown) {
		console.log(`${PROGRAM} self-test: FAIL-CLOSED — own source unreadable: ${selfPath} (${error instanceof Error ? error.message : String(error)})\n`);
		return 2;
	}
	for (const label of unverifiableShapes) {
		const shape = SECRET_PATTERNS.find((pattern) => pattern.label === label);
		if (shape === undefined) {
			failures.push(`unverifiable shape label not found in SECRET_PATTERNS: ${label}`);
			continue;
		}
		if (shape.regex.test(selfSource)) {
			failures.push(`self source carries a complete unverifiable credential shape (${label}): build the fixture with credentialSample(...)`);
		}
	}

	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-secrets-"));
	try {
		const mk = (name: string, files: Record<string, string>): string => {
			const root = path.join(dir, name);
			for (const [rel, body] of Object.entries(files)) {
				const abs = path.join(root, rel);
				fs.mkdirSync(path.dirname(abs), { recursive: true });
				fs.writeFileSync(abs, body);
			}
			fs.mkdirSync(root, { recursive: true });
			return root;
		};
		const clean = mk("clean", {
			"genes/process/g.json": '{"id":"g","summary":"uses no literal credentials"}\n',
			"events/2026-09.jsonl": '{"ts":"t","actor":"t","kind":"gene.added","evidence":"evaluate ok: all 16 gates green"}\n',
		});
		expect("clean", 0, clean);
		// 观测面在场但无命中边（观测数据本身不是凭据）：仍是 PASS，覆盖「有数据」路径
		expect("observation-face-no-hit", 0, mk("obs-clean", {
			".noogenesis/observations/2026-09.jsonl": '{"ts":"2026-09-10T00:00:00.000Z","signal":"s","gene":"a/b","outcome":"ok","evidence":"used a gene, no literal credential"}\n',
		}));

		expect("gene-face", 1, mk("gene-face", {
			"genes/process/g.json": '{"id":"g","summary":"key AKIAIOSFODNN7EXAMPLE"}\n',
		}));
		expect("event-evidence-face", 1, mk("event-face", {
			"events/2026-09.jsonl": '{"ts":"t","evidence":"used ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"}\n',
		}));
		expect("observation-face", 1, mk("obs-face", {
			".noogenesis/observations/2026-09.jsonl": '{"ts":"t","signal":"s","gene":"a/b","outcome":"ok","evidence":"DB_PASSWORD=hunter2hunter2xy"}\n',
		}));
		expect("unicode-filename-agnostic", 1, mk("nested", {
			"genes/域/g.json": '{"id":"g","summary":"sk-ant-api03-AAAABBBBCCCCDDDDEEEE"}\n',
		}));
		expect("missing-root", 2, path.join(dir, "does-not-exist"));
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
	if (failures.length > 0) {
		for (const failure of failures) console.log(`SELF-TEST FAIL: ${failure}`);
		return 1;
	}
	console.log(`${PROGRAM} self-test: ${SECRET_PATTERNS.length} patterns + ${surfaceFixtures} surface fixtures passed`);
	return 0;
}

const selfPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(selfPath), "..");
if (process.argv.includes("--self-test")) {
	process.exit(selfTest());
}
const result = evaluateSecrets(repoRoot);
process.stdout.write(result.report);
process.exit(result.code);
