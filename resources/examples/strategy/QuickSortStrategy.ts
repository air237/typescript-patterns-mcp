import { type SortStrategy } from "./SortStrategy.js";

/**
 * Concrete strategy — ascending numeric order.
 */
export class QuickSortStrategy implements SortStrategy {
  sort(items: readonly number[]): number[] {
    // `Array.prototype.sort` with a numeric comparator; JS's default sort
    // is lexicographic and would rank 10 before 2 without one.
    return [...items].sort((a, b) => a - b);
  }
}
