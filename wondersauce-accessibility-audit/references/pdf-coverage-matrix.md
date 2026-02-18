# PDF Coverage Matrix

Use this matrix to confirm full coverage of the Wondersauce accessibility PDF process on every audit run.

Execution format:
- Fill `references/pdf-coverage-template.json` category by category.
- Verify the matrix gate directly in the audit output before final HTML sign-off.

Mark each row as:
- `PASS`
- `FAIL` (must become a finding)
- `N/A` (not present in scope; include reason)

| Domain | Required Checks | Evidence Type |
|---|---|---|
| Structure and semantics | Heading hierarchy, exactly one h1, landmarks, semantic elements for action/navigation | DOM selectors + counts |
| ARIA usage | Accessible names, relationships, states, no `aria-hidden` on focusables, live/status usage | DOM snippets + accessibility tree notes |
| Keyboard and focus | Tab reachability, logical focus order, visible focus, no positive tabindex, focus management in dynamic UI | Keyboard walkthrough notes |
| Perceivable content | Contrast thresholds, non-color-only communication, 200% zoom, text spacing (WCAG 1.4.12) | Tool output + manual notes |
| Media and motion | Alt quality, captions/transcripts, reduced motion behavior, flashing risk, gesture alternatives | DOM/media checks + manual notes |
| Forms and authentication | Labels, required state, errors announced/associated, field grouping, password manager support, redundant entry/auth rules | DOM + form interaction notes |
| Common component patterns | Dialogs, menus, tabs, accordions, carousels, skip link behavior | Component interaction notes |
| Third-party integrations | Cookie banners, chat widgets, embeds/forms/players, known ownership constraints and fallback paths | Integration-specific notes |
| Automated + manual validation | Automated pass done and manual pass done (keyboard, screen reader spot-check, zoom, text spacing, reduced motion, high contrast where relevant) | Run log summary |
| Severity and triage quality | Findings classified using Critical/High/Medium/Low model from the PDF | Findings table review |

## Blocking Rule

Do not close an audit as complete unless:
1. Every matrix row is `PASS`, `FAIL`, or `N/A` with reason.
2. Every `FAIL` row has at least one finding.
3. If findings are zero, all applicable rows must be `PASS` (or `N/A` with reason).
