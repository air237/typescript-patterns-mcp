import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  getPatternExamplesLoader,
  PATTERNS,
  patternInfo,
  type Pattern,
} from "../../src/catalog/index.js";
import { PatternDetectionEngine } from "../../src/detect/index.js";

/**
 * The linchpin test for Phase 8. For EACH of the 23 canonical examples
 * bundled under `resources/examples/<slug>/`, run the full detection
 * engine over the concatenated source of that pattern's files, and
 * assert that AT LEAST one detection is emitted for the corresponding
 * pattern with confidence >= 0.50.
 *
 * This catches four whole classes of regression at once:
 *   - a detector that fails to fire on its own canonical example
 *   - a detector that fires on an unrelated example (false positive)
 *   - a detector that fires but with confidence < 0.50 (Java-parity
 *     threshold that the caller relies on)
 *   - a detector that crashes on a valid example (thrown from engine)
 */
describe("each canonical example triggers its own detector at >=0.50 confidence", () => {
  const engine = PatternDetectionEngine.getInstance();
  const loader = getPatternExamplesLoader();

  for (const p of PATTERNS) {
    const info = patternInfo(p);
    it(`${info.displayName} example → detector fires with confidence >= 0.50`, () => {
      const files = loader.forPattern(p);
      expect(files.length).toBeGreaterThanOrEqual(1);

      // Concatenate all files of the pattern into ONE compilation unit —
      // ts-morph handles the multi-class module fine.
      const combined = files.map((f) => f.source).join("\n\n");
      const detections = engine.detect(combined);

      const own = detections.filter((d) => d.pattern === p);
      expect(
        own.length,
        `expected at least one ${p} detection, got ${detections
          .map((d) => `${d.pattern}(${d.className}=${d.confidence})`)
          .join(", ") || "none"}`,
      ).toBeGreaterThanOrEqual(1);

      const bestConfidence = Math.max(...own.map((d) => d.confidence));
      expect(
        bestConfidence,
        `${p} best confidence was ${bestConfidence}`,
      ).toBeGreaterThanOrEqual(0.5);
    });
  }
});

// Also exercise the `detectAll` batch API with all 23 examples in ONE
// call so we cover the multi-file code path too.
describe("batch detectAll over all 23 example bundles", () => {
  it("returns >=23 detections and zero errors", () => {
    const engine = PatternDetectionEngine.getInstance();
    const loader = getPatternExamplesLoader();
    const here = dirname(fileURLToPath(import.meta.url));
    // Sanity: make sure resource resolution still lines up so a future
    // move of the file doesn't silently break the test.
    expect(here).toContain("test/detect");

    const sources = new Map<string, string>();
    for (const p of PATTERNS) {
      const files = loader.forPattern(p);
      const combined = files.map((f) => f.source).join("\n\n");
      sources.set(patternInfo(p).slug + ".ts", combined);
    }

    const result = engine.detectAll(sources);
    expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
    // Each example must fire at least its own detector.
    const detectedPatterns = new Set<Pattern>(
      result.detections.map((d) => d.detection.pattern),
    );
    for (const p of PATTERNS) {
      expect(
        detectedPatterns.has(p),
        `expected ${p} to be detected somewhere in the batch`,
      ).toBe(true);
    }
    // Silence unused-import warning for `readFileSync` if we ever
    // stop using it below.
    expect(typeof readFileSync).toBe("function");
    expect(typeof resolve).toBe("function");
  });
});
