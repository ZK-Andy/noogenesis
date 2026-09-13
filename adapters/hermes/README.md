# adapters/hermes — Hermes 第二宿主适配层

批次 7 序 35 的拍板与取舍单源：[ADR 2026-09-14-hermes-hook-bridge](../../.agents/notes/implemented/architecture/2026-09-14-hermes-hook-bridge.md)。本目录是插件包内**第二个**允许携带宿主特有面的层；与 `adapters/dsh/` 互不渗透（不互相 import）。

## 消费契约（安装面）

- **可携带面零适配**：Hermes 原生读 `AGENTS.md` 链（git 根 + 逐级子目录）；`.agents/skills` 是 Hermes 的项目技能路径之一——仓内跑一次 `hermes skills trust` 后，7 件 `noo-*` 入库。
- **本层交付 = 写码在环拦回**：把 `hooks.example.yml` 的 `hooks:` 块合并进 `~/.hermes/config.yaml`，`<repo>` 换成本仓绝对路径（hook 命令必须指向已构建的 `dist/adapters/hermes/hook.mjs`）。首次使用按宿主流程同意（`hermes hooks list` 看状态）。
- **行为**：`pre_tool_call` 收到 `write_file` 时，对 `.ts` / `.mts` 且在仓内的目标，用**拟写入内容**跑仓根 oxlint；命中即回 `{"action":"block","message":…}` 拦回（模型须修完再写）。判据与阈值同 DSH 侧 A4 的 lint 半（5s 超时、10 行截断 + `…(+N more)`）。
- **降级**：非 `write_file` / 非 `pre_tool_call` / 目标出仓 / 非 `.ts`,`.mts` / 缺 oxlint 二进制或配置 / 子进程异常或超时 / 坏 JSON —— 一律零输出 exit 0（fail-open，绝不阻断宿主）。

## 配置样例（`hooks.example.yml`）

```yaml
hooks:
  pre_tool_call:
    - matcher: "write_file"
      command: "node <repo>/dist/adapters/hermes/hook.mjs"
      timeout: 10
```

## 协议与验证

- 协议 = Hermes shell hook：stdin 收 `{hook_event_name, tool_name, tool_input, session_id, cwd, extra}`；本层只读 `hook_event_name` / `tool_name` / `tool_input.path` / `tool_input.content` / `cwd`。stdout 只发 block 形状（Hermes-canonical `action`/`message`），其余情况不写 stdout。
- 自测（离线、无需 Hermes）：`npm run build && node dist/adapters/hermes/selftest.mjs`。
- 宿主接线探针：`HERMES_HOME=<tmp> hermes hooks test pre_tool_call --payload-file <fixture>`——注意 `--payload-file` 的内容并入载荷 `extra`，宿主合成的 `tool_input` 是占位值，故该命令验证的是**发射与响应形状**，判据本身由自测覆盖；真会话写码载荷走 (B) 真机复验。

## 未覆盖（具名触发）

`patch` 工具（载荷形状未取证）；`pre_llm_call` 上下文注入；Hermes 原生插件面（Python only，撞机器层全栈 TS）；`hermes skills trust` 用户侧一步；**export-docs 半判据**（判据件按域归属判，在环候选落仓外即 skip——触发 = 判据件给出「给定内容 + 逻辑域」入口，或宿主给出可阻断的写后事件面）；`adapters/hermes` 不在判据件 `SOURCE_ROOTS` 内。
