#!/usr/bin/env python3
"""Verify review briefs exist and are well-formed (review.md §3 contract).

Every review lane (R1/R2/R3) must be launched from a brief written by the
main session BEFORE the review agent starts — the brief bounds the review
task (scope + directed checks + explicit out-of-scope) so the lane can
finish in one complete run. "Interruption = unaudited": there is no
"stop at limit and return partial findings" exit; a bounded brief is how a
lane completes without needing an interrupt. This script mechanically
checks that discipline.

A brief is a fixed-structure Markdown file at `<repo>/.review-briefs/R<N>-<topic>.md`
(local work doc, gitignored). Structure mirrors docs/method/review.md §3:

    # R<N> 评审简报（<lane name>）

    ## Scope
    - base: <git ref>  head: <git ref>
    - 需深审面（精读，逐行判读）：<files this lane reads line-by-line>
    - 陪跑文件（机器门禁已盖，扫读确认即可）：<other changed files; 无 when none>
    - 门禁自证（主会话实跑，exit 随行）：<script>:<exit>，…
    - diff 面相邻件（一层以内，按需引用）：<list or 无>

    ## Directed checks（≤5 条）
    - [ ] <check: what to verify + where the evidence is>

    ## Explicitly out of scope
    - <what this lane must NOT do>

    ## Report contract
    - 返回 Blocker[]/Suggestion[]，每条 `文件:行 + 一句证据`；空即"无发现"

Rules enforced:
  - lanes R1/R2/R3 each require exactly one brief under .review-briefs/
  - Scope carries `base:`/`head:`, a non-empty 需深审面 list ("无" rejected),
    and a 陪跑文件 line
  - 陪跑文件 (claims machine-gated) ⇒ a 门禁自证 line must exist with all-zero
    exit codes — the "已盖" claim must be backed by the main session's real
    runs (desktop 2026-09-04 exit-2 lesson); 「陪跑文件：无」needs no assertion
  - Directed checks: 1–5 `- [ ]` items
  - Explicitly out of scope: ≥1 bullet
  - Report contract: the fixed Blocker[]/Suggestion[] sentence present
  - brief files are NOT part of the git change set (gitignored); this gate
    is a local pre-launch check, not a CI gate

Lane derivation (single source of truth = the tier classification):
  default: lanes required by the tier of the diff range declared in the
  briefs' own Scope (base..head — fits the commit-then-review batch order);
  --lanes R1,R2,R3 overrides; conservative fallback = all three.

Consumption contract: imports verify-review-tier's _repo_changed_paths and
_classify via importlib (module has NO top-level side effects — its
__main__ guard keeps main() out of import). Editing either script is
FULL-tier by design (scripts/** trigger). Do not silently drift the two.

Usage:
    python3 scripts/verify-review-brief.py [--repo ROOT] [--lanes R1,R2,R3] [--enforce]
    python3 scripts/verify-review-brief.py --self-test
Exit code 0 = pass, 1 = violations.

Provenance: distilled from dotnet-deepseek-harness-desktop
scripts/verify-review-brief.py (MIT, 2026-09-05). Diff vs source: lane
derivation reads the briefs' own base..head range instead of the staged
set (Noogenesis commits before review); self-test uses assert-with-message
per ADR 2026-09-05-consolidate-r1-simplification-candidates Decision 2;
structure rules unchanged (they implement review.md §3 verbatim) per ADR
2026-09-05-review-mechanical-gate.
"""

import argparse
import importlib.util
import re
import subprocess
import sys
import tempfile
from pathlib import Path

BRIEFS_DIR = ".review-briefs"
LANES = ("R1", "R2", "R3")

# Title must be a level-1 heading naming exactly one lane (R1/R2/R3). The
# (?!\w) guard rejects over-matching names like "R2x 评审简报".
TITLE_RE = re.compile(r"#\s*(?P<lane>R[123])(?!\w)\s*评审简报")
SCOPE_HEADING = "## Scope"
CHECKS_HEADING = "## Directed checks"
OUTSCOPE_HEADING = "## Explicitly out of scope"
REPORT_HEADING = "## Report contract"
REPORT_SENTENCE = "Blocker[]/Suggestion[]"
CHECK_ITEM_RE = re.compile(r"^\s*-\s*\[ \]\s+.+")
BASE_RE = re.compile(r"base:\s*(\S+)")
HEAD_RE = re.compile(r"head:\s*(\S+)")
DEEP_RE = re.compile(r"需深审面[^\n]*?[:：]")
COMPANION_RE = re.compile(r"陪跑文件[^\n]*?[:：]")
# 门禁自证行：声明陪跑文件「机器门禁已盖」必须由主会话实跑的 exit 码背书。
# 形如「门禁自证：md-links:0，skill-format:0」。
SELFASSERT_RE = re.compile(r"门禁自证[^\n]*?[:：]")
# 自证单项 <name>:<exit>（容忍全角冒号）。exit 必须 0/1/2；扫描绑定在本行内，
# 简报正文其余部分的 `<token>:1`（文件:行引用）不会误报。
SELFASSERT_ITEM_RE = re.compile(r"([A-Za-z0-9._\-]+)[:：]([012])\b")


def _violations_for_lane(path: Path, lane: str) -> list[str]:
    """Return violation strings for one brief file (empty when well-formed)."""
    v: list[str] = []
    if not path.exists():
        return [f"{lane}: missing brief {BRIEFS_DIR}/R{lane[1]}-*.md (must write brief before launching review)"]

    text = path.read_text(encoding="utf-8")

    title_match = TITLE_RE.search(text)
    if not title_match:
        v.append(f"{lane}: {path.name} lacks '# R{lane[1]} 评审简报' title")
    elif title_match.group("lane") != lane:
        v.append(f"{lane}: {path.name} title lane '{title_match.group('lane')}' != {lane}")

    for heading in (SCOPE_HEADING, CHECKS_HEADING, OUTSCOPE_HEADING, REPORT_HEADING):
        if heading not in text:
            v.append(f"{lane}: {path.name} missing '{heading}' section")

    if BASE_RE.search(text) is None or HEAD_RE.search(text) is None:
        v.append(f"{lane}: {path.name} Scope must carry both 'base: <ref>' and 'head: <ref>'")
    if DEEP_RE.search(text) is None:
        v.append(f"{lane}: {path.name} Scope must list 需深审面 (files this lane reads line-by-line; empty = unbounded)")
    elif not _list_content_is_nonempty(text, DEEP_RE):
        # "需深审面：无" passes the key+colon regex but means no line-by-line
        # reading target — an unbounded-but-claiming-bounded brief must not slip.
        v.append(f"{lane}: {path.name} 需深审面 must name ≥1 file (write 无 only under 陪跑文件)")
    if COMPANION_RE.search(text) is None:
        v.append(f"{lane}: {path.name} Scope must list 陪跑文件 (machine-gated files scanned only; write 无 when none)")

    # 门禁自证耦合：声明「陪跑文件机器门禁已盖」必须携带主会话实跑且全 0 的 exit 码。
    companion_declares_gated = COMPANION_RE.search(text) is not None and not _companion_is_none(text)
    if companion_declares_gated:
        if SELFASSERT_RE.search(text) is None:
            v.append(f"{lane}: {path.name} 陪跑文件声明机器门禁已盖，但缺「门禁自证」行——主会话须实跑门禁并随行 exit 码（如「门禁自证：md-links:0，skill-format:0」）")
        else:
            bad = [m.group(1) for m in SELFASSERT_ITEM_RE.finditer(_selfassert_text(text)) if m.group(2) != "0"]
            if bad:
                v.append(f"{lane}: {path.name} 门禁自证含非 0 exit（{', '.join(bad)}）——红门禁文件不得列陪跑（声言已盖却实际红 = 未证）")

    checks_zone = _zone(text, CHECKS_HEADING, OUTSCOPE_HEADING)
    checks = [ln for ln in checks_zone.splitlines() if CHECK_ITEM_RE.match(ln)]
    if len(checks) == 0:
        v.append(f"{lane}: {path.name} Directed checks must have 1–5 '- [ ]' items (empty = unbounded review)")
    elif len(checks) > 5:
        v.append(f"{lane}: {path.name} Directed checks has {len(checks)} items (>5 — too broad to focus)")

    outscope_zone = _zone(text, OUTSCOPE_HEADING, REPORT_HEADING)
    outscope_lines = [ln for ln in outscope_zone.splitlines() if ln.strip().startswith(("-", "*"))]
    if len(outscope_lines) == 0:
        v.append(f"{lane}: {path.name} Explicitly out of scope must list ≥1 item (none = unbounded task)")

    if REPORT_SENTENCE not in text.replace("`", ""):
        v.append(f"{lane}: {path.name} Report contract must carry '{REPORT_SENTENCE}'")

    return v


def _companion_is_none(text: str) -> bool:
    """True when the 陪跑文件 line declares 无 (no companion files claimed)."""
    m = COMPANION_RE.search(text)
    if m is None:
        return True
    line_end = text.find("\n", m.end())
    inline = text[m.end(): line_end if line_end >= 0 else len(text)].strip()
    return inline == "无" or inline.startswith("无。")


def _selfassert_text(text: str) -> str:
    """Extract the 门禁自证 line's content (after the key's colon); empty when absent.

    Non-zero-exit scanning is bound to THIS line only — the brief body may
    carry arbitrary `<token>:1` / `:2` fragments (file:line refs) that a
    whole-text finditer would misreport as a failing gate."""
    m = SELFASSERT_RE.search(text)
    if m is None:
        return ""
    line_end = text.find("\n", m.end())
    return text[m.end(): line_end if line_end >= 0 else len(text)]


def _zone(text: str, start_heading: str, end_heading: str) -> str:
    """Return the text between start_heading and the next end_heading (exclusive)."""
    start = text.find(start_heading)
    if start < 0:
        return ""
    end = text.find(end_heading, start + len(start_heading))
    return text[start + len(start_heading): end if end >= 0 else len(text)]


def _list_content_is_nonempty(text: str, key_re: re.Pattern[str]) -> bool:
    """True when the keyed list carries at least one named item.

    Content may sit on the key line ("需深审面：a.md") or as indented sub-lines
    under a bare key line. Rejects "需深审面：无", bare keys, and empty content."""
    m = key_re.search(text)
    if m is None:
        return False
    line_end = text.find("\n", m.end())
    inline = text[m.end(): line_end if line_end >= 0 else len(text)].strip()
    if inline != "" and inline != "无" and not inline.startswith("无。"):
        return True
    rest = text[line_end if line_end >= 0 else len(text):]
    for ln in rest.splitlines():
        if ln.strip() == "":
            continue
        if ln.startswith(("- ", "* ", "## ")) or not ln[0].isspace():
            break  # next top-level item / heading — list ended
        stripped = ln.strip().lstrip("-* ").strip()
        if stripped != "" and stripped != "无" and not stripped.startswith("无。"):
            return True
    return False


def _brief_paths(repo: Path) -> tuple[dict[str, Path], list[str]]:
    """Map lane -> brief path, plus duplicate-lane names (one brief per lane)."""
    briefs_dir = repo / BRIEFS_DIR
    found: dict[str, Path] = {}
    duplicates: list[str] = []
    if briefs_dir.is_dir():
        for f in sorted(briefs_dir.glob("R[123]-*.md")):
            lane = f.name[0:2]
            if lane in found:
                duplicates.append(f"{lane}: multiple briefs for one lane: {found[lane].name} and {f.name}")
            else:
                found[lane] = f
    return {lane: found.get(lane) for lane in LANES}, duplicates


def _load_tier_module():
    """Import the sibling verify-review-tier module (no top-level side effects)."""
    script = Path(__file__).with_name("verify-review-tier.py")
    spec = importlib.util.spec_from_file_location("verify_review_tier", script)
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _lanes_from_brief_range(repo: Path, briefs: dict[str, Path]) -> list[str]:
    """Lanes required by the tier of the diff range the briefs themselves declare.

    Reads base/head from the first brief carrying both refs, classifies
    base..head with the tier module (fits commit-then-review batch order).
    Falls back to all three lanes when briefs/refs/module are unavailable."""
    base = head = None
    for p in briefs.values():
        if p is None or not p.exists():
            continue
        text = p.read_text(encoding="utf-8")
        mb, mh = BASE_RE.search(text), HEAD_RE.search(text)
        if mb and mh:
            base, head = mb.group(1), mh.group(1)
            break
    if base is None or head is None:
        return list(LANES)
    try:
        tier = _load_tier_module()
        if tier is None:
            return list(LANES)
        r = subprocess.run(["git", "diff", "--name-only", f"{base}..{head}"],
                           cwd=repo, capture_output=True, text=True, check=False)
        if r.returncode != 0:
            return list(LANES)
        paths = [x for x in r.stdout.splitlines() if x.strip()]
        full, _ = tier._classify(paths, repo)
        return list(LANES) if full else ["R2"]
    except Exception:
        return list(LANES)  # conservative: require all three


def check_repo(repo: Path, lanes: list[str] | None = None) -> list[str]:
    """Return all violations across required lanes (empty when well-formed).

    lanes=None => derive from the tier of the range declared in the briefs'
    own Scope (FULL needs R1/R2/R3, LIGHT needs R2). With no brief files at
    all there is no review in flight — vacuous pass (keeps CI, which never
    sees the gitignored briefs dir, green and quiet).
    """
    paths, duplicates = _brief_paths(repo)
    if lanes is None:
        if all(p is None for p in paths.values()):
            return duplicates
        lanes = _lanes_from_brief_range(repo, paths)
    out: list[str] = list(duplicates)
    for lane in lanes:
        p = paths[lane]
        out.extend(_violations_for_lane(p, lane) if p else [f"{lane}: missing brief under {BRIEFS_DIR}/"])
    return out


def self_test() -> int:
    """Offline fixtures; every case exercises check_repo/_violations_for_lane."""
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)

        def w(name: str, lane: str, scope_body: str, checks: str = "- [ ] c\n",
              outscope: str = "- d\n") -> Path:
            p = root / BRIEFS_DIR / name
            p.write_text(
                f"# {lane} 评审简报（lane）\n\n## Scope\n- base: a  head: b\n{scope_body}\n"
                f"- 门禁自证：md-links:0，skill-format:0\n\n"
                f"## Directed checks\n{checks}\n## Explicitly out of scope\n{outscope}\n"
                "## Report contract\n- 返回 `Blocker[]/Suggestion[]`；空即无发现\n",
                encoding="utf-8")
            return p

        (root / BRIEFS_DIR).mkdir()
        w("R1-a.md", "R1", "- 需深审面：scripts/verify-x.py\n- 陪跑文件：docs/method/review.md\n- diff 面相邻件：无")
        w("R2-a.md", "R2", "- 需深审面：scripts/verify-x.py\n- 陪跑文件：无")
        w("R3-a.md", "R3", "- 需深审面：.agents/notes/x.md\n- 陪跑文件：无")
        assert check_repo(root, lanes=list(LANES)) == [], \
            "fixture 1 (well-formed R1/R2/R3) should pass"

        # missing R1 brief -> violation
        root2 = Path(td) / "f2"
        (root2 / BRIEFS_DIR).mkdir(parents=True)
        (root2 / BRIEFS_DIR / "R2-a.md").write_text(
            "# R2 评审简报（code-review）\n\n## Scope\n- base: a  head: b\n- 需深审面：x\n- 陪跑文件：无\n\n"
            "## Directed checks\n- [ ] c\n\n## Explicitly out of scope\n- d\n\n## Report contract\n"
            "- 返回 `Blocker[]/Suggestion[]`；空即无发现\n", encoding="utf-8")
        assert any("R1: missing brief" in s for s in check_repo(root2, lanes=list(LANES))), \
            "fixture 2 (missing R1) should flag R1"

        # unbounded (no out-of-scope) R2 -> violation
        root3 = Path(td) / "f3"
        (root3 / BRIEFS_DIR).mkdir(parents=True)
        (root3 / BRIEFS_DIR / "R2-a.md").write_text(
            "# R2 评审简报（code-review）\n\n## Scope\n- base: a  head: b\n- 需深审面：x\n- 陪跑文件：无\n\n"
            "## Directed checks\n- [ ] c\n\n"
            "## Report contract\n- 返回 `Blocker[]/Suggestion[]`；空即无发现\n", encoding="utf-8")
        assert any("R2" in s and "out of scope" in s for s in check_repo(root3, lanes=list(LANES))), \
            "fixture 3 (no out-of-scope) should flag R2"

        # >5 directed checks -> violation
        root4 = Path(td) / "f4"
        (root4 / BRIEFS_DIR).mkdir(parents=True)
        (root4 / BRIEFS_DIR / "R1-a.md").write_text(
            "# R1 评审简报（simplifications）\n\n## Scope\n- base: a  head: b\n- 需深审面：x\n- 陪跑文件：无\n\n"
            "## Directed checks\n" + "".join(f"- [ ] c{i}\n" for i in range(6)) +
            "\n## Explicitly out of scope\n- d\n\n## Report contract\n"
            "- 返回 `Blocker[]/Suggestion[]`；空即无发现\n", encoding="utf-8")
        assert any("R1" in s and ">5" in s for s in check_repo(root4, lanes=list(LANES))), \
            "fixture 4 (>5 checks) should flag R1"

        # missing 需深审面 -> violation
        root5 = Path(td) / "f5"
        (root5 / BRIEFS_DIR).mkdir(parents=True)
        (root5 / BRIEFS_DIR / "R2-a.md").write_text(
            "# R2 评审简报（code-review）\n\n## Scope\n- base: a  head: b\n- 陪跑文件：x\n- 门禁自证：md-links:0\n\n"
            "## Directed checks\n- [ ] c\n\n## Explicitly out of scope\n- d\n\n## Report contract\n"
            "- 返回 `Blocker[]/Suggestion[]`；空即无发现\n", encoding="utf-8")
        assert any("R2" in s and "需深审面" in s for s in check_repo(root5, lanes=list(LANES))), \
            "fixture 5 (missing 需深审面) should flag R2"

        # "需深审面：无" -> violation (non-empty list enforced)
        root6 = Path(td) / "f6"
        (root6 / BRIEFS_DIR).mkdir(parents=True)
        (root6 / BRIEFS_DIR / "R2-a.md").write_text(
            "# R2 评审简报（code-review）\n\n## Scope\n- base: a  head: b\n- 需深审面：无\n- 陪跑文件：无\n\n"
            "## Directed checks\n- [ ] c\n\n## Explicitly out of scope\n- d\n\n## Report contract\n"
            "- 返回 `Blocker[]/Suggestion[]`；空即无发现\n", encoding="utf-8")
        assert any("R2" in s and "需深审面 must name ≥1 file" in s for s in check_repo(root6, lanes=list(LANES))), \
            "fixture 6 (需深审面：无) should flag R2"

        # 陪跑声明已盖但缺门禁自证 -> violation (gate-self-assertion)
        root7 = Path(td) / "f7"
        (root7 / BRIEFS_DIR).mkdir(parents=True)
        (root7 / BRIEFS_DIR / "R2-a.md").write_text(
            "# R2 评审简报（code-review）\n\n## Scope\n- base: a  head: b\n- 需深审面：x\n- 陪跑文件：scripts/verify-x.py（机器门禁已盖）\n\n"
            "## Directed checks\n- [ ] c\n\n## Explicitly out of scope\n- d\n\n## Report contract\n"
            "- 返回 `Blocker[]/Suggestion[]`；空即无发现\n", encoding="utf-8")
        assert any("R2" in s and "门禁自证" in s for s in check_repo(root7, lanes=list(LANES))), \
            "fixture 7 (companion without gate self-assertion) should flag R2"

        # 门禁自证含非 0 exit -> violation (red gate may not ride companion)
        root8 = Path(td) / "f8"
        (root8 / BRIEFS_DIR).mkdir(parents=True)
        (root8 / BRIEFS_DIR / "R2-a.md").write_text(
            "# R2 评审简报（code-review）\n\n## Scope\n- base: a  head: b\n- 需深审面：x\n- 陪跑文件：scripts/verify-x.py（机器门禁已盖）\n"
            "- 门禁自证：md-links:2，skill-format:0\n\n"
            "## Directed checks\n- [ ] c\n\n## Explicitly out of scope\n- d\n\n## Report contract\n"
            "- 返回 `Blocker[]/Suggestion[]`；空即无发现\n", encoding="utf-8")
        assert any("R2" in s and "非 0 exit" in s for s in check_repo(root8, lanes=list(LANES))), \
            "fixture 8 (self-assertion with non-zero exit) should flag R2"

        # duplicate briefs for one lane -> reported
        root9 = Path(td) / "f9"
        (root9 / BRIEFS_DIR).mkdir(parents=True)
        for name in ("R2-a.md", "R2-b.md"):
            (root9 / BRIEFS_DIR / name).write_text(
                "# R2 评审简报（code-review）\n\n## Scope\n- base: a  head: b\n- 需深审面：x\n- 陪跑文件：无\n\n"
                "## Directed checks\n- [ ] c\n\n## Explicitly out of scope\n- d\n\n## Report contract\n"
                "- 返回 `Blocker[]/Suggestion[]`；空即无发现\n", encoding="utf-8")
        assert any("multiple briefs" in s for s in check_repo(root9, lanes=["R2"])), \
            "fixture 9 (duplicate lane briefs) should be reported"

        # no briefs in flight -> vacuous pass (CI shape: briefs dir is gitignored)
        root10 = Path(td) / "f10"
        (root10 / BRIEFS_DIR).mkdir(parents=True)
        assert check_repo(root10) == [], \
            "fixture 10 (no briefs in flight) should pass vacuously"

    print("verify-review-brief --self-test OK (10 fixtures: structure/self-assertion/vacuous)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Review brief existence + structure gate")
    parser.add_argument("--repo", default=".", help="repo root (default cwd)")
    parser.add_argument("--lanes", default=None, metavar="R1,R2,R3",
                        help="required lanes override (default: derive from briefs' base..head tier)")
    parser.add_argument("--enforce", action="store_true", help="exit 1 on any violation")
    parser.add_argument("--self-test", action="store_true", help="run offline fixtures")
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    lanes = [x.strip().upper() for x in args.lanes.split(",")] if args.lanes else None
    bad = [x for x in (lanes or []) if x not in LANES]
    if bad:
        parser.error(f"unknown lanes: {', '.join(bad)} (allowed: R1,R2,R3)")

    violations = check_repo(Path(args.repo).resolve(), lanes=lanes)
    for lane in LANES:
        for s in (v for v in violations if v.startswith(lane + ":")):
            print(s)
    if violations:
        print(f"review-brief: {len(violations)} violation(s)")
        return 1 if args.enforce else 0
    print("review-brief: OK (required briefs present and well-formed)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
