/**
 * config.mts — 插件配置校验与缺省（零宿主依赖，selftest 直测）。
 * 手工校验不引 schemastery：宿主依赖收敛面只有 tools.mts 入口的 defineTool
 * （防火墙规则 2）。类型违约即抛（fail-closed；诊断指名字段 + 期望类型）。
 */

function isNatural(value: unknown): value is number {
	// typeof 前置是 TS 对 unknown 的收窄要求——Number.isInteger 对非 number 本就
	// 返回 false，运行时行为与旧实现逐值等价。
	return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** 官方基因库（P2 ADR D1 本仓即库；缺省进包 = 装完即部署，bug-fix ADR D2）。 */
export const DEFAULT_GENE_BANK_URL = "https://github.com/ZK-Andy/noogenesis.git";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// 逐字段收窄助手（TS strict 化的行为等价窄化：检查条件、抛错文案、字段求值
// 顺序与旧实现逐一对齐——每个助手只在其字段违约时抛同一诊断串）。
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

/**
 * 校验并归一化插件配置（8 字段；缺省与失败模式单源见 ./README.md「配置」表）。
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
	return {
		repoRoot,
		sectionOrder: sectionOrder ?? 120,
		injectSignals: injectSignals ?? [],
		stagingDir: stagingDir ?? "genes-staging",
		askOnDispose: askOnDispose ?? true,
		actor: actor ?? "noogenesis",
		maxIndexGenes: maxIndexGenes ?? 12,
		geneBankUrl: geneBankUrl ?? DEFAULT_GENE_BANK_URL,
	};
}
