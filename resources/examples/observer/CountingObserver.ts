import { type Observer } from "./Observer.js";

/**
 * Concrete observer — records every event it sees.
 */
export class CountingObserver<T> implements Observer<T> {
  readonly seen: T[] = [];

  onEvent(event: T): void {
    this.seen.push(event);
  }
}
