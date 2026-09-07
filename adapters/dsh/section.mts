/**
 * section.mts — system-prompt 有序节文本（纯函数，零宿主依赖，可脱离 DSH 自测）。
 *
 * 设计（M2 ADR 接线件 ①）：
 * - 常驻基座 = 极小固定节（工具面 + 写路径纪律，5 行级）；
 * - 命中节 = injectSignals 显式声明的信号喂给引擎 select，命中基因逐行注入；
 *   select 无命中（或未声明信号）→ 渲染为 "" → 宿主 prompt 渲染器丢弃 → 零 token。
 * - 信号只来自显式声明（配置 / 模型经 noo_select 工具喂入）；引擎 Detect 禁区
 *   （骨架 ADR D2）不在此解除——本模块不做任何自动信号发现。
 */

/** 每行命中条目的摘要截断宽度（一行式目录纪律，防单行失控）。 */
export const MAX_SUMMARY_CHARS = 160;

/** 常驻基座节：措辞即行为——只陈述真实能力与写路径纪律，不许诺未接线的能力。 */
export const BASE_SECTION = [
	"Noogenesis evolution gene bank is wired to this session.",
	"Genes are compact, behavior-oriented playbooks (strategy steps + constraints + AVOID warnings) curated in the target repo's genes/ directory.",
	"Signals are explicit: genes match literal normalized phrases — they are never auto-scanned.",
	"Use noo_select with signal phrases to find matching genes, noo_propose to render a gene's injection text, noo_evaluate to run its validation gates.",
	"Archiving a new gene (solidify) is a write path: it only runs with explicit human approval at session end.",
].join("\n");

/**
 * 命中节渲染：吃引擎 select 的 stdout（合同面 = stdout 文本，不另立解析协议）。
 * select stdout 首行为 `signals: ...`，其后每行 `<domain>/<id>  <summary>`，
 * 无命中为 `(no genes matched)`。逐行截断摘要，命中数按 maxGenes 封顶。
 */
export function hitsSectionText(
	selectResult: { stdout?: string } | undefined,
	{ maxGenes = 12, maxSummaryChars = MAX_SUMMARY_CHARS }: { maxGenes?: number; maxSummaryChars?: number } = {},
): string {
	const lines = String(selectResult?.stdout ?? "").split("\n").filter((line) => line.length > 0);
	const hitLines = lines.filter((line) => !line.startsWith("signals:") && line !== "(no genes matched)");
	if (!hitLines.length) return "";
	const capped = hitLines.slice(0, maxGenes).map((line) => (line.length > maxSummaryChars ? `${line.slice(0, maxSummaryChars)}…` : line));
	const truncated = hitLines.length > maxGenes ? `\n(+${hitLines.length - maxGenes} more — refine signals)` : "";
	// `{{` 中性化：宿主 system-prompt 的 interpolate 对未知 {{name}} 直接抛错，
	// 而 renderPrompt 在每个模型步无包裹调用——基因 summary 含模板语法（引擎
	// schema 允许）时会让会话每步持续崩。零宽插入保持肉眼内容不变，只拆散
	// 插值记号；engine stdout 不可信面在进入宿主 prompt 前在此一次性收口。
	const neutralized = capped.join("\n").replaceAll("{{", "{\u200b{");
	return `Noogenesis genes matched by declared signals:\n${neutralized}${truncated}`;
}
