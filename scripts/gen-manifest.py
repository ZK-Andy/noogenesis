#!/usr/bin/env python3
"""Generate the shared gene-bank manifest (P2; ADR
.agents/notes/proposed/architecture/2026-09-06-p2-shared-consumer.md, D3).

Scans genes/<domain>/<id>.json (same layout the engine scans) and writes
manifest.json at the repo root: the retrieval index for the shared bank
(schema ADR S1 keeps P1 manifest-free; the manifest exists because the bank
is shared). Deterministic output — sorted by ref, no timestamps — so reruns
without content changes produce byte-identical files.

Usage: python3 scripts/gen-manifest.py [--repo ROOT]
Exit code 0 = written (or unchanged), 1 = scan/protocol error.
"""

import json
import re
import sys
from pathlib import Path

KEBAB_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def scan_genes(repo: Path) -> list[dict]:
    """One manifest entry per gene: {ref, path, summary, signals} sorted by ref."""
    root = repo / "genes"
    entries: list[dict] = []
    if not root.is_dir():
        return entries
    for domain_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        for f in sorted((domain_dir).glob("*.json")):
            raw = f.read_text(encoding="utf-8")
            try:
                data = json.loads(raw)
            except json.JSONDecodeError as e:
                raise SystemExit(f"FAIL: {f.relative_to(repo)}: not valid JSON: {e}")
            ref = f"{domain_dir.name}/{f.stem}"
            if not isinstance(data, dict):
                raise SystemExit(f"FAIL: {f.relative_to(repo)}: gene must be a JSON object")
            if data.get("id") != f.stem or not KEBAB_RE.match(str(data.get("id", ""))):
                raise SystemExit(f"FAIL: {f.relative_to(repo)}: id must equal filename stem")
            if data.get("domain") != domain_dir.name:
                raise SystemExit(f"FAIL: {f.relative_to(repo)}: domain must equal its directory")
            summary = data.get("summary")
            signals = data.get("signals")
            if not (isinstance(summary, str) and summary.strip()):
                raise SystemExit(f"FAIL: {f.relative_to(repo)}: summary must be a non-empty string")
            if not (isinstance(signals, list) and signals and all(isinstance(s, str) for s in signals)):
                raise SystemExit(f"FAIL: {f.relative_to(repo)}: signals must be a non-empty array of strings")
            entries.append({
                "ref": ref,
                "path": f.relative_to(repo).as_posix(),
                "summary": summary,
                "signals": signals,
            })
    entries.sort(key=lambda e: e["ref"])
    return entries


def main() -> int:
    args = sys.argv[1:]
    repo = Path(args[args.index("--repo") + 1]) if "--repo" in args else Path(".")
    entries = scan_genes(repo)
    manifest = {"version": 1, "genes": entries}
    out = repo / "manifest.json"
    text = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    if out.exists() and out.read_text(encoding="utf-8") == text:
        print(f"manifest.json unchanged ({len(entries)} genes)")
        return 0
    out.write_text(text, encoding="utf-8")
    print(f"manifest.json written ({len(entries)} genes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
