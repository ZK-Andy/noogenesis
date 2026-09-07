#!/usr/bin/env node
/**
 * pre-push.mts — pre-push 钩子编排器（B3，ADR 2026-09-08-b3-hooks-install）。
 *
 * 由 lefthook 唯一 pre-push job 调起（lefthook.yml）：
 *   run: node scripts/pre-push.mts --hook-remote {1} {files}
 * - `{1}` = git pre-push 位置参数（remote 名；URL 直推时两参同为 URL）。
 *   缺失或字面 "{1}" 残留（lefthook 手工裸调无 GitArgs 时模板不替换）→
 *   默认 `origin`（同旧 bash hook 的 `${1:-origin}` 口径）。
 * - `{files}` = 恒跑逃生口占位（lefthook v2 pre-push push-files 门控的绕过，
 *   机制与上游锚点见 ADR 2026-09-08-b3-hooks-install Problem 节），值恒为
 *   lefthook.yml，本脚本忽略。
 * - `use_stdin: true` 把 git 的 ref 行原样转发到本进程 stdin；stdin 为终端 →
 *   tier 循环跳过并注明（同旧 bash `[ -t 0 ]` 分支）。
 *
 * 组结构：change-scope 展示（串行信息面）+ allSettled 并行组（任一非零即
 * exit 1）：gates / gene-format / dist 自测 / review-tier（逐 ref 档位循环
 * TS 端口——与旧 .githooks/pre-push bash 版逐分支语义同构，仅 tier enforce
 * 调用面 .py→.mts 指向有意变更；子进程 stdin 以 ignore 隔离，防未来门禁读
 * stdin 与 tier 抢行造成 fail-open）。
 *
 * 权威面口径（批次纪律）：pre-push 执行面本批切 TS；py 权威由 CI 双列维持至
 * B5（gates.json cmd 重指批）；自证 = reconcile-b1 零 diff + 本循环 e2e 四态
 * （scripts/pre-push-selftest.mts）。
 */

import * as fs from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const PROGRAM = "pre-push.mts";

interface GroupResult {
  name: string;
  ok: boolean;
}

function spawnGroup(name: string, cmd: string, args: string[]): Promise<GroupResult> {
  console.log(`-> ${name}`);
  return new Promise((resolve) => {
    // stdin 用 ignore：并行组子进程与 tierLoop 的 readFileSync(0) 共享 fd 0，
    // 子进程若读 stdin 会抢走 git 的 ref 行 → tier 空集通过 = fail-open。
    const child = spawn(cmd, args, { stdio: ["ignore", "inherit", "inherit"] });
    child.on("close", (code) => resolve({ name, ok: code === 0 }));
    child.on("error", (e: Error) => {
      console.error(`${name}: 进程启动失败 — ${e.message}`);
      resolve({ name, ok: false });
    });
  });
}

function isAllZero(sha: string): boolean {
  return /^0+$/.test(sha);
}

/** 逐 ref 档位循环（旧 bash 版逐分支语义同构端口，仅 tier enforce 指向 .py→.mts 有意变更）；返回是否通过。 */
function tierLoop(remote: string): boolean {
  console.log("-> 评审档位（--enforce）");
  if (process.stdin.isTTY) {
    console.log("review-tier: 非 push 调用（stdin 为终端），跳过档位强制");
    return true;
  }
  let rc = 0;
  const input = fs.readFileSync(0, "utf-8");
  for (const line of input.split("\n")) {
    const trimmed = line.trim();
    const fields = trimmed.length === 0 ? [] : trimmed.split(/\s+/);
    const lref = fields[0] ?? "";
    const lsha = fields[1] ?? "";
    const rref = fields[2] ?? "";
    const rsha = fields[3] ?? "";
    if (lsha.length === 0) continue;
    if (isAllZero(lsha)) continue;
    if (lref.startsWith("refs/tags/")) {
      const parsed = spawnSync("git", ["rev-parse", "--verify", "--quiet", `${lsha}^{commit}`], {
        encoding: "utf-8",
      });
      const tgt = parsed.status === 0 ? (parsed.stdout ?? "").trim() : "";
      if (tgt.length === 0) {
        console.error(`review-tier: FAIL — tag ${lref} 目标 commit 解析失败，fail-closed`);
        rc = 1;
        continue;
      }
      // 可达性 = rev-list 空集测试（tag 目标 commit 被任一 tracking ref 包含
      // ⇔ rev-list 空）。先判 rc 再判空集：rc≠0（坏对象/远端名不存在）与
      // 非空输出同落 fail-closed，不吞失败方向。
      const listed = spawnSync("git", ["rev-list", tgt, "--not", `--remotes=${remote}/`], {
        encoding: "utf-8",
      });
      if (listed.status === 0 && (listed.stdout ?? "").trim().length === 0) {
        console.log(`review-tier: tag ${lref} 目标 commit 已可达 ${remote} 远端 refs（零 outgoing），跳过档位强制`);
        continue;
      }
      console.error(
        `review-tier: FAIL — tag ${lref} 目标 commit 未被 ${remote} 远端 refs 包含（携带未推 commit），` +
          `无法定 outgoing base，fail-closed；先实跑 scripts/verify-review-tier.mts --since <base> --enforce ` +
          `并让证据随变更后再推`,
      );
      rc = 1;
      continue;
    }
    if (isAllZero(rsha)) {
      console.error(
        `review-tier: FAIL — 新分支首推 ${lref} 无法定 outgoing base；` +
          `先实跑 scripts/verify-review-tier.mts --since <base> --enforce 并让证据随变更后再推`,
      );
      rc = 1;
      continue;
    }
    const mb = spawnSync("git", ["merge-base", rsha, lsha], { encoding: "utf-8" });
    const base = mb.status === 0 ? (mb.stdout ?? "").trim() : "";
    if (base.length === 0) {
      console.error(`review-tier: FAIL — merge-base(${rsha}, ${lsha}) 失败（${lref}），fail-closed`);
      rc = 1;
      continue;
    }
    const tier = spawnSync("node", ["scripts/verify-review-tier.mts", "--enforce", "--since", base], {
      stdio: "inherit",
    });
    if (tier.status !== 0) {
      rc = 1;
    }
  }
  if (rc !== 0) {
    console.error("error: 评审档位强制未过（见上）");
    return false;
  }
  return true;
}

function main(): void {
  // argv 解析：--hook-remote 取 {1}（字面 "{1}" 残留 → origin）；{files} 占位忽略。
  const argv = process.argv.slice(2);
  let remote = "origin";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--hook-remote") {
      const value = argv[i + 1] ?? "";
      if (value.length > 0 && value !== "{1}") remote = value;
      i += 1;
    }
  }

  console.log("== pre-push: 文档与结构门禁（lefthook 单编排器，B3）==");

  // 变更范围展示（信息面；绝不臆测 base；失败不阻断——同旧 bash `|| true`）。
  spawnSync("bash", ["scripts/change-scope.sh"], { stdio: "inherit" });
  console.log("");

  const groups: Promise<GroupResult>[] = [
    spawnGroup("gates", "node", ["scripts/gates.mts", "--run", "--skip", "review-tier,review-brief,change-scope"]),
    spawnGroup("gene-format", "node", ["scripts/verify-gene-format.mts"]),
  ];
  if (fs.existsSync("dist/engine/bin.js") && fs.existsSync("dist/adapters/dsh/selftest.mjs")) {
    groups.push(spawnGroup("engine-selftest", "node", ["dist/engine/bin.js", "self-test"]));
    groups.push(spawnGroup("adapter-selftest", "node", ["dist/adapters/dsh/selftest.mjs"]));
  } else {
    console.error(
      "dist-selftest: FAIL — 缺 dist/（B3 起钩子跑预构建 dist，C6）；先 `npm run build` 再推",
    );
    groups.push(Promise.resolve({ name: "dist-selftest", ok: false }));
  }
  groups.push(
    Promise.resolve().then(() => ({ name: "review-tier", ok: tierLoop(remote) })),
  );

  void Promise.allSettled(groups).then((settled) => {
    const failed: string[] = [];
    for (const item of settled) {
      // rejected 仅病理可达（tierLoop 内 readFileSync(0) 同步异常）——真兜底非死面。
      if (item.status === "fulfilled" && !item.value.ok) failed.push(item.value.name);
      if (item.status === "rejected") failed.push("unknown");
    }
    if (failed.length > 0) {
      for (const name of failed) console.error(`error: pre-push 组 ${name} 未过（见上）`);
      process.exit(1);
    }
    console.log("pre-push OK");
  });
}

main();
