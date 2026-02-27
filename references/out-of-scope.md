# Out of Scope — Manual Testing Required

The following WCAG 2.2 AA criteria cannot be verified by axe-core automated scanning. Manual testing is required for each.

## Requires manual testing

- 1.2.2 Captions (Prerecorded)
- 1.2.3 Audio Description or Media Alternative
- 1.2.4 Captions (Live)
- 1.2.5 Audio Description (Prerecorded)
- 1.3.3 Sensory Characteristics
- 1.4.1 Use of Color
- 2.1.1 Keyboard
- 2.1.2 No Keyboard Trap
- 2.3.1 Three Flashes or Below Threshold
- 2.4.3 Focus Order
- 2.4.7 Focus Visible
- 2.5.3 Label in Name
- 3.2.1 On Focus
- 3.2.2 On Input
- 3.3.3 Error Suggestion
- 3.3.4 Error Prevention

## Not in scope

- AAA criteria are excluded from WCAG 2.2 AA compliance assessment.

## Backend root cause findings

Some axe-core findings appear to fail in the browser but originate from server-side output, not from frontend components or stylesheets. These are **out of scope for frontend fixes**.

**How to identify them:** Evidence in the finding contains server-generated debug output — PHP warnings, stack traces, file paths (e.g., `wp-config.php`, `.env`), line numbers, or raw error messages rendered directly into the DOM.

**Common examples:**
- WordPress `WP_DEBUG = true` in production — renders PHP warnings and `wp-config.php` paths into the page body, which axe-core flags as unlandmarked content (`region` rule)
- Server-side error output leaking into the rendered HTML

**What to do:**
1. Identify the server-side root cause from the evidence (file path, error type)
2. Report it to the user in plain language — explain what is causing the output and where it originates
3. Do not attempt any frontend fix
4. Mark the finding as **Out of scope — backend root cause** in the session
5. Exclude it from the fix queue; count it as unresolved/unactionable in the Step 6 summary
