import { beforeEach, describe, expect, it } from "vitest";

import {
  PatternRefactoringEngine,
  REFACTORING_IDS,
  RefactoringError,
  _resetPatternRefactoringEngineForTests,
  refactoringFromKey,
  refactoringInfo,
} from "../../src/refactor/index.js";

describe("PatternRefactoringEngine", () => {
  beforeEach(() => {
    _resetPatternRefactoringEngineForTests();
  });

  it("supports exactly the 12 refactorings declared in REFACTORING_IDS", () => {
    const engine = PatternRefactoringEngine.getInstance();
    const supported = engine.supported();
    expect(supported).toHaveLength(12);
    for (const id of REFACTORING_IDS) {
      expect(supported).toContain(id);
    }
  });

  it("caches the engine singleton across calls until reset", () => {
    const first = PatternRefactoringEngine.getInstance();
    expect(PatternRefactoringEngine.getInstance()).toBe(first);
    _resetPatternRefactoringEngineForTests();
    expect(PatternRefactoringEngine.getInstance()).not.toBe(first);
  });

  it("apply() returns changed:false for source that already conforms", () => {
    const engine = PatternRefactoringEngine.getInstance();
    // A canonical Singleton is already private-ctor → no change.
    const clean = `
      export class Logger {
        static #instance: Logger | undefined;
        private constructor() {}
        static getInstance(): Logger {
          Logger.#instance ??= new Logger();
          return Logger.#instance;
        }
      }
    `;
    const result = engine.apply(clean, "SINGLETON_MAKE_CTOR_PRIVATE");
    expect(result.changed).toBe(false);
    expect(result.changes).toEqual([]);
    expect(result.newSource).toBe(clean);
  });

  it("apply() throws RefactoringError for unregistered ids (defensive path)", () => {
    // Not user-reachable (Zod + refactoringFromKey guard the tool),
    // but the engine's internal error path is worth testing.
    const engine = PatternRefactoringEngine.getInstance();
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      engine.apply("export class C {}", "BOGUS_ID" as any),
    ).toThrow(RefactoringError);
  });

  it("refactoringFromKey accepts enum keys and slugs, case-insensitive", () => {
    expect(refactoringFromKey("SINGLETON_MAKE_CTOR_PRIVATE")).toBe(
      "SINGLETON_MAKE_CTOR_PRIVATE",
    );
    expect(refactoringFromKey("singleton-make-ctor-private")).toBe(
      "SINGLETON_MAKE_CTOR_PRIVATE",
    );
    expect(refactoringFromKey("SinGleton_MAKE_ctor_PRIVATE")).toBe(
      "SINGLETON_MAKE_CTOR_PRIVATE",
    );
  });

  it("refactoringFromKey throws for unknown key", () => {
    expect(() => refactoringFromKey("nonsense")).toThrow(/Unknown refactoring/);
    expect(() => refactoringFromKey("")).toThrow(/non-blank/);
  });

  it("refactoringInfo returns pattern + slug + description for every id", () => {
    for (const id of REFACTORING_IDS) {
      const info = refactoringInfo(id);
      expect(info.pattern.length).toBeGreaterThan(0);
      expect(info.slug.length).toBeGreaterThan(0);
      expect(info.description.length).toBeGreaterThan(0);
    }
  });

  it("RefactoringError inherits from Error and carries the expected name", () => {
    const err = new RefactoringError("boom");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("RefactoringError");
  });
});
