#!/usr/bin/env python3
"""Verify the P1 Gene/Event protocol (tenth gate; schema ADR S1-S3 single home:
.agents/notes/implemented/architecture/2026-09-05-gene-event-schema.md).

Checks, for the repo root (default cwd):
  genes/<domain>/<id>.json (S1 — closed eight-field schema)
    - id kebab-case and == filename stem; domain kebab-case and == parent dir
    - summary non-empty; signals (>=1) and strategy (>=1) arrays of strings
    - constraints optional object: max_files (int>=1) / forbidden_paths (non-empty strings)
    - validation optional: kebab gate names, each present in engine/gates.json
    - avoid optional: array of strings; empty arrays rejected (omit instead)
    - id unique across the whole genes/ tree (refs must stay unambiguous)
  engine/gates.json (S3 — whitelist carrier, fail-closed)
    - version number; gates non-empty; unique kebab names; cmd non-empty; args strings
    - every referenced scripts/** path exists in the repo
  events/<YYYY-MM>.jsonl (S2 — evolution events, append-only audit)
    - each line a JSON object with exactly {ts, actor, kind, gene, gene_sha, outcome, evidence}
    - kind in the closed set {gene.added, gene.updated, gene.retired}
    - ts ISO-8601, ascending within the volume, inside the volume's month (+-1 day
      timezone tolerance, mirroring verify-adr-format)
    - outcome "ok" or "fail: <reason>"; gene_sha 64-hex
  recompute (S2 — content-addressable on the worktree)
    - latest added/updated event's gene_sha must equal sha256 of the file bytes
    - latest retired event => the file must be absent
    - a worktree gene without any event trail is a violation (solidify is the only entry)

Usage: python3 verify-gene-format.py [--repo ROOT]
       python3 verify-gene-format.py --self-test   # offline fixture self-check
Exit code 0 = pass, 1 = violations.

Provenance: original to Noogenesis (2026-09-05, P1 implementation round), protocol
per the schema ADR above; JS-side mirror in engine/gene.js + engine/solidify.js.
"""

import datetime
import hashlib
import json
import re
import sys
from pathlib import Path

KEBAB_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SHA_RE = re.compile(r"^[0-9a-f]{64}$")
VOL_RE = re.compile(r"^(\d{4}-\d{2})\.jsonl$")
KINDS = ("gene.added", "gene.updated", "gene.retired")
EVENT_FIELDS = {"ts", "actor", "kind", "gene", "gene_sha", "outcome", "evidence"}
KNOWN_GENE_FIELDS = {"id", "domain", "summary", "signals", "strategy",
                     "constraints", "validation", "avoid"}


def _is_kebab(v) -> bool:
    return isinstance(v, str) and KEBAB_RE.match(v) is not None


def _check_gene(data: dict, rel: Path, whitelist: set) -> list[str]:
    """Closed-schema checks for one gene file (mirror of engine/gene.js)."""
    errors: list[str] = []
    stem = rel.stem
    parent = rel.parent.name
    if not isinstance(data, dict):
        return [f"{rel}: gene must be a JSON object"]
    for k in data:
        if k not in KNOWN_GENE_FIELDS:
            errors.append(f"{rel}: unknown field: {k}")
    if not _is_kebab(data.get("id")):
        errors.append(f"{rel}: id must be kebab-case string")
    elif data["id"] != stem:
        errors.append(f"{rel}: id '{data['id']}' must equal filename ({stem})")
    if not _is_kebab(data.get("domain")):
        errors.append(f"{rel}: domain must be kebab-case string")
    elif data["domain"] != parent:
        errors.append(f"{rel}: domain '{data['domain']}' must equal its directory ({parent})")
    if not (isinstance(data.get("summary"), str) and data["summary"].strip()):
        errors.append(f"{rel}: summary must be a non-empty string")
    for field, minimum in (("signals", 1), ("strategy", 1)):
        v = data.get(field)
        if not isinstance(v, list) or not all(isinstance(x, str) for x in v):
            errors.append(f"{rel}: {field} must be an array of strings")
        elif len(v) < minimum:
            errors.append(f"{rel}: {field} must have at least {minimum} item(s)")
    for field in ("validation", "avoid"):
        if field in data:
            v = data[field]
            if not isinstance(v, list) or not all(isinstance(x, str) for x in v):
                errors.append(f"{rel}: {field} must be an array of strings")
            elif not v:
                errors.append(f"{rel}: {field} must not be empty (omit the field instead)")
    if "validation" in data and isinstance(data["validation"], list):
        for entry in data["validation"]:
            if not _is_kebab(entry):
                errors.append(f"{rel}: validation entries must be kebab-case gate names")
            elif whitelist is not None and entry not in whitelist:
                errors.append(f"{rel}: validation entry '{entry}' is not in the whitelist")
    if "constraints" in data:
        c = data["constraints"]
        if not isinstance(c, dict) or not c:
            errors.append(f"{rel}: constraints must be a non-empty object (omit the field instead)")
        else:
            for k, v in c.items():
                if k == "max_files":
                    if not isinstance(v, int) or isinstance(v, bool) or v < 1:
                        errors.append(f"{rel}: constraints.max_files must be a positive integer")
                elif k == "forbidden_paths":
                    if not isinstance(v, list) or not all(
                            isinstance(x, str) and x.strip() for x in v):
                        errors.append(f"{rel}: constraints.forbidden_paths must be an array of non-empty strings")
                else:
                    errors.append(f"{rel}: unknown constraints key: {k}")
    return errors


def _load_whitelist(repo: Path) -> tuple[set, list[str]]:
    """Parse engine/gates.json (fail-closed) -> (gate names, errors)."""
    errors: list[str] = []
    p = repo / "engine" / "gates.json"
    try:
        raw = p.read_text(encoding="utf-8")
    except OSError as e:
        return set(), [f"engine/gates.json unreadable — fail-closed: {e}"]
    try:
        doc = json.loads(raw)
    except ValueError as e:
        return set(), [f"engine/gates.json is not valid JSON — fail-closed: {e}"]
    if not isinstance(doc, dict) or not isinstance(doc.get("version"), int) or isinstance(doc.get("version"), bool):
        errors.append("engine/gates.json: version must be a number")
    gates = doc.get("gates") if isinstance(doc, dict) else None
    if not isinstance(gates, list) or not gates:
        errors.append("engine/gates.json: gates must be a non-empty array")
        return set(), errors
    names: set = set()
    for g in gates:
        if not isinstance(g, dict):
            errors.append("engine/gates.json: gate entry must be an object")
            continue
        name = g.get("name")
        if not _is_kebab(name):
            errors.append(f"engine/gates.json: gate name not kebab-case: {name!r}")
        elif name in names:
            errors.append(f"engine/gates.json: duplicate gate name: {name}")
        names.add(name)
        if not (isinstance(g.get("cmd"), str) and g["cmd"].strip()):
            errors.append(f"engine/gates.json: gate {name}: cmd must be a non-empty string")
        args = g.get("args")
        if not isinstance(args, list) or not all(isinstance(a, str) for a in args):
            errors.append(f"engine/gates.json: gate {name}: args must be an array of strings")
            continue
        for a in args:
            if a.startswith("scripts/") and not (repo / a).exists():
                errors.append(f"engine/gates.json: gate {name}: referenced script does not exist: {a}")
    return names, errors


def _parse_ts(ts: str) -> datetime.datetime | None:
    if not isinstance(ts, str):
        return None
    try:
        dt = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt


def _check_events(repo: Path, vol: Path, errors: list[str]) -> list[tuple[datetime.datetime, dict]]:
    """Structural + ordering checks for one volume file; returns parsed rows."""
    m = VOL_RE.match(vol.name)
    if not m:
        errors.append(f"{vol}: events volume must be named <YYYY-MM>.jsonl")
        return []
    vol_first = datetime.date.fromisoformat(m.group(1) + "-01")
    last_day = (vol_first.replace(day=28) + datetime.timedelta(days=4)).replace(day=1) - datetime.timedelta(days=1)
    rows: list[tuple[datetime.datetime, dict]] = []
    prev: datetime.datetime | None = None
    for lineno, line in enumerate(vol.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            errors.append(f"{vol}:{lineno}: blank line (append-only JSONL)")
            continue
        try:
            ev = json.loads(line)
        except ValueError as e:
            errors.append(f"{vol}:{lineno}: not valid JSON: {e}")
            continue
        if not isinstance(ev, dict) or set(ev) != EVENT_FIELDS:
            errors.append(f"{vol}:{lineno}: event fields must be exactly {sorted(EVENT_FIELDS)}")
            continue
        dt = _parse_ts(ev["ts"])
        if dt is None:
            errors.append(f"{vol}:{lineno}: ts must be ISO-8601")
            continue
        if prev is not None and dt < prev:
            errors.append(f"{vol}:{lineno}: ts out of order within volume")
        prev = dt
        # 月卷归属：ts 落在卷月份内；跨时区容差 +-1 天（对齐 verify-adr-format 口径）
        ts_date = dt.date()
        if not (vol_first - datetime.timedelta(days=1) <= ts_date <= last_day + datetime.timedelta(days=1)):
            errors.append(f"{vol}:{lineno}: ts {ts_date} outside volume month {m.group(1)}")
        if ev["kind"] not in KINDS:
            errors.append(f"{vol}:{lineno}: kind '{ev['kind']}' not in closed set {KINDS}")
        if not _is_kebab(ev["gene"]):
            errors.append(f"{vol}:{lineno}: gene must be a kebab-case id")
        if not SHA_RE.match(ev.get("gene_sha") or ""):
            errors.append(f"{vol}:{lineno}: gene_sha must be 64-hex sha256")
        if ev["outcome"] != "ok" and not (isinstance(ev["outcome"], str) and ev["outcome"].startswith("fail: ")):
            errors.append(f"{vol}:{lineno}: outcome must be 'ok' or 'fail: <reason>'")
        if not (isinstance(ev["actor"], str) and ev["actor"].strip()):
            errors.append(f"{vol}:{lineno}: actor must be a non-empty string")
        if not (isinstance(ev["evidence"], str) and ev["evidence"].strip()):
            errors.append(f"{vol}:{lineno}: evidence must be a non-empty string")
        rows.append((dt, ev))
    return rows


def _scan(repo: Path) -> tuple[int, list[str]]:
    """Return (checked_count, errors) for the real tree."""
    errors: list[str] = []
    whitelist, wl_errors = _load_whitelist(repo)
    errors.extend(wl_errors)
    checked = 0

    genes_root = repo / "genes"
    gene_files: dict[str, Path] = {}
    if genes_root.is_dir():
        for p in sorted(genes_root.rglob("*.json")):
            checked += 1
            rel = p.relative_to(repo)
            # 布局封闭：只认 genes/<domain>/<id>.json（与引擎 scanGenes 单层扫描镜像，R2-S3）
            if len(rel.parts) != 3 or rel.parts[0] != "genes":
                errors.append(f"{rel}: gene files must be at genes/<domain>/<id>.json layout")
                continue
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
            except ValueError as e:
                errors.append(f"{p}: not valid JSON: {e}")
                continue
            errors.extend(_check_gene(data, rel, whitelist))
            gid = data.get("id") if isinstance(data, dict) else None
            if isinstance(gid, str):
                if gid in gene_files:
                    errors.append(f"{p}: duplicate gene id '{gid}' (also {gene_files[gid]})")
                gene_files[gid] = p

    # events/：结构 + 月卷 + 时间序；并按 id 聚出事件流（ts 稳定排序，R2-S2）
    per_gene: dict[str, list[dict]] = {}
    events_root = repo / "events"
    volumes: list[tuple[Path, list[tuple[datetime.datetime, dict]]]] = []
    if events_root.is_dir():
        for vol in sorted(events_root.glob("*.jsonl")):
            rows = _check_events(repo, vol, errors)
            checked += len(rows)
            volumes.append((vol, rows))
            for _, ev in rows:
                per_gene.setdefault(ev["gene"], []).append(ev)
    # 跨卷 ts 接续：前卷最大 ts ≤ 后卷最小 ts（月界 ±1 天容差下仍可辨乱序，R2-S2）
    for (v1, r1), (v2, r2) in zip(volumes, volumes[1:]):
        if r1 and r2 and r1[-1][0] > r2[0][0]:
            errors.append(f"{v2}: first ts precedes last ts of {v1.name} — cross-volume disorder")
    # 每 id 的 latest 选择按 ts 稳定排序（同 ts 保持卷内行序），防月界容差把复算对象选错
    for gid in per_gene:
        per_gene[gid].sort(key=lambda e: _parse_ts(e["ts"]) or datetime.datetime.min.replace(tzinfo=datetime.timezone.utc))

    # 复算规则分型（S2）：retired 划段；段内 ok 的 added/updated 对工作树复算；
    # fail 事件只查结构不作复算（被拒候选内容 ≠ 工作树状态）——R2-B1 修复
    for gid, evs in per_gene.items():
        candidates = list(genes_root.glob(f"*/{gid}.json")) if genes_root.is_dir() else []
        if len(candidates) > 1:
            errors.append(f"gene id '{gid}' present in multiple domains: "
                          + ", ".join(str(c.relative_to(repo)) for c in candidates))
        target = candidates[0] if candidates else None
        last_retired = max((i for i, ev in enumerate(evs) if ev["kind"] == "gene.retired"), default=-1)
        if last_retired == len(evs) - 1:
            if target is not None:
                errors.append(f"{target}: latest event is gene.retired but the file still exists")
            continue
        post = evs[last_retired + 1:]  # 最后一次 retire 之后的事件决定工作树期望
        ok_adds = [e for e in post if e["outcome"] == "ok" and e["kind"] in ("gene.added", "gene.updated")]
        if ok_adds:
            latest_ok = ok_adds[-1]
            if target is None:
                errors.append(f"gene '{gid}': latest accepted event is {latest_ok['kind']} but no worktree file exists")
            else:
                digest = hashlib.sha256(target.read_bytes()).hexdigest()
                if digest != latest_ok["gene_sha"]:
                    errors.append(f"{target}: gene_sha mismatch (event {latest_ok['gene_sha'][:12]}… "
                                  f"vs file {digest[:12]}…) — genes/ changes must go through solidify")
        else:
            # 分段内只有 fail：候选从未被（或自退役后未被）接受，工作树不应有该基因
            if target is not None:
                errors.append(f"{target}: no accepted event after last rejection/retire but the file exists")

    # 工作树基因必须有事件轨（solidify 是唯一入口）
    for gid, p in gene_files.items():
        if gid not in per_gene:
            errors.append(f"{p}: gene has no event trail — place genes only via solidify")

    return checked, errors


# --- self-test fixtures ---

def _mk(tmp: Path, rel: str, content: str) -> None:
    p = tmp / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def _gene(gid="sample-gene", domain="process", **over):
    doc = {
        "id": gid, "domain": domain, "summary": "one-line",
        "signals": ["push"], "strategy": ["step"],
    }
    doc.update(over)
    return json.dumps(doc, ensure_ascii=False, indent=2) + "\n"


def _event(kind="gene.added", gid="sample-gene", sha=None, outcome="ok", ts="2026-09-05T01:00:00Z"):
    return json.dumps({
        "ts": ts, "actor": "t", "kind": kind, "gene": gid,
        "gene_sha": sha or ("a" * 64), "outcome": outcome, "evidence": "e",
    }, ensure_ascii=False)


def _sha_of(tmp: Path, rel: str) -> str:
    return hashlib.sha256((tmp / rel).read_bytes()).hexdigest()


def _self_test() -> int:
    import tempfile

    WHITELIST = json.dumps({
        "version": 1,
        "gates": [{"name": "stub", "cmd": "python3", "args": ["scripts/stub.py"]}],
    })
    cases = []  # (tree-builder, expected_violation_substrings, desc)

    def conforming(t: Path):
        _mk(t, "engine/gates.json", WHITELIST)
        _mk(t, "scripts/stub.py", "print('ok')\n")
        _mk(t, "genes/process/sample-gene.json", _gene(validation=["stub"]))
        _mk(t, "events/2026-09.jsonl",
            _event(sha=None) + "\n")  # sha 占位，下方替换为真值

    def fix_sha(t: Path):
        # 让事件 sha 与文件一致（conforming 用）
        p = t / "events" / "2026-09.jsonl"
        p.write_text(_event(sha=_sha_of(t, "genes/process/sample-gene.json")) + "\n", encoding="utf-8")

    cases.append((conforming, [], "conforming tree -> pass"))

    def bad_filename(t: Path):
        conforming(t); fix_sha(t)
        _mk(t, "genes/process/other-name.json", _gene())  # id 与文件名不一致
    cases.append((bad_filename, ["must equal filename"], "id != filename -> fail"))

    def bad_domain(t: Path):
        conforming(t); fix_sha(t)
        (t / "genes/process/sample-gene.json").unlink()
        _mk(t, "genes/doc/sample-gene.json", _gene(domain="process"))
        (t / "events/2026-09.jsonl").unlink()
        # doc 域文件 + 无事件 → 事件轨缺失亦报；只断言域锚点违约出现
    cases.append((bad_domain, ["must equal its directory"], "domain != dir -> fail"))

    def unknown_field(t: Path):
        conforming(t); fix_sha(t)
        _mk(t, "genes/process/sample-gene.json", _gene(mutation_id="m1"))
    cases.append((unknown_field, ["unknown field: mutation_id"], "unknown field -> fail"))

    def bad_whitelist_ref(t: Path):
        conforming(t); fix_sha(t)
        _mk(t, "genes/process/sample-gene.json", _gene(validation=["ghost"]))
    cases.append((bad_whitelist_ref, ["not in the whitelist"], "validation outside whitelist -> fail"))

    def ghost_script(t: Path):
        _mk(t, "engine/gates.json", json.dumps(
            {"version": 1, "gates": [{"name": "stub", "cmd": "python3", "args": ["scripts/ghost.py"]}]}))
        _mk(t, "genes/process/sample-gene.json", _gene())
    cases.append((ghost_script, ["referenced script does not exist"], "whitelist script missing -> fail"))

    def bad_kind(t: Path):
        conforming(t); fix_sha(t)
        _mk(t, "events/2026-09.jsonl",
            _event(sha=_sha_of(t, "genes/process/sample-gene.json")) + "\n"
            + _event(kind="gene.mutated", gid="sample-gene", sha="b" * 64) + "\n")
    cases.append((bad_kind, ["not in closed set"], "event kind outside closed set -> fail"))

    def sha_drift(t: Path):
        conforming(t); fix_sha(t)
        _mk(t, "genes/process/sample-gene.json", _gene(summary="edited by hand"))
    cases.append((sha_drift, ["gene_sha mismatch"], "worktree edit without solidify -> fail"))

    def retired_exists(t: Path):
        conforming(t); fix_sha(t)
        _mk(t, "events/2026-09.jsonl",
            _event(sha=_sha_of(t, "genes/process/sample-gene.json")) + "\n"
            + _event(kind="gene.retired", sha="c" * 64) + "\n")
    cases.append((retired_exists, ["latest event is gene.retired but the file still exists"],
                  "retired but file exists -> fail"))

    def out_of_order(t: Path):
        conforming(t); fix_sha(t)
        _mk(t, "events/2026-09.jsonl",
            _event(sha=_sha_of(t, "genes/process/sample-gene.json")) + "\n"
            + _event(ts="2026-09-05T00:00:00Z", sha=_sha_of(t, "genes/process/sample-gene.json")) + "\n")
    cases.append((out_of_order, ["ts out of order"], "ts descending within volume -> fail"))

    def no_event_trail(t: Path):
        _mk(t, "engine/gates.json", WHITELIST)
        _mk(t, "scripts/stub.py", "print('ok')\n")
        _mk(t, "genes/process/sample-gene.json", _gene())
    cases.append((no_event_trail, ["no event trail"], "gene without events -> fail"))

    def bad_outcome(t: Path):
        conforming(t); fix_sha(t)
        _mk(t, "events/2026-09.jsonl", _event(outcome="rejected") + "\n")
    cases.append((bad_outcome, ["outcome must be"], "outcome neither ok nor fail: -> fail"))

    def wrong_month(t: Path):
        conforming(t); fix_sha(t)
        _mk(t, "events/2026-08.jsonl",
            _event(ts="2026-07-01T00:00:00Z", sha=_sha_of(t, "genes/process/sample-gene.json")) + "\n")
    cases.append((wrong_month, ["outside volume month"], "ts far outside volume month -> fail"))

    # R2-B1 修复夹具：合法红闸拒绝不得打红门禁
    def rejected_update(t: Path):
        conforming(t); fix_sha(t)
        _mk(t, "events/2026-09.jsonl",
            _event(sha=_sha_of(t, "genes/process/sample-gene.json")) + "\n"
            + _event(kind="gene.updated", gid="sample-gene", sha="d" * 64,
                     outcome="fail: stub-fail exit 1") + "\n")
    cases.append((rejected_update, [], "ok added + trailing rejected update -> pass"))

    def rejected_add_only(t: Path):
        _mk(t, "engine/gates.json", WHITELIST)
        _mk(t, "scripts/stub.py", "print('ok')\n")
        _mk(t, "events/2026-09.jsonl",
            _event(gid="never-kept", sha="e" * 64, outcome="fail: stub-fail exit 1") + "\n")
    cases.append((rejected_add_only, [], "rejected-only candidate (no file) -> pass"))

    # R2-S3 修复夹具：布局封闭
    def flat_layout(t: Path):
        _mk(t, "engine/gates.json", WHITELIST)
        _mk(t, "scripts/stub.py", "print('ok')\n")
        _mk(t, "genes/loose.json", _gene(domain="genes"))
    cases.append((flat_layout, ["genes/<domain>/<id>.json layout"], "flat gene file -> fail"))

    # R2-S2 修复夹具：跨卷 ts 乱序（月界 ±1 天容差内仍须可辨）
    def cross_volume_disorder(t: Path):
        conforming(t); fix_sha(t)
        sha = _sha_of(t, "genes/process/sample-gene.json")
        _mk(t, "events/2026-09.jsonl", _event(ts="2026-10-01T00:00:00Z", sha=sha) + "\n")
        _mk(t, "events/2026-10.jsonl", _event(ts="2026-09-30T00:00:00Z", sha=sha) + "\n")
    cases.append((cross_volume_disorder, ["cross-volume disorder"], "next volume starts before previous ends -> fail"))

    failed = 0
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        for i, (builder, expected, desc) in enumerate(cases):
            t = root / f"case{i}"
            t.mkdir()
            builder(t)
            if t.name.startswith("case0"):
                fix_sha(t)
            checked, errors = _scan(t)
            actual_ok = not errors
            want_ok = not expected
            if want_ok and actual_ok:
                print(f"  ok: {desc}")
            elif not want_ok and not actual_ok and any(any(sub in e for sub in expected) for e in errors):
                print(f"  ok: {desc}")
            else:
                print(f"  FAIL {desc}: expected {'pass' if want_ok else expected}, "
                      f"got {'pass' if actual_ok else errors}", file=sys.stderr)
                failed = 1

    if failed == 0:
        print("== verify-gene-format self-test passed ==")
    else:
        print("== verify-gene-format self-test failed ==", file=sys.stderr)
    return failed


def main() -> int:
    args = sys.argv[1:]
    if "--self-test" in args:
        return _self_test()
    repo = Path(args[args.index("--repo") + 1]) if "--repo" in args else Path(".")
    checked, errors = _scan(repo)
    print(f"Checked {checked} gene/event items")
    if errors:
        for e in errors:
            print(f"FAIL: {e}")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
