import { beforeEach, describe, expect, it } from "vitest";

import { PATTERNS } from "../../src/catalog/index.js";
import {
  PatternDetectionEngine,
  _resetPatternDetectionEngineForTests,
  DetectionError,
} from "../../src/detect/index.js";

describe("PatternDetectionEngine", () => {
  beforeEach(() => {
    _resetPatternDetectionEngineForTests();
  });

  it("supportedPatterns contains every one of the 23 GoF patterns", () => {
    const engine = PatternDetectionEngine.getInstance();
    const supported = engine.supportedPatterns();
    expect(supported).toHaveLength(23);
    for (const p of PATTERNS) {
      expect(supported).toContain(p);
    }
    // Ordering must match PATTERNS declaration for stable output.
    expect(supported).toEqual(PATTERNS);
  });

  it("caches the engine singleton across calls until reset", () => {
    const first = PatternDetectionEngine.getInstance();
    expect(PatternDetectionEngine.getInstance()).toBe(first);
    _resetPatternDetectionEngineForTests();
    expect(PatternDetectionEngine.getInstance()).not.toBe(first);
  });

  it("detect() returns 0 hits for a non-pattern class", () => {
    const engine = PatternDetectionEngine.getInstance();
    const result = engine.detect(`
      export class Plain {
        foo(): number { return 42; }
      }
    `);
    // A plain class trips no detector.
    expect(result).toEqual([]);
  });

  it("detect() spots the class-based Singleton idiom", () => {
    const engine = PatternDetectionEngine.getInstance();
    const result = engine.detect(`
      export class Logger {
        static #instance: Logger | undefined;
        private constructor() {}
        static getInstance(): Logger {
          Logger.#instance ??= new Logger();
          return Logger.#instance;
        }
      }
    `);
    const singleton = result.find((d) => d.pattern === "SINGLETON");
    expect(singleton).toBeDefined();
    expect(singleton?.className).toBe("Logger");
    expect(singleton?.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it("detectAll collects per-file parse errors without aborting the batch", () => {
    const engine = PatternDetectionEngine.getInstance();
    const sources = new Map<string, string>([
      [
        "singleton.ts",
        `export class Logger {
          static #instance: Logger | undefined;
          private constructor() {}
          static getInstance(): Logger {
            Logger.#instance ??= new Logger();
            return Logger.#instance;
          }
        }`,
      ],
      // Deliberately empty second entry so we exercise the multi-file path.
      [
        "plain.ts",
        `export class Plain { foo(): number { return 42; } }`,
      ],
    ]);
    const batch = engine.detectAll(sources);
    expect(batch.filesAnalyzed).toBe(2);
    expect(batch.errors).toEqual([]);
    // Singleton must show up, attributed to singleton.ts.
    const singletonHit = batch.detections.find(
      (d) => d.detection.pattern === "SINGLETON",
    );
    expect(singletonHit).toBeDefined();
    expect(singletonHit?.file).toBe("singleton.ts");
  });

  it("detectAll sorts detections by (file, pattern, line)", () => {
    const engine = PatternDetectionEngine.getInstance();
    const src = `export class L {
      static #instance: L | undefined;
      private constructor() {}
      static getInstance(): L { L.#instance ??= new L(); return L.#instance; }
    }`;
    const sources = new Map<string, string>([
      ["b.ts", src],
      ["a.ts", src],
    ]);
    const batch = engine.detectAll(sources);
    const files = batch.detections.map((d) => d.file);
    // Sorted alphabetically — a.ts before b.ts.
    expect(files[0]).toBe("a.ts");
    expect(files[files.length - 1]).toBe("b.ts");
  });

  it("DetectionError inherits from Error and carries the expected name", () => {
    const err = new DetectionError("boom");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("DetectionError");
    expect(err.message).toBe("boom");
  });
});
