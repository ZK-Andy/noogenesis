# Agent Note: git 前置条件写明 + 引擎 git 缺失诊断分流

Status: implemented

> Provenance：本仓原创（2026-09-06 用户提问「这套流程生效的前提是不是用户必须装有 git」暴露两缺口；用户拍板采纳「文档写明 + 诊断分流」，同拍板「不单开发版轮」——修复落 main 随下一有发版需求的批次出包）。上游拍板：P1 骨架（[2026-09-05-p1-engine-skeleton](../architecture/2026-09-05-p1-engine-skeleton.md) D4 slot 推导绑 git）、P2 本仓即库（[2026-09-06-p2-shared-consumer](../architecture/2026-09-06-p2-shared-consumer.md) D1）。

## Problem

本套流程的生效前提 = **运行仓为 git 仓且 git 二进制在场**——这是拍板面（P1 D4：solidify 写 git commit、slot 取值仅由 git 事实推导；P2 D1：基因库 = git 仓、pull = git clone），但两处没兑现：

1. **前置条件零处写明**：README / 适配层 README 均无此句——依赖面要靠读引擎源码才能还原（用户提问即证据）。
2. **诊断误导**：`engine/bin.js` 的 `gitRoot` 把「git 二进制缺失（spawn ENOENT）」与「cwd 不在 git 仓」混进同一 catch，git 没装时也报「not inside a git repository」——违反诊断指名失败主体的纪律。

## Decision

**D1 · 前置条件进消费者契约面**：根 README（安装处）与 `adapters/dsh/README.md` 消费契约节各写明——引擎五命令与 pull 依赖 git 子进程；非 git 目录用 `noo_*` 工具会 fail-closed 退出 2。

**D2 · 引擎诊断分流（exit 2 fail-closed 不变，仅 stderr 文案指名主体）**：`gitRoot` 的 catch 区分 spawn `ENOENT`（git 未装 → 「git binary not found — install git」）与非 git 仓（原文案不变）。stdout 内容与退出码三档不动——M2 spawn 单合同（stdout + 退出码）零变化，模型面工具的失败映射行为不变（exit 2 → 抛错，stderr 原文进异常消息）。

## Alternatives considered

- **仅文档写明、诊断不动**：落败——诊断误导是既有纪律缺口（指名失败主体），且修复成本一行 catch 分流；留着会继续把「没装 git」误诊成「不是 git 仓」。
- **支持非 git 运行仓**（select 以 cwd 锚定、跳过 git 推导）：落败——P1 D4 slot 推导与 solidify git-commit 是绑定 git 的拍板，解开属架构面变更，非本缺陷修复范围；北极星场景（非程序员/非 git 仓）留后续胶囊立项记录。
- **分流扩到非 ENOENT spawn 失败**（git 在场但不可执行 EACCES 等也指名）：落败——D2 只承诺 ENOENT 分流；EACCES 属异例且无实案，扩面归后续诊断轮（R2-S2 不采纳记录）。

## Consequences

- **采用面**：`engine/bin.js`（gitRoot ENOENT 分流）、`engine/selftest.js`（PATH 清空夹具：`process.execPath` 绝对路径 spawn 子进程，断言 exit 2 + 指名 git 缺失 + 不含非 git 仓文案）、根 README + `adapters/dsh/README.md` 前置条件句。修复已落 main（commits `b5fcb2e` 实现 + 收口批），随下一有发版需求的批次出包（用户拍板不单开发版轮）。
- **评审收口（2026-09-06，LIGHT 档 R2 单路）**：R2 1B/2S。B1 夹具裸名 `'node'` 被 PATH 清空连带误伤（Node 按传入 env 的 PATH 解析裸名可执行件，引擎根本未启动）→ `process.execPath` 修 + exit 2 断言补（S1 同批采纳）；S2 不采纳有据（见 Alternatives 第三条）。
- **测试边界**：引擎 self-test 真 runner = `node engine/bin.js self-test`（67 ok 全绿）——`node engine/selftest.js` 直跑是 no-op（模块只导出无顶层调用），静默 exit 0 是假绿（本批实证教训入 [cookbook 门禁条](../../../../docs/cookbook.md)）。
- **验证**：`node engine/bin.js self-test` 67 ok / exit 0；git 未装环境 live 实证（PATH 清空 + 绝对路径 node → stderr 指名 git 缺失、exit 2、stdout 空）；门禁全绿。
