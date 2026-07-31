/**
 * Class-based Singleton — the closest direct translation of the Gang of Four
 * pattern to modern TypeScript.
 *
 * Why not a module-level `const singleton = new Logger();`?
 *   That is idiomatic ESM, but it is not the GoF Singleton — the "access
 *   point" is `import`, not a static method, and the constructor is public
 *   so callers can still `new Logger()` themselves. This class-based variant
 *   preserves the two structural invariants of the pattern:
 *     (1) the constructor is unreachable to external callers
 *         (`private constructor()`),
 *     (2) there is exactly one instance, exposed through a documented static
 *         access point (`Logger.getInstance()`).
 *
 * Thread-safety is a non-issue in Node's single event loop; lazy
 * initialisation is enforced by the `??=` assignment on `#instance`.
 */
export class Logger {
  static #instance: Logger | undefined;

  readonly #buffer: string[] = [];

  private constructor() {
    // Intentionally empty. `private` prevents external `new Logger()`.
  }

  static getInstance(): Logger {
    Logger.#instance ??= new Logger();
    return Logger.#instance;
  }

  log(line: string): void {
    this.#buffer.push(line);
  }

  /** Returns a defensive copy so callers cannot mutate internal state. */
  entries(): readonly string[] {
    return [...this.#buffer];
  }
}
