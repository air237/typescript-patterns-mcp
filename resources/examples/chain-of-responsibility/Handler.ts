/**
 * Abstract handler — declares the fluent `setNext()` chain builder and a
 * default `forward()` implementation that passes the request down the chain
 * (or returns `null` at the end).
 *
 * Concrete handlers override `handle()` and either return the response
 * themselves or delegate to `forward()`.
 */
export abstract class Handler {
  #next: Handler | null = null;

  setNext(next: Handler): Handler {
    this.#next = next;
    return next;
  }

  abstract handle(request: string): string | null;

  protected forward(request: string): string | null {
    return this.#next === null ? null : this.#next.handle(request);
  }
}
