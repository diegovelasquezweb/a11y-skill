#!/usr/bin/env python3
"""Generate a single accessibility issue markdown file from template inputs."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

ALLOWED_SEVERITIES = {"Critical", "High", "Medium", "Low"}


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "issue"


def build_issue_markdown(args: argparse.Namespace, issue_id: str) -> str:
    steps = [step.strip() for step in args.repro.split("|") if step.strip()]
    if not steps:
        steps = ["Reproduction steps not provided."]

    lines: list[str] = []
    lines.append("# Accessibility Issue")
    lines.append("")
    lines.append("Use this template for each audit finding.")
    lines.append("")
    lines.append("## Issue")
    lines.append("")
    lines.append(f"- ID: {issue_id}")
    lines.append(f"- Title: {args.title}")
    lines.append(f"- Severity: {args.severity}")
    lines.append(f"- WCAG Criterion: {args.wcag}")
    lines.append(f"- WCAG Level: {args.level}")
    lines.append(f"- Affected Area: {args.area}")
    lines.append("")
    lines.append("## Reproduction")
    lines.append("")
    for idx, step in enumerate(steps, start=1):
        lines.append(f"{idx}. {step}")
    lines.append("")
    lines.append("## Actual Behavior")
    lines.append("")
    lines.append(args.actual)
    lines.append("")
    lines.append("## Expected Behavior")
    lines.append("")
    lines.append(args.expected)
    lines.append("")
    lines.append("## User Impact")
    lines.append("")
    lines.append(args.impact)
    lines.append("")
    lines.append("## Severity Rationale")
    lines.append("")
    lines.append(f"- Why this severity is correct: {args.rationale}")
    lines.append(f"- Is a core user task blocked? {args.core_blocked}")
    lines.append(f"- Is there a reasonable workaround? {args.workaround}")
    lines.append(f"- Scope of impact: {args.scope_impact}")
    lines.append(f"- Release recommendation: {args.release_recommendation}")
    lines.append("")
    lines.append("## Evidence")
    lines.append("")
    lines.append(f"- URL: {args.url}")
    lines.append(f"- Screenshot / recording: {args.evidence}")
    lines.append(f"- DOM selector / component ID: {args.selector}")
    lines.append("- Tool output (if any):")
    lines.append("")
    lines.append("## Recommended Fix")
    lines.append("")
    lines.append(args.fix)
    lines.append("")
    lines.append("## QA Retest Notes")
    lines.append("")
    lines.append("- Retest date:")
    lines.append("- Retested by:")
    lines.append("- Status: Pass | Fail | Needs follow-up")
    lines.append("- Notes:")
    lines.append("")

    return "\n".join(lines)


def next_issue_id(out_dir: Path, prefix: str) -> str:
    existing = sorted(out_dir.glob(f"{prefix}-*.md"))
    if not existing:
        return f"{prefix}-001"
    last = existing[-1].stem.split("-")[1]
    try:
        number = int(last)
    except ValueError:
        number = len(existing)
    return f"{prefix}-{number + 1:03d}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate accessibility issue markdown")
    parser.add_argument("--title", required=True)
    parser.add_argument("--severity", choices=sorted(ALLOWED_SEVERITIES), required=True)
    parser.add_argument("--wcag", required=True, help="Example: 1.4.3")
    parser.add_argument("--level", choices=["A", "AA", "AAA"], default="AA")
    parser.add_argument("--area", required=True)
    parser.add_argument("--url", required=True)
    parser.add_argument("--selector", default="")
    parser.add_argument("--repro", default="", help="Steps separated by |")
    parser.add_argument("--actual", default="Current behavior not provided.")
    parser.add_argument("--expected", default="Expected behavior not provided.")
    parser.add_argument("--impact", default="User impact not provided.")
    parser.add_argument("--fix", default="Fix guidance not provided.")
    parser.add_argument("--evidence", default="")
    parser.add_argument("--rationale", default="Severity rationale not provided.")
    parser.add_argument("--core-blocked", choices=["Yes", "No"], default="No")
    parser.add_argument("--workaround", choices=["Yes", "No"], default="Yes")
    parser.add_argument("--scope-impact", default="Single component")
    parser.add_argument(
        "--release-recommendation",
        default="Fix this release",
        choices=["Block now", "Fix this release", "Next release", "Backlog"],
    )
    parser.add_argument("--prefix", default="A11Y")
    parser.add_argument("--out-dir", default="audit")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    issue_id = next_issue_id(out_dir, args.prefix)
    slug = slugify(args.title)
    output = out_dir / f"{issue_id}-{slug}.md"

    output.write_text(build_issue_markdown(args, issue_id), encoding="utf-8")
    print(f"Issue written to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
