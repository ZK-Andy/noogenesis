# Agent Note: 技能触点提醒 push 面正则对带全局选项的推送不可达——匹配面须容忍 `git` 全局选项前缀

Status: implemented
Review: FULL/2026-09-12/pending（三重审核进行中，收口时回填真实结论）

> Related：触发面机制 [2026-09-11-skill-guard-trigger-faces](../architecture/2026-09-11-skill-guard-trigger-faces.md)（本件只改其缺省表 push 条目的匹配面，条目形状、档位与残余边界不变）；候选出处 = 演化轮池 2026-09-12 取证轮 findings（本件为其结论家）；真机复验判据 = [HANDOFF-todos](../../../../HANDOFF-todos.md)（B）条。

## Problem

**现象（本机实测，n=3，2026-09-11 会话）**：本机无凭据助手，向 origin 推送的唯一可用形态是 `git -c credential.helper=… push`；缺省守卫正则 `\bgit\s+push\b` 要求 `git` 与子命令相邻，3 次推送 **0 次命中**——提醒通道对这一形态结构不可达，而它正是操作者在这台机器上的常态。

**机制**：`command` 条目的判定 = `new RegExp(entry.pattern).test(command)`（[skill-guard.mts](../../../../adapters/dsh/skill-guard.mts)），命令文本原文匹配、无归一化；`-c` / `-C` / `--git-dir` / `--no-pager` 等全局选项插在 `git` 与 `push` 之间即不命中。

**来源面**：触发面扩面批（2026-09-11）的取证样本取的是宿主会话日志里**已有的** push 调用，形态是 `cd … && git push` 与 `timeout 300 git push` 两种前导形——真机的第三种形态（带全局选项）不在样本内，n=16 的会话样本因此没暴露它。缺省表是装完即生效的面：用户不改 `config.skillGuards` 就长期收不到 push 前提醒。

**影响面**：只有 push 条目涉及——`path` / `suffix` 两类不读命令文本。

## Decision

1. **匹配面容忍全局选项前缀**：`git` 与子命令之间容许①取值为独立 token 的全局选项（白名单：`-C` / `-c` / `--git-dir` / `--work-tree` / `--namespace` / `--exec-path` / `--config-env` / `--attr-source`——git 全局选项的取值集封闭）与②开关形（`-<flag>`、`--<flag>[=<value>]`）。正则字面量（可复制，供手写 `config.skillGuards` 条目）：

   `\bgit(?:\s+(?:-C|-c|--git-dir|--work-tree|--namespace|--exec-path|--config-env|--attr-source)\s+\S+|\s+-{1,2}[\w-]+(?:=\S+)?)*\s+push\b`

   实现单源 = [config.mts](../../../../adapters/dsh/config.mts) 的 `GIT_PUSH_PATTERN`（缺省表条目引用它）。
2. **噪声边界不放宽**：只容许「选项前缀 + 子命令」形态——`git commit -m push`、`git log --grep push`、`git remote add push` 保持不命中；文本字面量命中（`echo 'git push'`）仍是已接受噪声（触发面 ADR 假阳面）。
3. **夹具改行为面**：缺省表断言拆为「前三条字面量钉死 + 第四条行为验」；守卫夹具直接吃 `validateConfig({}).skillGuards`（原先硬抄一份缺省表 = 改一处漏一处），并加 4 正例（`-c k=v` / `-C <dir>` / `--git-dir=<dir>` / `--no-pager`）+ 2 负例。
4. **载体事实同步**：`adapters/dsh/README.md` 配置表、触发面 ADR Decision 4 的条目事实句、HANDOFF 当前状态句按现态改写（决定不变）。

## Alternatives considered

- **匹配前归一化命令**（剥全局选项后匹配子命令）：落败——`command` 条目的合同是「用户可配正则 × `test(command)`」，归一化会把配置面与匹配实现分叉，且要自己解析引号 / 转义 / 续行；前缀容错在同一正则里解决。
- **放宽为「命令文本含 token `push`」**：落败——`git commit -m push`、`git log --grep push`、`git remote add push` 全命中，把每条 advice 的信噪比打穿，与缺省表的「宁缺勿滥」纪律反向。
- **只容许连续选项**（`\bgit(?:\s+-\S+)*\s+push\b`）：落败——覆盖 `-c k=v` 形，漏掉取值为独立 token 的形态（`git -C <dir> push`、`git --git-dir <dir> push`），那是脚本里的常见形态。
- **不改匹配面，改在技能/文档里要求「推送前先载技能」**：落败——提醒通道的存在意义就是补纪律面；且真机复验判据点名了该形态，留着等于复验当晚必记一条已知缺陷。

## Consequences

- **采用面**：`config.mts`（`GIT_PUSH_PATTERN` + 缺省表条目）、`selftest.mts`（配置缺省断言 + 守卫夹具 4 正 2 负 + 缺省表单一来源）、`adapters/dsh/README.md` 配置表、触发面 ADR 事实句、HANDOFF 当前状态句。
- **行为面**：`git -c … push`、`git -C <dir> push`、`git --git-dir[=…] push`、`git --<flag> push` 进入提醒面；`push` 作为其它子命令参数的调用不新增命中。
- **残余边界（文本正则的固有）**：`git -C "含 空格的路径" push`（取值被引号包）不命中；`git` 经 shell 别名 / 封装脚本调用不可见。同族残余（字面量假阳、脚本体内的写）仍归触发面 ADR Consequences。
- **真机复验**：判据补 `-c` 形态，随下一版装机复核（跨会话遗留 = [HANDOFF-todos](../../../../HANDOFF-todos.md)（B）条）。
