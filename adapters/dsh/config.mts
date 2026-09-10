/**
 * config.mts — 插件配置校验与缺省（零宿主依赖，selftest 直测）。
 * 手工校验不引 schemastery：宿主依赖收敛面只有 tools.mts 入口的 defineTool
 * （防火墙规则 2）。类型违约即抛（fail-closed；诊断指名字段 + 期望类型）。
 */

function isNatural(value: unknown): value is number {
	// typeof 前置是 TS 对 unknown 的收窄要求——Number.isInteger 对非 number
	// 本就返回 false，前置只是收窄类型。
	return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** 官方基因库（P2 ADR D1 本仓即库；缺省进包 = 装完即部署，bug-fix ADR D2）。 */
export const DEFAULT_GENE_BANK_URL = "https://github.com/ZK-Andy/noogenesis.git";

/** 触点提醒匹配面（封闭三值）：写码目标路径前缀 / 路径后缀 / bash 命令文本正则。 */
export type SkillGuardKind = "path" | "suffix" | "command";

/** 触点提醒条目：匹配面（`kind`）+ 模式（`pattern`）+ 对口技能名。 */
export interface SkillGuardEntry {
	kind: SkillGuardKind;
	pattern: string;
	skill: string;
}

/**
 * 触点提醒缺省表（M1 守卫②；触发面扩面 ADR
 * 2026-09-11-skill-guard-trigger-faces）。宁缺勿滥（charter ADR 对价条款：
 * 重复提醒稀释真守卫信号）——只配实证过「该载未载」的强相关条目；噪声上界
 * 由触发器给（每会话每技能至多一条），不靠条目节制；任务型语义映射不进本表。
 */
export const DEFAULT_SKILL_GUARDS: readonly SkillGuardEntry[] = [
	{ kind: "path", pattern: "docs", skill: "noo-doc-standards" },
	{ kind: "suffix", pattern: ".md", skill: "noo-prose-standard" },
	{ kind: "path", pattern: ".agents/notes", skill: "noo-archive-agent-notes" },
	{ kind: "command", pattern: "\\bgit\\s+push\\b", skill: "noo-pre-push-checks" },
];

/** 触点提醒匹配面封闭集（配置校验的拒收判据）。 */
const SKILL_GUARD_KINDS: ReadonlySet<string> = new Set(["path", "suffix", "command"]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// 逐字段收窄助手（每个助手只在其字段违约时抛同一诊断串；检查条件、
// 抛错文案、字段求值顺序构成校验契约）。
function optNonEmptyString(value: unknown, field: "repoRoot" | "stagingDir" | "actor"): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`noogenesis: config.${field} must be a non-empty string`);
	}
	return value;
}

function optPositiveInteger(value: unknown, field: "sectionOrder" | "maxIndexGenes"): number | undefined {
	if (value === undefined) return undefined;
	if (!isNatural(value)) {
		throw new Error(`noogenesis: config.${field} must be a positive integer`);
	}
	return value;
}

function optBoolean(value: unknown, field: "askOnDispose"): boolean | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "boolean") {
		throw new Error(`noogenesis: config.${field} must be a boolean`);
	}
	return value;
}

function optStringArray(value: unknown): string[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
		throw new Error("noogenesis: config.injectSignals must be an array of strings");
	}
	return value;
}

function optGeneBankUrl(value: unknown): string | false | undefined {
	if (value === undefined) return undefined;
	if (value === false) return false;
	if (typeof value !== "string" || value.length === 0) {
		throw new Error("noogenesis: config.geneBankUrl must be a non-empty string or false");
	}
	return value;
}

function optSkillGuards(value: unknown): readonly SkillGuardEntry[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) {
		throw new Error("noogenesis: config.skillGuards must be an array of { kind, pattern, skill }");
	}
	return value.map((entry) => {
		if (!isRecord(entry) || typeof entry.kind !== "string" || !SKILL_GUARD_KINDS.has(entry.kind)) {
			throw new Error('noogenesis: config.skillGuards entries must be { kind: "path" | "suffix" | "command", pattern: string, skill: string }');
		}
		if (typeof entry.pattern !== "string" || entry.pattern.length === 0 || typeof entry.skill !== "string" || entry.skill.length === 0) {
			throw new Error("noogenesis: config.skillGuards entries must be { kind, pattern: string, skill: string } with non-empty pattern and skill");
		}
		const kind = entry.kind as SkillGuardKind;
		// 三类模式各自有「永不命中却通过非空校验」的形态——守卫静默失效，fail-closed 拒收。
		if (kind === "path") {
			// POSIX 相对目录且每段为常规段：绝对路径 / 盘符 / 反斜杠，以及空段
			// （`docs//x`、尾斜杠）、`.`、`..`（含前导 `./`）都不命中前缀匹配。
			const segments = entry.pattern.split("/");
			if (/^(\/|[A-Za-z]:)|\\/.test(entry.pattern) || segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
				throw new Error(`noogenesis: config.skillGuards path must be a POSIX-style relative directory of regular segments (got ${JSON.stringify(entry.pattern)})`);
			}
		}
		// suffix：点开头的扩展名（含 `/` 是路径不是后缀）。
		if (kind === "suffix" && (!entry.pattern.startsWith(".") || entry.pattern.includes("/"))) {
			throw new Error(`noogenesis: config.skillGuards suffix must be a dot-prefixed extension such as ".md" (got ${JSON.stringify(entry.pattern)})`);
		}
		// command：编译不得抛（守卫按事件现场编译；不可编译即静默失效）。
		if (kind === "command") {
			try {
				new RegExp(entry.pattern);
			} catch {
				throw new Error(`noogenesis: config.skillGuards command pattern must be a valid regular expression (got ${JSON.stringify(entry.pattern)})`);
			}
		}
		return { kind, pattern: entry.pattern, skill: entry.skill };
	});
}

/**
 * 校验并归一化插件配置（9 字段；缺省与失败模式单源见 ./README.md「配置」表）。
 * 违约抛 Error（fail-closed）；geneBankUrl undefined = 官方库缺省、false = 显式禁用。
 */
export function validateConfig(config: unknown = {}) {
	if (!isRecord(config)) {
		throw new Error("noogenesis: config must be an object");
	}
	const repoRoot = optNonEmptyString(config.repoRoot, "repoRoot");
	const sectionOrder = optPositiveInteger(config.sectionOrder, "sectionOrder");
	const injectSignals = optStringArray(config.injectSignals);
	const stagingDir = optNonEmptyString(config.stagingDir, "stagingDir");
	const askOnDispose = optBoolean(config.askOnDispose, "askOnDispose");
	const actor = optNonEmptyString(config.actor, "actor");
	const maxIndexGenes = optPositiveInteger(config.maxIndexGenes, "maxIndexGenes");
	// geneBankUrl：undefined → 缺省官方库（装完即部署）；false → 显式禁用
	// （pull 面短路，零 clone 尝试）；非空 string → 自定义库；空串/其余类型违约。
	const geneBankUrl = optGeneBankUrl(config.geneBankUrl);
	// skillGuards：undefined → 缺省表；显式数组整体替换缺省表（条目按需增删）。
	const skillGuards = optSkillGuards(config.skillGuards);
	return {
		repoRoot,
		sectionOrder: sectionOrder ?? 120,
		injectSignals: injectSignals ?? [],
		stagingDir: stagingDir ?? "genes-staging",
		askOnDispose: askOnDispose ?? true,
		actor: actor ?? "noogenesis",
		maxIndexGenes: maxIndexGenes ?? 12,
		geneBankUrl: geneBankUrl ?? DEFAULT_GENE_BANK_URL,
		skillGuards: skillGuards ?? DEFAULT_SKILL_GUARDS,
	};
}
