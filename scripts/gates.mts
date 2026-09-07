#!/usr/bin/env node
/**
 * gates.mts — 门禁清单单源发射器（清单 = engine/gates.json），B1 随族迁 TS、
 * B5 起唯一执行面（py 原件 scripts/gates.py 随切换批删除；行为恒等对账证据见
 * ADR 2026-09-08-collab-rebuild-b1-gates-ts）。
 *
 * 行为合同：
 * - `--list`：打印 `name<TAB>cmd...` 行；缺槽位以 `<key>` 占位（不 fail），未知 --skip 不报错。
 * - `--run`：按 DAG 调度执行；jobs=1 时输出为逐行确定性序列（`-> name` + 子进程透传 + 失败行）。
 * - 槽位替换任意 {{key}}（含 cmd），缺值 fail-closed exit 2（--run）/ `<key>` 占位（--list）。
 * - 退出码：0 全绿 / 1 有门禁红 / 2 fail-closed（清单缺失/坏条目/坏图/坏槽位/未知 skip）。
 * - --self-test：离线夹具自测（四组基础 + DAG 组）。
 *
 * 槽位替换**形似而非同口径**（勿照抄互通）：本发射器替换任意 {{key}}（含 cmd）
 * 且缺值 fail-closed；引擎侧 engine/gates.ts instantiate 只认 outgoing_base/head
 * 双键、缺键静默留字面量（无害的前提是引擎 deriveSlots 保证两键齐全）——两侧
 * 今日等价纯因白名单只有这两键且都在 args，非机制等价。
 *
 * 清单单源的**结构性例外**（有意为之，勿"修复"；机制单家 = 本头注）：
 * - review-tier：pre-push 以 per-ref merge-base 循环逐 ref enforce（新分支首推
 *   fail-closed），CI 以 push 事件条件步承载——两者都不是平面清单能表达的形态，
 *   故默认跳过、由专属步骤保留。
 * - review-brief：按设计仅本地预发射，不入 CI；pre-push 亦不跑（简报闸是评审
 *   发射前检查，非 push 前提）。
 * - change-scope：hooks/CI/pre-push 展示面用脚本自身的缺省推导（fork-point）；
 *   gates.json 内的槽位形态供引擎 evaluate 使用。同一脚本、两种推导口径，见
 *   P1 实现 ADR D4。
 * - gene-format：白名单外独立件——它消费引擎产物（genes/ + events/
 *   复算），进白名单会让 solidify 入档中途复算自身（语义循环）；hooks/CI 保留
 *   显式行，不在 --skip 清单里表达。
 *
 * DAG（蓝图 §2 蒸馏三能力，B1 ADR 2026-09-08-collab-rebuild-b1-gates-ts）：
 * - `needs`：硬依赖——依赖红/被 skip 则下游 skipped（skip 理由传染 needs 链）；
 * - `after`：排序不传染——只等完成（不论成败），失败不进 skip 理由；
 * - fail-fast：任一门禁非零即停止调度新门禁，等在飞件收尾后 exit 1；jobs=1 时
 *   与 py 逐行等价（不打印 skip 行）；jobs>1 时对未调度件补 skip 理由行。
 * - 有界并行：默认并行度 = min(CPU 数, 8)，--jobs 可调（1 = 串行等价档）。
 * - 图校验（fail-closed exit 2）：重 id / needs∪after 未知依赖（含自环）/ 环，
 *   另加运行前校验：needs/after 不得指向 `--skip` 剔除的门禁（平面串行无 DAG
 *   语义、同场景照跑下游；TS 按 DAG 语义 fail-closed，报错指向 `--skip X`）。
 *   图无环 + 依赖全存在且全在 plan 内 ⇒ 无调度死锁态（任一 pending 的依赖
 *   要么绿、要么已触发 fail-fast 全跳、要么在飞/前序 pending——推进恒有保证），
 *   运行期不再设死锁分支。
 *
 * 用法（仓库根运行）：node scripts/gates.mts --list | --run [--skip a,b] [--slot K=V]... [--jobs N] | --self-test
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROGRAM = "gates.mts";
const GATES_REL = path.join("engine", "gates.json");
const SLOT_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
const MAX_JOBS_CAP = 8;

interface Gate {
  name: string;
  cmd: string;
  args: string[];
  needs: string[];
  after: string[];
}
interface Slots { [key: string]: string }

class FailClosed extends Error {}

function failClosed(message: string): never {
  console.error(`${PROGRAM}: FAIL-CLOSED — ${message}`);
  throw new FailClosed(message);
}

/** 读 + 形状校验 gates.json；重 id / 坏条目 fail-closed。 */
function loadGates(repoRoot: string): Gate[] {
  const file = path.join(repoRoot, GATES_REL);
  let doc: unknown;
  try {
    doc = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (e) {
    failClosed(`gates.json not found or invalid JSON (${file}): ${e instanceof Error ? e.message : e}`);
  }
  const gates = (doc as { gates?: unknown } | null)?.gates;
  if (!Array.isArray(gates) || gates.length === 0) {
    failClosed(`gates.json has no non-empty 'gates' list (${file})`);
  }
  const names = new Set<string>();
  const out: Gate[] = [];
  for (const raw of gates) {
    const g = raw as Record<string, unknown>;
    if (typeof g.name !== "string" || typeof g.cmd !== "string") {
      failClosed(`gates.json entry needs string name+cmd: ${JSON.stringify(raw)}`);
    }
    if (g.args !== undefined && !Array.isArray(g.args)) {
      failClosed(`gate ${g.name}: args must be a list`);
    }
    if (names.has(g.name)) failClosed(`gates.json duplicate gate name: ${g.name}`);
    names.add(g.name);
    out.push({
      name: g.name,
      cmd: g.cmd,
      args: (g.args ?? []).map(String),
      needs: parseDeps(g.name, g.needs),
      after: parseDeps(g.name, g.after),
    });
  }
  return out;
}

function parseDeps(gateName: string, raw: unknown): string[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.some((d) => typeof d !== "string")) {
    failClosed(`gate ${gateName}: needs/after must be an array of gate names`);
  }
  return raw as string[];
}

/** 图校验：未知依赖 / 环（needs ∪ after 合图，含自环）一律 fail-closed。 */
function validateGraph(gates: Gate[]): void {
  const byName = new Map(gates.map((g) => [g.name, g]));
  for (const g of gates) {
    for (const dep of [...g.needs, ...g.after]) {
      if (!byName.has(dep) || dep === g.name) {
        failClosed(`gate ${g.name}: ${dep === g.name ? "self" : "unknown"} dependency '${dep}'`);
      }
    }
  }
  // Kahn 拓扑：剩余节点 = 环。
  const indeg = new Map<string, number>(gates.map((g) => [g.name, 0]));
  const dependents = new Map<string, string[]>();
  for (const g of gates) {
    for (const dep of [...g.needs, ...g.after]) {
      indeg.set(g.name, (indeg.get(g.name) ?? 0) + 1);
      dependents.set(dep, [...(dependents.get(dep) ?? []), g.name]);
    }
  }
  const queue = gates.filter((g) => indeg.get(g.name) === 0).map((g) => g.name);
  let visited = 0;
  while (queue.length > 0) {
    const n = queue.pop()!;
    visited += 1;
    for (const m of dependents.get(n) ?? []) {
      const d = (indeg.get(m) ?? 0) - 1;
      indeg.set(m, d);
      if (d === 0) queue.push(m);
    }
  }
  if (visited !== gates.length) {
    const cyclic = gates.filter((g) => (indeg.get(g.name) ?? 0) > 0).map((g) => g.name);
    failClosed(`dependency cycle detected among: ${cyclic.join(", ")}`);
  }
}

/** 槽位替换：任意 {{key}}（含 cmd）；缺值 fail-closed（--run）/ <key> 占位（--list）。
 *  与引擎侧 engine/gates.ts instantiate 形似而非同口径（见头注，勿照抄互通）。 */
function instantiate(gate: Gate, slots: Slots, missing: "fail" | "placeholder"): { name: string; command: string[] } {
  const substitute = (text: string): string => text.replace(SLOT_RE, (_all: string, key: string) => {
    if (key in slots) return slots[key]!;
    if (missing === "placeholder") return `<${key}>`;
    failClosed(`gate ${gate.name}: slot '{{${key}}}' has no value (--slot ${key}=<value>)`);
  });
  return { name: gate.name, command: [substitute(gate.cmd), ...gate.args.map(substitute)] };
}

interface RunOptions {
  jobs: number;
  slots: Slots;
  skip: Set<string>;
}

/** runGates 的 stdout 行发射器：默认同步直写 fd 1——子进程经 inherit 直写同
 *  一 fd，父行必须同步落盘才能与子输出保序（py 侧由 subprocess.run flush 父
 *  缓冲达成同序；console.log 管道下异步缓冲会失序）。self-test 经此钩子捕获。 */
let emitLine: (line: string) => void = (line) => fs.writeSync(1, line + "\n");

/** DAG 调度：needs 全绿 + after 全完成才就绪；fail-fast 停调度、等在飞、exit 1。
 *  jobs=1：确定性串行（失败即止，不打印 skip 行）；
 *  jobs>1：有界并行；失败后对未调度件补 skip 理由行（needs 传染 / fail-fast）。 */
function runGates(repoRoot: string, gates: Gate[], opts: RunOptions): Promise<number> {
  for (const name of opts.skip) {
    if (!gates.some((g) => g.name === name)) failClosed(`--skip names unknown gate: ${name}`);
  }
  const plan = gates.filter((g) => !opts.skip.has(g.name));
  for (const g of plan) {
    const depSkipped = [...g.needs, ...g.after].find((d) => opts.skip.has(d));
    if (depSkipped !== undefined) {
      failClosed(`gate ${g.name}: depends on skipped gate ${depSkipped} (--skip ${depSkipped})`);
    }
  }
  const jobs = Math.max(1, Math.min(opts.jobs || defaultJobs(), MAX_JOBS_CAP, plan.length || 1));
  const exitOf = new Map<string, number>();   // 已完成件的退出码
  const skipped = new Map<string, string>();  // fail-fast 后未调度件的 skip 理由
  const pending = new Set<string>(plan.map((g) => g.name));
  const byName = new Map(plan.map((g) => [g.name, g]));
  let inFlight = 0;
  let failed = false;

  const isReady = (g: Gate): boolean =>
    g.needs.every((d) => exitOf.get(d) === 0) && g.after.every((d) => exitOf.has(d));

  const skipReason = (g: Gate): string => {
    for (const d of g.needs) {
      if (skipped.has(d)) return `needs ${d} skipped`;
      if ((exitOf.get(d) ?? 0) !== 0) return `needs ${d} failed`;
    }
    return "fail-fast: 上游失败后不再调度";
  };

  return new Promise<number>((resolve) => {
    const settle = (): void => {
      if (failed) {
        if (jobs > 1) {
          for (const [name, reason] of skipped) emitLine(`skip: ${name} (${reason})`);
        }
        resolve(1);
        return;
      }
      if (pending.size === 0 && inFlight === 0) {
        resolve(0);
        return;
      }
      // 不可达（图校验 + plan 期 skip 依赖校验后无死锁态；防御性 fail-closed）。
      console.error(`${PROGRAM}: FAIL-CLOSED — scheduling stuck: ${[...pending].join(", ")}`);
      resolve(2);
    };

    const markSkipped = (): void => {
      for (const name of pending) skipped.set(name, skipReason(byName.get(name)!));
      pending.clear();
    };

    const launchReady = (): void => {
      if (failed) {
        if (inFlight === 0) settle();
        return;
      }
      for (const g of plan) {
        if (inFlight >= jobs) break;
        if (!pending.has(g.name) || !isReady(g)) continue;
        pending.delete(g.name);
        inFlight += 1;
        emitLine(`-> ${g.name}`);
        const { command } = instantiate(g, opts.slots, "fail");
        const child = spawn(command[0]!, command.slice(1), { cwd: repoRoot, stdio: "inherit" });
        let settledOnce = false; // error/close 可能都触发：只结算一次
        const settleChild = (code: number, spawnError?: string): void => {
          if (settledOnce) return;
          settledOnce = true;
          inFlight -= 1;
          exitOf.set(g.name, code);
          if (code !== 0) {
            failed = true;
            console.error(spawnError ?? `${PROGRAM}: gate ${g.name} exited ${code}`);
            markSkipped();
          }
          // 无论成败都重新调度：after/needs 依赖此刻可能刚就绪；launchReady
          // 自带「无可发射且无在飞」的 settle 收口。
          launchReady();
        };
        child.on("error", (err) => settleChild(127, `${PROGRAM}: gate ${g.name} failed to spawn: ${err.message}`));
        child.on("close", (code) => settleChild(code ?? 1));
      }
      if (inFlight === 0) settle();
    };

    launchReady();
  });
}

function defaultJobs(): number {
  return Math.min(os.cpus().length || 1, MAX_JOBS_CAP);
}

function emitListLines(gates: Gate[], skip: Set<string>, slots: Slots): string[] {
  const lines: string[] = [];
  for (const gate of gates) {
    if (skip.has(gate.name)) continue;
    const { command } = instantiate(gate, slots, "placeholder");
    lines.push(`${gate.name}\t${command.join(" ")}`);
  }
  return lines;
}

function parseSlots(slotArgs: string[]): Slots {
  const slots: Slots = {};
  for (const item of slotArgs) {
    const eq = item.indexOf("=");
    const key = eq === -1 ? "" : item.slice(0, eq);
    if (eq === -1 || !key) failClosed(`--slot expects K=V, got ${JSON.stringify(item)}`);
    slots[key] = item.slice(eq + 1);
  }
  return slots;
}

interface Args {
  mode: "list" | "run" | "self-test";
  skip: string;
  slots: string[];
  jobsArg?: number;
}

function usageError(message: string): never {
  console.error(`${PROGRAM}: ${message}`);
  console.error(`usage: ${PROGRAM} --list | --run [--skip a,b] [--slot K=V]... [--jobs N] | --self-test`);
  throw new FailClosed(message);
}

function parseArgs(argv: string[]): Args {
  let mode: Args["mode"] | undefined;
  let skip = "";
  const slots: string[] = [];
  let jobsArg: number | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--list" || a === "--run" || a === "--self-test") {
      if (mode !== undefined) usageError(`conflicting modes: ${mode} and ${a}`);
      mode = a === "--list" ? "list" : a === "--run" ? "run" : "self-test";
    } else if (a === "--skip") {
      skip = argv[++i] ?? usageError("--skip needs a value");
    } else if (a === "--slot") {
      slots.push(argv[++i] ?? usageError("--slot needs K=V"));
    } else if (a === "--jobs") {
      const v = Number(argv[++i]);
      if (!Number.isInteger(v) || v < 1) usageError("--jobs expects a positive integer");
      jobsArg = v;
    } else {
      usageError(`unknown argument: ${a}`);
    }
  }
  if (mode === undefined) usageError("one of --list / --run / --self-test is required");
  return { mode, skip, slots, jobsArg };
}

// ---------- self-test（离线夹具；输出文本为本件自有面） ----------

async function selfTest(): Promise<number> {
  const failures: string[] = [];
  const check = (cond: boolean, what: string): void => {
    if (!cond) failures.push(what);
  };
  const tmpRoots: string[] = [];
  const node = process.execPath;
  const makeRoot = (gates: unknown): string => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gates-ts-"));
    tmpRoots.push(root);
    fs.mkdirSync(path.join(root, "engine"), { recursive: true });
    fs.writeFileSync(path.join(root, "engine", "gates.json"), JSON.stringify(gates));
    return root;
  };
  const evalGate = (name: string, code: string, extra: Record<string, unknown> = {}): Record<string, unknown> =>
    ({ name, cmd: node, args: ["-e", code], ...extra });
  const captureRun = async (root: string, gates: Gate[], opts: RunOptions): Promise<{ rc: number; lines: string[] }> => {
    const lines: string[] = [];
    const origEmit = emitLine;
    emitLine = (line: string) => { lines.push(line); };
    try {
      return { rc: await runGates(root, gates, opts), lines };
    } finally {
      emitLine = origEmit;
    }
  };
  try {
    // 组 1：槽位替换 + 全绿（并行默认档）
    {
      const root = makeRoot({ version: 1, gates: [
        evalGate("always-green", "console.log('green')"),
        evalGate("slot-user", `assert(process.argv[1] === 'base-x', process.argv)`, { args: ["-e", `assert(process.argv[1] === 'base-x', process.argv)`, "{{outgoing_base}}"] }),
      ] });
      const gates = loadGates(root);
      const inst = instantiate(gates[1]!, { outgoing_base: "base-x", head: "h" }, "fail");
      check(inst.name === "slot-user" && inst.command[inst.command.length - 1] === "base-x", "组1: 槽位替换结果不符");
      check((await captureRun(root, gates, { jobs: 4, skip: new Set(), slots: { outgoing_base: "base-x", head: "h" } })).rc === 0, "组1: 全绿并行应为 0");
    }
    // 组 2：红门禁 fail-fast → exit 1（jobs=1 串行等价，后续门禁不发射）
    {
      const root = makeRoot({ version: 1, gates: [
        evalGate("always-red", "process.exit(3)"),
        evalGate("never-reached", "process.exit(0)"),
      ] });
      const { rc, lines } = await captureRun(root, loadGates(root), { jobs: 1, skip: new Set(), slots: {} });
      check(rc === 1, "组2: 红门禁串行应 exit 1");
      check(!lines.some((l) => l === "-> never-reached"), "组2: fail-fast 后不应发射后续门禁");
      check(!lines.some((l) => l.startsWith("skip:")), "组2: 串行模式不应打印 skip 行");
    }
    // 组 3：缺失槽位 / 未知 skip / 坏文件 → fail-closed
    {
      const root = makeRoot({ version: 1, gates: [
        { name: "needs-slot", cmd: "true", args: ["{{head}}"] },
      ] });
      const gates = loadGates(root);
      check(throwsFailClosed(() => instantiate(gates[0]!, {}, "fail")), "组3: 缺槽位应 fail-closed");
      check(throwsFailClosed(() => runGates(root, gates, { jobs: 1, skip: new Set(["ghost"]), slots: {} })), "组3: 未知 skip 应 fail-closed");
      check(throwsFailClosed(() => loadGates(path.join(root, "nowhere"))), "组3: 缺 gates.json 应 fail-closed");
    }
    // 组 4：--list 信息面缺槽位以 <key> 占位（不 fail），供值后替换
    {
      const root = makeRoot({ version: 1, gates: [
        { name: "slotted", cmd: "check", args: ["--since", "{{outgoing_base}}"] },
      ] });
      const gates = loadGates(root);
      check(JSON.stringify(emitListLines(gates, new Set(), {})) === JSON.stringify(["slotted\tcheck --since <outgoing_base>"]), "组4: --list 缺槽位应占位");
      check(emitListLines(gates, new Set(), { outgoing_base: "abc" })[0] === "slotted\tcheck --since abc", "组4: --list 供值后应替换");
    }
    // 组 5：DAG needs——依赖红则下游 skipped，skip 理由传染，exit 1
    {
      const root = makeRoot({ version: 1, gates: [
        evalGate("a-red", `setTimeout(()=>process.exit(1),150)`),
        evalGate("s-occupier", `setTimeout(()=>process.exit(0),400)`),
        evalGate("b-needs-a", "process.exit(0)", { needs: ["a-red"] }),
        evalGate("c-needs-b", "process.exit(0)", { needs: ["b-needs-a"] }),
        evalGate("d-free", "process.exit(0)"),
        evalGate("e-after-red", "process.exit(0)", { after: ["a-red"] }),
      ] });
      const { rc, lines } = await captureRun(root, loadGates(root), { jobs: 2, skip: new Set(), slots: {} });
      const joined = lines.join(" | ");
      check(rc === 1, "组5: needs 依赖红应 exit 1");
      check(lines.some((l) => l.includes("skip: b-needs-a (needs a-red failed)")), `组5: b 应报 needs 传染 skip，实际：${joined}`);
      check(lines.some((l) => l.includes("skip: c-needs-b (needs b-needs-a skipped)")), `组5: c 应报 skip 理由传染，实际：${joined}`);
      check(lines.some((l) => l.includes("skip: d-free (fail-fast")), `组5: d 应报 fail-fast skip，实际：${joined}`);
      check(lines.some((l) => l.includes("skip: e-after-red (fail-fast")), `组5: e（after 红依赖）应报 fail-fast 而非 needs 传染，实际：${joined}`);
    }
    // 组 6：after 排序生效——依赖未完成时下游不发射
    {
      const root = makeRoot({ version: 1, gates: [
        evalGate("a-slow", `setTimeout(()=>process.exit(0),150)`),
        evalGate("b-after-a", "process.exit(0)", { after: ["a-slow"] }),
      ] });
      const t0 = Date.now();
      check((await captureRun(root, loadGates(root), { jobs: 4, skip: new Set(), slots: {} })).rc === 0, "组6: after 链应全绿");
      check(Date.now() - t0 >= 140, "组6: after 应等待依赖完成（排序生效）");
    }
    // 组 7：图校验——重 id / 未知依赖 / 环 / 自环 / 坏形状 → fail-closed
    {
      const dup = makeRoot({ version: 1, gates: [
        evalGate("x", "process.exit(0)"),
        evalGate("x", "process.exit(0)"),
      ] });
      check(throwsFailClosed(() => loadGates(dup)), "组7: 重 id 应 fail-closed");
      const unknownDep = makeRoot({ version: 1, gates: [evalGate("x", "process.exit(0)", { needs: ["ghost"] })] });
      check(throwsFailClosed(() => { const g = loadGates(unknownDep); validateGraph(g); }), "组7: 未知依赖应 fail-closed");
      const cyc = makeRoot({ version: 1, gates: [
        evalGate("x", "process.exit(0)", { needs: ["y"] }),
        evalGate("y", "process.exit(0)", { needs: ["x"] }),
      ] });
      check(throwsFailClosed(() => { const g = loadGates(cyc); validateGraph(g); }), "组7: 环应 fail-closed");
      const selfDep = makeRoot({ version: 1, gates: [evalGate("x", "process.exit(0)", { after: ["x"] })] });
      check(throwsFailClosed(() => { const g = loadGates(selfDep); validateGraph(g); }), "组7: 自环应 fail-closed");
      const badShape = makeRoot({ version: 1, gates: [evalGate("x", "process.exit(0)", { needs: "y" })] });
      check(throwsFailClosed(() => loadGates(badShape)), "组7: needs 非数组应 fail-closed");
    }
    // 组 8：有界并行——并发峰值不超过 jobs 上限（marker 文件测并发）
    {
      const marker = path.join(tmpRoots[0] ?? os.tmpdir(), `conc-${Date.now()}.txt`);
      const gateCode = `const fs=require('fs');fs.appendFileSync(process.argv[1],'+');setTimeout(()=>{fs.appendFileSync(process.argv[1],'-');process.exit(0)},120)`;
      const root = makeRoot({ version: 1, gates: Array.from({ length: 6 }, (_v, i) => ({
        name: `g${i}`, cmd: node, args: ["-e", gateCode, "{{marker}}"],
      })) });
      const { rc } = await captureRun(root, loadGates(root), { jobs: 2, skip: new Set(), slots: { marker } });
      const marks = fs.readFileSync(marker, "utf-8");
      let live = 0;
      let peak = 0;
      for (const ch of marks) {
        live += ch === "+" ? 1 : -1;
        peak = Math.max(peak, live);
      }
      check(rc === 0, "组8: 并行全绿应 exit 0");
      check(peak <= 2 && peak > 1, `组8: 并发峰值应为 2（有界并行生效），实测 ${peak}`);
    }
    // 组 9：jobs=1 串行等价——发射顺序 = 清单序
    {
      const root = makeRoot({ version: 1, gates: [
        evalGate("b-slow", `setTimeout(()=>process.exit(0),60)`),
        evalGate("a-fast", "process.exit(0)"),
      ] });
      const { rc, lines } = await captureRun(root, loadGates(root), { jobs: 1, skip: new Set(), slots: {} });
      const launched = lines.filter((l) => l.startsWith("-> ")).map((l) => l.slice(3));
      check(rc === 0, "组9: 串行全绿应 exit 0");
      check(JSON.stringify(launched) === JSON.stringify(["b-slow", "a-fast"]), `组9: 串行发射序应为清单序，实测 ${launched.join(",")}`);
    }
    // 组 10：--skip 剔除被依赖门禁 → plan 期 fail-closed（R1/R2 评审收口）
    {
      const root = makeRoot({ version: 1, gates: [
        evalGate("a", "process.exit(0)"),
        evalGate("b", "process.exit(0)", { needs: ["a"] }),
        evalGate("c", "process.exit(0)", { after: ["a"] }),
        evalGate("free", "process.exit(0)"),
      ] });
      const gates = loadGates(root);
      check(throwsFailClosed(() => runGates(root, gates, { jobs: 1, skip: new Set(["a"]), slots: {} })), "组10: skip 被依赖门禁（needs）应 fail-closed");
      check(throwsFailClosed(() => runGates(root, gates, { jobs: 1, skip: new Set(["a"]), slots: {} })), "组10: skip 被依赖门禁（after）应 fail-closed");
    }
  } finally {
    for (const root of tmpRoots) fs.rmSync(root, { recursive: true, force: true });
  }
  if (failures.length > 0) {
    for (const f of failures) console.log(`SELF-TEST FAIL: ${f}`);
    return 1;
  }
  console.log(`${PROGRAM} self-test: 10 fixture groups passed`);
  return 0;
}

function throwsFailClosed(fn: () => unknown): boolean {
  try {
    fn();
  } catch (e) {
    return e instanceof FailClosed;
  }
  return false;
}

async function main(argv: string[]): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    if (e instanceof FailClosed) return 2;
    throw e;
  }
  if (args.mode === "self-test") return selfTest();
  try {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const gates = loadGates(repoRoot);
    validateGraph(gates);
    const skip = new Set(args.skip.split(",").map((s) => s.trim()).filter(Boolean));
    const slots = parseSlots(args.slots);
    if (args.mode === "list") {
      for (const line of emitListLines(gates, skip, slots)) console.log(line);
      return 0;
    }
    return runGates(repoRoot, gates, { jobs: args.jobsArg ?? defaultJobs(), skip, slots });
  } catch (e) {
    if (e instanceof FailClosed) return 2;
    throw e;
  }
}

process.exit(await main(process.argv.slice(2)));
