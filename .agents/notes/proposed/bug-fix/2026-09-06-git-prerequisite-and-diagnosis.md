# Agent Note: git 前置条件写明 + 引擎 git 缺失诊断分流

Status: proposed

> Provenance：本仓原创（2026-09-06 用户提问「这套流程生效的前提是不是用户必须装有 git」暴露两缺口；用户拍板采纳「文档写明 + 诊断分流」）。上游拍板：P1 骨架（[2026-09-05-p1-engine-skeleton](../../implemented/architecture/2026-09-05-p1-engine-skeleton.md) D4 slot 推导绑 git）、P2 本仓即库（[2026-09-06-p2-shared-consumer](../../implemented/architecture/2026-09-06-p2-shared-consumer.md) D1）。

## Problem

本套流程的生效前提 = **运行仓为 git 仓且 git 二进制在场**——这是拍板面（P1 D4：solidify 写 git commit、slot 取值仅由 git 事实推导；P2 D1：基因库 = git 仓、pull = git clone），但两处没兑现：

1. **前置条件零处写明**：README / 适配层 README 均无此句——依赖面要靠读引擎源码才能还原（用户提问即证据）。
2. **诊断误导**：`engine/bin.js` 的 `gitRoot` 把「git 二进制缺失（spawn ENOENT）」与「cwd 不在 git 仓」混进同一 catch，git 没装时也报「not inside a git repository」——违反诊断指名失败主体的纪律（prose 标准：诊断信息指名失败主体/路径/违反的规则）。

## Proposal

用户拍板（2026-09-06，采纳推荐项）：

**D1 · 前置条件进消费者契约面**：根 README（安装/当前状态处）与 `adapters/dsh/README.md` 消费契约节各写一句——引擎五命令与 pull 依赖 git 子进程；非 git 目录用 `noo_*` 工具会 fail-closed 退出 2。

**D2 · 引擎诊断分流（exit 2 fail-closed 不变，仅 stderr 文案指名主体）**：`gitRoot` 的 catch 区分 spawn `ENOENT`（git 未装 → 「git binary not found — install git」）与非 git 仓（原文案不变）。stdout 内容与退出码三档不动——M2 spawn 单合同（stdout + 退出码）零变化，模型面工具的失败映射行为不变。

修复随 `noogenesis-dsh@0.1.4` 发版轮（修复走发包不走本地手修）。

## Alternatives considered

- **仅文档写明、诊断不动**：落败——诊断误导是既有纪律缺口（指名失败主体），且修复成本一行 catch 分流；留着会继续把「没装 git」误诊成「不是 git 仓」。
- **支持非 git 运行仓**（select 以 cwd 锚定、跳过 git 推导）：落败——P1 D4 slot 推导与 solidify git-commit 是绑定 git 的拍板，解开属架构面变更，非本缺陷修复范围；北极星场景（非程序员/非 git 仓）留后续胶囊立项记录（HANDOFF-todos（D））。

## Acceptance criteria

- README 与 `adapters/dsh/README.md` 各有前置条件一句（git 仓 + git CLI）。
- git 二进制缺席的环境下跑引擎任一命令 → exit 2 且 stderr 指名 git 缺失；非 git 仓（git 在场）→ 原文案不变。
- stdout 内容与退出码三档与 0.1.3 完全一致（selftest 既有夹具回归）。

## Risks

- `ENOENT` 判定依赖 Node execFileSync 错误对象的 `code` 字段语义（Node 保留行为，非合同承诺）——selftest 夹具钉住。
