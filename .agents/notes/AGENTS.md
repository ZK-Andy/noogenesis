# .agents/notes/ — ADR 子树

> 规则单源：[notes/README.md](README.md)。`.agents/AGENTS.md` 管 .agents 全子树，本件只写 notes 独有的具体失败。

- **新建即超车检查**：新建笔记前必须先搜活跃树（proposed/implemented）做取代分类——已拥有该决定的旧笔记**更新即可，禁止重复创建**；完全取代者合并删旧 + 修入站链接；笔记要超车就写新的并交叉链接。
- **路径即元数据**：`{lifecycle}/{class}/yyyy-mm-dd-<topic>.md`，lifecycle 与 Status 行一致，迁移不改日期；class 六类封闭集，树外路径 = 门禁 FAIL。
- **archived/ 永久冻结**：归档时只允许在 Status 下插一行 `Archived: YYYY-MM-DD`，之后禁改禁删——机器强制见 `verify-archived-agent-notes`（冻结清单 append-only，改写已有条目即拦截）。
- **implemented 笔记与上线现实同步**：文件移动/改名/改默认值时同变更改写（只改事实，不改决定）。
- 新建/修改笔记即跑 `python3 scripts/verify-adr-format.py`。
