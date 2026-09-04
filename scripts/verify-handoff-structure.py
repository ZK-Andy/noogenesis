#!/usr/bin/env python3
"""Verify the HANDOFF structure stays lean and layered.

HANDOFF is a committed working document family (single source of truth for
background / location / current state / todo / start steps); Noogenesis tracks
process assets (HANDOFF family + journal/) in git by decision
(ADR 2026-09-05-journal-in-git):

  HANDOFF.md        — entry file: stable sections + *summary* rolling window
  HANDOFF-todos.md  — action area: all todo items, lifecycle-constrained

The 2026-08-27 split added a bounded rolling window; the 2026-08-31 split
(split-governance) went further because a window cap alone did not bound
growth — entries were 800-1400 chars and completed todos never shrank.
This gate gives the handoff layer a machine backstop:

  * The `## 交接更新记录` window keeps only recent session-batch *summaries*
    (date | type | commit/ADR pointer | one-line conclusion); full narrative
    is archived to `journal/<YYYY-MM>.md`. Enforced:
    entry count <= --max-window (default 24) and each entry <= --max-entry
    chars (default 260).
  * The `## 待办` section in HANDOFF.md is a pointer; the real action area
    is HANDOFF-todos.md. Enforced: file exists and is referenced; open items
    (`[ ]`) <= --max-open and <= --max-open-chars; total items <= --max-total;
    closed items (`[x]`) <= --max-closed-chars (one-line pointers).
  * Required body sections must exist; the journal archive pointer must be
    present and its referenced volume must exist.

Usage: python3 scripts/verify-handoff-structure.py [--handoff PATH] [--max-window N] ...
       python3 scripts/verify-handoff-structure.py --self-test   # offline fixtures
Exit code 0 = pass, 1 = violations.

Provenance: distilled from dotnet-deepseek-harness-desktop/scripts/verify-handoff-structure.py
(MIT, 2026-09-05). Diffs vs source: journal lives at repo-root `journal/`
(not `.plan/journal/`); volume name derived from the current month instead of
a hardcoded constant (fixes the upstream cross-month rollover bug — a
nonexistent volume only fails when it is NOT the current month, since a fresh
month may legitimately have nothing archived yet).
"""

import argparse
import datetime
import re
import sys
from pathlib import Path

DEFAULT_HANDOFF = "HANDOFF.md"
DEFAULT_TODOS = "HANDOFF-todos.md"
DEFAULT_MAX_WINDOW = 24
DEFAULT_MAX_ENTRY = 260
DEFAULT_MAX_OPEN = 16
DEFAULT_MAX_TOTAL = 70
DEFAULT_MAX_OPEN_CHARS = 340
DEFAULT_MAX_CLOSED_CHARS = 220

HEADER_SECTIONS = ("背景", "位置", "当前状态", "待办", "开始步骤")
ENTRY_RE = re.compile(r"^- \d{4}-\d{2}-\d{2}｜")
SECTION_RE = re.compile(r"^## (?P<name>.+?)\s*$")
JOURNAL_RE = re.compile(r"journal/[\w\u4e00-\u9fff-]+\.md")
TODO_RE = re.compile(r"^- \[([ x])\] ")
TODOS_REF_RE = re.compile(r"HANDOFF-todos\.md")
# Single home for the journal volume naming convention: monthly volumes at
# journal/<YYYY-MM>.md. The current-month name is derived from today's date
# (upstream hardcoded one month and broke on rollover); existence is only
# enforced for volumes of past months — a fresh month may legitimately have
# nothing archived yet.
# Single clock: UTC now, read once at import; CURRENT_MONTH and the self-test
# fixtures derive from it (UTC aligns with verify-cookbook.py's tolerance
# precedent; single read kills the cross-midnight two-read nondeterminism).
_NOW = datetime.datetime.now(datetime.timezone.utc)
CURRENT_MONTH = _NOW.strftime("%Y-%m")


def _scan(handoff: Path, todos_path: Path, max_window: int, max_entry: int,
          max_open: int, max_total: int, max_open_chars: int,
          max_closed_chars: int) -> tuple[int, list[str]]:
    """Return (window_count, errors).

    The journal volume and the todos file live under the HANDOFF's own parent
    (repo root when HANDOFF is at the repo root), so we resolve them from
    `handoff.parent` rather than the current working directory. This keeps
    `--handoff` pointing at a HANDOFF elsewhere (its intended use) from
    false-failing.
    """
    if not handoff.is_file():
        # HANDOFF family is committed in git (ADR 2026-09-05-journal-in-git):
        # absence is a violation, not a clean-CI exemption.
        return 0, [f"{handoff}: HANDOFF not found — the family is tracked in "
                   f"git; deleting it must go through an ADR, not silence."]

    errors: list[str] = []
    text = handoff.read_text(encoding="utf-8")
    lines = text.splitlines()

    # 1) required body sections present
    seen_sections: set[str] = set()
    for line in lines:
        m = SECTION_RE.match(line.strip())
        if m:
            # tolerate a parenthetical suffix, e.g. "## 待办（第二步 …）"
            name = m.group("name").strip()
            base = name.split("（")[0].split("(")[0].strip()
            seen_sections.add(base)
    missing = [s for s in HEADER_SECTIONS if s not in seen_sections]
    if missing:
        errors.append(f"{handoff}: missing required section(s): {missing}")

    # 2) rolling-window entries: count bounded + each a short summary
    window_count = 0
    in_window = False
    for i, line in enumerate(lines, 1):
        if line.strip().startswith("## 交接更新记录"):
            in_window = True
            continue
        if in_window and SECTION_RE.match(line.strip()):
            in_window = False
            continue
        if in_window and ENTRY_RE.match(line.strip()):
            window_count += 1
            if len(line) > max_entry:
                errors.append(
                    f"{handoff}: line {i}: window entry exceeds {max_entry} "
                    f"chars ({len(line)}). Summaries only — full narrative "
                    f"goes to journal/.")
    if window_count > max_window:
        errors.append(
            f"{handoff}: 交接更新记录 has {window_count} entries, exceeds max "
            f"window {max_window}. Archive the oldest summaries to "
            f"journal/ before adding to HANDOFF."
        )

    # 3) `## 待办` section must point at the todos file
    todos_found = False
    in_todo = False
    for line in lines:
        if line.strip().startswith("## 待办"):
            in_todo = True
            continue
        if in_todo and SECTION_RE.match(line.strip()):
            break
        if in_todo and TODOS_REF_RE.search(line):
            todos_found = True
    if not todos_found:
        errors.append(
            f"{handoff}: `## 待办` section must reference the todos file "
            f"({todos_path.name}).")

    # 4) todos file: exists + item counts/compression limits
    if todos_path.is_file():
        todo_errors = _scan_todos(todos_path, max_open, max_total,
                                  max_open_chars, max_closed_chars)
        errors.extend(todo_errors)
    elif todos_found:
        errors.append(f"{handoff}: referenced todos file missing: {todos_path}")
    else:
        errors.append(f"{handoff}: todos file missing: {todos_path} "
                      f"(create {todos_path.name} for the action area).")

    # 5) journal pointers: every `journal/…​.md` mention must resolve for
    # past months; the current month may legitimately have no volume yet.
    # Validating ALL matches (not just the first) removes the fragility where
    # an early prose mention silently retargets the check.
    refs = JOURNAL_RE.findall(text)
    if not refs:
        errors.append(
            f"{handoff}: missing archive pointer to `journal/<YYYY-MM>.md` "
            f"(add a '## 会话叙事档案' note so old narrative has a home).")
    else:
        for ref in refs:
            vol = ref.split("/")[-1]
            jpath = handoff.parent / "journal" / vol
            if jpath.is_file():
                continue
            m = re.fullmatch(r"(\d{4})-(\d{2})\.md", vol)
            is_current = bool(m) and vol == f"{CURRENT_MONTH}.md"
            if not is_current:
                errors.append(f"{handoff}: referenced journal volume '{vol}' "
                              f"not found at {jpath}")
    return window_count, errors


def _scan_todos(path: Path, max_open: int, max_total: int, max_open_chars: int,
                max_closed_chars: int) -> list[str]:
    errors: list[str] = []
    lines = path.read_text(encoding="utf-8").splitlines()
    open_count = closed_count = 0
    for i, line in enumerate(lines, 1):
        m = TODO_RE.match(line)
        if not m:
            continue
        state, body = m.group(1), line[m.end():]
        if state == " ":
            open_count += 1
            if len(line) > max_open_chars:
                errors.append(
                    f"{path}: line {i}: open todo exceeds {max_open_chars} "
                    f"chars ({len(line)}). Keep action + trigger + pointer.")
        else:
            closed_count += 1
            if len(line) > max_closed_chars:
                errors.append(
                    f"{path}: line {i}: closed todo exceeds {max_closed_chars} "
                    f"chars ({len(line)}). Compress to a one-line pointer — "
                    f"detail lives in journal/ADR.")
    total = open_count + closed_count
    if open_count > max_open:
        errors.append(f"{path}: {open_count} open items exceed max {max_open} "
                      f"— finish or prune before adding more.")
    if total > max_total:
        errors.append(f"{path}: {total} items exceed max {max_total}.")
    return errors


def _self_test() -> int:
    """Offline fixture self-check built from synthetic HANDOFF trees."""
    import tempfile

    # Deterministic volume names, derived from the single module-level UTC
    # clock (no second read -> no cross-midnight flake): a past month that
    # exists / a past month that does not exist / the current month (allowed
    # to be missing).
    prev_month = (_NOW.replace(day=1) - datetime.timedelta(days=1)).strftime("%Y-%m")
    vol_exists = f"{prev_month}.md"
    vol_missing = (_NOW.replace(day=1) - datetime.timedelta(days=41)).strftime("%Y-%m") + ".md"
    vol_current = f"{CURRENT_MONTH}.md"

    def build(tree: Path, entries: list[str], journal: bool, sections: bool,
              journal_file: bool, todos: bool, todo_lines: list[str],
              todos_ref: bool, vol: str = vol_exists) -> None:
        (tree / "journal").mkdir(parents=True, exist_ok=True)
        lines = ["# HANDOFF — test\n", "\n", "## 交接更新记录\n", "\n"]
        if journal:
            lines.append(
                f"> 滚动窗口有界；旧叙事归档 `journal/{vol}`。\n")
        lines.append("\n")
        for e in entries:
            lines.append(e + "\n")
        if sections:
            lines.append("\n## 背景\n\n正文。\n")
            lines.append("\n## 位置\n\n正文。\n")
            lines.append("\n## 当前状态\n\n正文。\n")
            lines.append("\n## 待办\n\n")
            if todos_ref:
                lines.append(f"> 行动区在 [HANDOFF-todos.md](HANDOFF-todos.md)。\n")
            lines.append("\n## 开始步骤\n\n正文。\n")
        (tree / "HANDOFF.md").write_text("".join(lines), encoding="utf-8")
        if journal_file:
            (tree / "journal" / vol).write_text(
                "# journal\n", encoding="utf-8")
        if todos:
            (tree / "HANDOFF-todos.md").write_text(
                "".join(t + "\n" for t in todo_lines), encoding="utf-8")

    short = "- 2026-08-31｜**会话 t**：一句结论。"
    long_entry = "- 2026-08-31｜**会话 t**：" + "长" * 300

    cases = []  # (entries, journal_ref, sections, jfile, todos, todo_lines, ref, expected, desc)
    cases.append(([short], True, True, True, True,
                  ["- [ ] 待办甲，行动+触发+指针。", "- [x] 已办乙，一行指针。"],
                  True, 0, "conforming (summary window + todos file) -> pass"))
    cases.append(([short] * 30, True, True, True, True,
                  ["- [ ] 待办甲。"], True, 1, "30 entries exceeds max window -> fail"))
    cases.append(([long_entry], True, True, True, True,
                  ["- [ ] 待办甲。"], True, 1, "over-long window entry -> fail"))
    cases.append(([short], True, True, True, False, [], False, 1,
                  "todos file missing -> fail"))
    cases.append(([short], True, True, True, True,
                  ["- [ ] " + "长" * 500], True, 1, "over-long open todo -> fail"))
    cases.append(([short], True, True, True, True,
                  ["- [ ] 待办甲。"], False, 1, "todos file not referenced from 待办 -> fail"))
    cases.append(([short], False, True, True, True,
                  ["- [ ] 待办甲。"], True, 1, "missing journal pointer -> fail"))
    cases.append(([short], True, False, True, True,
                  ["- [ ] 待办甲。"], True, 1, "missing body sections -> fail"))
    cases.append(([short], True, True, False, True,
                  ["- [ ] 待办甲。"], True, 1, "referenced past-month volume missing -> fail"))
    cases.append(([short], True, True, False, True,
                  ["- [ ] 待办甲。"], True, 0, "current-month volume missing -> pass (fresh month)",
                  vol_current))
    cases.append(([short], True, True, True, True,
                  [f"- [ ] 待办 {n}。" for n in range(25)], True, 1,
                  "too many open todos -> fail"))
    cases.append(([short], True, True, True, True,
                  ["- [x] 已办乙。"], True, 0, "no open items, closed ok -> pass"))

    failed = 0
    with tempfile.TemporaryDirectory() as td:
        for i, case in enumerate(cases):
            entries, jref, secs, jfile, todos, tlines, ref, expected, desc = case[:9]
            vol = case[9] if len(case) > 9 else vol_exists
            tree = Path(td) / f"tree-{i}"
            tree.mkdir(parents=True, exist_ok=True)
            build(tree, entries, jref, secs, jfile, todos, tlines, ref, vol)
            count, errors = _scan(tree / "HANDOFF.md", tree / "HANDOFF-todos.md",
                                  DEFAULT_MAX_WINDOW, DEFAULT_MAX_ENTRY,
                                  DEFAULT_MAX_OPEN, DEFAULT_MAX_TOTAL,
                                  DEFAULT_MAX_OPEN_CHARS, DEFAULT_MAX_CLOSED_CHARS)
            actual = 1 if errors else 0
            if actual == expected:
                print(f"  ok: {desc}")
            else:
                print(f"  ✗ {desc}: expected exit {expected}, got {actual} "
                      f"({' ; '.join(errors)})")
                failed = 1
    if failed == 0:
        print("== verify-handoff-structure self-test passed ==")
    else:
        print("== verify-handoff-structure self-test failed ==", file=sys.stderr)
    return failed


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] == "--self-test":
        return _self_test()

    parser = argparse.ArgumentParser(description="Verify HANDOFF.md structure")
    parser.add_argument("--handoff", default=DEFAULT_HANDOFF)
    parser.add_argument("--todos", default=DEFAULT_TODOS)
    parser.add_argument("--max-window", type=int, default=DEFAULT_MAX_WINDOW)
    parser.add_argument("--max-entry", type=int, default=DEFAULT_MAX_ENTRY)
    parser.add_argument("--max-open", type=int, default=DEFAULT_MAX_OPEN)
    parser.add_argument("--max-total", type=int, default=DEFAULT_MAX_TOTAL)
    parser.add_argument("--max-open-chars", type=int, default=DEFAULT_MAX_OPEN_CHARS)
    parser.add_argument("--max-closed-chars", type=int, default=DEFAULT_MAX_CLOSED_CHARS)
    args = parser.parse_args()

    handoff = Path(args.handoff)
    todos = handoff.parent / args.todos
    count, errors = _scan(handoff, todos, args.max_window, args.max_entry,
                          args.max_open, args.max_total, args.max_open_chars,
                          args.max_closed_chars)
    print(f"HANDOFF 交接更新记录 entries: {count}")
    if errors:
        for e in errors:
            print(f"FAIL: {e}")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
