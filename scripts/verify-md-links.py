#!/usr/bin/env python3
"""Verify relative Markdown links: file targets exist and #fragment anchors resolve.

Checks, for every .md file under the given root (default: current directory):
  - `](relative/path.md)`  -> target file must exist
  - `](relative/path.md#slug)` -> target exists AND slug must match a heading
    slug (GitHub-style: lowercase, spaces->hyphens, strip punctuation) or an
    explicit <a id="slug"> anchor in that file
  - `](https://…)` / `](mailto:…)` / `](<…>)` -> skipped (external)
  - bare filenames resolve against the containing file's directory;
    leading-`/` targets resolve against the scan root

skills/ directories ARE checked (unlike the desktop upstream): Noogenesis
adopts "引入即适配" — a skill whose upstream path references are not remapped
must not be introduced at all (frecency's 11 dead-link skills lesson).

Usage: python3 verify-md-links.py [root_dir]
Exit code 0 = pass, 1 = violations.

Provenance: distilled from dotnet-deepseek-harness-desktop/scripts/verify-md-links.py
(MIT, 2026-09-05). Diff vs source: skills/ exclusion removed (checked by
default); .plan/ exclusion removed (Noogenesis keeps journal in git under
journal/); third-party/build dir skip list kept; link/anchor primitives
consolidated into scripts/mdref.py (per ADR
2026-09-05-consolidate-r1-simplification-candidates).
"""

import argparse
import sys
from pathlib import Path

from mdref import check_relative_links


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("root", nargs="?", default=".")
    args = ap.parse_args()
    root = Path(args.root)
    errors: list[str] = []
    checked = 0
    for md in sorted(root.rglob("*.md")):
        # 第三方/生成物目录：缓存、依赖、构建产物（其内 README 常带外部相对链接）
        if any(seg in md.parts for seg in (".cache", "bin", "obj", "node_modules")):
            continue
        # 归档笔记：冻结历史，其外链按纪律不校验（见 .agents/notes/README.md archived 规则）；
        # 限定 .agents/notes/ 下的 archived，避免未来误伤无关目录
        if ".agents" in md.parts and "notes" in md.parts and "archived" in md.parts:
            continue
        text = md.read_text(encoding="utf-8")
        checked += check_relative_links(text, md, root, errors)

    print(f"Checked {checked} link targets")
    if errors:
        for e in errors:
            print(f"FAIL: {e}")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
