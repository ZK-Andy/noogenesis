# Agent Note: 技能触点提醒触发面扩面——三类匹配 + 命令/重定向通道

Status: implemented
Review: FULL/2026-09-11/R1=ok R2=ok R3=ok

Related: 机制立项 [2026-09-10-m1-guard-anti-overdesign](2026-09-10-m1-guard-anti-overdesign.md)（守卫三件套 Proposal 1②——本件扩其触发面，决定与档位不变）；语义面归属 [session-close](../../../workflows/session-close.md) §2；盲区取证（2026-09-11 两批的收尾对账与实测）[journal 2026-09 卷](../../../../journal/2026-09.md)。

## Problem

「该载未载」在 2026-09-11 两批的收尾对账里各记一次（`noo-prose-standard` / `noo-pre-push-checks`），当时的判定是「纪律条文在位、缺的是执行」。按守卫②的实际触发面逐条复核，这个判定对这两例不成立——两处触发面**结构不可达**；取证时另发现第三处：

- **`noo-prose-standard` 无任何条目**：缺省表只有两条（`docs` → doc-standards、`.agents/notes` → archive-agent-notes），散文面不在表内；且条目匹配只有「仓库相对路径前缀」一种形状，根 `AGENTS.md` / `HANDOFF.md` / `journal/**` 不落在任何前缀内。
- **`noo-pre-push-checks` 对应的是命令，不是文件**：守卫只看 `write` / `edit` 两个工具体（`skill-guard.mts` 的 `exec.name` 判定）——命令行面在机制里没有位置，`git push` 前不可能产生提醒。
- **bash 中介写不可见**：命令内的 `>` / `>>` / `tee` 写文件不产生 `write` / `edit` 事件。证据 = 机械化批（2026-09-11 00:02 会话，装机 0.2.4 已生效）改 `docs/method/doc-standards.md`（commit `3754808`，+1 行）走 bash 内 python heredoc 的 `sub(path, …)`；该会话宿主日志实取的 `advice` 事件 = 0，而同会话未载 `noo-doc-standards`——守卫对该次写入没有任何触发事件。同仓会话追加 journal 同样走 `cat >> journal/2026-09.md <<'EOF'`。

实测（宿主会话日志实取，单机单仓样本，【探索性】）：样本口径 = 本工作区 `~/.dsh/sessions/--mnt-work-Noogenesis--/*/session.v3.jsonl.zstd` 的 `tool/call` 事件，窗口 2026-09-09..09-11 内含 ≥1 次 `write` / `edit` 写 `.md` 的 19 个会话（不含测量会话自身——读取时其日志仍在写入；日志集随会话增长，重跑口径会漂）。结果：19 个会话全部用 `write` / `edit` 写过 `.md`，其中 `noo-prose-standard` 在首个 `.md` 写之前已载 = 3；16 个会话发出过真实 `git push`，其中 `noo-pre-push-checks` 已在载 = 5（即 11 个会话会收到提醒）；现存两条条目实际发行 advice 的会话 = 2（去重 3 条：docs→doc-standards ×2、`.agents/notes`→archive-agent-notes ×1）。两处漏项在样本内触发面为零，而对应任务普遍发生。守卫生效后的两次漏项（`c231ce0c` 机械化批、`ef23170c` 吸收阶段批）宿主日志均为零 advice。

## Decision

**守卫②的触发面从「路径前缀 × 技能」扩为「三类匹配 × 技能」，并把 bash 中介写纳入写码目标。**

1. **条目形状**：`config.skillGuards` 条目 = `{ kind, pattern, skill }`，`kind ∈ { path, suffix, command }`——`path` = 写码目标路径的 POSIX 相对目录前缀（每段为常规段：绝对形态与 `.` / `..` / 空段在配置面拒收，它们永不命中前缀匹配）；`suffix` = 目标路径后缀（扩展名，如 `.md`）；`command` = bash 命令文本的正则。旧形态 `{ path, skill }` 拒收（配置 schema 变更，fail-closed 指名字段）。
2. **写码目标两条通道**：`write` / `edit` 的 `file_path`，以及 bash 命令里的 `>` / `>>` / `tee`（含 `-a` / `--append`）目标——双引号包、单引号包或裸 token（按会话 cwd 解析，出仓即弃；`$VAR` / `~` 未展开式与 `->` / `=>` 不算重定向）；两类通道同样参与 `path` / `suffix` 匹配。脚本体内的写（python heredoc 的 `sub(path, …)`、`sed -i` 等）与 heredoc 体内文本不可枚举，留作残余边界（见 Consequences）。
3. **一次列全**：同一事件命中的全部未载技能一次列出（命中即返单行的形态改为多行），每条仍受「每会话每技能至多提醒一次」约束。
4. **缺省表补两条实证条目**：`suffix ".md"` → `noo-prose-standard`、`command "\bgit\s+push\b"` → `noo-pre-push-checks`；原两条保留，共 4 条。
5. **档位不变**：advice 非阻断、每会话每技能至多一次；阻断档仍判不立（「该不该用技能」是语义判断，机器给不出必报失败——理由单源 = [M1 Alternatives](2026-09-10-m1-guard-anti-overdesign.md)）。
6. **归属**：本件补的三处结构面归机制；`noo-code-review` / `noo-find-simplifications` / `noo-trim-cot-leakage` 等任务型技能仍是语义面，归 `session-close` §2 对账与 `feature-flow` §5 吸收——不为它们新增行动区条目（机制与既有对账步即 owner）。
7. **取代分类**：M1 立项 ADR 保留（其 Decision 1② 仍是守卫机制的家，本件只扩触发面），不归档、不删；无其他笔记主张同一决定。

## Alternatives considered

- **只立行动区一条**：落败——纪律条文已两次失效，待办条没有触发时刻，与 M1 既定判据（触发交给机器、服从留给自觉）反向；待办条无法把「写 .md 的那一刻」或「push 前的那一刻」变成信号。
- **阻断档**（写 `docs/**` 未载技能即拦回）：仍判不立——M1 Alternatives 的理由不变（该不该用技能是语义判断，机器给不出必报失败），本件不触碰档位。
- **条目枚举替代 `suffix`**（`docs` + `.agents` + `journal` + 若干个根级 `.md` 各一条）：落败——8 条 vs 1 条，且新增根级 Markdown 文件即漏。
- **命令面用字面前缀匹配而非正则**：落败——实测命令形态带前导（`cd /mnt/work/Noogenesis && git push origin main`、`timeout 300 git push`），前缀匹配命中不了。
- **命令面按「命令里出现 `.md` 路径」泛匹配**（用以覆盖脚本体内的写）：落败——读命令（`grep`、`sed -n`）同样命中，噪声换不来覆盖，与缺省表的「宁缺勿滥」反向。
- **补 `gh pr ready` / 代码注释散文面等条目**：落败——无实证缺口，预铺条目。
- **仓判定收紧**（技能面缺席时不发行）：缓议——代价是离线性降级下建议一个载不到的技能（一行、可忽略）；触发 = 实测出现误导。

## Consequences

- **噪声上界由触发器给**：每会话每技能至多一行，不随写次数增长。同一样本内投影发行率（【探索性】n=19）：`.md` 面 16 个会话各 1 行（已载 3 个例外）、`git push` 面 16 个有 push 的会话中 11 个各 1 行（已载 5 个例外）。
- **残余边界（漏报）**：脚本体内的写不可见（机械化批实例在案）；命令内 `cd` 改目录的复合命令按会话 cwd 解析；heredoc 体内的 `>` 文本会被当写目标读出。
- **假阳面**：命令面是文本正则——字符串字面量里的 `git push`（如 `echo 'git push'`）与 heredoc 体内的 `.md` / `docs/**` 文本同样命中。代价是一行可忽略 advice（上界仍是每会话每技能一行）；`$VAR` / `~` 未展开目标与 `->` / `=>` 已在提取面排除。
- **配置面破坏性变更**：`config.skillGuards` 旧形态拒收，`adapters/dsh/README.md` 配置表同批改写。
- **载体事实同步**：[M1 ADR](2026-09-10-m1-guard-anti-overdesign.md) Proposal 1② 的「缺省表 `docs`/`.agents/notes` 两条」按现态改写，决定不变。
- **`session-close` §2 裁断口径不变**：advice 只发建议不发断言，「该载未载」的最终裁断仍留人；本件不把语义面机械化的口子打开。
