/**
 * tools.mjs — noo_* 三工具（模型面只读路径；M2 ADR 接线件 ②）。
 *
 * defineTool 由入口注入（依赖注入）而非本模块 import —— 本模块保持零宿主
 * 依赖，可被 selftest 以假 defineTool 驱动（防火墙规则 2 的自测载体）。
 * 三个工具全部只读：select/propose/evaluate 不写盘、不提交；写路径只有
 * solidify-trigger（人工确认面），本模块不暴露 solidify 工具。
 *
 * 退出码映射（引擎 D6 三档）：0 = 结果文本；1 = 闸红（结果性红，作为文本
 * 返回给模型——红是有效评测结论，不是异常）；2 = fail-closed（抛错——环境
 * 性失败，重试无益，不得静默退化为空结果）。
 */

/** 三个工具共用的 output 契约（与 dsh-continual-evolve 同款文本工具面）。 */
function textOutput() {
	return {
		schema: { type: "object", additionalProperties: false, properties: { text: { type: "string", required: true } } },
		render: (_args, value) => [{ type: "text", text: value.text ?? "" }],
	};
}

function textResult(text) {
	return { text };
}

function requireStringArray(value, tool) {
	if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || item.length === 0)) {
		throw new Error(`${tool}: signals must be a non-empty array of non-empty strings`);
	}
	return value;
}

function requireGeneRef(value, tool) {
	if (typeof value !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*\/[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
		throw new Error(`${tool}: gene must be "<domain>/<id>" (lowercase kebab, matching the gene file layout)`);
	}
	return value;
}

/** fail-closed 统一抛错：指名引擎退出码与 stderr（诊断纪律：失败主体 + 违反规则）。 */
function failClosed(tool, result) {
	throw new Error(`${tool}: engine fail-closed (exit 2) — ${String(result.stderr || result.stdout || "(no output)").trim()}`);
}

/**
 * repoRoot 解析（部署收口 ADR 2026-09-06-adapter-deploy-hardening）：
 * 字符串 = 静态锚定（config/env/cwd 已在入口解析完）；函数 = 逐次解析——吃
 * execute(args, exec) 的 exec，走四级回退链（config → env → 会话工作区 → cwd）
 * 取本次调用的目标仓根。逐次解析是正确性要求：多 agent 异仓的工具体各归各仓，
 * 装载时固化会互相污染。
 */
function repoRootOf(repoRoot, exec) {
	return typeof repoRoot === "function" ? repoRoot(exec) : repoRoot;
}

export function registerNooTools(ctx, { defineTool, runEngine, repoRoot }) {
	// DSH 合同：ctx.tools.register(definition) 单参——一次传多个定义时多余实参
	// 被静默忽略（0.1.0 首发实测：三工具只上了一个）。逐个注册，绝不合并传参。
	const register = (definition) => ctx.tools.register(definition);
	register(defineTool({
		name: "noo_select",
		description:
			"Match evolution genes by explicit signal phrases (literal normalized match, multi-key union). Returns '<domain>/<id>  <summary>' lines. Read-only.",
		parameters: {
			signals: {
				type: "array",
				items: { type: "string" },
				required: true,
				description: "Signal phrases to match against gene signals, e.g. ['git 对账', 'push 前检查'].",
			},
		},
		output: textOutput(),
		execute: async (args, exec) => {
			const signals = requireStringArray(args.signals, "noo_select");
			const result = await runEngine(["select", ...signals], { repoRoot: repoRootOf(repoRoot, exec) });
			if (result.code === 2) failClosed("noo_select", result);
			return textResult(result.code === 0 ? result.stdout : `${result.stdout}${result.stderr}`);
		},
	}));
	register(defineTool({
		name: "noo_propose",
		description:
			"Render a gene's deterministic injection text (strategy steps + constraints + AVOID). Deterministic: same input, same output. Read-only.",
		parameters: {
			gene: { type: "string", description: 'Gene reference "<domain>/<id>", e.g. "process/git-reconcile-extra-commits".' },
		},
		output: textOutput(),
		execute: async (args, exec) => {
			const gene = requireGeneRef(args.gene, "noo_propose");
			const result = await runEngine(["propose", gene], { repoRoot: repoRootOf(repoRoot, exec) });
			if (result.code === 2) failClosed("noo_propose", result);
			return textResult(result.code === 0 ? result.stdout : `${result.stdout}${result.stderr}`);
		},
	}));
	register(defineTool({
		name: "noo_evaluate",
		description:
			"Run a gene against the full validation whitelist (gates.json). 0=green, 1=gate red (the red report is returned as text — a valid verdict; exit 1 with an empty report means an engine fault and throws), 2=fail-closed (throws). Read-only.",
		parameters: {
			gene: { type: "string", description: 'Gene reference "<domain>/<id>", e.g. "doc/doc-single-home".' },
		},
		output: textOutput(),
		execute: async (args, exec) => {
			const gene = requireGeneRef(args.gene, "noo_evaluate");
			const result = await runEngine(["evaluate", gene], { repoRoot: repoRootOf(repoRoot, exec) });
			if (result.code === 2) failClosed("noo_evaluate", result);
			// exit 1 + 空 stdout ≠ 红档结论：引擎对非 EngineError 的内部异常走
			// `throw e`（Node 崩溃退出码同为 1，无报告输出）——当红档放行会把
			// 引擎 bug 伪装成有效评测结论；红档必有报告 stdout，空则 fail-closed。
			if (result.code === 1 && !result.stdout.trim()) failClosed("noo_evaluate", result);
			const verdict = result.code === 0 ? "GREEN" : "RED (exit 1)";
			return textResult(`${verdict}\n${result.stdout}${result.stderr}`);
		},
	}));
}
