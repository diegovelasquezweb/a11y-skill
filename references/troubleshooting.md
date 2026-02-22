# Troubleshooting

If a command fails, use this guide to self-correct before asking the user.

| Failure                       | Potential Cause                  | Suggested Action                                           |
| :---------------------------- | :------------------------------- | :--------------------------------------------------------- |
| **Timeout (30000ms reached)** | Heavy JS payload or slow server. | Increase `--timeout-ms 60000` or use `waitUntil: "load"`.  |
| **Auth Error (401/403)**      | Protected routes or IP blocking. | Verify URL accessibility or ask user for session cookies.  |
| **Chromium Error**            | Broken Playwright install.       | Run `npx playwright install chromium` and retry.           |
| **0 Routes Discovered**       | No same-origin links or SPA.     | Provide a static list of `--routes "/,/about"` to the CLI. |

## Feedback Loop: Verification

After applying a fix, **always re-run the audit** (Step 3d). If the issue persists in the report, double-check that the selector used in your edit matches the one reported in `audit/report.html`.
