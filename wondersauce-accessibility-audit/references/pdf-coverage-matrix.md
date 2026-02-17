# PDF Coverage Matrix

Use this matrix to confirm full coverage of the Wondersauce accessibility PDF process on every audit run.

Execution format:
- Fill `references/pdf-coverage-template.json` item by item.
- Do not collapse multiple PDF checks into a single row.
- Record execution metadata for each required tool in `execution_log`.

Mark each row as:
- `PASS`
- `FAIL` (must become a finding)
- `N/A` (not present in scope; include reason)

Required fields per checklist item:
- `status`
- `tool_used`
- `evidence`
- `finding_ids`
- `notes`

Required fields per execution log entry:
- `tool`
- `command`
- `status`
- `summary`

## Blocking Rule

Do not close an audit as complete unless:
1. Every checklist item from `references/pdf-coverage-template.json` exists in the audit coverage file.
2. Every checklist item has `status`, `tool_used`, and evidence that matches the status.
3. Every `FAIL` item has at least one linked finding ID.
4. Every `N/A` item includes a specific reason in `notes`.
5. The execution log includes all required tools with command + summarized output.
6. If findings are zero, all applicable items are `PASS` (or `N/A` with reason).
