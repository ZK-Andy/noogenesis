/**
 * selftest.mjs — 适配层元评测（零宿主依赖，可在无 DSH 环境跑；CI 与 pre-push
 * 与 engine self-test 平级，不占门禁编号）。
 *
 * 覆盖面：bridge 合同（stdout + 退出码三档实跑）、cwd 锚定（repoRoot 显式
 * 传入 vs process.cwd() 漂移）、section 渲染（空命中 → ""）、tools 依赖注入
 * 面（假 defineTool + 假引擎）、solidify 触发体全路径、配置校验 fail-closed、
 * 防火墙机器检查（adapters/dsh import 面 + engine 零第三方依赖 + 插件包
 * 结构契约）。
 *
 * 引擎夹具纪律（同 engine selftest 教训）：全部在 os.tmpdir 临时 git 仓内
 * 实跑真实 engine/bin.js，不触碰真实仓。
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { isBuiltin } from "node:module";
import { fileURLToPath } from "node:url";
import { runEngineSync, resolveRepoRoot, sessionWorkspaceOf, EXIT } from "./engine-bridge.mjs";
import { hitsSectionText } from "./section.mjs";
import { registerNooTools } from "./tools.mjs";
import { listStagingCandidates, buildSolidifyArgs, solidifyNotice, runSolidifyTrigger, createSolidifyGate, ASK_TIMEOUT_MS } from "./solidify-trigger.mjs";
import { validateConfig } from "./config.mjs";

const ADAPTER_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(ADAPTER_DIR, "..", "..");
const PASSED = [];

function ok(name) {
	PASSED.push(name);
	console.log(`ok - ${name}`);
}

function tempRepo(label) {
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

function writeFixtureGene(repoRoot) {
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
	assert.equal(hitsSectionText({ stdout: "" }), "");
	assert.equal(hitsSectionText({ stdout: "signals: x\n(no genes matched)\n" }), "");
	ok("section: empty select → '' (zero-token drop)");

	const many = Array.from({ length: 15 }, (_, i) => `demo/g-${i}  summary ${i}`).join("\n");
	const rendered = hitsSectionText({ stdout: `signals: x\n${many}\n` }, { maxGenes: 3 });
	assert.equal(rendered.split("\n").filter((l) => l.startsWith("demo/")).length, 3);
	assert.match(rendered, /\(\+12 more/);
	ok("section: hit lines capped with (+N more) tail");

	const long = `demo/x  ${"字".repeat(200)}`;
	assert.ok(hitsSectionText({ stdout: `signals: x\n${long}\n` }, { maxSummaryChars: 160 }).includes("…"));
	ok("section: per-line summary truncated");

	// `{{` 中性化（R2-B1）：宿主 interpolate 对未知 {{name}} 抛错且每模型步调用
	// renderPrompt——模板语法基因 summary 不得原样进 system-prompt 节。
	const templated = hitsSectionText({ stdout: "signals: x\ndemo/tmpl  prefer {{placeholder}} tokens\n" });
	assert.ok(!templated.includes("{{"), "literal {{ must not survive into section text");
	assert.ok(templated.includes("{\u200b{placeholder}"), "neutralized form keeps visible content");
	ok("section: '{{' neutralized (interpolate cannot throw on gene summaries)");
}

// ── 3) tools：依赖注入面（假 defineTool + 假引擎，退出码映射全路径） ──────
{
	const registered = [];
	const fakeDefineTool = (def) => def;
	// 单参合同（部署收口 ADR）：DSH 的 ctx.tools.register(definition) 一次只收
	// 一个定义，多余实参被静默忽略——假面必须复刻该形状，多实参照收即漏检
	// （0.1.0 首发实测教训：三工具只上了一个）。
	const fakeCtx = {
		tools: {
			register: (...tools) => {
				assert.equal(tools.length, 1, "register must be called with exactly one definition (DSH single-arg contract)");
				registered.push(tools[0]);
			},
		},
	};
	const byName = {};
	const responses = {
		select: { code: 0, stdout: "signals: demo signal\ndemo/demo-hit  demo gene\n", stderr: "" },
		propose: { code: 0, stdout: "## demo-hit\nstep one\n", stderr: "" },
		evaluateRed: { code: 1, stdout: "gate adr-format: FAIL\n", stderr: "" },
		evaluateCrash: { code: 1, stdout: "", stderr: "engine: internal fault\n" },
		evaluateBad: { code: 2, stdout: "", stderr: "engine: gene not found: demo/x\n" },
	};
	const rootsSeen = [];
	const fakeRunEngine = async (args, { repoRoot } = {}) => {
		rootsSeen.push(repoRoot);
		if (args[0] === "select") return responses.select;
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
	assert.deepEqual(Object.keys(byName).sort(), ["noo_evaluate", "noo_propose", "noo_select"]);
	assert.match(byName.noo_select.description, /literal normalized match/);
	ok("tools: three read-only tools registered one-per-register call (no solidify tool)");

	assert.match((await byName.noo_select.execute({ signals: ["demo signal"] }, execA)).text, /demo\/demo-hit/);
	assert.match((await byName.noo_propose.execute({ gene: "demo/demo-hit" }, execB)).text, /step one/);
	assert.deepEqual(rootsSeen.slice(0, 2), ["/tmp/repo-a", "/tmp/repo-b"]);
	ok("tools: function repoRoot resolved per call from exec (per-agent anchoring)");

	// exec 缺席（静态注入面）→ 解析器自己的兜底分支，工具体不得因此崩。
	assert.match((await byName.noo_select.execute({ signals: ["demo signal"] })).text, /demo\/demo-hit/);
	assert.equal(rootsSeen[2], "/tmp/fallback");
	ok("tools: exec-less execute still resolves (function repoRoot handles undefined exec)");

	const red = await byName.noo_evaluate.execute({ gene: "demo/red" }, execA);
	assert.match(red.text, /^RED \(exit 1\)\n/);
	// exit 1 + 空 stdout = 引擎内部故障（非 EngineError 走 throw e，退出码同为 1
	// 且无报告输出）——不得当红档结论放行。
	await assert.rejects(() => byName.noo_evaluate.execute({ gene: "demo/crash" }), /fail-closed \(exit 2\)/);
	ok("tools: exit 0 → text; exit 1+report → RED verdict; exit 1+empty report → throw; exit 2 → throw");

	await assert.rejects(() => byName.noo_evaluate.execute({ gene: "demo/missing" }), /fail-closed \(exit 2\)/);
	await assert.rejects(() => byName.noo_select.execute({ signals: [] }), /non-empty array/);
	await assert.rejects(() => byName.noo_propose.execute({ gene: "BAD REF" }), /<domain>\/<id>/);
	ok("tools: exit 2 → throw; malformed args → throw with field diagnosis");
}

// ── 4) solidify 触发体：发现 / 提醒 / 确认 / 失败清单 ─────────────────────
{
	// 逐仓去重闸（R2-B1 修复钉子）：同仓 in-flight 丢弃，异仓互不阻塞，
	// release 后同仓恢复放行——多 agent 异仓近同时 dispose 各归各仓。
	const gate = createSolidifyGate();
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
	assert.match(solidifyNotice(repo, staging, "t-actor", candidates), /node engine\/bin\.js solidify genes-staging\/alpha\.json --actor t-actor/);
	assert.deepEqual(buildSolidifyArgs(candidates[0], "t-actor", repo), ["solidify", "genes-staging/alpha.json", "--actor", "t-actor"]);
	ok("solidify: notice carries exact reproducible command; args are structured");

	const infos = [];
	const warns = [];
	const logger = { info: (m) => infos.push(m), warn: (m) => warns.push(m) };
	const nothing = await runSolidifyTrigger({ repoRoot: repo, stagingDir: staging, actor: "t", candidates: [], logger, ask: async () => "archive", runEngine: async () => ({ code: 0, stdout: "", stderr: "" }) });
	assert.deepEqual(nothing, { asked: false, approved: false, archived: [], failed: [] });
	ok("solidify: no candidates → no-op");

	const later = await runSolidifyTrigger({ repoRoot: repo, stagingDir: staging, actor: "t", candidates, logger, ask: async () => "later", runEngine: async () => assert.fail("must not run engine on decline") });
	assert.equal(later.approved, false);
	assert.match(infos.at(-1), /genes-staging\/alpha\.json/);
	ok("solidify: declined → notice only, engine never runs");

	const archived = await runSolidifyTrigger({ repoRoot: repo, stagingDir: staging, actor: "t", candidates, logger, ask: async () => "archive", runEngine: async () => ({ code: 0, stdout: "ok\n", stderr: "" }) });
	assert.deepEqual(archived.archived, ["genes-staging/alpha.json"]);
	ok("solidify: approved → engine runs, archived path reported");

	const failed = await runSolidifyTrigger({ repoRoot: repo, stagingDir: staging, actor: "t", candidates, logger, ask: async () => "archive", runEngine: async () => ({ code: 1, stdout: "", stderr: "red: gate\n" }) });
	assert.equal(failed.failed.length, 1);
	assert.match(warns.at(-1), /solidify failed for 1 candidate/);
	ok("solidify: gate red → failed list via warn (write refused, engine semantics)");

	// ask 兜底超时（R2-S9）：answerer 永久挂起 → 超时按"仅提醒"降级，不挂死触发体。
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
	assert.match(infos.at(-1), /genes-staging\/alpha\.json/);
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
	ok("config: defaults complete");

	for (const [bad, pattern] of [
		[{ repoRoot: "" }, /repoRoot/],
		[{ sectionOrder: 0 }, /sectionOrder/],
		[{ injectSignals: "x" }, /injectSignals/],
		[{ askOnDispose: "yes" }, /askOnDispose/],
		[{ maxIndexGenes: 1.5 }, /maxIndexGenes/],
		[[1, 2], /must be an object/],
	]) {
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

// ── 6) 防火墙机器检查：import 面 / 引擎零依赖 / 包结构契约 ────────────────
{
	for (const file of fs.readdirSync(ADAPTER_DIR).filter((f) => f.endsWith(".mjs") && f !== "index.mjs")) {
		const text = fs.readFileSync(path.join(ADAPTER_DIR, file), "utf8");
		assert.doesNotMatch(text, /from ["']@deepseek-ai\//, `${file} must not import host packages (firewall rule 2)`);
	}
	ok("firewall: only index.mjs imports @deepseek-ai/* (dependency injection at entry)");

	for (const file of fs.readdirSync(path.join(REPO_ROOT, "engine")).filter((f) => f.endsWith(".js"))) {
		const text = fs.readFileSync(path.join(REPO_ROOT, "engine", file), "utf8");
		const thirdParty = [...text.matchAll(/require\(['"]([^'"]+)['"]\)/g)]
			.map((m) => m[1])
			.filter((spec) => !spec.startsWith(".") && !isBuiltin(spec));
		assert.deepEqual(thirdParty, [], `engine/${file} must stay dependency-free, found ${thirdParty}`);
	}
	ok("firewall: engine/*.js has zero third-party requires");

	const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
	assert.equal(pkg.name, "noogenesis-dsh");
	assert.notEqual(pkg.type, "module");
	assert.equal(pkg.main, "adapters/dsh/index.mjs");
	assert.equal(pkg.dsh?.bundle?.patch, "./cordis.patch.yml");
	for (const needle of ["engine/**/*.js", "adapters/dsh/**/*.mjs", "cordis.patch.yml", "LICENSE"]) {
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
