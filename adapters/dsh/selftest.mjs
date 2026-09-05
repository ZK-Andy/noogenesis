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
import { runEngineSync, resolveRepoRoot, EXIT } from "./engine-bridge.mjs";
import { BASE_SECTION, hitsSectionText } from "./section.mjs";
import { registerNooTools } from "./tools.mjs";
import { listStagingCandidates, buildSolidifyArgs, solidifyNotice, runSolidifyTrigger } from "./solidify-trigger.mjs";
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
	assert.match(BASE_SECTION, /noo_select/);
	assert.match(BASE_SECTION, /human approval/);
	ok("section: base section states tools + write-path discipline");
}

// ── 3) tools：依赖注入面（假 defineTool + 假引擎，退出码映射全路径） ──────
{
	const registered = [];
	const fakeDefineTool = (def) => def;
	const fakeCtx = { tools: { register: (...tools) => registered.push(...tools) } };
	const byName = {};
	const responses = {
		select: { code: 0, stdout: "signals: demo signal\ndemo/demo-hit  demo gene\n", stderr: "" },
		propose: { code: 0, stdout: "## demo-hit\nstep one\n", stderr: "" },
		evaluateRed: { code: 1, stdout: "gate adr-format: FAIL\n", stderr: "" },
		evaluateBad: { code: 2, stdout: "", stderr: "engine: gene not found: demo/x\n" },
	};
	const fakeRunEngine = async (args) => {
		if (args[0] === "select") return responses.select;
		if (args[0] === "propose") return responses.propose;
		if (args[0] === "evaluate") return args[1] === "demo/red" ? responses.evaluateRed : responses.evaluateBad;
		throw new Error(`unexpected args ${args}`);
	};
	registerNooTools(fakeCtx, { defineTool: fakeDefineTool, runEngine: fakeRunEngine, repoRoot: "/tmp/nowhere" });
	for (const tool of registered) byName[tool.name] = tool;
	assert.deepEqual(Object.keys(byName).sort(), ["noo_evaluate", "noo_propose", "noo_select"]);
	assert.match(byName.noo_select.description, /literal normalized match/);
	ok("tools: three read-only tools registered (no solidify tool)");

	assert.match((await byName.noo_select.execute({ signals: ["demo signal"] })).text, /demo\/demo-hit/);
	assert.match((await byName.noo_propose.execute({ gene: "demo/demo-hit" })).text, /step one/);
	const red = await byName.noo_evaluate.execute({ gene: "demo/red" });
	assert.match(red.text, /^RED \(exit 1\)\n/);
	ok("tools: exit 0 → text; exit 1 → RED verdict as text (valid result, not thrown)");

	await assert.rejects(() => byName.noo_evaluate.execute({ gene: "demo/missing" }), /fail-closed \(exit 2\)/);
	await assert.rejects(() => byName.noo_select.execute({ signals: [] }), /non-empty array/);
	await assert.rejects(() => byName.noo_propose.execute({ gene: "BAD REF" }), /<domain>\/<id>/);
	ok("tools: exit 2 → throw; malformed args → throw with field diagnosis");
}

// ── 4) solidify 触发体：发现 / 提醒 / 确认 / 失败清单 ─────────────────────
{
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
	ok("config: repoRoot fallback chain (config → env → cwd)");
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
	assert.equal(pkg.name, "noogenesis");
	assert.notEqual(pkg.type, "module");
	assert.equal(pkg.main, "adapters/dsh/index.mjs");
	assert.equal(pkg.dsh?.bundle?.patch, "./cordis.patch.yml");
	for (const needle of ["engine/**/*.js", "adapters/dsh/**/*.mjs", "cordis.patch.yml", "LICENSE"]) {
		assert.ok(pkg.files.some((f) => f === needle || f.startsWith(needle.replace("/**", ""))), `files whitelist must ship ${needle}`);
	}
	ok("package: name/main/bundle-patch/files-whitelist contract");

	assert.match(
		fs.readFileSync(path.join(REPO_ROOT, "cordis.patch.yml"), "utf8"),
		/- insert:\s*\n\s*- id: noogenesis\s*\n\s*name: 'noogenesis'/,
	);
	ok("patch: plugin row insert shape matches loader dialect");
}

console.log(`\nadapter self-test: ${PASSED.length} fixture groups passed`);
