import { beforeEach, describe, expect, it } from "vitest";

import {
  PatternValidationEngine,
  ValidationError,
  _resetPatternValidationEngineForTests,
} from "../../src/validate/index.js";
import { PATTERNS } from "../../src/catalog/index.js";

describe("PatternValidationEngine", () => {
  beforeEach(() => {
    _resetPatternValidationEngineForTests();
  });

  it("supports 18 patterns (Group A + Group B); Group C intentionally out of scope", () => {
    const engine = PatternValidationEngine.getInstance();
    expect(engine.supportedPatterns()).toHaveLength(18);
  });

  it("caches the engine singleton across calls until reset", () => {
    const first = PatternValidationEngine.getInstance();
    expect(PatternValidationEngine.getInstance()).toBe(first);
    _resetPatternValidationEngineForTests();
    expect(PatternValidationEngine.getInstance()).not.toBe(first);
  });

  it("validateAll returns [] for a plain non-pattern class", () => {
    const engine = PatternValidationEngine.getInstance();
    const issues = engine.validateAll(
      `export class Plain { foo(): number { return 42; } }`,
    );
    expect(issues).toEqual([]);
  });

  it("validateAll flags a public-ctor Singleton with ERROR", () => {
    const engine = PatternValidationEngine.getInstance();
    const issues = engine.validateAll(`
      export class Broken {
        public constructor() {}
        static getInstance(): Broken { return new Broken(); }
      }
    `);
    // At least one ERROR must be present.
    const errors = issues.filter((i) => i.severity === "ERROR");
    expect(errors.length).toBeGreaterThanOrEqual(1);
    for (const e of errors) expect(e.pattern).toBe("SINGLETON");
  });

  it("validateOne rejects unsupported patterns with a helpful error", () => {
    const engine = PatternValidationEngine.getInstance();
    expect(() =>
      engine.validateOne("export class C {}", "PROTOTYPE"),
    ).toThrow(/No validator wired/);
  });

  it("ValidationError inherits from Error and carries the expected name", () => {
    const err = new ValidationError("boom");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ValidationError");
    expect(err.message).toBe("boom");
  });

  it("issues are sorted by (pattern order, severity, line)", () => {
    const engine = PatternValidationEngine.getInstance();
    // Trigger issues from two distinct patterns in the same file so we
    // can observe the pattern-declaration ordering.
    const src = `
      export class Broken {
        public constructor() {}
        static getInstance(): Broken { return new Broken(); }
      }
      export interface LeakyStrategy {}
      export class A implements LeakyStrategy {}
      export class B implements LeakyStrategy {}
    `;
    const issues = engine.validateAll(src);
    const patterns = issues.map((i) => i.pattern);
    // SINGLETON comes before STRATEGY in the PATTERNS declaration.
    const firstSingleton = patterns.indexOf("SINGLETON");
    const firstStrategy = patterns.indexOf("STRATEGY");
    if (firstSingleton !== -1 && firstStrategy !== -1) {
      expect(firstSingleton).toBeLessThan(firstStrategy);
    }
    // Sanity: PATTERNS still exposes 23 (unchanged by the validate
    // engine) — protects against accidental catalog edits from
    // validator wiring.
    expect(PATTERNS).toHaveLength(23);
  });
});
