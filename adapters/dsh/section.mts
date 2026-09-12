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
 *   共享同一组常量（摘要宽度 / 命中行上界 / 预算），是「常驻注入不膨胀」这条
 *   不变量的单源；配置侧只在装载期调用它。
 */

import type { EngineResult } from "./engine-bridge.mjs";

/** 每行命中条目的摘要截断宽度（一行式目录纪律，防单行失控）。 */
export const MAX_SUMMARY_CHARS = 160;

/**
 * 命中行 ref（`<domain>/<id>`）的长度上界。引擎会原样回显基因的 domain/id，
 * 故这不是手抄估值而是**可核验上界**：selftest 逐件遍历本仓 `genes/` 断言
 * 无一 ref 越界——超出即自测红，提示同变更调整本常量（实测最长 = 35 字符，
 * 示例 `process/git-reconcile-extra-commits`）。
 */
export const MAX_HIT_REF_CHARS = 64;

/** 一行命中条目的非摘要开销：ref 上界 + 两空格 + 截断省略号。 */
const HIT_LINE_OVERHEAD_CHARS = MAX_HIT_REF_CHARS + 3;

/** 命中行的最大渲染长度（`hitLines.slice` 截断后每行至多此长）。 */
const HIT_LINE_MAX_CHARS = MAX_SUMMARY_CHARS + 1;

/** 命中节每行常驻成本（最大渲染长度 + 非摘要开销），预算判据的单价。 */
export const HIT_LINE_COST_CHARS = HIT_LINE_MAX_CHARS + HIT_LINE_OVERHEAD_CHARS;

/**
 * 命中节注入面声明的缺省命中行数。单源在本模块——`config.mts` 以缺省值消费它，
 * 预算与上界由它推导，故改缺省只需改这一处。
 */
export const DEFAULT_MAX_INDEX_GENES = 12;

/**
 * 命中节的常量开销（`hitsSectionText` 的固定前缀 46 字符 + 溢出提示行
 * 27 字符，逐字实测）。解析失败降级为空节等路径只减少字符，故它恒是本项的
 * **上界**；selftest 以实渲染长度对预算复核，漂移即红。
 */
const HITS_SECTION_FIXED_CHARS = 73;

/**
 * 命中节可配行数的上界（导出即判据与自测的共用阈值，防两处各推一遍）：
 * 固定开销 + 该行数的最坏行宽之和落在预算内。语义 = 常驻注入预算的配置面。
 */
export const MAX_HIT_LINES = DEFAULT_MAX_INDEX_GENES + 1;

/**
 * 命中节常驻注入预算（字符），字面判据的阈面（护栏立项 ADR 决定 1：token
 * 基线不变量改两轨，字面预算即阻断面）。由「已发布缺省 + 一行」的最坏情形
 * 推导——预算与缺省同源，改缺省即自动跟随。`BASE_SECTION`（545 字符）另计
 * 不占本预算（基线本身固定，增长路径只有命中节）。
 *
 * **改动义务（code-standards §2.1）**：本值随 `MAX_SUMMARY_CHARS` /
 * `MAX_HIT_REF_CHARS` / `DEFAULT_MAX_INDEX_GENES` 三个原始量漂移，而它同时
 * 是装载期拒收阈值——单价上调会收紧 `MAX_HIT_LINES`，可能让已装机配置在
 * 升级后装载失败（口径见 `assertResidentSectionBudget` 与 adapters README
 * 「配置」表）；改这三个量前先核 selftest 的边界断言与已发布缺省是否仍过闸。
 */
export const HITS_SECTION_CHAR_BUDGET = HITS_SECTION_FIXED_CHARS + MAX_HIT_LINES * HIT_LINE_COST_CHARS;

/**
 * 常驻注入判据：命中节最坏情形（`MAX_HIT_LINES` 行满摘要）不得超预算。
 * 判据落配置装载期而非渲染期——超预算的配置在 prompt 组装前 fail-closed
 * 拒收，渲染路径保持原语义（不自作截断：静默改注入内容比拒载更难发现）。
 * 正整数类型面归 `config.mts` 的字段校验（先于本判据），此处只判上界。
 * 抛错文案带字段名、当前值、上界与单价，供配置侧直接定位。
 */
export function assertResidentSectionBudget(maxGenes: number): void {
	if (maxGenes > MAX_HIT_LINES) {
		throw new Error(
			`noogenesis: config.maxIndexGenes=${String(maxGenes)} exceeds the resident section budget ` +
				`(${HITS_SECTION_CHAR_BUDGET} chars / ${HIT_LINE_COST_CHARS} chars per hit line → at most ${MAX_HIT_LINES})`,
		);
	}
}

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
 * maxGenes 必传：调用点恒来自 config（缺省单源 = DEFAULT_MAX_INDEX_GENES 本模块导出，
 * README 配置表为口径单源）。
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
