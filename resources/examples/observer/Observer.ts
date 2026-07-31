/**
 * Observer interface — subscribers receive typed events via `onEvent(T)`.
 */
export interface Observer<T> {
  onEvent(event: T): void;
}
