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

export function registerNooTools(ctx, { defineTool, runEngine, repoRoot }) {
	ctx.tools.register(
		defineTool({
			name: "noo_select",
			description:
				"Match evolution genes by explicit signal phrases (literal normalized match, multi-key union). Returns '<domain>/<id>  <summary>' lines. Read-only.",
			parameters: {
				signals: {
					type: "array",
					items: { type: "string" },
					description: "Signal phrases to match against gene signals, e.g. ['git 对账', 'push 前检查'].",
				},
			},
			output: textOutput(),
			execute: async (args) => {
				const signals = requireStringArray(args.signals, "noo_select");
				const result = await runEngine(["select", ...signals], { repoRoot });
				if (result.code === 2) failClosed("noo_select", result);
				return textResult(result.code === 0 ? result.stdout : `${result.stdout}${result.stderr}`);
			},
		}),
		defineTool({
			name: "noo_propose",
			description:
				"Render a gene's deterministic injection text (strategy steps + constraints + AVOID). Deterministic: same input, same output. Read-only.",
			parameters: {
				gene: { type: "string", description: 'Gene reference "<domain>/<id>", e.g. "process/git-reconcile-extra-commits".' },
			},
			output: textOutput(),
			execute: async (args) => {
				const gene = requireGeneRef(args.gene, "noo_propose");
				const result = await runEngine(["propose", gene], { repoRoot });
				if (result.code === 2) failClosed("noo_propose", result);
				return textResult(result.code === 0 ? result.stdout : `${result.stdout}${result.stderr}`);
			},
		}),
		defineTool({
			name: "noo_evaluate",
			description:
				"Run a gene against the full validation whitelist (gates.json). 0=green, 1=gate red (the red report is returned as text — it is a valid verdict), 2=fail-closed (throws). Read-only.",
			parameters: {
				gene: { type: "string", description: 'Gene reference "<domain>/<id>", e.g. "doc/doc-single-home".' },
			},
			output: textOutput(),
			execute: async (args) => {
				const gene = requireGeneRef(args.gene, "noo_evaluate");
				const result = await runEngine(["evaluate", gene], { repoRoot });
				if (result.code === 2) failClosed("noo_evaluate", result);
				const verdict = result.code === 0 ? "GREEN" : "RED (exit 1)";
				return textResult(`${verdict}\n${result.stdout}${result.stderr}`);
			},
		}),
	);
}
