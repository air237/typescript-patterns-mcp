/**
 * The result of detecting a single pattern instance in a TypeScript source file.
 *
 * TypeScript sibling of `com.javapatterns.mcp.detect.DetectedPattern`.
 *
 * Fields:
 *   - `pattern`    — which GoF pattern was recognised.
 *   - `className`  — the anchor class / interface / callable-type name where the
 *                    instance lives. For Singleton, the class with the private
 *                    constructor. For Builder, the outer immutable type. For
 *                    Strategy, the strategy interface itself, and so on.
 *   - `startLine`  — first line of the anchor declaration (1-based, inclusive).
 *   - `confidence` — 0.0 (very weak signal) to 1.0 (textbook match). Every
 *                    detector documents how it sums up its independent sub-signals.
 *   - `evidence`   — human-readable list of the signals that fired
 *                    (e.g. "private constructor", "static getInstance() returning
 *                     the enclosing class").
 */

import { type Pattern } from "../catalog/index.js";

export interface DetectedPattern {
  readonly pattern: Pattern;
  readonly className: string;
  readonly startLine: number;
  readonly confidence: number;
  readonly evidence: readonly string[];
}

/**
 * Build a validated `DetectedPattern`. Guards the confidence range so a
 * buggy detector cannot silently emit `NaN` or values outside `[0, 1]`.
 */
export function detectedPattern(
  args: DetectedPattern,
): DetectedPattern {
  if (!Number.isFinite(args.confidence) || args.confidence < 0 || args.confidence > 1) {
    throw new Error(
      `confidence must be in [0, 1], got ${String(args.confidence)}`,
    );
  }
  return {
    pattern: args.pattern,
    className: args.className,
    startLine: args.startLine,
    confidence: args.confidence,
    evidence: Object.freeze([...args.evidence]),
  };
}
