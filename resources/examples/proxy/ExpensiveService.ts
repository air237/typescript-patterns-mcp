import { type Service } from "./Service.js";

/**
 * The real subject — pretend every `fetch(key)` call hits a network or a
 * database. `callCount` is exposed so callers (and tests) can see when a
 * hypothetical CachingServiceProxy actually short-circuits.
 */
export class ExpensiveService implements Service {
  #callCount = 0;

  fetch(key: string): string {
    this.#callCount += 1;
    return `[expensive:${key}]`;
  }

  callCount(): number {
    return this.#callCount;
  }
}
