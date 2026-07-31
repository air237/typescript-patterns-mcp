/**
 * Strategy for recognising one design pattern in a parsed `SourceFile`.
 *
 * TypeScript sibling of `com.javapatterns.mcp.detect.PatternDetector`.
 *
 * Detectors are stateless and side-effect free: they look at the AST and
 * emit zero or more {@link DetectedPattern} entries. Confidence scoring
 * is per-detector; see each implementation for the rule set.
 */

import { type SourceFile } from "ts-morph";

import { type Pattern } from "../catalog/index.js";
import { type DetectedPattern } from "./detectedPattern.js";

export interface PatternDetector {
  /** Which pattern this detector recognises. */
  readonly pattern: Pattern;
  /**
   * @param sourceFile a parsed TS source file. Must not be null.
   * @returns all instances of {@link pattern} found in the file, in
   *          declaration order.
   */
  detect(sourceFile: SourceFile): readonly DetectedPattern[];
}
