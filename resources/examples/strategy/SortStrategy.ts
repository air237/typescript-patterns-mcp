/**
 * Strategy — a pluggable sort algorithm. Given the interface has exactly
 * one method, TypeScript's callable-type alias would be idiomatic:
 *
 *   type SortStrategy = (items: readonly number[]) => number[];
 *
 * The `strategy-narrow-to-function-type` refactoring recipe (planned for
 * Phase 10) rewrites SAM interfaces to that shape automatically. For the
 * canonical example we keep the interface form because it is closer to the
 * GoF diagram and gives concrete detectors a stable structural fingerprint.
 */
export interface SortStrategy {
  sort(items: readonly number[]): number[];
}
