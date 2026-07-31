import { type SortStrategy } from "./SortStrategy.js";

/**
 * Concrete strategy — descending numeric order.
 */
export class ReverseSortStrategy implements SortStrategy {
  sort(items: readonly number[]): number[] {
    return [...items].sort((a, b) => b - a);
  }
}
