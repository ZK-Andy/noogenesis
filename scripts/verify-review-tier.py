#!/usr/bin/env python3
"""Verify that a change's review tier is honored (tier escape-proofing).

Mechanizes the path-mechanizable subset of the review-tier criteria in
docs/method/review.md §1 (semantic criteria — async/并发/跨边界契约/用户显式
批量审核 — stay human-judged there). Single source of truth for the FULL
path triggers; the brief gate (verify-review-brief.py) imports this
classification for lane derivation.

A diff touching any FULL-tier path requires review evidence travelling WITH
the change before it may be pushed. Evidence = an implemented ADR under
.agents/notes that is part of THIS change set (same base..HEAD range /
staged set) whose header carries a valid `Review:` line:

    Review: FULL/<yyyy-mm-dd>/R1=ok R2=ok R3=ok

Proposed ADRs cannot self-certify; R values are strict (=ok only).

Diff scope (caller picks the mode matching the git moment):
  --staged            index vs HEAD          -> pre-commit (report-only)
  --since <base-ref>  <base>..HEAD commits   -> pre-push (--enforce)
  (default)           working tree           -> ad-hoc local check

Default is report-only (exit 0). `--enforce` exits 1 when a FULL-tier diff
lacks review evidence.

Consumption contract: verify-review-brief.py imports _repo_changed_paths /
_classify / FULL_TRIGGERS. That import is only safe because this module has
NO top-level side effects beyond constant/regex definition (the
`if __name__ == "__main__"` guard keeps main() out of import). Keep it that
way: any change here is itself FULL-tier (scripts/** trigger) by design.

Usage:
    python3 scripts/verify-review-tier.py [--repo ROOT] [--staged|--since BASE] [--enforce]
    python3 scripts/verify-review-tier.py --self-test
Exit code 0 = pass, 1 = violations.

Provenance: distilled from dotnet-deepseek-harness-desktop
scripts/verify-review-tier.py (MIT, 2026-09-05). Diff vs source: FULL
trigger set rewritten for the Noogenesis review face (scripts/**
incl. shared gate helpers, .agents/workflows flow cards, AGENTS.md at any
depth; no .NET compose-root / ArchitectureTests predicates) per ADR
2026-09-05-review-mechanical-gate; argparse --self-test dispatch and
assert-with-message fixtures per ADR
2026-09-05-consolidate-r1-simplification-candidates Decision 2.
"""

import argparse
import datetime as _dt
import re
import subprocess
import sys
import tempfile
from pathlib import Path

NOTES_DIR = ".agents/notes"
# FULL/<date>/R1=ok R2=ok R3=ok — values strictly checked (a fail/abort marks nothing).
REVIEW_LINE_RE = re.compile(
    r"^Review:\s*FULL\s*/\s*(?P<date>\d{4}-\d{2}-\d{2})\s*/\s*"
    r"R1=ok\s+R2=ok\s+R3=ok$")

# FULL-tier path triggers (single source of truth; review.md §1 points here).
# Predicates take (path-string, pathlib.Path) and return True when the path
# forces the FULL tier.
FULL_TRIGGERS = (
    ("gate-criteria", lambda rel, p: "scripts" in p.parts),
    ("gate-criteria", lambda rel, p: ".githooks" in p.parts),
    ("behavior-surface", lambda rel, p: ".github" in p.parts and "workflows" in p.parts),
    ("behavior-surface", lambda rel, p: "templates" in p.parts),
    ("behavior-surface", lambda rel, p: "docs" in p.parts and "method" in p.parts),
    ("behavior-surface", lambda rel, p: p.name == "AGENTS.md"),
    ("behavior-surface", lambda rel, p: ".agents" in p.parts and "workflows" in p.parts),
)

# A proposed ADR whose body commits to a three-way review forces FULL —
# the ADR's own promised tier outranks the general default.
FULL_TIER_WORDS = ("三重审核",)


def _valid_date(s: str) -> bool:
    try:
        _dt.date.fromisoformat(s)
        return True
    except ValueError:
        return False


def _repo_changed_paths(repo: Path, staged_only: bool = False,
                        since: str | None = None) -> list[str]:
    """Changed paths for the selected git moment:
    --staged => index vs HEAD; --since => <base>..HEAD; default => working tree."""
    out: set[str] = set()
    if staged_only:
        cmds = (["git", "diff", "--cached", "--name-only"],)
    elif since:
        cmds = (["git", "diff", "--name-only", f"{since}..HEAD"],)
    else:
        cmds = (
            ["git", "diff", "--name-only", "HEAD"],
            ["git", "diff", "--cached", "--name-only"],
            ["git", "diff", "--name-only"],
        )
    for cmd in cmds:
        try:
            r = subprocess.run(cmd, cwd=repo, capture_output=True, text=True, check=False)
            if r.returncode == 0:
                out.update(x for x in r.stdout.splitlines() if x.strip())
        except Exception:
            pass
    if not staged_only and not since:
        # untracked (not in HEAD, not ignored)
        try:
            r = subprocess.run(["git", "ls-files", "--others", "--exclude-standard"],
                               cwd=repo, capture_output=True, text=True, check=False)
            if r.returncode == 0:
                out.update(x for x in r.stdout.splitlines() if x.strip())
        except Exception:
            pass
    return sorted(out)


def _adr_commits_full(rel: str, repo: Path) -> bool:
    """A changed proposed ADR whose body commits to a full review forces FULL."""
    if not rel.endswith(".md") or not rel.startswith(NOTES_DIR + "/"):
        return False
    path = repo / rel
    try:
        text = path.read_text(encoding="utf-8")
    except Exception:
        return False
    return "Status: proposed" in text and any(w in text for w in FULL_TIER_WORDS)


def _classify(paths: list[str], repo: Path) -> tuple[bool, list[str]]:
    """Return (is_full_tier, reasons). No executor discretion."""
    full = False
    reasons: list[str] = []
    for rel in paths:
        p = Path(rel)
        matched = False
        for label, pred in FULL_TRIGGERS:
            try:
                hit = pred(rel, p)
            except Exception:
                hit = False
            if hit:
                if label not in reasons:
                    reasons.append(f"{label}: {rel}")
                matched = True
                full = True
                break
        if not matched and _adr_commits_full(rel, repo):
            full = True
            reasons.append(f"adr-promises-full: {rel}")
    return full, reasons


def _evidence_in_change(paths: list[str], repo: Path) -> str | None:
    """Return a violation string when the change set lacks valid review evidence,
    else None. Evidence = an implemented ADR in THIS change set whose header
    carries Review: FULL/<date>/R1=ok R2=ok R3=ok with a real calendar date."""
    for rel in paths:
        if not rel.startswith(NOTES_DIR + "/") or not rel.endswith(".md"):
            continue
        adr = repo / rel
        if not adr.is_file():
            continue
        try:
            head = adr.read_text(encoding="utf-8", errors="replace").splitlines()[:15]
        except Exception:
            continue
        if "Status: implemented" not in "\n".join(head):
            continue  # proposed cannot self-certify
        for line in head:
            m = REVIEW_LINE_RE.match(line.strip())
            if m and _valid_date(m.group("date")):
                return None
    return ("no implemented ADR in the change set carries a valid "
            "Review: FULL/<date>/R1=ok R2=ok R3=ok line")


def _scan(repo: Path, staged_only: bool = False, since: str | None = None) -> list[str]:
    paths = _repo_changed_paths(repo, staged_only, since)
    if not paths:
        return []
    full, reasons = _classify(paths, repo)
    if not full:
        return []
    bad = _evidence_in_change(paths, repo)
    if bad is None:
        return []
    return [f"FULL-tier change lacks review evidence ({len(reasons)} trigger(s)): "
            + "; ".join(reasons) + f" | {bad}"]


def _new_repo(td: Path, name: str) -> Path:
    """Create an isolated fixture repo with a committed baseline."""
    repo = td / name
    (repo / NOTES_DIR / "implemented" / "process").mkdir(parents=True)
    (repo / "docs").mkdir(parents=True)
    (repo / "docs" / "note.md").write_text("base\n", encoding="utf-8")

    def git(*args: str) -> None:
        subprocess.run(["git", *args], cwd=repo, capture_output=True, check=False)

    git("init", "-q")
    git("config", "user.email", "t@t")
    git("config", "user.name", "t")
    git("add", "-A")
    git("commit", "-qm", "init")
    return repo


def _write(repo: Path, rel: str, text: str) -> None:
    p = repo / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    subprocess.run(["git", "add", rel], cwd=repo, capture_output=True, check=False)


def _commit_all(repo: Path, msg: str) -> None:
    subprocess.run(["git", "add", "-A"], cwd=repo, capture_output=True, check=False)
    subprocess.run(["git", "commit", "-qm", msg], cwd=repo, capture_output=True, check=False)


EVIDENCE = ("# Agent Note: x\n\nStatus: implemented\n\n"
            "Review: FULL/2026-09-05/R1=ok R2=ok R3=ok\n\n"
            "## Problem\n\nx\n\n## Decision\n\nx\n\n"
            "## Alternatives considered\n\n- a\n\n## Consequences\n\nx\n")


def _self_test() -> int:
    """Offline fixture repos; every case exercises _scan/_classify for real
    (no isolated assertions that never touch the main logic)."""
    failed = 0

    def ok(cond: bool, msg: str) -> None:
        nonlocal failed
        assert isinstance(cond, bool), f"fixture misused: {msg}"
        if cond:
            print(f"  ok: {msg}")
        else:
            print(f"  FAIL: {msg}", file=sys.stderr)
            failed = 1

    with tempfile.TemporaryDirectory() as td:
        # 1) LIGHT change (docs/cookbook.md) passes without any evidence
        r = _new_repo(Path(td), "f1")
        _write(r, "docs/cookbook.md", "changed (LIGHT)\n")
        ok(_scan(r) == [], "LIGHT change passes without evidence")

        # 2) FULL scripts/ change is blocked without evidence
        r = _new_repo(Path(td), "f2")
        _write(r, "scripts/verify-x.py", "# gate\n")
        rows = _scan(r)
        ok(any("FULL-tier change lacks review evidence" in x and "gate-criteria" in x
               for x in rows), "FULL scripts/ change blocked without evidence")

        # 3) FULL passes when the SAME change carries an implemented ADR with a
        #    valid Review line
        r = _new_repo(Path(td), "f3")
        _write(r, "scripts/verify-x.py", "# gate\n")
        _write(r, NOTES_DIR + "/implemented/process/2026-09-05-x.md", EVIDENCE)
        ok(_scan(r) == [], "FULL change passes when change carries Review evidence")

        # 4) flow-card change (.agents/workflows) classifies FULL
        r = _new_repo(Path(td), "f4")
        _write(r, ".agents/workflows/feature-flow.md", "# card\n")
        rows = _scan(r)
        ok(any("behavior-surface" in x for x in rows),
           "flow-card change classifies FULL")

        # 5) AGENTS.md at subtree depth classifies FULL
        r = _new_repo(Path(td), "f5")
        _write(r, ".agents/AGENTS.md", "# agents\n")
        ok(any("behavior-surface" in x for x in _scan(r)),
           "subtree AGENTS.md classifies FULL")

        # 6) proposed ADR promising full review classifies FULL, blocked w/o evidence
        r = _new_repo(Path(td), "f6")
        _write(r, NOTES_DIR + "/proposed/process/2026-09-05-y.md",
               "# Agent Note: y\n\nStatus: proposed\n\n落地须三重审核确认零行为变更\n")
        rows = _scan(r)
        ok(any("adr-promises-full" in x for x in rows),
           "proposed ADR promising 三重审核 classifies FULL")

        # 7) committed + clean tree: --since catches an outgoing FULL change
        r = _new_repo(Path(td), "f7")
        _commit_all(r, "base")
        _write(r, "scripts/verify-x.py", "# new gate\n")
        _commit_all(r, "full change w/o evidence")
        rows = _scan(r, since="HEAD~1")
        ok(any("FULL-tier change lacks review evidence" in x for x in rows),
           "--since catches an outgoing FULL change on a clean tree")

        # 8) committed + clean tree, WITH evidence ADR in the same range: passes
        r = _new_repo(Path(td), "f8")
        _commit_all(r, "base")
        _write(r, NOTES_DIR + "/implemented/process/2026-09-05-x.md", EVIDENCE)
        _write(r, "scripts/verify-x.py", "# new gate\n")
        _commit_all(r, "full change w/ evidence")
        rows = _scan(r, since="HEAD~1")
        ok(rows == [], "--since passes when the range carries Review evidence")

        # 9) review values strictly checked: R1=fail does NOT count as evidence
        r = _new_repo(Path(td), "f9")
        _write(r, "scripts/verify-x.py", "# gate\n")
        _write(r, NOTES_DIR + "/implemented/process/2026-09-05-x.md",
               EVIDENCE.replace("R1=ok", "R1=fail"))
        ok(any("FULL-tier change lacks review evidence" in x for x in _scan(r)),
           "R1=fail does not count as review evidence")

        # 10) proposed ADR self-adding a Review line does NOT clear
        r = _new_repo(Path(td), "f10")
        _write(r, "scripts/verify-x.py", "# gate\n")
        _write(r, NOTES_DIR + "/proposed/process/2026-09-05-y.md",
               "# Agent Note: y\n\nStatus: proposed\n\n"
               "Review: FULL/2026-09-05/R1=ok R2=ok R3=ok\n")
        ok(any("FULL-tier change lacks review evidence" in x for x in _scan(r)),
           "proposed ADR self-Review does not clear a FULL change")

    if failed == 0:
        print("verify-review-tier --self-test OK (10 fixtures: triggers/evidence/modes)")
    else:
        print("verify-review-tier --self-test FAIL", file=sys.stderr)
    return failed


def main() -> int:
    parser = argparse.ArgumentParser(description="Review tier classification + evidence gate")
    parser.add_argument("--repo", default=".", help="repo root (default cwd)")
    parser.add_argument("--staged", action="store_true",
                        help="scan only the index vs HEAD (pre-commit use)")
    parser.add_argument("--since", default=None, metavar="BASE",
                        help="scan committed range BASE..HEAD (pre-push use)")
    parser.add_argument("--enforce", action="store_true",
                        help="exit 1 when a FULL-tier diff lacks review evidence")
    parser.add_argument("--self-test", action="store_true", help="run offline fixtures")
    args = parser.parse_args()
    if args.self_test:
        return _self_test()
    if args.staged and args.since:
        parser.error("--staged and --since are mutually exclusive")

    repo = Path(args.repo).resolve()
    rows = _scan(repo, staged_only=args.staged, since=args.since)
    if rows:
        print(f"review-tier: {len(rows)} violation(s)")
        for r in rows:
            print(r)
        if args.enforce:
            return 1
    else:
        print("review-tier: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
