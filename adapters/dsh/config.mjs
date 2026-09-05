/**
 * config.mjs — 插件配置校验与缺省（零宿主依赖，selftest 直测）。
 * 手工校验不引 schemastery：宿主依赖收敛面只有 tools.mjs 入口的 defineTool
 * （防火墙规则 2）。类型违约即抛（fail-closed；诊断指名字段 + 期望类型）。
 */

function isNatural(value) {
	return Number.isInteger(value) && value > 0;
}

export function validateConfig(config = {}) {
	if (typeof config !== "object" || config === null || Array.isArray(config)) {
		throw new Error("noogenesis: config must be an object");
	}
	if (config.repoRoot !== undefined && (typeof config.repoRoot !== "string" || config.repoRoot.length === 0)) {
		throw new Error("noogenesis: config.repoRoot must be a non-empty string");
	}
	if (config.sectionOrder !== undefined && !isNatural(config.sectionOrder)) {
		throw new Error("noogenesis: config.sectionOrder must be a positive integer");
	}
	if (config.injectSignals !== undefined) {
		if (!Array.isArray(config.injectSignals) || config.injectSignals.some((item) => typeof item !== "string")) {
			throw new Error("noogenesis: config.injectSignals must be an array of strings");
		}
	}
	if (config.stagingDir !== undefined && (typeof config.stagingDir !== "string" || config.stagingDir.length === 0)) {
		throw new Error("noogenesis: config.stagingDir must be a non-empty string");
	}
	if (config.askOnDispose !== undefined && typeof config.askOnDispose !== "boolean") {
		throw new Error("noogenesis: config.askOnDispose must be a boolean");
	}
	if (config.actor !== undefined && (typeof config.actor !== "string" || config.actor.length === 0)) {
		throw new Error("noogenesis: config.actor must be a non-empty string");
	}
	if (config.maxIndexGenes !== undefined && !isNatural(config.maxIndexGenes)) {
		throw new Error("noogenesis: config.maxIndexGenes must be a positive integer");
	}
	return {
		repoRoot: config.repoRoot,
		sectionOrder: config.sectionOrder ?? 120,
		injectSignals: config.injectSignals ?? [],
		stagingDir: config.stagingDir ?? "genes-staging",
		askOnDispose: config.askOnDispose ?? true,
		actor: config.actor ?? "noogenesis",
		maxIndexGenes: config.maxIndexGenes ?? 12,
	};
}
