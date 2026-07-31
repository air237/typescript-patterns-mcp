import { type CustomIterator } from "./CustomIterator.js";

/**
 * Aggregate interface — yields a fresh CustomIterator on demand.
 */
export interface Aggregate<T> {
  iterator(): CustomIterator<T>;
}
