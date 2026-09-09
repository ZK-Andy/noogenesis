# Agent Note: 全仓规范语义面审计修复批——失败传导缺口、口径漂移与门禁 fail-closed

Status: implemented
Review: FULL/2026-09-10/R1=ok R2=ok R3=ok

> Provenance：本仓原创（2026-09-10，全仓 [R] 语义面审计批）。三族并行审计（engine / adapters / scripts 按 [architecture-standards](../../../../docs/method/architecture-standards.md) + [code-standards](../../../../docs/method/code-standards.md) 的 `[R]` 清单逐行核对）产出的行为面与判据面定夺批；注释/命名清扫为其同批零行为部分。
> Related：失败传导通则与「显式降级 warn 留痕」语义单源 = architecture-standards §3；lint 拦回档位拍板 = [升格批 ADR](../architecture/2026-09-09-lint-block-and-staged-hook.md)（本批只修 README 漂移，不改拍板）。

## Problem

机器闸（lint / export-docs / package-invariants）全绿不等于语义面无缺陷。三族审计共命中行为面缺陷 5 件 + 判据面缺陷 2 件：

1. **engine `propose --out` 缺值静默吞**（bin.ts）：`--out` 在末尾缺值时 outFile=undefined → 注入文本写 stdout 且 exit 0——用户显式要求写文件，引擎无痕降级且报成功；同文件 `pull --cache` / `solidify --actor` 缺值均 exit 2，三处用法错误口径不一致。
2. **engine `evaluate` 丢弃 spawn 诊断**（evaluate.ts）：gate 二进制缺失时 util.run 已捕获 `spawnError`，但报告只显示 `FAIL (exit -1)` 且 tail 为空——根因在手被扔掉，调用方零诊断。
3. **adapters 命中节 select 失败无痕吞**（index.mts）：`runEngineSync` 永不抛（失败映射 code=FAIL_CLOSED、stdout 空），hitsSectionText 只读 stdout → 渲染 `""` → 该节静默消失，全程零 warn。引擎持续故障（dist 未构建等）时整段会话无人知晓。
4. **adapters README 拍板单源漂移**：「语义与失败模式」节 A4 仍写「建议档 `context`」与「策略件全部建议档，**零阻断路径**」，与实现（默认 `block` 拦回）和升格批 ADR 直接矛盾——同一事实两处表述漂移。
5. **verify-adr-format 双缺陷**：违约文案残留 Python f-string 字面量 `{len(parts)}`（原样打印，2 段路径可触达，夹具只断 exit 盖不住文案）；顶层非豁免 `.md`（或非 lifecycle 子目录文件）被 scan 前置过滤静默跳过——杂散笔记零报错逃过命名+内容+骨架三面检查，隐式豁免面未登记（fail-open）。
6. **verify-postmortem-naming 排序不确定**：`localeCompare` 随运行环境 locale 漂移，而编号递增判据依赖该序；家族纪律明确钉确定序（change-scope/gen-manifest/verify-manifest 同口径）。

## Decision

1. **propose `--out` 缺值 → exit 2 fail-loud**：与 `pull --cache` / `solidify --actor` 用法错误同口径；显式 `--out` 被静默降级为 stdout 打印视为调用方必须感知的失败。
2. **evaluate 并入 spawn 根因**：`code === -1 && spawnError` 时把 spawnError 一行并入报告 tail；`TAIL_LINES`/`TAIL_CHARS`/`SPAWN_MAX_BUFFER` 命名常量。
3. **命中节 select 失败 warn 留痕**：`code !== EXIT.OK` → logger.warn（每次故障期至多一条，成功复位——provider 每模型步运行，逐条 warn 会刷屏）；渲染仍降级 `""`（命中节缺席 ≠ 会话阻断，不改为阻塞/抛错）。
4. **README A4 条改为实现与 ADR 同口径**：A4 = 机器可判违规 block 拦回 + 同文件连续拦回达上限降级 `context`；删「零阻断路径」断言，阻断面唯一 = A4。
5. **verify-adr-format 改 fail-closed**：删 lifecycle 前置过滤 `continue`——所有非豁免路径一律走 validateName（命名判据本就盖「3 段 + lifecycle 封闭集」）+ 内容/骨架检查；顶层豁免面显式封闭为 `README.md` + `AGENTS.md` 两件（notes 子树常设件，AGENTS.md 此前靠 fail-open 溜过）；文案内插 `parts.length`；夹具新增 case G（lifecycle 树外杂散笔记必拦）+ case F 文案断言（钉死内插，防残留回潮）。
6. **postmortem 排序钉确定序**：`localeCompare` → 字符串序比较器（JS UTF-16 码元序；postmortem 名被 NAME_RE 钉死 ASCII，与码点序同序——消除环境漂移面；真码点序比较器归口是 simplification 候选）。

## Alternatives considered

- **维持 fail-open、仅头注登记豁免面**：落败——杂散笔记逃过全部检查面正是门禁存在意义的反面；显式豁免两件常设件后无合法逃逸需求，而「登记了所以可以漏」把例外从机器可判降级为文档约定。
- **命中节 select 失败改为抛错/阻塞**：落败——宿主 prompt 节 provider 是同步面，阻塞 = 会话阻断，违反「降级面绝不变成阻断」纪律；warn 留痕已满足「调用方必须感知」。
- **家族共享 `MS_PER_DAY` 归口 mdref 同批做**：落败——码点比较器 8 处副本、路径归一 7 处变体需先逐处对齐语义（pyNorm/pyPathStr 语义略异），跨件归口是独立 simplification 候选，混入行为批会放大爆炸半径。
- **retire 未用的 `engineRoot` 参数保留对称签名**：落败——lint 参数类豁免盖不住语义面：零使用的参数暗示引擎根参与退役路径，误导读者；调用点仅 3 处，删参成本低于歧义成本。

## Consequences

- **采用面**：engine（bin/evaluate/util/gene/gates/solidify/selftest——行为 2 件 + `retire` 删参 + 注释批）；adapters（index.mts select warn + README 口径收口 + 注释批）；scripts（verify-adr-format fail-closed 重写 + verify-postmortem-naming 排序 + 注释批）。注释/命名清扫为同批零行为部分，不另立 ADR。
- **行为面变化**：`propose --out` 缺值（含空串值）从静默成功改为 exit 2（CLI 合同面唯一变化，engine self-test 夹具钉死两态 + `--out` 写文件路径）；`evaluate` spawn 失败报告多一行根因（tail 字符截断取尾部——根因行在输出末尾，保头会切掉它）；命中节故障期每会话至多一条新 warn（warn-once/复位纪律单源 = section.mts `createHitsSection`，adapters selftest 夹具钉死）；verify-adr-format 现在会拦 lifecycle 树外杂散笔记与深位同名豁免件（豁免只认一层深度；本仓树现况零命中，真实扫描 OK）。
- **评审核对补遗（R1/R2 收口批）**：R2 判定五条 Suggestion 全采纳——`--out` 空串残面（falsy 守卫盖住）、spawnError 与 `--out` 行为面夹具补钉、tail 字符截断改取尾、深位同名豁免洞（case H 钉死）、命中节 warn 行为提取为可测工厂；R1 判定两薄建议采纳其一（spawnError 模板收敛；比较器第 9 副本口径改准并补登 simplification 候选 ADR）。
- **判据面**：verify-adr-format 豁免面从隐式（lifecycle 过滤）变显式封闭集（fail-closed）；postmortem 排序确定化。两件 self-test 均含新夹具。
- **遗留候选（本批不做）**：py 原语归口 mdref、ADR class 封闭集双源、7 个门禁自测临时目录不清理、模型面字符串语言口径拍板——立 simplification 候选另行拍板。
