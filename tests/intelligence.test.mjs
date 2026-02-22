import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const intel = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../assets/intelligence.json"), "utf-8"),
);
const ruleMetadata = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../assets/rule-metadata.json"),
    "utf-8",
  ),
);

const VALID_FP_RISK = new Set(["low", "medium", "high"]);
const VALID_FW_KEYS = new Set([
  "react",
  "vue",
  "angular",
  "svelte",
  "astro",
  "generic",
]);
const VALID_CMS_KEYS = new Set(["shopify", "wordpress", "drupal"]);
const WCAG22_PROACTIVE = new Set([
  "accessible-auth-minimum",
  "consistent-help",
  "dragging-movements",
  "focus-appearance",
  "redundant-entry",
]);

const rules = intel.rules;
const ruleIds = new Set(Object.keys(rules));
let axeRules = null;

beforeAll(async () => {
  try {
    const axePath = path.join(__dirname, "../node_modules/axe-core/axe.js");
    const axe = await import(pathToFileURL(axePath).href);
    axeRules = Object.fromEntries(
      (axe.default ?? axe).getRules().map((r) => [r.ruleId, r]),
    );
  } catch {
    // axe-core unavailable — coverage checks will be skipped
  }
});

// ── 1. intelligence.json schema ────────────────────────────────────────────
describe("intelligence.json — schema", () => {
  for (const [id, rule] of Object.entries(rules)) {
    describe(id, () => {
      it("has a valid fix object with description", () => {
        expect(rule.fix).toBeDefined();
        expect(typeof rule.fix).toBe("object");
        expect(rule.fix.description?.trim()).toBeTruthy();
      });

      it("has valid false_positive_risk", () => {
        expect(VALID_FP_RISK.has(rule.false_positive_risk)).toBe(true);
      });

      if (rule.framework_notes) {
        it("framework_notes keys are valid", () => {
          for (const key of Object.keys(rule.framework_notes)) {
            expect(
              VALID_FW_KEYS.has(key),
              `Invalid framework key: ${key}`,
            ).toBe(true);
            expect(rule.framework_notes[key]?.trim()).toBeTruthy();
          }
        });
      }

      if (rule.cms_notes) {
        it("cms_notes keys are valid", () => {
          for (const key of Object.keys(rule.cms_notes)) {
            expect(VALID_CMS_KEYS.has(key), `Invalid CMS key: ${key}`).toBe(
              true,
            );
            expect(rule.cms_notes[key]?.trim()).toBeTruthy();
          }
        });
      }

      if (rule.related_rules !== undefined) {
        it("related_rules is an array with id and reason", () => {
          expect(Array.isArray(rule.related_rules)).toBe(true);
          for (const rel of rule.related_rules) {
            expect(rel.id).toBeTruthy();
            expect(rel.reason?.trim()).toBeTruthy();
          }
        });
      }

      if (rule.manual_test) {
        it("manual_test has description and steps", () => {
          expect(rule.manual_test.description?.trim()).toBeTruthy();
          expect(Array.isArray(rule.manual_test.steps)).toBe(true);
          expect(rule.manual_test.steps.length).toBeGreaterThan(0);
        });
      }
    });
  }
});

// ── 2. rule-metadata.json schema ──────────────────────────────────────────────
describe("rule-metadata.json — schema", () => {
  it("every rule has impactedUsers", () => {
    const missing = [...ruleIds].filter(
      (id) => !ruleMetadata.impactedUsers?.[id]?.trim(),
    );
    expect(missing).toEqual([]);
  });

  it("every rule has expected", () => {
    const missing = [...ruleIds].filter(
      (id) => !ruleMetadata.expected?.[id]?.trim(),
    );
    expect(missing).toEqual([]);
  });
});

// ── 3. Internal integrity ──────────────────────────────────────────────────
describe("intelligence.json — integrity", () => {
  it("all related_rules reference existing rule IDs", () => {
    const broken = [];
    for (const [id, rule] of Object.entries(rules)) {
      for (const rel of rule.related_rules ?? []) {
        if (!ruleIds.has(rel.id)) broken.push(`${id} → ${rel.id}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("no rule references itself in related_rules", () => {
    const selfRefs = [];
    for (const [id, rule] of Object.entries(rules)) {
      if ((rule.related_rules ?? []).some((r) => r.id === id))
        selfRefs.push(id);
    }
    expect(selfRefs).toEqual([]);
  });

  it("all related_rules are reciprocal", () => {
    const missing = [];
    for (const [id, rule] of Object.entries(rules)) {
      for (const rel of rule.related_rules ?? []) {
        const hasReciprocal = (rules[rel.id]?.related_rules ?? []).some(
          (r) => r.id === id,
        );
        if (!hasReciprocal) missing.push(`${id} → ${rel.id}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

// ── 4. Axe-core coverage ───────────────────────────────────────────────────
describe("intelligence.json — axe-core coverage", () => {
  it("has no stale rules (rules not in axe-core)", () => {
    if (!axeRules) return;
    const stale = [...ruleIds].filter(
      (id) => !axeRules[id] && !WCAG22_PROACTIVE.has(id),
    );
    expect(stale).toEqual([]);
  });
});

// ── 5. Content quality ─────────────────────────────────────────────────────
describe("intelligence.json — content quality", () => {
  it("every rule has fix.code or manual_test", () => {
    const noGuidance = Object.entries(rules)
      .filter(([, rule]) => !rule.fix?.code && !rule.manual_test)
      .map(([id]) => id);
    expect(noGuidance).toEqual([]);
  });
});

// ── 6. WCAG criterion mapping accuracy ────────────────────────────────────
describe("rule-metadata.json — WCAG criterion mapping", () => {
  // Rules axe-core tags as best-practice (no WCAG tag) but we intentionally map
  const BEST_PRACTICE_MAPPED = new Set([
    "accesskeys",
    "aria-allowed-role",
    "aria-dialog-name",
    "aria-text",
    "aria-treeitem-name",
    "empty-heading",
    "empty-table-header",
    "focus-order-semantics",
    "frame-tested",
    "heading-order",
    "hidden-content",
    "image-redundant-alt",
    "label-title-only",
    "landmark-banner-is-top-level",
    "landmark-complementary-is-top-level",
    "landmark-contentinfo-is-top-level",
    "landmark-main-is-top-level",
    "landmark-no-duplicate-banner",
    "landmark-no-duplicate-contentinfo",
    "landmark-no-duplicate-main",
    "landmark-one-main",
    "landmark-unique",
    "meta-viewport-large",
    "page-has-heading-one",
    "presentation-role-conflict",
    "region",
    "scope-attr-valid",
    "skip-link",
    "table-duplicate-name",
    "tabindex",
  ]);
  // WCAG 4.1.1 is obsoleted in WCAG 2.2 — axe still tags with wcag411
  const WCAG22_OBSOLETE_OVERRIDE = new Set(["duplicate-id"]);

  it("every intelligence rule has a wcagCriterionMap entry", () => {
    const missing = [...ruleIds].filter(
      (id) => !ruleMetadata.wcagCriterionMap?.[id],
    );
    expect(missing).toEqual([]);
  });

  it("wcagCriterionMap values match axe-core WCAG tags", () => {
    if (!axeRules) return;
    const mismatches = [];
    for (const [ruleId, criterion] of Object.entries(
      ruleMetadata.wcagCriterionMap,
    )) {
      if (BEST_PRACTICE_MAPPED.has(ruleId)) continue;
      if (WCAG22_PROACTIVE.has(ruleId)) continue;
      if (WCAG22_OBSOLETE_OVERRIDE.has(ruleId)) continue;
      const axeRule = axeRules[ruleId];
      if (!axeRule) continue;
      const wcagTags = axeRule.tags.filter((t) => /^wcag\d{3,4}$/.test(t));
      const parsed = wcagTags.map((t) => {
        const d = t.replace("wcag", "");
        return d.length === 3
          ? `${d[0]}.${d[1]}.${d[2]}`
          : `${d[0]}.${d[1]}.${d.slice(2)}`;
      });
      if (parsed.length > 0 && !parsed.includes(criterion)) {
        mismatches.push(
          `${ruleId}: ours=${criterion}, axe=${parsed.join(",")}`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("every intelligence rule has an MDN reference", () => {
    const missing = [...ruleIds].filter(
      (id) => !ruleMetadata.mdn?.[id]?.trim(),
    );
    expect(missing).toEqual([]);
  });
});

// ── 7. manual-checks.json schema ──────────────────────────────────────────
const manualChecks = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../assets/manual-checks.json"),
    "utf-8",
  ),
);
const VALID_WCAG_LEVELS = new Set(["A", "AA", "AAA"]);

const wcagChecks = manualChecks.filter((c) =>
  /^\d+\.\d+\.\d+$/.test(c.criterion),
);
const atChecks = manualChecks.filter((c) => /^AT-\d+$/.test(c.criterion));

describe("manual-checks.json — schema", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(manualChecks)).toBe(true);
    expect(manualChecks.length).toBeGreaterThan(0);
  });

  it("every entry is either a WCAG or AT check", () => {
    const unmatched = manualChecks.filter(
      (c) =>
        !/^\d+\.\d+\.\d+$/.test(c.criterion) && !/^AT-\d+$/.test(c.criterion),
    );
    expect(unmatched.map((c) => c.criterion)).toEqual([]);
  });

  it("has at least one WCAG check and one AT check", () => {
    expect(wcagChecks.length).toBeGreaterThan(0);
    expect(atChecks.length).toBeGreaterThan(0);
  });

  for (const check of manualChecks) {
    const isAT = /^AT-\d+$/.test(check.criterion);

    describe(check.criterion ?? "unknown", () => {
      it("has a non-empty title", () => {
        expect(check.title?.trim()).toBeTruthy();
      });

      it("has a valid level", () => {
        if (isAT) {
          expect(check.level).toBe("AT");
        } else {
          expect(VALID_WCAG_LEVELS.has(check.level)).toBe(true);
        }
      });

      it("has a non-empty description", () => {
        expect(check.description?.trim()).toBeTruthy();
      });

      it("has non-empty steps array", () => {
        expect(Array.isArray(check.steps)).toBe(true);
        expect(check.steps.length).toBeGreaterThan(0);
      });

      it("has non-empty remediation array", () => {
        expect(Array.isArray(check.remediation)).toBe(true);
        expect(check.remediation.length).toBeGreaterThan(0);
      });

      it("has a valid code_example with before and after", () => {
        expect(check.code_example).toBeDefined();
        expect(check.code_example.lang?.trim()).toBeTruthy();
        expect(check.code_example.before?.trim()).toBeTruthy();
        expect(check.code_example.after?.trim()).toBeTruthy();
      });

      it("has a valid ref URL", () => {
        expect(check.ref).toMatch(/^https:\/\//);
        if (!isAT) {
          expect(check.ref).toMatch(
            /^https:\/\/www\.w3\.org\/WAI\/WCAG22\/Understanding\//,
          );
        }
      });
    });
  }
});
