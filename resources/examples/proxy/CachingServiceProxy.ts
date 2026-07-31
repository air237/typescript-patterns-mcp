import { type Service } from "./Service.js";

/**
 * Caching proxy — same Service surface, but hits the real subject only on
 * cache miss. The wrapped `subject` field is `readonly` so the delegate
 * cannot be re-pointed mid-flight (this is the invariant the
 * `proxy-make-subject-readonly` refactoring recipe enforces on freestyle
 * code).
 */
export class CachingServiceProxy implements Service {
  readonly #cache = new Map<string, string>();

  constructor(private readonly subject: Service) {}

  fetch(key: string): string {
    let cached = this.#cache.get(key);
    if (cached === undefined) {
      cached = this.subject.fetch(key);
      this.#cache.set(key, cached);
    }
    return cached;
  }
}
