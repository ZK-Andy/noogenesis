# 扫描电池（recall batteries）

> Provenance：蒸馏自 deepseek-harness `dsh-trim-cot-leakage/references/recall-batteries.md`（MIT，2026-09-10）；模式与排除面按本仓改写——本仓正文以中文为主，主电池 = 中文叙述 + 死引用模式，英文面作残留副电池。

配 [SKILL.md 的八类分类](../SKILL.md)使用。每个命中都需要语义判断——电池设计上过匹配（over-match），天然欠匹配（under-match）：上游 2026-08 全仓清理的每一轮评审都遇到电池没抓到的案例，所以必须配一轮**无模式的密散文通读**（README、docs/method、活跃 ADR）。

## 调用规则

- `--hidden` 让 `.agents/` 入扫——ripgrep 默认跳过点目录，漏扫 Agent Notes 是最大风险面。
- 排除放最后（后置 include 会重新收进来）：

  ```sh
  --glob '!node_modules/**' --glob '!.cache/**' --glob '!.noogenesis/**' --glob '!dist/**' \
  --glob '!journal/**' --glob '!docs/postmortem/**' --glob '!.agents/notes/archived/**' \
  --glob '!.agents/skills/noo-trim-cot-leakage/**'
  ```

  journal 月卷、postmortem、archived（冻结）是变更叙事的裁定体裁——叙事留在原地不可疑；本技能自带校准引文，排除自身。
- **ADR 自命中**：ADR 会引用泄漏措辞作证据（doc-standards 的 slop 清单、本技能 examples 的泄漏对照）——按证据裁，不按使用裁。
- **HANDOFF.md 特殊**：滚动窗是批次叙事体裁（体裁合法），但同一文件里还住着状态区与指针——命中后按「滚动窗槽位 vs 泄漏进状态区/指针」分流裁断。
- 中文模式无大小写（`-i` 无意义）；代码注释模式保持大小写敏感。
- 短语加边界：`\bused to\b` 命中 "used to sign" 属工具性用法（见误报族），中文「不再」前后文判时态。
- 零命中在打过已知正例之前什么也证明不了；噪声模式在拒掉近似负例之前什么也证明不了。跑语料结论前先双校准。
- **行为可见面**（prompt、门禁失败文案、技能目录摘要、基因注入文本）的命中，改写前先找 owning 可运行快照——措辞即行为，纯散文批不静默改；没有 owner 场景就留原样报告推迟。

## 中文主电池

```sh
# 死引用：会话速记决策号 / 审计号 / 旁证 / 无主阶段标签
rg -n --hidden '（决策|决策 ?\d+[：:]|（审计|旁证|T\d 批|第 ?\d+ ?题决议' <scope>

# 变更叙述（中文 durable 面；journal/HANDOFF 滚动窗已排除）
rg -n --hidden '不再|此前|以前|曾经|原来|旧版|老的|现已|后来|改名|已废弃' <scope>

# 评审编舞与轮次归属（durable 面命中才可疑）
rg -n --hidden '上一?轮|评审 ?[R123]|R[123] 抓回|评审中|收口后转' <scope>

# 对冲与无主推迟
rg -n --hidden '随下次|随下一|后续再|以后再说|先用着|大概|应该够|估计' <scope>

# 中文正文夹半翻译工作语
rg -n --hidden 'fix ?[了掉]|review ?中|ship ?了|review ?完|还没 ?review' <scope>
```

## 英文副电池（英文注释/正文残留）

```sh
rg -n --hidden -i '\bthis PR\b|\bthis commit\b|\bthis branch\b|\bused to\b|\bno longer\b|\bpreviously\b|\bthe old\b|\bas of v?\d' <scope>
rg -n --hidden -i 'rejected in review|reviewer (confirmed|said)|later PRs?|probably |should be enough|it simply|is safe' <scope>
rg -n --hidden '§\d' <scope>   # 每个命中查：有没有已提交主（本仓设计稿/蓝图/问题池多数有主——有主保留）
```

## 已知误报族（上游 2026-08 清理轮已裁过，预期再见）

keep 判据的单源 = [SKILL.md「什么不是泄漏」](../SKILL.md)；本节只列**电池模式特有**的误报族（判法/去噪，不是 keep 清单复述）：

- **工具性「不再/used to」**——「旧进程退出前不再接收新连接」是运行时生命周期，不是仓库史。时态判据：主语是不是仓库状态。
- **有主 § 与里程碑引用**——问题池 §3.4（谱系）、问题池 §2.2-6、B0–B5、C15、M1 批 A 有已提交主（capsule 问题池/蓝图）且自有编号——按名/节引用合法；「T4」类无主标签才删。判据是 HEAD 可解析，不是模式形态。
- **体系名词「评审」**——「评审检查项」「FULL 三审」是体系名词（根 AGENTS 裁定）；可疑的是把某轮评审的过程写进 durable 正文。
- **状态行元数据**——ADR `Status: implemented|rejected` 是元数据槽位，不是正文变更叙述。
- **术语中英混排**——gate/ADR/skill/rank/kebab 名是本仓约定词汇，不是残留；可疑的是半翻译工作对话（「fix 了」「review 还没过」）。
- **TODO/FIXME 行**——升格后的推迟有 owner，是合法形态；可疑的是**无标记**的对冲（「应该够」「随下次发版」）。
- **体裁槽位自命中**——journal/滚动窗/ADR 证据行被排除面或裁断规则豁免；doc-standards 的 slop 清单引文（"previously/now"）是校准证据——按证据裁，不按使用裁。
