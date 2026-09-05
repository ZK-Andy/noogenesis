#!/usr/bin/env python3
"""gates.py — 门禁清单单源发射器（清单 = engine/gates.json，M2 ADR 归口收口）。

hooks/CI 不再手抄 verify-* 清单：清单（名 + 命令）从 engine/gates.json 读取，
与引擎 evaluate 同一来源。槽位替换**形似而非同口径**（勿照抄互通）：
- 本脚本替换任意 {{key}}（含 cmd），缺值 fail-closed；
- engine/gates.js instantiate 只认 outgoing_base/head 两键，缺键静默留字面量
  （无害的前提是引擎侧 deriveSlots 保证两键齐全）——今日两侧行为等价纯因
  白名单只有这两键且都在 args，非机制等价。

清单单源的**结构性例外**（有意为之，勿"修复"）：
- review-tier：pre-push 以 per-ref merge-base 循环逐 ref enforce（新分支首推
  fail-closed），CI 以 push 事件条件步承载——两者都不是平面清单能表达的形态，
  故默认跳过、由专属步骤保留。
- review-brief：按设计仅本地预发射，不入 CI；pre-push 亦不跑（简报闸是评审
  发射前检查，非 push 前提）。
- change-scope：hooks/CI 用脚本自身的缺省推导（fork-point）；gates.json 内的
  槽位形态供引擎 evaluate 使用。同一脚本、两种推导口径，见 P1 实现 ADR D4。
- gene-format（第十门禁）：白名单外独立件——它消费引擎产物（genes/ + events/
  复算），进白名单会让 solidify 入档中途复算自身（语义循环）；hooks/CI 保留
  显式行，不在本脚本跳过清单里表达。

用法：
  gates.py --list                                  # 打印 name<TAB>cmd...
  gates.py --run [--skip a,b] [--slot k=v ...]     # 依次执行；非零即停（exit 1）
  gates.py --self-test                             # 离线夹具自测

退出码：0 全绿 / 1 有门禁红 / 2 fail-closed（gates.json 缺失、坏槽位、跳过名不存在）。
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

GATES_REL = Path("engine") / "gates.json"
SLOT_RE = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}")


def fail_closed(message: str) -> "SystemExit":
	print(f"gates.py: FAIL-CLOSED — {message}", file=sys.stderr)
	raise SystemExit(2)


def load_gates(repo_root: Path):
	path = repo_root / GATES_REL
	try:
		doc = json.loads(path.read_text(encoding="utf-8"))
	except FileNotFoundError:
		fail_closed(f"gates.json not found: {path}")
	except json.JSONDecodeError as error:
		fail_closed(f"gates.json invalid JSON ({path}): {error}")
	gates = doc.get("gates") if isinstance(doc, dict) else None
	if not isinstance(gates, list) or not gates:
		fail_closed(f"gates.json has no non-empty 'gates' list ({path})")
	names = set()
	for gate in gates:
		if not isinstance(gate, dict) or not isinstance(gate.get("name"), str) or not isinstance(gate.get("cmd"), str):
			fail_closed(f"gates.json entry needs string name+cmd: {gate!r}")
		if not isinstance(gate.get("args", []), list):
			fail_closed(f"gate {gate['name']}: args must be a list")
		if gate["name"] in names:
			fail_closed(f"gates.json duplicate gate name: {gate['name']}")
		names.add(gate["name"])
	return gates


def instantiate(gate: dict, slots: dict):
	"""槽位替换：任意 {{key}}（含 cmd），缺值 fail-closed——**形似而非同口径**
	于 engine/gates.js instantiate（彼只认双键、缺键静默留字面量），见头注。"""

	def substitute(text: str) -> str:
		def replace(match: "re.Match[str]") -> str:
			key = match.group(1)
			if key not in slots:
				fail_closed(f"gate {gate['name']}: slot '{{{{{key}}}}}' has no value (--slot {key}=<value>)")
			return slots[key]

		return SLOT_RE.sub(replace, text)

	args = [substitute(str(part)) for part in [gate["cmd"], *gate.get("args", [])]]
	return gate["name"], args


def parse_args(argv):
	parser = argparse.ArgumentParser(description="Emit and run the gate list from engine/gates.json (single source).")
	mode = parser.add_mutually_exclusive_group(required=True)
	mode.add_argument("--list", action="store_true", help="print 'name<TAB>command' lines")
	mode.add_argument("--run", action="store_true", help="run gates in order, fail-fast on first non-zero exit")
	mode.add_argument("--self-test", action="store_true", help="run offline fixtures (no repo gates needed)")
	parser.add_argument("--skip", default="", help="comma-separated gate names to skip")
	parser.add_argument("--slot", action="append", default=[], metavar="K=V", help="slot value, repeatable")
	return parser.parse_args(argv)


def parse_slots(slot_args):
	slots = {}
	for item in slot_args:
		key, sep, value = item.partition("=")
		if not sep or not key:
			fail_closed(f"--slot expects K=V, got {item!r}")
		slots[key] = value
	return slots


def run_gates(repo_root: Path, gates, skip: set, slots: dict) -> int:
	for name in skip - {gate["name"] for gate in gates}:
		fail_closed(f"--skip names unknown gate: {name}")
	for gate in gates:
		if gate["name"] in skip:
			continue
		name, command = instantiate(gate, slots)
		print(f"-> {name}")
		result = subprocess.run(command, cwd=repo_root, check=False)
		if result.returncode != 0:
			print(f"gates.py: gate {name} exited {result.returncode}", file=sys.stderr)
			return 1
	return 0


def self_test() -> int:
	# 夹具 1：槽位替换 + 全绿
	with tempfile.TemporaryDirectory() as tmp:
		root = Path(tmp)
		gates_dir = root / "engine"
		gates_dir.mkdir()
		(gates_dir / "gates.json").write_text(
			json.dumps({"version": 1, "gates": [
				{"name": "always-green", "cmd": sys.executable, "args": ["-c", "print('green')"]},
				{"name": "slot-user", "cmd": sys.executable, "args": ["-c", f"import sys; assert sys.argv[1] == 'base-x', sys.argv", "{{outgoing_base}}"]},
			]}),
			encoding="utf-8",
		)
		gates = load_gates(root)
		name, command = instantiate(gates[1], {"outgoing_base": "base-x", "head": "h"})
		assert name == "slot-user" and command[-1] == "base-x"
		assert run_gates(root, gates, set(), {"outgoing_base": "base-x", "head": "h"}) == 0
	print("ok - slots substitute and green gates pass")
	# 夹具 2：红门禁 fail-fast → exit 1
	with tempfile.TemporaryDirectory() as tmp:
		root = Path(tmp)
		gates_dir = root / "engine"
		gates_dir.mkdir()
		(gates_dir / "gates.json").write_text(
			json.dumps({"version": 1, "gates": [{"name": "always-red", "cmd": sys.executable, "args": ["-c", "raise SystemExit(3)"]}]}),
			encoding="utf-8",
		)
		assert run_gates(root, load_gates(root), set(), {}) == 1
	print("ok - red gate fail-fasts with exit 1")
	# 夹具 3：缺失槽位 / 未知 skip / 坏文件 → fail-closed exit 2
	with tempfile.TemporaryDirectory() as tmp:
		root = Path(tmp)
		gates_dir = root / "engine"
		gates_dir.mkdir()
		(gates_dir / "gates.json").write_text(
			json.dumps({"version": 1, "gates": [{"name": "needs-slot", "cmd": "true", "args": ["{{head}}"]}]}),
			encoding="utf-8",
		)
		gates = load_gates(root)
		try:
			instantiate(gates[0], {})
		except SystemExit as exit_error:
			assert exit_error.code == 2
		else:
			raise AssertionError("missing slot must fail closed")
		try:
			run_gates(root, gates, {"ghost"}, {})
		except SystemExit as exit_error:
			assert exit_error.code == 2
		else:
			raise AssertionError("unknown --skip must fail closed")
		try:
			load_gates(root / "nowhere")
		except SystemExit as exit_error:
			assert exit_error.code == 2
		else:
			raise AssertionError("missing gates.json must fail closed")
	print("ok - missing slot / unknown skip / missing file fail closed (exit 2)")
	print("gates.py self-test: 3 fixture groups passed")
	return 0


def main(argv) -> int:
	args = parse_args(argv)
	if args.self_test:
		return self_test()
	repo_root = Path(__file__).resolve().parent.parent
	gates = load_gates(repo_root)
	skip = {name.strip() for name in args.skip.split(",") if name.strip()}
	slots = parse_slots(args.slot)
	if args.list:
		for gate in gates:
			if gate["name"] in skip:
				continue
			_name, command = instantiate(gate, slots)
			print(f"{gate['name']}\t{' '.join(command)}")
		return 0
	return run_gates(repo_root, gates, skip, slots)


if __name__ == "__main__":
	raise SystemExit(main(sys.argv[1:]))
