import { type Observer } from "./Observer.js";

/**
 * Subject — subscribe / unsubscribe / publish. The critical detail is that
 * `publish()` iterates over a snapshot (`[...this.#observers]`), NOT the
 * live collection: a subscriber that unsubscribes itself during dispatch
 * would otherwise cause a ConcurrentModificationException-equivalent.
 *
 * This is exactly what the `observer-snapshot-iteration` refactoring
 * recipe fixes on freestyle code.
 */
export class EventBus<T> {
  readonly #observers: Array<Observer<T>> = [];

  subscribe(o: Observer<T>): () => void {
    this.#observers.push(o);
    return () => {
      const idx = this.#observers.indexOf(o);
      if (idx !== -1) this.#observers.splice(idx, 1);
    };
  }

  publish(event: T): void {
    for (const o of [...this.#observers]) {
      o.onEvent(event);
    }
  }

  size(): number {
    return this.#observers.length;
  }
}
