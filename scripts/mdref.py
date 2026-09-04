"""Shared Markdown link primitives for the verify-* gates.

Single source (ADR 2026-09-05-consolidate-r1-simplification-candidates)
for the link/anchor definitions and the relative-link resolution loop of
verify-md-links.py and verify-skill-format.py.

Consumers run as `python3 scripts/verify-*.py` from the repo root, so
`sys.path[0]` is scripts/ and a plain `import mdref` resolves. Covered by
the consumers' self-tests (verify-skill-format --self-test exercises the
dead-link path through check_skill).

Provenance: distilled from dotnet-deepseek-harness-desktop
scripts/verify-md-links.py + verify-skill-format.py (MIT, 2026-09-05);
the shared pieces live here unchanged per the ADR above.
"""

import re
from pathlib import Path

LINK_RE = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
ANCHOR_RE = re.compile(r'<a\s+id="([^"]+)"')


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^\w\u4e00-\u9fff \-]", "", text)
    text = re.sub(r"\s+", "-", text)
    return text


def heading_slugs(path: Path) -> set[str]:
    slugs: set[str] = set()
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return slugs
    for line in lines:
        m = HEADING_RE.match(line)
        if m:
            slugs.add(slugify(m.group(2)))
        m = ANCHOR_RE.search(line)
        if m:
            slugs.add(m.group(1))
    return slugs


def check_relative_links(
    text: str, path: Path, root: Path, errors: list[str]
) -> int:
    """Resolve relative Markdown links in `text` and verify their anchors.

    `path` is the file being checked: its string form prefixes error
    messages and its parent directory resolves relative targets. `root`
    resolves repo-root-absolute targets ("/..."). Appends "missing target"
    / "dead anchor" entries to `errors` and returns the number of targets
    whose file exists. External (http(s)/mailto) and same-page ("#...")
    targets are skipped.
    """
    checked = 0
    for target in LINK_RE.findall(text):
        target = target.strip()
        if target.startswith(("http://", "https://", "mailto:", "#", "<")):
            continue
        if "://" in target:
            continue
        if target.startswith("/"):  # repo-root absolute: resolve against root
            resolved = (root / target.lstrip("/")).resolve()
        else:
            resolved = (path.parent / target.split("#")[0]).resolve()
        if not resolved.is_file():
            errors.append(f"{path}: missing target '{target}'")
            continue
        checked += 1
        if "#" in target:
            frag = target.split("#", 1)[1]
            if frag and frag not in heading_slugs(resolved):
                errors.append(f"{path}: dead anchor '#{frag}' in '{target}'")
    return checked
