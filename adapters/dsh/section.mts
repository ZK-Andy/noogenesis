/**
 * section.mts — system-prompt 有序节文本（纯函数 + 命中节 provider 工厂，零宿主依赖，可脱离 DSH 自测）。
 *
 * 设计（M2 ADR 接线件 ①）：
 * - 常驻基座 = 极小固定节（工具面 + 写路径纪律，5 行级）；
 * - 命中节 = injectSignals 显式声明的信号喂给引擎 select，命中基因逐行注入；
 *   select 无命中（或未声明信号）→ 渲染为 "" → 宿主 prompt 渲染器丢弃 → 零 token。
 * - 信号只来自显式声明（配置 / 模型经 noo_select 工具喂入）；引擎 Detect 禁区
 *   （骨架 ADR D2）不在此解除——本模块不做任何自动信号发现。
 * - 常驻注入预算判据（`assertResidentSectionBudget`）也落本模块：它与节渲染
 *   共享同一组常量（摘要宽度 / 行开销 / 预算），是「常驻注入不膨胀」这条
 *   不变量的单源；配置侧只在装载期调用它。
 */

import type { EngineResult } from "./engine-bridge.mjs";

/** 每行命中条目的摘要截断宽度（一行式目录纪律，防单行失控）。 */
export const MAX_SUMMARY_CHARS = 160;

/**
 * 命中节每行的非摘要开销估算（`<domain>/<id>` + 两空格 + 截断省略号，保守
 * 取 16），与 `MAX_SUMMARY_CHARS` 一同构成「每行常驻成本」——预算判据的单价面。
 */
export const HIT_LINE_OVERHEAD_CHARS = 16;

/** 命中节每行常驻成本（摘要宽度 + 行开销），预算判据的单价。 */
export const HIT_LINE_COST_CHARS = MAX_SUMMARY_CHARS + HIT_LINE_OVERHEAD_CHARS;

/** 已发布缺省命中行数（口径单源 = config.mts；本常量只为预算自洽断言与推导）。 */
export const DEFAULT_MAX_INDEX_GENES = 12;

/** `(+N more — refine signals)` 溢出提示行的保守上界（多一位数也够用）。 */
const HITS_OVERFLOW_NOTE_CHARS = 64;

/**
 * 命中节常驻注入预算（字符），字面判据的阈面（护栏立项 ADR 决定 1：token
 * 基线不变量改两轨，字面预算即阻断面）。口径 = 「已发布缺省行数的自身最坏
 * 情形 + 一行余量」——预算与缺省同源，改缺省即自动跟随；`BASE_SECTION`
 * （545 字符）另计不占本预算（基线本身固定，增长路径只有命中节：基因库只增
 * 不减 + `maxIndexGenes` 可调大）。
 */
export const HITS_SECTION_CHAR_BUDGET =
	(DEFAULT_MAX_INDEX_GENES + 1) * HIT_LINE_COST_CHARS + HITS_OVERFLOW_NOTE_CHARS;

/**
 * 常驻注入判据：命中节最坏情形（`maxGenes` 行满摘要）不得超预算。
 * 判据落配置装载期而非渲染期——超预算的配置在 prompt 组装前 fail-closed
 * 拒收，渲染路径保持原语义（不自作截断：静默改注入内容比拒载更难发现）。
 * 抛错文案带字段名、当前值、上界与单价，供配置侧直接定位。
 */
export function assertResidentSectionBudget(maxGenes: number): void {
	const ceiling = Math.floor((HITS_SECTION_CHAR_BUDGET - HITS_OVERFLOW_NOTE_CHARS) / HIT_LINE_COST_CHARS);
	if (!Number.isInteger(maxGenes) || maxGenes < 1 || maxGenes > ceiling) {
		throw new Error(
			`noogenesis: config.maxIndexGenes=${String(maxGenes)} exceeds the resident section budget ` +
				`(${HITS_SECTION_CHAR_BUDGET} chars / ${HIT_LINE_COST_CHARS} chars per hit line → at most ${ceiling})`,
		);
	}
}

// 自洽不变量（模块装载期即查）：已发布缺省必须过判据——否则升级后插件拿
// 自己的缺省配置装载失败（预算与缺省不能各说各话）。缺口只在源码面暴露，
// 不在运行时兜底。
assertResidentSectionBudget(DEFAULT_MAX_INDEX_GENES);

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
 * 无命中为 `(no genes matched)`；观测建议档行（`advice: ...`，融合立宪 D8/D10）
 * 排在命中行之后，**不进常驻节**——建议按需经 noo_select 工具输出读，常驻面
 * 每模型步重复付费。逐行截断摘要，命中数按 maxGenes 封顶。
 * maxGenes 必传：调用点恒来自 config（缺省 12 单源 = config.mts，README 配置表为口径单源）。
 * 前缀过滤的边界：命中行恒以 `<domain>/<id>`（两者 kebab）开头，`signals:` 与 `advice:`
 * 都不可能成为命中行的行首（需求 `:` 而 ref 必含 `/`），故按前缀剔除不会误杀命中。
 */
export function hitsSectionText(
	selectResult: { stdout?: string } | undefined,
	opts: { maxGenes: number; maxSummaryChars?: number },
): string {
	const { maxGenes, maxSummaryChars = MAX_SUMMARY_CHARS } = opts;
	const lines = String(selectResult?.stdout ?? "").split("\n").filter((line) => line.length > 0);
	const hitLines = lines.filter((line) => !line.startsWith("signals:") && !line.startsWith("advice:") && line !== "(no genes matched)");
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

/** createHitsSection 的注入面：引擎同步 runner 与告警出口由调用方传入（零宿主依赖可测）。 */
export interface HitsSectionDeps {
	injectSignals: readonly string[];
	maxGenes: number;
	repoRoot: string | undefined;
	runSelectSync: (args: string[], opts: { repoRoot?: string }) => EngineResult;
	warn: (message: string) => void;
}

/**
 * 命中节 text provider 工厂：select 失败 → warn 留痕 + 渲染降级 ""（命中节缺席
 * ≠ 会话阻断，绝不抛错阻断 prompt 组装）。每次故障期至多一条 warn、成功即复位
 * ——provider 每模型步运行，逐条 warn 会刷屏；复位让下轮故障重新留痕。
 * 空 injectSignals 短路（select 空键必 exit 2，纯浪费一子进程/每次 prompt 组装）。
 */
export function createHitsSection(deps: HitsSectionDeps): () => string {
	let selectDownWarned = false;
	return () => {
		if (!deps.injectSignals.length) return "";
		const r = deps.runSelectSync(["select", ...deps.injectSignals], { repoRoot: deps.repoRoot });
		if (r.code !== 0) {
			if (!selectDownWarned) {
				selectDownWarned = true;
				const reason = r.stderr.trim().split("\n")[0] || "(no stderr)";
				deps.warn(`noogenesis select failed (exit ${r.code}) — hits section degraded to empty: ${reason}`);
			}
		} else {
			selectDownWarned = false;
		}
		return hitsSectionText(r, { maxGenes: deps.maxGenes });
	};
}
