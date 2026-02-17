#!/usr/bin/env python3
"""Validate issue severity consistency using lightweight heuristics."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

SEVERITY_ORDER = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}

RULES = [
    (
        re.compile(r"core task blocked|cannot complete|keyboard trap|inaccessible login", re.IGNORECASE),
        "Critical",
        "Issue text indicates a blocker for core user tasks.",
    ),
    (
        re.compile(r"checkout|payment|authentication|sign in|screen reader cannot", re.IGNORECASE),
        "High",
        "Issue impacts critical flow or key assistive technology behavior.",
    ),
    (
        re.compile(r"contrast|focus indicator|aria-|label missing", re.IGNORECASE),
        "Medium",
        "Issue indicates a notable accessibility barrier.",
    ),
]


def parse_declared_severity(content: str) -> str | None:
    match = re.search(r"^- Severity:\s*(Critical|High|Medium|Low)\s*$", content, flags=re.MULTILINE)
    return match.group(1) if match else None


def infer_minimum_severity(content: str) -> tuple[str, str] | None:
    for pattern, severity, reason in RULES:
        if pattern.search(content):
            return severity, reason
    return None


def check_file(path: Path) -> tuple[bool, str]:
    content = path.read_text(encoding="utf-8")
    declared = parse_declared_severity(content)
    if declared is None:
        return False, "Missing '- Severity: ...' line"

    inferred = infer_minimum_severity(content)
    if inferred is None:
        return True, f"OK: no rule trigger, declared severity '{declared}' accepted"

    minimum, reason = inferred
    if SEVERITY_ORDER[declared] > SEVERITY_ORDER[minimum]:
        return (
            False,
            f"Declared '{declared}' is lower than inferred minimum '{minimum}'. {reason}",
        )
    return True, f"OK: declared '{declared}' meets inferred minimum '{minimum}'"


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate accessibility issue severity consistency")
    parser.add_argument("--path", default="audit", help="Issue file or directory to validate")
    parser.add_argument(
        "--glob",
        default="A11Y-*.md",
        help="Glob pattern for issue files when --path is a directory",
    )
    args = parser.parse_args()

    target = Path(args.path)
    files: list[Path]
    if target.is_file():
        files = [target]
    else:
        files = sorted(target.glob(args.glob))

    if not files:
        print("No issue files found.")
        return 0

    has_failures = False
    for file_path in files:
        ok, message = check_file(file_path)
        status = "PASS" if ok else "FAIL"
        print(f"[{status}] {file_path}: {message}")
        if not ok:
            has_failures = True

    return 1 if has_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
