import { describe, expect, it } from "vitest";

import {
  getPatternExamplesLoader,
  PATTERNS,
  patternInfo,
  type Pattern,
} from "../../src/catalog/index.js";
import { PatternValidationEngine } from "../../src/validate/index.js";

/**
 * The linchpin test for Phase 9. For each of the 18 patterns with a
 * validator, run that validator on the corresponding canonical example
 * and assert that NO `ERROR`-severity issue is emitted. Canonical
 * examples are the reference implementation; if any validator flags them
 * as broken, either the example or the validator is wrong.
 *
 * `WARNING` and `INFO` findings are TOLERATED — the canonical examples
 * are minimal on purpose and may legitimately trip stylistic rules
 * (e.g. "class has only one strategy implementor" when the example
 * bundle names one Strategy at a time).
 */

const SUPPORTED_BY_VALIDATOR: readonly Pattern[] = [
  "SINGLETON",
  "BUILDER",
  "FACTORY_METHOD",
  "STRATEGY",
  "OBSERVER",
  "DECORATOR",
  "STATE",
  "COMMAND",
  "ADAPTER",
  "COMPOSITE",
  "PROXY",
  "TEMPLATE_METHOD",
  "ABSTRACT_FACTORY",
  "BRIDGE",
  "FACADE",
  "VISITOR",
  "CHAIN_OF_RESPONSIBILITY",
  "MEDIATOR",
];

describe("canonical examples do NOT trigger ERROR-severity validator issues", () => {
  const engine = PatternValidationEngine.getInstance();
  const loader = getPatternExamplesLoader();

  for (const p of SUPPORTED_BY_VALIDATOR) {
    const info = patternInfo(p);
    it(`${info.displayName} canonical example produces no ERROR issues`, () => {
      const files = loader.forPattern(p);
      expect(files.length).toBeGreaterThanOrEqual(1);
      const combined = files.map((f) => f.source).join("\n\n");
      const issues = engine.validateOne(combined, p);
      const errors = issues.filter((i) => i.severity === "ERROR");
      expect(
        errors,
        `expected 0 ERROR issues for canonical ${p}, got ${errors
          .map((e) => `[${e.className}:${e.line}] ${e.issue}`)
          .join(" | ")}`,
      ).toEqual([]);
    });
  }
});

describe("engine coverage", () => {
  it("supports exactly the 18 patterns Group A + Group B", () => {
    const engine = PatternValidationEngine.getInstance();
    const supported = engine.supportedPatterns();
    expect(supported).toHaveLength(18);
    for (const p of SUPPORTED_BY_VALIDATOR) {
      expect(supported).toContain(p);
    }
    // Group C patterns are intentionally NOT validated.
    const groupC: Pattern[] = [
      "PROTOTYPE",
      "FLYWEIGHT",
      "INTERPRETER",
      "ITERATOR",
      "MEMENTO",
    ];
    for (const p of groupC) {
      expect(supported).not.toContain(p);
    }
    // Sanity: PATTERNS has 23 and supported has 18 == 23 - 5 Group C.
    expect(PATTERNS.length - supported.length).toBe(5);
  });
});
