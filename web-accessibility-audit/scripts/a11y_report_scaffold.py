#!/usr/bin/env python3
"""Generate a structured accessibility report from findings JSON."""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any

REQUIRED_KEYS = [
    "id",
    "title",
    "severity",
    "wcag",
    "area",
    "url",
    "selector",
    "impact",
    "reproduction",
    "actual",
    "expected",
    "recommended_fix",
]


def load_findings(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or "findings" not in payload:
        raise ValueError("Input must be a JSON object with a 'findings' array")
    findings = payload["findings"]
    if not isinstance(findings, list):
        raise ValueError("'findings' must be an array")
    for index, finding in enumerate(findings, start=1):
        if not isinstance(finding, dict):
            raise ValueError(f"Finding #{index} must be an object")
        missing = [key for key in REQUIRED_KEYS if key not in finding]
        if missing:
            raise ValueError(f"Finding #{index} is missing keys: {', '.join(missing)}")
        if not isinstance(finding.get("reproduction"), list) or not finding["reproduction"]:
            raise ValueError(f"Finding #{index} needs a non-empty 'reproduction' array")
    return findings


def build_markdown(
    findings: list[dict[str, Any]],
    project: str,
    scope: str,
    wcag_target: str,
    auditor: str,
) -> str:
    severity_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    findings = sorted(findings, key=lambda f: severity_order.get(str(f["severity"]), 99))

    totals = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for item in findings:
        sev = str(item["severity"])
        if sev in totals:
            totals[sev] += 1

    lines: list[str] = []
    lines.append(f"# Accessibility Report - {project}")
    lines.append("")
    lines.append("## 1. Executive Summary")
    lines.append("")
    lines.append(f"- Date: {date.today().isoformat()}")
    lines.append(f"- Auditor: {auditor}")
    lines.append(f"- Scope: {scope}")
    lines.append(f"- Target: {wcag_target}")
    lines.append(f"- Total findings: {len(findings)}")
    lines.append(
        f"- Severity split: Critical {totals['Critical']}, High {totals['High']}, Medium {totals['Medium']}, Low {totals['Low']}"
    )
    lines.append("")

    lines.append("## 2. Findings Table")
    lines.append("")
    lines.append("| ID | Severity | WCAG | Area | Short Impact |")
    lines.append("|---|---|---|---|---|")
    for finding in findings:
        lines.append(
            f"| {finding['id']} | {finding['severity']} | {finding['wcag']} | {finding['area']} | {finding['impact']} |"
        )
    lines.append("")

    lines.append("## 3. Issue Details")
    lines.append("")
    for finding in findings:
        lines.append(f"### {finding['id']} - {finding['title']}")
        lines.append("")
        lines.append(f"- Severity: {finding['severity']}")
        lines.append(f"- WCAG Criterion: {finding['wcag']}")
        lines.append(f"- Affected Area: {finding['area']}")
        lines.append(f"- URL: {finding['url']}")
        lines.append(f"- Selector/Component: {finding['selector']}")
        lines.append("")
        lines.append("**Reproduction**")
        for step_index, step in enumerate(finding["reproduction"], start=1):
            lines.append(f"{step_index}. {step}")
        lines.append("")
        lines.append("**Actual Behavior**")
        lines.append(finding["actual"])
        lines.append("")
        lines.append("**Expected Behavior**")
        lines.append(finding["expected"])
        lines.append("")
        lines.append("**User Impact**")
        lines.append(finding["impact"])
        lines.append("")
        lines.append("**Recommended Fix**")
        lines.append(finding["recommended_fix"])
        lines.append("")

    lines.append("## 4. Remediation Plan")
    lines.append("")
    lines.append("- Immediate: Fix all Critical and High findings first.")
    lines.append("- Current release: Resolve remaining Medium findings tied to affected flows.")
    lines.append("- Backlog: Track Low findings and close during related component updates.")
    lines.append("")

    lines.append("## 5. Retest Checklist")
    lines.append("")
    lines.append("- Verify each fixed issue with keyboard-only navigation.")
    lines.append("- Verify with screen reader spot-check.")
    lines.append("- Re-run automated checks and compare diffs.")
    lines.append("- Attach updated evidence for each closed issue.")
    lines.append("")

    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate accessibility report scaffold")
    parser.add_argument("--input", required=True, help="Path to findings JSON")
    parser.add_argument("--project", required=True, help="Project name")
    parser.add_argument("--scope", default="In-scope pages and key user flows", help="Audit scope")
    parser.add_argument("--wcag-target", default="WCAG 2.1 AA", help="Target conformance")
    parser.add_argument("--auditor", default="Accessibility Team", help="Auditor name")
    parser.add_argument("--output", default="", help="Output markdown file")
    args = parser.parse_args()

    findings = load_findings(Path(args.input))
    markdown = build_markdown(findings, args.project, args.scope, args.wcag_target, args.auditor)

    output_path = Path(args.output) if args.output else Path("audit") / f"a11y-report-{date.today().isoformat()}.md"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(markdown, encoding="utf-8")

    print(f"Report written to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
