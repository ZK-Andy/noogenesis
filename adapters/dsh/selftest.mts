/**
 * selftest.mts — 适配层元评测（零宿主依赖，可在无 DSH 环境跑；CI 与 pre-push
 * 与 engine self-test 平级，不占门禁编号）。
 *
 * 覆盖面：bridge 合同（stdout + 退出码三档实跑）、cwd 锚定（repoRoot 显式
 * 传入 vs process.cwd() 漂移）、section 渲染（空命中 → ""）、tools 依赖注入
 * 面（假 defineTool + 假引擎）、solidify 触发体全路径、配置校验 fail-closed、
 * 防火墙机器检查（adapters/dsh import 面 + engine 零第三方依赖 + 插件包
 * 结构契约）。
 *
 * 引擎夹具纪律（同 engine selftest 教训）：全部在 os.tmpdir 临时 git 仓内
 * 实跑真实 dist/engine/bin.js，不触碰真实仓。
 *
 * 运行形态（B2 ADR）：本件是 dist 面——经 tsc 发射为
 * `dist/adapters/dsh/selftest.mjs` 运行（`npm run build` 后
 * `node dist/adapters/dsh/selftest.mjs`）；源 .mts 不是运行形态。因此
 * REPO_ROOT 需三级上溯到真仓根，防火墙 engine 扫描与包结构契约仍判真仓
 * 文件；solidify 提醒命令断言同款指 dist/engine/bin.js（与
 * solidify-trigger.mts 的 dist 形态提示串对齐）。
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { isBuiltin } from "node:module";
import { fileURLToPath } from "node:url";
import type { defineTool, ToolDefinition } from "@deepseek-ai/dsh-tools";
import { runEngineSync, resolveRepoRoot, sessionWorkspaceOf, explicitRepoRootOf, EXIT } from "./engine-bridge.mjs";
import { hitsSectionText, createHitsSection } from "./section.mjs";
import { registerNooTools } from "./tools.mjs";
import { listStagingCandidates, buildSolidifyArgs, solidifyNotice, runSolidifyTrigger, createInFlightGate, ASK_TIMEOUT_MS } from "./solidify-trigger.mjs";
import { buildPullArgs, pullBankOnce, createBankPullScheduler } from "./bank-pull.mjs";
import { BUNDLED_SKILL_RANK, PROVIDER_NAME, createBankSkillProvider, parseSkillFile, registerBankSkills } from "./skill-provider.mjs";
import { validateConfig, DEFAULT_GENE_BANK_URL } from "./config.mjs";
import { createSessionStore, mergePreStep, mergeSessionStart, mergeToolPost, mergeToolPre } from "./mount.mjs";
import { createMountPolicies, createSubtreeRulesPolicies, SKILL_DIR_CANDIDATES } from "./mount-policies.mjs";
import { createLintFeedbackPolicies } from "./lint-feedback.mjs";
import type { LintDiagnostic, LintRunContext } from "./lint-feedback.mjs";
import { createExportDocsPolicies } from "./export-docs-feedback.mjs";
import type { ExportDocsRunContext, ExportDocsRunResult } from "./export-docs-feedback.mjs";
import { createSkillGuardPolicies } from "./skill-guard.mjs";
import { apply } from "./index.mjs";

const ADAPTER_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(ADAPTER_DIR, "..", "..", "..");
const PASSED: string[] = [];

function ok(name: string): void {
	PASSED.push(name);
	console.log(`ok - ${name}`);
}

function tempRepo(label: string): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), `noo-adapter-${label}-`));
	execFileSync("git", ["init", "-q"], { cwd: dir });
	return dir;
}

const FIXTURE_GENE = {
	id: "demo-hit",
	domain: "demo",
	summary: "demo gene for adapter selftest",
	signals: ["demo signal", "另一个 信号"],
	strategy: ["step one", "step two"],
};

function writeFixtureGene(repoRoot: string): void {
	const dir = path.join(repoRoot, "genes", "demo");
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, `${FIXTURE_GENE.id}.json`), JSON.stringify(FIXTURE_GENE, null, 2) + "\n");
}

// ── 1) bridge 合同：stdout 文本 + 退出码三档（真实引擎实跑） ──────────────
{
	const repo = tempRepo("bridge");
	const empty = runEngineSync(["select", "demo signal"], { repoRoot: repo });
	assert.equal(empty.code, EXIT.OK);
	assert.match(empty.stdout, /\(no genes matched\)/);
	ok("bridge: select in empty repo → exit 0, '(no genes matched)'");

	assert.equal(runEngineSync(["evaluate", "demo/missing"], { repoRoot: repo }).code, EXIT.FAIL_CLOSED);
	ok("bridge: evaluate missing gene → exit 2 (fail-closed)");

	// cwd 锚定：repoRoot 显式指向夹具仓，process.cwd() 停在别处——命中即证锚定生效
	writeFixtureGene(repo);
	const hit = runEngineSync(["select", "demo signal"], { repoRoot: repo });
	assert.equal(hit.code, EXIT.OK);
	assert.match(hit.stdout, /demo\/demo-hit\s+demo gene for adapter selftest/);
	assert.doesNotMatch(hit.stdout, /no genes matched/);
	ok("bridge: cwd anchoring — explicit repoRoot hits fixture gene while cwd is elsewhere");

	const multi = runEngineSync(["select", "另一个 信号"], { repoRoot: repo });
	assert.match(multi.stdout, /demo\/demo-hit/);
	ok("bridge: signal normalization — CJK multi-space signal matches");
}

// ── 2) section：空命中 → ""（零 token）；命中 → 一行式封顶 ────────────────
{
	assert.equal(hitsSectionText({ stdout: "" }, { maxGenes: 12 }), "");
	assert.equal(hitsSectionText({ stdout: "signals: x\n(no genes matched)\n" }, { maxGenes: 12 }), "");
	ok("section: empty select → '' (zero-token drop)");

	const many = Array.from({ length: 15 }, (_, i) => `demo/g-${i}  summary ${i}`).join("\n");
	const rendered = hitsSectionText({ stdout: `signals: x\n${many}\n` }, { maxGenes: 3 });
	assert.equal(rendered.split("\n").filter((l) => l.startsWith("demo/")).length, 3);
	assert.match(rendered, /\(\+12 more/);
	ok("section: hit lines capped with (+N more) tail");

	const long = `demo/x  ${"字".repeat(200)}`;
	assert.ok(hitsSectionText({ stdout: `signals: x\n${long}\n` }, { maxGenes: 12, maxSummaryChars: 160 }).includes("…"));
	ok("section: per-line summary truncated");

	// `{{` 中性化：宿主 interpolate 对未知 {{name}} 抛错且每模型步调用
	// renderPrompt——模板语法基因 summary 不得原样进 system-prompt 节。
	const templated = hitsSectionText({ stdout: "signals: x\ndemo/tmpl  prefer {{placeholder}} tokens\n" }, { maxGenes: 12 });
	assert.ok(!templated.includes("{{"), "literal {{ must not survive into section text");
	assert.ok(templated.includes("{\u200b{placeholder}"), "neutralized form keeps visible content");
	ok("section: '{{' neutralized (interpolate cannot throw on gene summaries)");

	// 观测建议档行不进常驻节（融合立宪 D8/D10）：命中行在场、advice 行被滤掉，
	// 也绝不参与 maxGenes 封顶计数（否则建议会顶掉真实命中）。
	const withAdvice = hitsSectionText({
		stdout: "signals: x\ndemo/a  hit a\nadvice: x :: demo/a  ok=2 fail=1 last=2026-09-10\ndemo/b  hit b\nadvice: x :: demo/b  ok=1 fail=0 last=2026-09-10\n",
	}, { maxGenes: 2 });
	assert.ok(withAdvice.includes("demo/a  hit a") && withAdvice.includes("demo/b  hit b"), "hits survive alongside advice lines");
	assert.ok(!withAdvice.includes("advice:"), "advice lines are not injected into the resident section");
	ok("section: observation advice lines filtered out (zero resident cost)");
}

// ── 2b) hits provider：select 失败 warn 留痕（每故障期恰一条、成功复位）──
{
	const warnings: string[] = [];
	let selectFails = true;
	const provider = createHitsSection({
		injectSignals: ["s"],
		maxGenes: 12,
		repoRoot: undefined,
		runSelectSync: () => (selectFails
			? { code: 2, stdout: "", stderr: "engine: boom\n" }
			: { code: 0, stdout: "signals: s\ndemo/x  hit\n", stderr: "" }),
		warn: (m) => warnings.push(m),
	});
	assert.equal(provider(), "", "failure renders empty section (degrade, never throw)");
	assert.equal(warnings.length, 1, "first outage warns once");
	assert.equal(provider(), "", "same outage still renders empty");
	assert.equal(warnings.length, 1, "same outage does not re-warn (per-outage latch)");
	selectFails = false;
	assert.match(provider(), /demo\/x/, "recovery renders hits again");
	selectFails = true;
	assert.equal(provider(), "", "next outage degrades again");
	assert.equal(warnings.length, 2, "success resets latch — next outage warns again");
	ok("hits provider: select failure warns once per outage, success resets");
}

// ── 3) tools：依赖注入面（假 defineTool + 假引擎，退出码映射全路径） ──────
{
	// selftest 消费的已注册工具窄面（exec 参数用 any——宿主 exec 合同不在本层类型面）。
	interface RegisteredTool {
		name: string;
		description: string;
		execute(args: unknown, exec?: any): Promise<any>;
	}

	const registered: ToolDefinition[] = [];
	// 假 defineTool 复刻依赖注入形状：identity 回传定义对象；与真 defineTool
	// 的泛型签名对接需要一次测试脚手架侧的显式 cast（ToolDefinition 编译面
	// 比原始定义面宽，运行时形状即定义本身）。
	const fakeDefineTool = ((options: unknown) => options) as unknown as typeof defineTool;
	// 单参合同（部署收口 ADR）：DSH 的 ctx.tools.register(definition) 一次只收
	// 一个定义，多余实参被静默忽略——假面必须复刻该形状，多实参照收即漏检
	// （0.1.0 首发实测教训：三工具只上了一个）。
	const fakeCtx = {
		tools: {
			register: (...tools: ToolDefinition[]) => {
				assert.equal(tools.length, 1, "register must be called with exactly one definition (DSH single-arg contract)");
				const definition = tools[0];
				assert.ok(definition);
				registered.push(definition);
			},
		},
	};
	const byName: Record<string, RegisteredTool> = {};
	const responses = {
		select: { code: 0, stdout: "signals: demo signal\ndemo/demo-hit  demo gene\n", stderr: "" },
		selectCrash: { code: 1, stdout: "", stderr: "engine: internal fault\n" },
		propose: { code: 0, stdout: "## demo-hit\nstep one\n", stderr: "" },
		evaluateRed: { code: 1, stdout: "gate adr-format: FAIL\n", stderr: "" },
		evaluateCrash: { code: 1, stdout: "", stderr: "engine: internal fault\n" },
		evaluateBad: { code: 2, stdout: "", stderr: "engine: gene not found: demo/x\n" },
	};
	const rootsSeen: Array<string | undefined> = [];
	const fakeRunEngine = async (args: string[], { repoRoot }: { repoRoot?: string } = {}) => {
		rootsSeen.push(repoRoot);
		if (args[0] === "select") return args[1] === "demo/crash" ? responses.selectCrash : responses.select;
		if (args[0] === "propose") return responses.propose;
		if (args[0] === "evaluate") {
			if (args[1] === "demo/red") return responses.evaluateRed;
			if (args[1] === "demo/crash") return responses.evaluateCrash;
			return responses.evaluateBad;
		}
		throw new Error(`unexpected args ${args}`);
	};
	// 函数形 repoRoot = 逐次解析面：吃 exec，返回本次调用的仓根（多 agent 异仓
	// 各归各仓的正确性来源）。
	const execA = { agent: { session: { header: { cwd: "/tmp/repo-a" } } } };
	const execB = { agent: { session: { header: { cwd: "/tmp/repo-b" } } } };
	registerNooTools(fakeCtx, { defineTool: fakeDefineTool, runEngine: fakeRunEngine, repoRoot: (exec) => exec?.agent?.session?.header?.cwd ?? "/tmp/fallback" });
	assert.equal(registered.length, 3);
	for (const tool of registered) byName[tool.name] = tool;
	const selectTool = byName.noo_select;
	const proposeTool = byName.noo_propose;
	const evaluateTool = byName.noo_evaluate;
	assert.ok(selectTool);
	assert.ok(proposeTool);
	assert.ok(evaluateTool);
	assert.deepEqual(Object.keys(byName).sort(), ["noo_evaluate", "noo_propose", "noo_select"]);
	assert.match(selectTool.description, /literal normalized match/);
	ok("tools: three read-only tools registered one-per-register call (no solidify tool)");

	assert.match((await selectTool.execute({ signals: ["demo signal"] }, execA)).text, /demo\/demo-hit/);
	assert.match((await proposeTool.execute({ gene: "demo/demo-hit" }, execB)).text, /step one/);
	assert.deepEqual(rootsSeen.slice(0, 2), ["/tmp/repo-a", "/tmp/repo-b"]);
	ok("tools: function repoRoot resolved per call from exec (per-agent anchoring)");

	// exec 缺席（静态注入面）→ 解析器自己的兜底分支，工具体不得因此崩。
	assert.match((await selectTool.execute({ signals: ["demo signal"] })).text, /demo\/demo-hit/);
	assert.equal(rootsSeen[2], "/tmp/fallback");
	ok("tools: exec-less execute still resolves (function repoRoot handles undefined exec)");

	const red = await evaluateTool.execute({ gene: "demo/red" }, execA);
	assert.match(red.text, /^RED \(exit 1\)\n/);
	// exit 1 + 空 stdout = 引擎内部故障（非 EngineError 走 throw e，退出码同为 1
	// 且无报告输出）——不得当红档结论放行。
	await assert.rejects(() => evaluateTool.execute({ gene: "demo/crash" }), /fail-closed \(exit 2\)/);
	ok("tools: exit 0 → text; exit 1+report → RED verdict; exit 1+empty report → throw; exit 2 → throw");

	// select 无红档：exit 1 只可能是引擎内部崩溃——不得把栈文本当命中面交给模型。
	await assert.rejects(() => selectTool.execute({ signals: ["demo/crash"] }), /fail-closed \(exit 2\)/);
	ok("tools: select exit 1 (engine fault) throws instead of returning a stack as hits");

	await assert.rejects(() => evaluateTool.execute({ gene: "demo/missing" }), /fail-closed \(exit 2\)/);
	await assert.rejects(() => selectTool.execute({ signals: [] }), /non-empty array/);
	await assert.rejects(() => proposeTool.execute({ gene: "BAD REF" }), /<domain>\/<id>/);
	ok("tools: exit 2 → throw; malformed args → throw with field diagnosis");
}

// ── 4) solidify 触发体：发现 / 提醒 / 确认 / 失败清单 ─────────────────────
{
	// 逐仓去重闸：同仓 in-flight 丢弃，异仓互不阻塞，release 后同仓恢复
	// 放行——多 agent 异仓近同时 dispose 各归各仓。
	const gate = createInFlightGate();
	assert.equal(gate.acquire("/repo-a"), true);
	assert.equal(gate.acquire("/repo-a"), false);
	assert.equal(gate.acquire("/repo-b"), true);
	gate.release("/repo-a");
	assert.equal(gate.acquire("/repo-a"), true);
	gate.release("/repo-b");
	gate.release("/repo-a");
	ok("solidify: per-repo in-flight gate — same repo dropped, other repo unblocked, release restores");

	const repo = tempRepo("solidify");
	const staging = "genes-staging";
	fs.mkdirSync(path.join(repo, staging));
	fs.writeFileSync(path.join(repo, staging, "alpha.json"), "{}\n");
	fs.writeFileSync(path.join(repo, staging, "notes.txt"), "not a candidate\n");

	assert.deepEqual(listStagingCandidates(repo, staging).map((p) => path.basename(p)), ["alpha.json"]);
	assert.deepEqual(listStagingCandidates(repo, "no-such-dir"), []);
	ok("solidify: staging discovery picks *.json only; missing dir → []");

	const candidates = listStagingCandidates(repo, staging);
	const alpha = candidates[0];
	assert.ok(alpha);
	assert.match(solidifyNotice(repo, staging, "t-actor", candidates), /node dist\/engine\/bin\.js solidify genes-staging\/alpha\.json --actor t-actor/);
	assert.deepEqual(buildSolidifyArgs(alpha, "t-actor", repo), ["solidify", "genes-staging/alpha.json", "--actor", "t-actor"]);
	ok("solidify: notice carries exact reproducible command; args are structured");

	const infos: string[] = [];
	const warns: string[] = [];
	const logger = { info: (m: string) => infos.push(m), warn: (m: string) => warns.push(m) };
	const nothing = await runSolidifyTrigger({ repoRoot: repo, stagingDir: staging, actor: "t", candidates: [], logger, ask: async () => "archive", runEngine: async () => ({ code: 0, stdout: "", stderr: "" }) });
	assert.deepEqual(nothing, { asked: false, approved: false, archived: [], failed: [] });
	ok("solidify: no candidates → no-op");

	const later = await runSolidifyTrigger({ repoRoot: repo, stagingDir: staging, actor: "t", candidates, logger, ask: async () => "later", runEngine: async () => assert.fail("must not run engine on decline") });
	assert.equal(later.approved, false);
	const declinedInfo = infos.at(-1);
	assert.ok(declinedInfo);
	assert.match(declinedInfo, /genes-staging\/alpha\.json/);
	ok("solidify: declined → notice only, engine never runs");

	const archived = await runSolidifyTrigger({ repoRoot: repo, stagingDir: staging, actor: "t", candidates, logger, ask: async () => "archive", runEngine: async () => ({ code: 0, stdout: "ok\n", stderr: "" }) });
	assert.deepEqual(archived.archived, ["genes-staging/alpha.json"]);
	ok("solidify: approved → engine runs, archived path reported");

	const failed = await runSolidifyTrigger({ repoRoot: repo, stagingDir: staging, actor: "t", candidates, logger, ask: async () => "archive", runEngine: async () => ({ code: 1, stdout: "", stderr: "red: gate\n" }) });
	assert.equal(failed.failed.length, 1);
	const failedWarn = warns.at(-1);
	assert.ok(failedWarn);
	assert.match(failedWarn, /solidify failed for 1 candidate/);
	ok("solidify: gate red → failed list via warn (write refused, engine semantics)");

	// ask 兜底超时：answerer 永久挂起 → 超时按"仅提醒"降级，不挂死触发体。
	// keep-alive 句柄：降级定时器 unref（生产语义——不拖住宿主关停），自测进程
	// 需自备存活窗让 20ms 超时先于事件循环排空触发。
	const keepAlive = setTimeout(() => {}, 200);
	const hung = await runSolidifyTrigger({
		repoRoot: repo,
		stagingDir: staging,
		actor: "t",
		candidates,
		logger,
		ask: () => new Promise(() => {}),
		runEngine: async () => assert.fail("must not run engine on ask timeout"),
		askTimeoutMs: 20,
	});
	clearTimeout(keepAlive);
	assert.equal(hung.approved, false);
	const hungInfo = infos.at(-1);
	assert.ok(hungInfo);
	assert.match(hungInfo, /genes-staging\/alpha\.json/);
	ok(`solidify: hung ask times out (default ${ASK_TIMEOUT_MS}ms) → notice-only fallback`);
}

// ── 5) 配置校验：fail-closed + 缺省补全 ───────────────────────────────────
{
	const cfg = validateConfig({});
	assert.equal(cfg.sectionOrder, 120);
	assert.deepEqual(cfg.injectSignals, []);
	assert.equal(cfg.stagingDir, "genes-staging");
	assert.equal(cfg.askOnDispose, true);
	assert.equal(cfg.actor, "noogenesis");
	assert.equal(cfg.maxIndexGenes, 12);
	assert.deepEqual(cfg.skillGuards, [
		{ path: "docs", skill: "noo-doc-standards" },
		{ path: ".agents/notes", skill: "noo-archive-agent-notes" },
	]);
	ok("config: defaults complete");

	// skillGuards：显式数组整体替换缺省表；条目形状违约指名字段。
	assert.deepEqual(validateConfig({ skillGuards: [{ path: "journal", skill: "noo-custom" }] }).skillGuards, [{ path: "journal", skill: "noo-custom" }]);
	assert.throws(() => validateConfig({ skillGuards: "docs" }), /skillGuards/);
	assert.throws(() => validateConfig({ skillGuards: [{ path: "", skill: "x" }] }), /skillGuards/);
	assert.throws(() => validateConfig({ skillGuards: [{ path: "docs" }] }), /skillGuards/);
	// POSIX 相对目录形态：绝对路径 / 盘符 / 反斜杠 / 尾部斜杠永不命中 = 静默失效，fail-closed 拒收。
	assert.throws(() => validateConfig({ skillGuards: [{ path: "/abs/docs", skill: "x" }] }), /POSIX/);
	assert.throws(() => validateConfig({ skillGuards: [{ path: "C:docs", skill: "x" }] }), /POSIX/);
	assert.throws(() => validateConfig({ skillGuards: [{ path: "docs\\sub", skill: "x" }] }), /POSIX/);
	assert.throws(() => validateConfig({ skillGuards: [{ path: "docs/", skill: "x" }] }), /POSIX/);
	ok("config: skillGuards — explicit table replaces default; entry and path-shape violations throw");

	const badConfigs: Array<[unknown, RegExp]> = [
		[{ repoRoot: "" }, /repoRoot/],
		[{ sectionOrder: 0 }, /sectionOrder/],
		[{ injectSignals: "x" }, /injectSignals/],
		[{ askOnDispose: "yes" }, /askOnDispose/],
		[{ maxIndexGenes: 1.5 }, /maxIndexGenes/],
		[[1, 2], /must be an object/],
	];
	for (const [bad, pattern] of badConfigs) {
		assert.throws(() => validateConfig(bad), pattern);
	}
	ok("config: type violations throw naming the field");

	assert.equal(resolveRepoRoot({}), process.cwd());
	assert.equal(resolveRepoRoot({ repoRoot: "rel/path" }), path.resolve("rel/path"));
	// 四级回退链（部署收口 ADR）：config → env → 会话工作区 → cwd；逐级抢占。
	{
		const saved = process.env.NOGENESIS_REPO_ROOT;
		try {
			delete process.env.NOGENESIS_REPO_ROOT;
			assert.equal(resolveRepoRoot({}, "/tmp/session-repo"), "/tmp/session-repo");
			assert.equal(resolveRepoRoot({}), process.cwd());
			process.env.NOGENESIS_REPO_ROOT = "/tmp/env-repo";
			assert.equal(resolveRepoRoot({}, "/tmp/session-repo"), "/tmp/env-repo");
			assert.equal(resolveRepoRoot({ repoRoot: "/tmp/config-repo" }, "/tmp/session-repo"), "/tmp/config-repo");
		} finally {
			if (saved === undefined) delete process.env.NOGENESIS_REPO_ROOT;
			else process.env.NOGENESIS_REPO_ROOT = saved;
		}
	}
	ok("config: repoRoot fallback chain (config → env → session workspace → cwd)");

	// 会话工作区提取：与官方 bash 工具同源（agent.session.header.cwd），
	// 缺环/空串 → undefined（交给回退链，绝不抛）。
	assert.equal(sessionWorkspaceOf(null), undefined);
	assert.equal(sessionWorkspaceOf({}), undefined);
	assert.equal(sessionWorkspaceOf({ agent: {} }), undefined);
	assert.equal(sessionWorkspaceOf({ agent: { session: {} } }), undefined);
	assert.equal(sessionWorkspaceOf({ agent: { session: { header: { cwd: "" } } } }), undefined);
	assert.equal(sessionWorkspaceOf({ agent: { session: { header: { cwd: "/tmp/x" } } } }), "/tmp/x");
	ok("config: sessionWorkspaceOf extracts agent.session.header.cwd, absent chain → undefined");
}

// ── 5.5) P2 只读消费：bank-pull 触发体 + 缓存合并扫描 e2e ──────────────────
{
	assert.deepEqual(buildPullArgs("https://example.com/bank.git"), ["pull", "https://example.com/bank.git"]);
	ok("bank-pull: args are structured (engine spawn contract)");

	const gate = createInFlightGate();
	assert.equal(gate.acquire("/repo-a"), true);
	assert.equal(gate.acquire("/repo-a"), false);
	assert.equal(gate.acquire("/repo-b"), true);
	gate.release("/repo-a");
	assert.equal(gate.acquire("/repo-a"), true);
	gate.release("/repo-a");
	gate.release("/repo-b");
	ok("bank-pull: per-repo in-flight gate — same repo dropped, other repo unblocked");

	const infos: string[] = [];
	const warns: string[] = [];
	const logger = { info: (m: string) => infos.push(m), warn: (m: string) => warns.push(m) };
	const pulls: Array<{ args: string[]; opts?: { repoRoot?: string; timeoutMs?: number } }> = [];
	const pulled = await pullBankOnce({
		repoRoot: "/repo-a",
		url: "https://example.com/bank.git",
		runEngine: async (args, opts) => {
			pulls.push({ args, opts });
			return { code: EXIT.OK, stdout: "pull: cloned bank into /repo-a/.noogenesis/genes-cache\n", stderr: "" };
		},
		logger,
		gate,
	});
	const firstPull = pulls[0];
	assert.ok(firstPull);
	assert.deepEqual(firstPull.args, ["pull", "https://example.com/bank.git"]);
	assert.match(pulled.pulled ? (infos[0] ?? "") : "", /bank pulled/);
	const again = await pullBankOnce({ repoRoot: "/repo-a", url: "x", runEngine: async () => assert.fail("gate held — must not re-pull"), logger, gate });
	assert.equal(again.pulled, false);
	assert.equal(again.reason, "in-flight");
	ok("bank-pull: success → info log; gate held after settle (one pull per instance)");

	const failedPull = await pullBankOnce({
		repoRoot: "/repo-b",
		url: "https://example.com/bank.git",
		runEngine: async () => ({ code: EXIT.FAIL_CLOSED, stdout: "", stderr: "engine: git clone failed: network down\n" }),
		logger,
	});
	assert.equal(failedPull.pulled, false);
	const offlineWarn = warns.at(-1);
	assert.ok(offlineWarn);
	assert.match(offlineWarn, /continuing offline/);
	ok("bank-pull: engine failure → warn, degraded offline, never throws");

	// config: geneBankUrl 缺省官方库（装完即部署，bug-fix ADR D2）/ false 显式禁用 / 自定义串 / 违约抛
	const cfg = validateConfig({});
	assert.equal(cfg.geneBankUrl, DEFAULT_GENE_BANK_URL);
	assert.equal(validateConfig({ geneBankUrl: false }).geneBankUrl, false);
	assert.equal(validateConfig({ geneBankUrl: "https://example.com/bank.git" }).geneBankUrl, "https://example.com/bank.git");
	for (const bad of ["", 42, null]) {
		assert.throws(() => validateConfig({ geneBankUrl: bad }), /geneBankUrl/);
	}
	ok("bank-pull: config.geneBankUrl — default official bank, false disables, custom string passes, violations throw");

	// e2e：真实引擎 pull（本地临时 bank）→ 缓存基因经 select 命中
	const bank = tempRepo("bank");
	const bankGeneDir = path.join(bank, "genes", "demo");
	fs.mkdirSync(bankGeneDir, { recursive: true });
	fs.writeFileSync(path.join(bankGeneDir, "bank-only.json"), JSON.stringify({
		id: "bank-only", domain: "demo", summary: "bank-only gene",
		signals: ["bank-only signal"], strategy: ["bank step"],
	}, null, 2) + "\n");
	execFileSync("git", ["-C", bank, "add", "-A"], { stdio: "pipe" });
	execFileSync("git", ["-C", bank, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "bank gene"], { stdio: "pipe" });

	const target = tempRepo("consumer");
	const pulledE2e = runEngineSync(["pull", bank], { repoRoot: target });
	assert.equal(pulledE2e.code, EXIT.OK);
	const hit = runEngineSync(["select", "bank-only signal"], { repoRoot: target });
	assert.equal(hit.code, EXIT.OK);
	assert.match(hit.stdout, /demo\/bank-only\s+bank-only gene/);
	assert.match(hit.stdout, /signals: bank-only signal/);
	ok("bank-pull: e2e — real engine pull caches bank genes; select hits cache-only gene");

	// 本仓优先遮蔽：同 ref 双份 → 本仓版本胜出
	const shadowDir = path.join(target, "genes", "demo");
	fs.mkdirSync(shadowDir, { recursive: true });
	fs.writeFileSync(path.join(shadowDir, "bank-only.json"), JSON.stringify({
		id: "bank-only", domain: "demo", summary: "local wins",
		signals: ["bank-only signal"], "strategy": ["local step"],
	}, null, 2) + "\n");
	const shadowed = runEngineSync(["select", "bank-only signal"], { repoRoot: target });
	assert.match(shadowed.stdout, /demo\/bank-only\s+local wins/);
	assert.doesNotMatch(shadowed.stdout, /bank-only gene/);
	ok("bank-pull: e2e — repo gene shadows same-ref cache copy (repo-first)");

	// 触发点调度（bug-fix ADR D1）：装载期仅显式锚定；会话期仅会话工作区锚定；
	// 两路径共享闸（每实例每仓至多一次）；成功回调 onPulled（技能面 invalidate）。
	{
		const schedCfg = { geneBankUrl: "https://example.com/bank.git" };
		const schedPulls: Array<string | undefined> = [];
		const pulledCallbacks: number[] = [];
		const schedLogger = { info: () => {}, warn: () => {} };
		const runEngine = async (args: string[], { repoRoot }: { repoRoot?: string } = {}) => {
			schedPulls.push(repoRoot);
			return { code: EXIT.OK, stdout: "pull: cloned bank\n", stderr: "" };
		};
		const sched = createBankPullScheduler({ config: schedCfg, runEngine, logger: schedLogger, onPulled: () => pulledCallbacks.push(1) });

		// 装载期：无显式锚定 → 跳过，且绝不落 cwd 兜底（错位落地回归：宿主 cwd ≠ 用户仓）
		assert.deepEqual(await sched.pullAtLoad(), { pulled: false, reason: "repoRoot unknown at load" });
		assert.deepEqual(schedPulls, []);
		ok("bank-pull: scheduler — load-time pull skipped without explicit anchor (never cwd fallback)");

		// 会话期：会话工作区锚定；成功回调即技能面 invalidate
		const session = await sched.pullForSession({ agent: { session: { header: { cwd: "/tmp/repo-a" } } } });
		assert.equal(session.pulled, true);
		assert.deepEqual(schedPulls, ["/tmp/repo-a"]);
		assert.equal(pulledCallbacks.length, 1);
		ok("bank-pull: scheduler — session workspace anchors the pull; onPulled fires on success");

		// 同仓重复发射（subagent 各自 agent/created）→ 闸吞掉，onPulled 不重复
		assert.deepEqual(await sched.pullForSession({ agent: { session: { header: { cwd: "/tmp/repo-a" } } } }), { pulled: false, reason: "in-flight" });
		assert.equal(pulledCallbacks.length, 1);
		// 异仓各归各仓
		await sched.pullForSession({ agent: { session: { header: { cwd: "/tmp/repo-b" } } } });
		assert.deepEqual(schedPulls, ["/tmp/repo-a", "/tmp/repo-b"]);
		// 无会话工作区 → 跳过（不落 cwd 兜底）
		assert.deepEqual(await sched.pullForSession({}), { pulled: false, reason: "no session workspace" });
		assert.equal(schedPulls.length, 2);
		ok("bank-pull: scheduler — shared gate dedupes per repo (never released); missing session cwd skipped");

		// 显式锚定 → 装载期触发（0.1.2 显式配置部署行为不变）；相对 repoRoot 过
		// resolveRepoRoot 归一化——装载与会话两路径闸键同空间（闸键不同空间
		// 则共享闸去重失效，同一仓重复 pull）
		schedPulls.length = 0;
		const rel = "rel-pinned-repo";
		const pinned = createBankPullScheduler({ config: { ...schedCfg, repoRoot: rel }, runEngine, logger: schedLogger });
		assert.equal((await pinned.pullAtLoad()).pulled, true);
		assert.deepEqual(schedPulls, [path.resolve(rel)]);
		ok("bank-pull: scheduler — explicit repoRoot keeps load-time trigger; relative root normalized (absolute gate key)");

		// 禁用面：false → 两路径零引擎 spawn
		let spawned = false;
		const off = createBankPullScheduler({
			config: { geneBankUrl: false, repoRoot: "/tmp/off" },
			runEngine: async () => { spawned = true; return { code: EXIT.OK, stdout: "", stderr: "" }; },
			logger: schedLogger,
		});
		assert.deepEqual(await off.pullAtLoad(), { pulled: false, reason: "disabled" });
		assert.deepEqual(await off.pullForSession({ agent: { session: { header: { cwd: "/tmp/x" } } } }), { pulled: false, reason: "disabled" });
		assert.equal(spawned, false);
		ok("bank-pull: scheduler — geneBankUrl false disables both paths with zero engine spawns");

		// 失败面：引擎红档 → 降级离线，onPulled 不触发（warn 文本已在 5.5 夹具钉过）
		const failCallbacks: number[] = [];
		const failing = createBankPullScheduler({
			config: schedCfg,
			runEngine: async () => ({ code: EXIT.FAIL_CLOSED, stdout: "", stderr: "engine: git clone failed: network down\n" }),
			logger: { info: () => {}, warn: () => {} },
			onPulled: () => failCallbacks.push(1),
		});
		assert.equal((await failing.pullForSession({ agent: { session: { header: { cwd: "/tmp/repo-c" } } } })).pulled, false);
		assert.equal(failCallbacks.length, 0);
		ok("bank-pull: scheduler — engine failure degrades offline, onPulled withheld");
	}

	// explicitRepoRootOf：config → env → undefined（无 cwd 兜底）；resolveRepoRoot 是其超集
	{
		const saved = process.env.NOGENESIS_REPO_ROOT;
		try {
			delete process.env.NOGENESIS_REPO_ROOT;
			assert.equal(explicitRepoRootOf({}), undefined);
			assert.equal(explicitRepoRootOf({ repoRoot: "/tmp/config-repo" }), "/tmp/config-repo");
			process.env.NOGENESIS_REPO_ROOT = "/tmp/env-repo";
			assert.equal(explicitRepoRootOf({}), "/tmp/env-repo");
			assert.equal(explicitRepoRootOf({ repoRoot: "/tmp/config-repo" }), "/tmp/config-repo");
		} finally {
			if (saved === undefined) delete process.env.NOGENESIS_REPO_ROOT;
			else process.env.NOGENESIS_REPO_ROOT = saved;
		}
		ok("bank-pull: explicitRepoRootOf — config → env → undefined, no cwd fallback");
	}
}

// ── 5.6) 技能随库分发：provider 动态 list/get + 降级 + 逐仓解析 ───────────
{
	// frontmatter 解析：合规 / 缺 description / 非法名 / 引号剥除
	const good = parseSkillFile("---\nname: alpha-skill\ndescription: \"Alpha does things\"\nwhenToUse: when alpha\n---\n\n# Alpha\nbody\n");
	assert.ok(good);
	assert.deepEqual(good.meta, { name: "alpha-skill", description: "Alpha does things", whenToUse: "when alpha" });
	assert.match(good.content, /^# Alpha/);
	// 四类 frontmatter 违约都返回 null：缺 description / 非 kebab-case /
	// 无围栏 / 围栏未闭合
	assert.equal(parseSkillFile("---\nname: alpha-skill\n---\nbody\n"), null);
	assert.equal(parseSkillFile("---\nname: Bad Name\ndescription: x\n---\nbody\n"), null);
	assert.equal(parseSkillFile("no frontmatter\n"), null);
	assert.equal(parseSkillFile("---\nname: x\ndescription: y\n"), null);
	ok("skills: frontmatter — kebab name + required description, quotes stripped, malformed → null");

	// 夹具仓：缓存镜像内 1 合规技能 + 1 坏 frontmatter 技能
	const repo = tempRepo("bank-skills");
	const skillsDir = path.join(repo, ".noogenesis", "genes-cache", ".agents", "skills");
	const alphaDir = path.join(skillsDir, "alpha-skill");
	fs.mkdirSync(alphaDir, { recursive: true });
	fs.writeFileSync(path.join(alphaDir, "SKILL.md"), '---\nname: alpha-skill\ndescription: Alpha does things\nwhenToUse: when alpha\n---\n\n# Alpha\nbody line\n');
	const badDir = path.join(skillsDir, "bad-skill");
	fs.mkdirSync(badDir, { recursive: true });
	fs.writeFileSync(path.join(badDir, "SKILL.md"), "---\nname: alpha-skill\n---\nno description\n");
	const warns: string[] = [];
	const provider = createBankSkillProvider({ config: { repoRoot: repo }, logger: { warn: (m) => warns.push(m) } });

	const candidates = await provider.list({ cwd: "/tmp/elsewhere" });
	const first = candidates[0];
	assert.ok(first);
	assert.equal(candidates.length, 1);
	assert.equal(first.name, "alpha-skill");
	assert.equal(first.description, "Alpha does things");
	assert.equal(first.whenToUse, "when alpha");
	assert.equal(first.rank, BUNDLED_SKILL_RANK);
	assert.equal(first.provider, PROVIDER_NAME);
	assert.equal(first.source, "bundled");
	assert.equal(first.resourceBase.path, alphaDir);
	assert.match(warns.join("\n"), /bad-skill\/SKILL\.md/);
	ok("skills: cache dir lists curated skill at rank 600; bad frontmatter skipped with warn");

	// list 级 CRLF：CRLF 收录的库缓存不得整技能面静默清空（回归：行尾归一化
	// 缺失时 fence 识别失败 → 解析返回 null → 面被清空）
	const crlfDir = path.join(skillsDir, "crlf-skill");
	fs.mkdirSync(crlfDir, { recursive: true });
	fs.writeFileSync(path.join(crlfDir, "SKILL.md"), "---\r\nname: crlf-skill\r\ndescription: Survives CRLF\r\n---\r\n\r\n# CRLF body\r\n");
	const crlfList = await provider.list({ cwd: "/tmp/elsewhere" });
	assert.ok(crlfList.some((c) => c.name === "crlf-skill"), "CRLF skill must be served, not dropped");
	ok("skills: CRLF skill served by list (no silent whole-surface wipe)");

	// get：全文定义 + 合同防线（外来 candidate / 文件消失 → undefined）
	const def = await provider.get(first);
	assert.ok(def);
	assert.equal(def.name, "alpha-skill");
	assert.ok(def.content);
	assert.match(def.content, /# Alpha/);
	assert.equal(def.invocation.modelInvocable, true);
	assert.equal(def.invocation.userInvocable, true);
	assert.equal(def.resourceBase.kind, "directory");
	assert.equal(def.resourceBase.path, alphaDir);
	assert.equal(await provider.get({ provider: "other", locator: {} }), undefined);
	assert.equal(await provider.get({ provider: PROVIDER_NAME, name: "alpha-skill", locator: { path: "/no/such/SKILL.md", directory: "/no/such" } }), undefined);
	ok("skills: get returns full definition; foreign/missing candidates → undefined (registry contract)");

	// 逐次解析：无 config 锚定时按 cwd 各归各仓（部署收口 ADR 的正确性面）
	const repoB = tempRepo("bank-skills-b");
	const skillsB = path.join(repoB, ".noogenesis", "genes-cache", ".agents", "skills", "beta-skill");
	fs.mkdirSync(skillsB, { recursive: true });
	fs.writeFileSync(path.join(skillsB, "SKILL.md"), "---\nname: beta-skill\ndescription: Beta only in repo B\n---\nbody\n");
	const dyn = createBankSkillProvider({});
	const repoList = await dyn.list({ cwd: repo });
	const repoFirst = repoList[0];
	assert.ok(repoFirst);
	assert.equal(repoFirst.name, "alpha-skill");
	const repoBList = await dyn.list({ cwd: repoB });
	const repoBFirst = repoBList[0];
	assert.ok(repoBFirst);
	assert.equal(repoBFirst.name, "beta-skill");
	ok("skills: per-lookup cwd resolution — two repos each see their own cached skills");

	const crlf = parseSkillFile("---\r\nname: crlf-skill\r\ndescription: survives CRLF\r\n---\r\n\r\n# Body\r\nline\r\n");
	assert.ok(crlf);
	assert.equal(crlf.meta.name, "crlf-skill");
	assert.match(crlf.content, /^# Body\nline\n$/);
	ok("skills: CRLF SKILL.md parses — entry normalization, body \\r stripped (CRLF regression)");

	// 降级：无缓存目录 → 空数组，绝不抛。cwd 钉在 tmpdir——真实仓根可能已有
	// 0.1.3+ 装载时拉下的 genes-cache，夹具不得依赖「环境缓存缺席」这一
	// 会随功能生效而失效的假设（desktop 重装实测暴露）。
	assert.deepEqual(await dyn.list({ cwd: os.tmpdir() }), []);
	ok("skills: missing cache → empty skill surface (degrade, never throw)");

	// 非 ENOENT 读错误（skills 路径是文件 → ENOTDIR）：warn 留痕仍空面（bank-pull 同款纪律）
	const blocker = tempRepo("bank-skills-block");
	fs.mkdirSync(path.join(blocker, ".noogenesis", "genes-cache", ".agents"), { recursive: true });
	fs.writeFileSync(path.join(blocker, ".noogenesis", "genes-cache", ".agents", "skills"), "not a directory");
	const blockWarns: string[] = [];
	const blocked = createBankSkillProvider({ config: { repoRoot: blocker }, logger: { warn: (m) => blockWarns.push(m) } });
	assert.deepEqual(await blocked.list({}), []);
	assert.match(blockWarns.join("\n"), /unreadable/);
	ok("skills: non-ENOENT read error → warn + empty surface; ENOENT stays silent");

	// 接线：宿主 skills 面缺席 → 降级 {ok:false}；在场 → 注册成功 + invalidate 钩子
	assert.equal(registerBankSkills({}, { logger: { warn() {} } }).ok, false);
	const invalidated: number[] = [];
	let created: ReturnType<typeof createBankSkillProvider> | undefined;
	const fakeSkillsCtx = {
		skills: {
			registerProvider: (create: (control: { invalidate: () => void }) => ReturnType<typeof createBankSkillProvider>) => {
				const control = { signal: new AbortController().signal, invalidate: () => invalidated.push(1) };
				created = create(control);
			},
		},
	};
	const wired = registerBankSkills(fakeSkillsCtx, { config: { repoRoot: repo }, logger: { warn() {} } });
	assert.equal(wired.ok, true);
	assert.ok(created);
	assert.equal(created.name, PROVIDER_NAME);
	const createdList = await created.list({});
	const createdFirst = createdList[0];
	assert.ok(createdFirst);
	assert.equal(createdFirst.name, "alpha-skill");
	wired.invalidate();
	assert.equal(invalidated.length, 1);
	ok("skills: registerBankSkills — absent host service degrades; invalidate hook bumps host catalog after pull");

	// e2e：真实引擎 pull（bank 仓带 .agents/skills）→ provider 从缓存命中技能
	const bankWithSkills = tempRepo("bank-skills-e2e");
	const bankSkill = path.join(bankWithSkills, ".agents", "skills", "e2e-skill");
	fs.mkdirSync(bankSkill, { recursive: true });
	fs.writeFileSync(path.join(bankSkill, "SKILL.md"), "---\nname: e2e-skill\ndescription: Rides the bank\n---\nbody from bank\n");
	execFileSync("git", ["-C", bankWithSkills, "add", "-A"], { stdio: "pipe" });
	execFileSync("git", ["-C", bankWithSkills, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "bank skill"], { stdio: "pipe" });
	const consumer = tempRepo("skills-consumer");
	assert.equal(runEngineSync(["pull", bankWithSkills], { repoRoot: consumer }).code, EXIT.OK);
	const e2eProvider = createBankSkillProvider({});
	const e2eList = await e2eProvider.list({ cwd: consumer });
	assert.equal(e2eList.length, 1);
	const e2eFirst = e2eList[0];
	assert.ok(e2eFirst);
	const e2eDef = await e2eProvider.get(e2eFirst);
	assert.ok(e2eDef);
	assert.equal(e2eDef.content, "body from bank\n");
	ok("skills: e2e — real engine pull carries .agents/skills into cache; provider serves them");
}

// ── 5.7) 挂载面（B4）：合并语义逐条 + M1/M2/M3 策略 + index 接线假 ctx 冒烟
// （C7 最小 smoke；apply 全路径脱宿主——dsh-llm/dsh-tools 以 peer 形态在场，
// geneBankUrl false 钉死零引擎 spawn）─────────────────────────────────────
{
	type PreStepDecision = { kind: string; messages?: unknown[] };

	// A2 合并语义：advice 行累积；首个 reject 胜出且停止（后续策略不再问）。
	const a2Policies = [
		() => ({ kind: "advice" as const, lines: ["l1"] }),
		() => ({ kind: "reject" as const, reason: "r1" }),
		() => ({ kind: "advice" as const, lines: ["l2"] }),
	];
	assert.deepEqual(mergePreStep(a2Policies, {}), { reject: "r1", advice: ["l1"] });
	assert.deepEqual(mergePreStep([], {}), { advice: [] });
	ok("mounts: pre-step merge — advice accumulates, first reject wins and stops");

	// A3 合并语义：deny 胜出停止（已累积 advice 随行返回）；无 deny 取首个 ask；
	// advice 不停扫描照常累积；无策略 = 空决策（透传）。
	const a3Policies = [
		() => ({ kind: "ask" as const, reason: "need approval" }),
		() => ({ kind: "deny" as const, reason: "blocked" }),
	];
	assert.deepEqual(mergeToolPre(a3Policies, {}), { deny: "blocked", advice: [] });
	assert.deepEqual(mergeToolPre([() => ({ kind: "ask" as const })], {}), { ask: "", advice: [] });
	assert.deepEqual(mergeToolPre([() => ({ kind: "advice" as const, lines: ["l1"] }), () => ({ kind: "advice" as const, lines: ["l2"] })], {}), { advice: ["l1", "l2"] });
	assert.deepEqual(mergeToolPre([() => ({ kind: "advice" as const, lines: ["l1"] }), () => ({ kind: "deny" as const, reason: "r" })], {}), { deny: "r", advice: ["l1"] });
	assert.deepEqual(mergeToolPre([], {}), { advice: [] });
	ok("mounts: tool-pre merge — first deny wins (advice rides along); ask only when no deny; advice accumulates");

	// A4 合并语义：block 胜出停止；context 行累积（含 block 之前的）。
	const a4Policies = [
		() => ({ kind: "context" as const, lines: ["c1"] }),
		() => ({ kind: "block" as const, feedback: "no" }),
		() => ({ kind: "context" as const, lines: ["c2"] }),
	];
	assert.deepEqual(mergeToolPost(a4Policies, {}, {}), { block: "no", context: ["c1"] });
	assert.deepEqual(mergeToolPost([], {}, {}), { context: [] });
	ok("mounts: tool-post merge — first block wins; context accumulates");

	assert.deepEqual(mergeSessionStart([() => ({ kind: "inject" as const, lines: ["a", "b"] })], {}), ["a", "b"]);
	ok("mounts: session-start merge — inject lines accumulate (non-blocking)");

	// 会话键控存储：同键共享实例、异键隔离、无键降级为即席实例（残留面仅
	// 单门布尔，GC 自清兜底）。
	{
		const store = createSessionStore();
		const keyA = {};
		const keyB = {};
		store.of<{ n: number }>(keyA, () => ({ n: 1 })).n = 3;
		assert.equal(store.of<{ n: number }>(keyA, () => ({ n: 2 })).n, 3);
		assert.equal(store.of<{ n: number }>(keyB, () => ({ n: 9 })).n, 9);
		ok("mounts: session store — per-key state, keyless degrades to fresh");
	}

	// M2：开场地图每会话一次（subagent / 零布点仓跳过）。
	{
		const repo = tempRepo("mount-m2");
		for (const subtree of ["engine", "scripts"]) {
			fs.mkdirSync(path.join(repo, subtree), { recursive: true });
			fs.writeFileSync(path.join(repo, subtree, "AGENTS.md"), `# ${subtree}\n`);
		}
		fs.mkdirSync(path.join(repo, "docs", "method"), { recursive: true });
		fs.writeFileSync(path.join(repo, "docs", "method", "code-standards.md"), "# code-standards\n");
		fs.writeFileSync(path.join(repo, "docs", "method", "architecture-standards.md"), "# architecture-standards\n");
		const subtreePolicies = createSubtreeRulesPolicies({ repoRoot: repo });
		const agent = { session: { header: { cwd: repo } } };
		const advice = subtreePolicies.preStep({ agent, turn: 1, step: 1 });
		assert.ok(advice && advice.kind === "advice");
		assert.deepEqual(advice.lines, [
			"Noogenesis subtree rules map — read a subtree's AGENTS.md before working in it:",
			"- engine/ → engine/AGENTS.md",
			"- scripts/ → scripts/AGENTS.md",
			"- Coding standards: docs/method/code-standards.md (in-loop feedback on code writes: lint rules + export contract comments)",
			"- Architecture standards: docs/method/architecture-standards.md (layering / dependencies / impact surface; new top-level dirs first pass the admission questions)",
		]);
		assert.equal(subtreePolicies.preStep({ agent, turn: 1, step: 2 }), undefined);
		const subagent = { session: { header: { cwd: repo, origin: "subagent" } } };
		assert.equal(subtreePolicies.preStep({ agent: subagent, turn: 1, step: 1 }), undefined);
		// 单门语义：首个 pre-step 不限 turn/step——被拒后下一会话步仍可触发。
		const late = createSubtreeRulesPolicies({ repoRoot: repo });
		const lateAgent = { session: { header: { cwd: repo } } };
		const lateAdvice = late.preStep({ agent: lateAgent, turn: 3, step: 2 });
		assert.ok(lateAdvice && lateAdvice.kind === "advice", "first pre-step triggers regardless of turn/step");
		const bare = createSubtreeRulesPolicies({ repoRoot: tempRepo("mount-m2-bare") });
		assert.equal(bare.preStep({ agent: { session: { header: { cwd: path.join(os.tmpdir(), "mount-m2-bare-missing") } } }, turn: 1, step: 1 }), undefined);
		// 指针行存在性过滤：有布点件但无判据单源件的仓不追加（否则指向不存在文件）。
		const noPointer = tempRepo("mount-m2-nopointer");
		fs.mkdirSync(path.join(noPointer, "engine"), { recursive: true });
		fs.writeFileSync(path.join(noPointer, "engine", "AGENTS.md"), "# engine\n");
		const noPointerAdvice = createSubtreeRulesPolicies({ repoRoot: noPointer }).preStep({ agent: { session: { header: { cwd: noPointer } } }, turn: 1, step: 1 });
		assert.ok(noPointerAdvice && noPointerAdvice.kind === "advice");
		assert.equal(noPointerAdvice.lines.length, 2);
		assert.ok(!noPointerAdvice.lines.some((line) => line.includes("code-standards")));
		assert.ok(!noPointerAdvice.lines.some((line) => line.includes("architecture-standards")));
		ok("mounts: M2 — opening map once per session (subagent skipped; empty map suppressed; pointer line gated on file presence)");

		// 技能路标行（M1 守卫①）：技能面在场（任一候选目录含 noo-*）才发行——缺席仓零噪音。
		// 两候选目录（活副本 / 随库缓存）同源循环，夹具仅目录路径不同。
		for (const skillDir of SKILL_DIR_CANDIDATES) {
			const withSkills = tempRepo(`mount-m2-skills-${skillDir.replace(/[/.]/g, "-")}`);
			fs.mkdirSync(path.join(withSkills, skillDir, "noo-doc-standards"), { recursive: true });
			fs.writeFileSync(path.join(withSkills, skillDir, "noo-doc-standards", "SKILL.md"), "# skill\n");
			const skillsAdvice = createSubtreeRulesPolicies({ repoRoot: withSkills }).preStep({ agent: { session: { header: { cwd: withSkills } } }, turn: 1, step: 1 });
			assert.ok(skillsAdvice && skillsAdvice.kind === "advice");
			assert.equal(skillsAdvice.lines.filter((line) => line.startsWith("- Task-matched skills")).length, 1);
			assert.match(skillsAdvice.lines.at(-1)!, /noo-doc-standards/);
		}
		ok("mounts: M1 ① — skill roster line emitted only when a noo-* skill face exists (live copy or bank cache)");

		// 发行条件放宽面：零子树布点 + 指针在场 → 指针行地图仍发行（零内容才零注入）。
		const pointerOnly = tempRepo("mount-m2-pointeronly");
		fs.mkdirSync(path.join(pointerOnly, "docs", "method"), { recursive: true });
		fs.writeFileSync(path.join(pointerOnly, "docs", "method", "code-standards.md"), "# code-standards\n");
		const pointerOnlyAdvice = createSubtreeRulesPolicies({ repoRoot: pointerOnly }).preStep({ agent: { session: { header: { cwd: pointerOnly } } }, turn: 1, step: 1 });
		assert.ok(pointerOnlyAdvice && pointerOnlyAdvice.kind === "advice");
		assert.equal(pointerOnlyAdvice.lines.length, 2);
		assert.ok(pointerOnlyAdvice.lines.some((line) => line.includes("code-standards")));
		ok("mounts: M2 release condition — pointer-only repo still gets the map (zero content, zero injection)");
	}

	// 策略件组装：A2 地图件 + A3 触点提醒件（缺省守卫表）+ A4 写码在环两判据
	// （lint + 注释面）+ A5 零策略能力位（A6/A8 投影面不挂——撤除 ADR）。
	{
		const set = createMountPolicies({ repoRoot: "/tmp/assembly" });
		assert.equal(set.preStep.length, 1);
		assert.equal(set.toolPre.length, 1);
		assert.equal(set.toolPost.length, 2);
		assert.deepEqual(set.sessionStart, []);
		ok("mounts: policy set assembly — A2 map + A3 skill guard + A4 lint/export-docs judges + A5 zero-policy lane");
	}

	// M1 守卫②：A3 触点提醒策略逐条合同（守卫表直调，零宿主依赖）。
	{
		const repo = tempRepo("skill-guard");
		const agent = { session: { header: { cwd: repo } } };
		const guards = [
			{ path: "docs", skill: "noo-doc-standards" },
			{ path: ".agents/notes", skill: "noo-archive-agent-notes" },
		];
		const { toolPre } = createSkillGuardPolicies({ repoRoot: repo }, guards);
		// 写 docs 面未载技能 → advice 一行；同会话同技能不重复提醒。
		const advice = toolPre({ name: "write", arguments: { file_path: "docs/x.md" }, agent });
		assert.ok(advice && advice.kind === "advice");
		assert.match(advice.lines[0]!, /noo-doc-standards/);
		assert.equal(toolPre({ name: "write", arguments: { file_path: "docs/y.md" }, agent }), undefined);
		// skill 调用进入 seen 集 → 提醒消失（载入观测解除）。
		const agentLoaded = { session: { header: { cwd: repo } } };
		const toolPreLoaded = createSkillGuardPolicies({ repoRoot: repo }, guards).toolPre;
		const firstUnloaded = toolPreLoaded({ name: "write", arguments: { file_path: "docs/x.md" }, agent: agentLoaded });
		assert.ok(firstUnloaded && firstUnloaded.kind === "advice");
		assert.equal(toolPreLoaded({ name: "write", arguments: { file_path: "docs/x.md" }, agent: agentLoaded }), undefined);
		toolPreLoaded({ name: "skill", arguments: { name: "noo-doc-standards" }, agent: agentLoaded });
		assert.equal(toolPreLoaded({ name: "write", arguments: { file_path: "docs/x.md" }, agent: agentLoaded }), undefined);
		// 非守卫路径 / 子树内层路径命中（.agents/notes 前缀）/ 出仓路径 / 非写码工具 → 静默。
		assert.equal(toolPre({ name: "write", arguments: { file_path: "docs-misc/x.md" }, agent }), undefined);
		const notesAdvice = toolPre({ name: "edit", arguments: { file_path: ".agents/notes/implemented/process/x.md" }, agent });
		assert.ok(notesAdvice && notesAdvice.kind === "advice");
		assert.match(notesAdvice.lines[0]!, /noo-archive-agent-notes/);
		assert.equal(toolPre({ name: "write", arguments: { file_path: "../outside.md" }, agent }), undefined);
		assert.equal(toolPre({ name: "read", arguments: { file_path: "docs/x.md" }, agent }), undefined);
		// 无会话键（keyless）降级 = 即席新状态 → 仍发提醒（无法去重，触达优于静默）。
		const keyless = toolPre({ name: "write", arguments: { file_path: "docs/x.md" } });
		assert.ok(keyless && keyless.kind === "advice");
		ok("skill-guard: docs/notes trigger once per skill per session; skill load clears; off-path/out-of-repo/non-write silent; keyless still advises");
	}

	// index 接线假 ctx 冒烟：存留四点各恰一个 listener + 行为逐条。
	{
		const repo = tempRepo("mount-wiring");
		fs.mkdirSync(path.join(repo, "engine"), { recursive: true });
		fs.writeFileSync(path.join(repo, "engine", "AGENTS.md"), "# engine subtree rules\n");
		const listeners = new Map<string, Array<(...args: any[]) => unknown>>();
		const warns: string[] = [];
		const fakeMountCtx = {
			tools: { register: () => {} },
			systemPrompt: { section: () => {} },
			provide: () => {},
			logger: () => ({ info: () => {}, warn: (m: string) => warns.push(m) }),
			on: (event: string, listener: (...args: any[]) => unknown) => {
				const list = listeners.get(event) ?? [];
				list.push(listener);
				listeners.set(event, list);
			},
		};
		apply(fakeMountCtx as never, { repoRoot: repo, geneBankUrl: false });
		for (const event of ["agent/session-start", "agent/pre-step", "tools/pre-execute", "tools/post-execute"]) {
			assert.equal(listeners.get(event)?.length, 1, `${event} must be wired exactly once`);
		}
		ok("mounts: index wiring — surviving four mounting points registered one listener each");

		const agent = { session: { header: { cwd: repo } } };
		const preStep = listeners.get("agent/pre-step")![0]!;
		const toolPre = listeners.get("tools/pre-execute")![0]!;
		const toolPost = listeners.get("tools/post-execute")![0]!;
		const sessionStart = listeners.get("agent/session-start")![0]!;

		// A2：首步地图追加一条建议消息；后续步零追加；reject 下游直通。
		const decided = (await preStep({ agent, turn: 1, step: 1, messages: [] }, async () => ({ kind: "enter", messages: [{ existing: true }] }))) as { messages: Array<{ content: Array<{ text: string }> }> };
		assert.equal(decided.messages.length, 2);
		assert.match(decided.messages[1]!.content[0]!.text, /subtree rules map/);
		const later = (await preStep({ agent, turn: 1, step: 2 }, async () => ({ kind: "enter", messages: [] }))) as PreStepDecision;
		assert.deepEqual(later.messages, []);
		const rejected = (await preStep({ agent, turn: 2, step: 1 }, async () => ({ kind: "reject" }))) as PreStepDecision;
		assert.equal(rejected.kind, "reject");
		ok("mounts: A2 wiring — opening map appended once; later steps and reject passthrough");

		// A3：无策略决策 → next 透传（能力位在场；exec 形状 = 宿主合同冒烟，无观测语义）。
		const passthroughMarker = { marker: true };
		assert.equal(await toolPre({ name: "read", arguments: { file_path: "/tmp/x.ts" }, agent }, async () => passthroughMarker), passthroughMarker);
		ok("mounts: A3 wiring — no-policy passthrough preserved");

		// A3 advice 档（M1 守卫②）：触守卫路径 → agent.inject 投递一条；同会话
		// 同技能不重复；inject 能力位缺席 → warn 降级（每会话至多一条）且工具调用不阻断。
		const injected: unknown[] = [];
		const agentWithInject = { session: { header: { cwd: repo } }, inject: (message: unknown) => injected.push(message) };
		const passthrough = await toolPre({ name: "write", arguments: { file_path: "docs/x.md" }, agent: agentWithInject }, async () => passthroughMarker);
		assert.equal(passthrough, passthroughMarker);
		assert.equal(injected.length, 1);
		assert.match((injected[0] as { content: Array<{ text: string }> }).content[0]!.text, /noo-doc-standards/);
		assert.equal(await toolPre({ name: "write", arguments: { file_path: "docs/y.md" }, agent: agentWithInject }, async () => passthroughMarker), passthroughMarker);
		assert.equal(injected.length, 1);
		assert.equal(await toolPre({ name: "write", arguments: { file_path: "docs/z.md" }, agent }, async () => passthroughMarker), passthroughMarker);
		assert.equal(warns.filter((m) => m.includes("advice delivery unavailable")).length, 1);
		ok("mounts: A3 advice — one inject per skill per session; missing capability degrades with one warn, tool call unblocked");

		// A4：非写码 exec → 透传；写码面两判据缺基建 → 各自静默降级 + 每会话一条
		// warn（warn 经 index.mts 透传的 logger 捕获）。
		const postDownstream = { kind: "accept" };
		assert.equal(await toolPost({ agent }, { content: [{ type: "text", text: "ok" }] }, async () => postDownstream), postDownstream);
		const writeExec = { name: "write", arguments: { file_path: "x.ts" }, agent };
		assert.equal(await toolPost(writeExec, {}, async () => postDownstream), postDownstream);
		assert.equal(await toolPost(writeExec, {}, async () => postDownstream), postDownstream);
		assert.equal(warns.filter((m) => m.includes("lint feedback offline")).length, 1);
		assert.equal(warns.filter((m) => m.includes("export-docs feedback offline")).length, 1);
		ok("mounts: A4 wiring — non-write passthrough; both judges degrade with one warn per session");

		// A5：零策略件 → 无注入不抛（能力位在场即冒烟）。
		await sessionStart({ agent });
		ok("mounts: A5 wiring — session-start capability wired, zero-policy no-op safe");
	}
}

// ── 5.8) 轨道 A 写码在环反馈：A4 lint 策略逐条合同 + 真件 e2e ───────────────
{
	const repo = tempRepo("lint-feedback");
	fs.copyFileSync(path.join(REPO_ROOT, ".oxlintrc.json"), path.join(repo, ".oxlintrc.json"));
	fs.symlinkSync(path.join(REPO_ROOT, "node_modules"), path.join(repo, "node_modules"), "dir");
	const agent = { session: { header: { cwd: repo } } };
	const writeExec = { name: "write", arguments: { file_path: "sample.ts" }, agent };
	const stubCalls: LintRunContext[] = [];
	const withStub = (diagnostics: LintDiagnostic[]) =>
		createLintFeedbackPolicies(
			{ repoRoot: repo },
			{
				runLint: (ctx) => {
					stubCalls.push(ctx);
					return diagnostics;
				},
			},
		);

	const single = withStub([{ line: 3, column: 5, rule: "eslint(no-var)", message: "Unexpected var" }]);
	assert.deepEqual(single.toolPost(writeExec, {}), {
		kind: "block",
		feedback: "sample.ts:3:5 eslint(no-var): Unexpected var",
	});
	assert.equal(stubCalls[0]!.cwd, repo);
	assert.equal(stubCalls[0]!.file, path.join(repo, "sample.ts"));
	assert.equal(stubCalls[0]!.config, path.join(repo, ".oxlintrc.json"));
	ok("lint-feedback: write + diagnostics → block with rule and message");

	assert.equal(single.toolPost({ name: "read", arguments: { file_path: "sample.ts" }, agent }, {}), undefined);
	assert.equal(single.toolPost(writeExec, { isError: true }), undefined);
	assert.equal(single.toolPost({ name: "write", arguments: { file_path: "../outside.ts" }, agent }, {}), undefined);
	assert.equal(single.toolPost({ name: "write", arguments: { file_path: "/etc/outside.ts" }, agent }, {}), undefined);
	assert.equal(single.toolPost({ name: "write", arguments: { file_path: "notes.md" }, agent }, {}), undefined);
	assert.equal(single.toolPost({ name: "write", arguments: { file_path: 42 }, agent }, {}), undefined);
	assert.equal(single.toolPost({ name: "write", arguments: { file_path: "" }, agent }, {}), undefined);
	assert.equal(single.toolPost({ name: "write", arguments: "not-an-object", agent }, {}), undefined);
	assert.equal(single.toolPost({ name: "write", agent }, {}), undefined);
	ok("lint-feedback: non-write / isError / outside-repo (rel+abs) / non-TS / bad file_path / non-object arguments → void");

	// row 7 空诊断分支：桩被调用且返回空 → void（与「桩抛错」同结果但路径不同）。
	{
		let called = 0;
		const empty = createLintFeedbackPolicies(
			{ repoRoot: repo },
			{
				runLint: () => {
					called += 1;
					return [];
				},
			},
		);
		assert.equal(empty.toolPost({ name: "write", arguments: { file_path: "sample.mts" }, agent }, {}), undefined);
		assert.equal(called, 1);
		ok("lint-feedback: zero diagnostics → void (stub invoked; .mts extension accepted)");
	}

	const throwing = createLintFeedbackPolicies(
		{ repoRoot: repo },
		{
			runLint: () => {
				throw new Error("boom");
			},
		},
	);
	assert.equal(throwing.toolPost(writeExec, {}), undefined);
	ok("lint-feedback: runLint throws → void (never propagates)");

	const many = Array.from({ length: 13 }, (_, i) => ({ line: i + 1, column: 1, rule: "r", message: `m${i}` }));
	const truncated = withStub(many).toolPost(writeExec, {});
	assert.ok(truncated && truncated.kind === "block");
	assert.match(truncated.feedback, /\+3 more/);
	assert.match(truncated.feedback, /m0.*m9/s);
	ok("lint-feedback: >10 diagnostics truncated with (+N more) tail");

	// 死锁降级：同文件连续 block 达上限后 → context；干净写码复位后重新 block。
	{
		const two = withStub([{ line: 1, column: 1, rule: "no-var", message: "var" }]);
		const first = two.toolPost(writeExec, {});
		const second = two.toolPost(writeExec, {});
		const third = two.toolPost(writeExec, {});
		const fourth = two.toolPost(writeExec, {});
		assert.ok(first && first.kind === "block", "1st must block");
		assert.ok(second && second.kind === "block", "2nd must block");
		assert.ok(third && third.kind === "block", "3rd must block");
		assert.ok(fourth && fourth.kind === "context", "4th+ must demote to context");
		assert.ok(fourth.kind === "context" && Array.isArray(fourth.lines), "demoted decision carries lines");
		const fifth = two.toolPost(writeExec, {});
		assert.ok(fifth && fifth.kind === "context", "stays context after demotion (no re-arm until clean write)");

		// 干净写码复位 → 下一违规重新 block（可切换诊断的桩：违规当 flip=true）。
		let flip = true;
		const flipper = createLintFeedbackPolicies(
			{ repoRoot: repo },
			{
				runLint: (c) => {
					stubCalls.push(c);
					return flip ? [{ line: 1, column: 1, rule: "no-var", message: "var" }] : [];
				},
			},
		);
		for (let i = 0; i < 4; i++) flipper.toolPost(writeExec, {});
		// 下次干净
		flip = false;
		assert.equal(flipper.toolPost(writeExec, {}), undefined, "clean write after demotion → void (delete resets)");
		// 再违规
		flip = true;
		const re = flipper.toolPost(writeExec, {});
		assert.ok(re && re.kind === "block", "after clean reset, next violation re-arms block");
		ok("lint-feedback: deadlock demotion to context after N; clean write resets to block");
	}

	const bare = tempRepo("lint-feedback-bare");
	const bareAgent = { session: { header: { cwd: bare } } };
	const warns: string[] = [];
	const degraded = createLintFeedbackPolicies({ repoRoot: bare }, { warn: (m) => warns.push(m) });
	assert.equal(degraded.toolPost({ name: "write", arguments: { file_path: "a.ts" }, agent: bareAgent }, {}), undefined);
	assert.equal(degraded.toolPost({ name: "write", arguments: { file_path: "a.ts" }, agent: bareAgent }, {}), undefined);
	assert.equal(warns.length, 1);
	assert.match(warns[0]!, /lint feedback offline: .*\.oxlintrc\.json or node_modules/);
	ok("lint-feedback: missing oxlint infra → void + one warn per session (message pinned)");

	const real = createLintFeedbackPolicies({ repoRoot: repo });
	fs.writeFileSync(path.join(repo, "sample.ts"), "export function bad(): number { var x = 1; return x; }\n");
	const reported = real.toolPost(writeExec, {});
	assert.ok(reported && reported.kind === "block");
	assert.match(reported.feedback, /no-var/);
	fs.writeFileSync(path.join(repo, "sample.ts"), "export function ok(): number { return 1; }\n");
	assert.equal(real.toolPost(writeExec, {}), undefined);
	ok("lint-feedback: default runLint e2e — real oxlint blocks no-var; clean file → void");
}

// ── 5.9) 注释面在环反馈：A4 export-docs 策略逐条合同 + 真件 e2e ──────────────
{
	const repo = tempRepo("export-docs-feedback");
	fs.mkdirSync(path.join(repo, "scripts"), { recursive: true });
	// 桩夹具只需判据件路径在位（执行面被注入桩替换）；真件 e2e 用真判据件副本。
	fs.writeFileSync(path.join(repo, "scripts", "verify-export-docs.mts"), "// stub judge placeholder\n");
	const agent = { session: { header: { cwd: repo } } };
	const writeExec = { name: "write", arguments: { file_path: "sample.ts" }, agent };
	const stubCalls: ExportDocsRunContext[] = [];
	const withStub = (run: ExportDocsRunResult) =>
		createExportDocsPolicies(
			{ repoRoot: repo },
			{
				runExportDocs: (ctx) => {
					stubCalls.push(ctx);
					return run;
				},
			},
		);

	const failing = withStub({ code: 1, stdout: "FAIL: adapters/dsh/a.ts:12: exported function foo lacks an adjacent JSDoc contract comment\n" });
	assert.deepEqual(failing.toolPost(writeExec, {}), {
		kind: "block",
		feedback: "adapters/dsh/a.ts:12: exported function foo lacks an adjacent JSDoc contract comment",
	});
	assert.equal(stubCalls[0]!.cwd, repo);
	assert.equal(stubCalls[0]!.file, path.join(repo, "sample.ts"));
	assert.equal(stubCalls[0]!.script, path.join(repo, "scripts", "verify-export-docs.mts"));
	ok("export-docs-feedback: write + judge FAIL → block with stripped FAIL line");

	// 目标解析前言（与 lint 判据共享谓词）：同款边界。
	assert.equal(failing.toolPost({ name: "read", arguments: { file_path: "sample.ts" }, agent }, {}), undefined);
	assert.equal(failing.toolPost(writeExec, { isError: true }), undefined);
	assert.equal(failing.toolPost({ name: "write", arguments: { file_path: "../outside.ts" }, agent }, {}), undefined);
	assert.equal(failing.toolPost({ name: "write", arguments: { file_path: "/etc/outside.ts" }, agent }, {}), undefined);
	assert.equal(failing.toolPost({ name: "write", arguments: { file_path: "notes.md" }, agent }, {}), undefined);
	assert.equal(failing.toolPost({ name: "write", arguments: { file_path: 42 }, agent }, {}), undefined);
	assert.equal(failing.toolPost({ name: "write", arguments: "not-an-object", agent }, {}), undefined);
	assert.equal(failing.toolPost({ name: "write", agent }, {}), undefined);
	ok("export-docs-feedback: non-write / isError / outside-repo (rel+abs) / non-TS / bad file_path → void");

	assert.equal(withStub({ code: 0, stdout: "OK: 1 件文件目标\n" }).toolPost(writeExec, {}), undefined);
	ok("export-docs-feedback: judge exit 0 → void");

	// 判据件故障面（退出码 ≠ 0/1、spawn 抛错）→ void + 每会话至多一条 warn（不是写码方违规）。
	{
		const warns: string[] = [];
		const broken = createExportDocsPolicies({ repoRoot: repo }, { runExportDocs: () => ({ code: 2, stdout: "" }), warn: (m) => warns.push(m) });
		assert.equal(broken.toolPost(writeExec, {}), undefined);
		assert.equal(broken.toolPost(writeExec, {}), undefined);
		assert.equal(warns.length, 1);
		assert.match(warns[0]!, /export-docs feedback skipped: judge exited 2/);
		const throwing = createExportDocsPolicies(
			{ repoRoot: repo },
			{
				runExportDocs: () => {
					throw new Error("boom");
				},
				warn: (m) => warns.push(m),
			},
		);
		assert.equal(throwing.toolPost(writeExec, {}), undefined);
		ok("export-docs-feedback: judge exit ≠ 0/1 or throw → void + one warn per session");
	}

	// 截断（≤10 行 + 尾行）与协议面兜底（退出码 1 却无 FAIL 行）。
	{
		const many = Array.from({ length: 13 }, (_, i) => `FAIL: f.ts:${i + 1}: exported function f${i} lacks an adjacent JSDoc contract comment`).join("\n");
		const truncated = withStub({ code: 1, stdout: `${many}\n` }).toolPost(writeExec, {});
		assert.ok(truncated && truncated.kind === "block");
		assert.match(truncated.feedback, /\+3 more/);
		assert.match(truncated.feedback, /f0.*f9/s);
		const protocol = withStub({ code: 1, stdout: "unexpected output without FAIL lines\n" }).toolPost(writeExec, {});
		assert.ok(protocol && protocol.kind === "block");
		assert.match(protocol.feedback, /without FAIL lines/);
		ok("export-docs-feedback: >10 FAIL lines truncated; exit 1 without FAIL lines → protocol line");
	}

	// 死锁降级：同文件连续 block 达上限后 → context；干净写码复位后重新 block。
	{
		let violating = true;
		const flipper = createExportDocsPolicies(
			{ repoRoot: repo },
			{
				runExportDocs: () => (violating ? { code: 1, stdout: "FAIL: f.ts:1: exported function f lacks an adjacent JSDoc contract comment\n" } : { code: 0, stdout: "OK\n" }),
			},
		);
		const first = flipper.toolPost(writeExec, {});
		const second = flipper.toolPost(writeExec, {});
		const third = flipper.toolPost(writeExec, {});
		const fourth = flipper.toolPost(writeExec, {});
		assert.ok(first && first.kind === "block", "1st must block");
		assert.ok(second && second.kind === "block", "2nd must block");
		assert.ok(third && third.kind === "block", "3rd must block");
		assert.ok(fourth && fourth.kind === "context", "4th+ must demote to context");
		violating = false;
		assert.equal(flipper.toolPost(writeExec, {}), undefined, "clean write after demotion → void (delete resets)");
		violating = true;
		const re = flipper.toolPost(writeExec, {});
		assert.ok(re && re.kind === "block", "after clean reset, next violation re-arms block");
		ok("export-docs-feedback: deadlock demotion to context after N; clean write resets to block");
	}

	// 判据件缺席 → void + 每会话一条 warn（文案钉死，同 lint 判据的离线降级纪律）。
	{
		const bare = tempRepo("export-docs-feedback-bare");
		const bareAgent = { session: { header: { cwd: bare } } };
		const warns: string[] = [];
		const degraded = createExportDocsPolicies({ repoRoot: bare }, { warn: (m) => warns.push(m) });
		assert.equal(degraded.toolPost({ name: "write", arguments: { file_path: "a.ts" }, agent: bareAgent }, {}), undefined);
		assert.equal(degraded.toolPost({ name: "write", arguments: { file_path: "a.ts" }, agent: bareAgent }, {}), undefined);
		assert.equal(warns.length, 1);
		assert.match(warns[0]!, /export-docs feedback offline: .*verify-export-docs\.mts missing/);
		ok("export-docs-feedback: missing judge script → void + one warn per session (message pinned)");
	}

	// 真件 e2e：真判据件 + 默认执行面（node 直跑仓内脚本，文件目标模式）。
	{
		const real = tempRepo("export-docs-feedback-real");
		fs.mkdirSync(path.join(real, "scripts"), { recursive: true });
		fs.mkdirSync(path.join(real, "adapters", "dsh"), { recursive: true });
		fs.copyFileSync(path.join(REPO_ROOT, "scripts", "verify-export-docs.mts"), path.join(real, "scripts", "verify-export-docs.mts"));
		fs.symlinkSync(path.join(REPO_ROOT, "node_modules"), path.join(real, "node_modules"), "dir");
		const realAgent = { session: { header: { cwd: real } } };
		const target = "adapters/dsh/bad.ts";
		const realExec = { name: "write", arguments: { file_path: target }, agent: realAgent };
		const policies = createExportDocsPolicies({ repoRoot: real });
		fs.writeFileSync(path.join(real, target), "export function bad(): number { return 1; }\n");
		const blocked = policies.toolPost(realExec, {});
		assert.ok(blocked && blocked.kind === "block");
		assert.match(blocked.feedback, /adapters\/dsh\/bad\.ts:1: exported function bad lacks an adjacent JSDoc contract comment/);
		fs.writeFileSync(path.join(real, target), "/** 契约：返回 1。 */\nexport function bad(): number { return 1; }\n");
		assert.equal(policies.toolPost(realExec, {}), undefined);
		ok("export-docs-feedback: default runner e2e — real judge blocks missing contract comment; compliant write → void");
	}
}

// ── 6) 防火墙机器检查：import 面 / 引擎零依赖 / 包结构契约 ────────────────
{
	// 扫描面按运行形态自适应：dist 跑（权威形态）扫 .mjs，源跑扫 .mts——
	// 两种形态下被扫集合都非空（下方非空守卫钉死，防形态切换后正则失配
	// 静默空转；index.* 为宿主依赖唯一入口，单独断言允许集）。
	const adapterModules = fs.readdirSync(ADAPTER_DIR).filter((f) => /\.(mjs|mts)$/.test(f) && !f.startsWith("index."));
	assert.ok(adapterModules.length > 0, "firewall module scan must be non-empty (dist .mjs / source .mts)");
	for (const file of adapterModules) {
		const text = fs.readFileSync(path.join(ADAPTER_DIR, file), "utf8");
		assert.doesNotMatch(
			text,
			/from\s+["']@deepseek-ai\/|import\s+["']@deepseek-ai\/|import\(\s*["']@deepseek-ai\/|require\(\s*["']@deepseek-ai\//,
			`${file} must not import host packages (firewall rule 2)`,
		);
	}
	ok("firewall: only index.* imports @deepseek-ai/* (dependency injection at entry)");

	// 源码面：宿主 import 的值/类型分野（轨道 B-1 ADR Decision 3）——dist 扫描
	// 看不见源码 import（type-only 发射期擦除），本断言把闭集钉死：值 import 仅
	// index.mts，type-only import 仅 host-api-contract.mts / selftest.mts / tools.mts。
	// 三形态同扫（静态 import/export-from + 动态 import() + require()）：动态与
	// require 是运行时值耦合，不能被发射期擦除掩盖。
	{
		const sourceDir = path.join(REPO_ROOT, "adapters", "dsh");
		const STATIC_RE = /(?:^|\n)\s*(?:import|export)\s+(type\s+)?[^;]*?\bfrom\s+["']@deepseek-ai\//g;
		const SIDE_EFFECT_RE = /(?:^|\n)\s*import\s+["']@deepseek-ai\//g;
		const DYNAMIC_RE = /(?:^|\n)\s*(?:await\s+)?import\(\s*["']@deepseek-ai\//g;
		const REQUIRE_RE = /(?:^|\n)[^\n]*?\brequire\(\s*["']@deepseek-ai\//g;
		const valueImporters = new Set<string>();
		const typeImporters = new Set<string>();
		for (const file of fs.readdirSync(sourceDir).filter((f) => f.endsWith(".mts")).sort()) {
			const text = fs.readFileSync(path.join(sourceDir, file), "utf8");
			for (const match of text.matchAll(STATIC_RE)) {
				(match[1] === undefined ? valueImporters : typeImporters).add(file);
			}
			if (text.match(SIDE_EFFECT_RE) !== null || text.match(DYNAMIC_RE) !== null || text.match(REQUIRE_RE) !== null) {
				valueImporters.add(file);
			}
		}
		assert.deepEqual([...valueImporters].sort(), ["index.mts"], "value host imports must stay in index.mts (firewall rule 2)");
		assert.deepEqual([...typeImporters].sort(), ["host-api-contract.mts", "selftest.mts", "tools.mts"], "type-only host imports are a closed set");
	}
	ok("firewall: source host imports — value only index.mts; type-only {host-api-contract,selftest,tools} (static/dynamic/require)");

	// index.* 宿主 import 允许集封底（B4 ADR Decision 2：dsh-tools + dsh-llm；
	// 新增宿主依赖必须同变更扩本断言 + ADR 拍板）。
	{
		const entryFile = fs.existsSync(path.join(ADAPTER_DIR, "index.mjs")) ? "index.mjs" : "index.mts";
		const indexText = fs.readFileSync(path.join(ADAPTER_DIR, entryFile), "utf8");
		const hostImports = [...new Set([...indexText.matchAll(/from ["'](@deepseek-ai\/[^"']+)["']/g)].map((m) => m[1]))].sort();
		assert.deepEqual(hostImports, ["@deepseek-ai/dsh-llm", "@deepseek-ai/dsh-tools"], "index.* host import set is closed (firewall allowed set)");
	}
	ok("firewall: index.* host import set = dsh-tools + dsh-llm (B4 allowed set)");

	// 引擎源零第三方依赖判据：import / require 两种第三方引用形态都扫
	//（.ts 源内保留 lazy require 形态，正则双形态同扫）。
	for (const file of fs.readdirSync(path.join(REPO_ROOT, "engine")).filter((f) => f.endsWith(".ts"))) {
		const text = fs.readFileSync(path.join(REPO_ROOT, "engine", file), "utf8");
		const thirdParty = [
			...text.matchAll(/require\(['"]([^'"]+)['"]\)/g),
			...text.matchAll(/import\s+(?:[\w*${}\s,]*from\s+)?["']([^"']+)["']/g),
			...text.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g),
		]
			.map((m) => m[1])
			.filter((spec) => spec !== undefined && !spec.startsWith(".") && !isBuiltin(spec));
		assert.deepEqual(thirdParty, [], `engine/${file} must stay dependency-free, found ${thirdParty}`);
	}
	ok("firewall: engine/*.ts has zero third-party requires/imports");

	const pkg: { name: string; type: string; main: string; files: string[]; dsh?: { bundle?: { patch?: string } }; peerDependencies?: Record<string, string> } = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
	assert.equal(pkg.name, "noogenesis-dsh");
	assert.notEqual(pkg.type, "module");
	// 包结构契约：白名单已切 dist 发布形态（B2 ADR 点 4）。
	assert.equal(pkg.main, "dist/adapters/dsh/index.mjs");
	assert.equal(pkg.dsh?.bundle?.patch, "./cordis.patch.yml");
	assert.ok(pkg.peerDependencies?.["@deepseek-ai/dsh-llm"], "peer dep dsh-llm declared (B4 ADR Decision 2)");
	for (const needle of ["dist/", "engine/gates.json", "engine/README.md", "adapters/dsh/README.md", "cordis.patch.yml", "LICENSE"]) {
		assert.ok(pkg.files.some((f) => f === needle || f.startsWith(needle.replace("/**", ""))), `files whitelist must ship ${needle}`);
	}
	ok("package: name(dsh-suffixed)/main/bundle-patch/files-whitelist contract");

	assert.match(
		fs.readFileSync(path.join(REPO_ROOT, "cordis.patch.yml"), "utf8"),
		/- insert:\s*\n\s*- id: noogenesis\s*\n\s*name: 'noogenesis-dsh'/,
	);
	ok("patch: plugin row insert shape matches loader dialect (id noogenesis, package noogenesis-dsh)");
}

console.log(`\nadapter self-test: ${PASSED.length} fixture groups passed`);
