/**
 * Iterator interface — the GoF `hasNext()` / `next()` contract.
 *
 * TypeScript's built-in `Iterator` / `Symbol.iterator` is often idiomatic for
 * ad-hoc traversals, but the GoF pattern is a legitimate distinct concept:
 * a first-class object that traverses an aggregate at its own pace,
 * without exposing the aggregate's internals. This file demonstrates the
 * pattern in that classic form.
 */
export interface CustomIterator<T> {
  hasNext(): boolean;
  next(): T;
}
