import { type Aggregate } from "./Aggregate.js";
import { type CustomIterator } from "./CustomIterator.js";

/**
 * Concrete aggregate — an ordered roster of names. The iterator is a
 * private helper class so callers cannot construct one without going
 * through `iterator()`.
 */
class NameRosterIterator implements CustomIterator<string> {
  #cursor = 0;

  constructor(private readonly names: readonly string[]) {}

  hasNext(): boolean {
    return this.#cursor < this.names.length;
  }

  next(): string {
    if (!this.hasNext()) throw new Error("No more elements");
    const value = this.names[this.#cursor]!;
    this.#cursor += 1;
    return value;
  }
}

export class NameRoster implements Aggregate<string> {
  readonly #names: string[] = [];

  add(name: string): this {
    this.#names.push(name);
    return this;
  }

  iterator(): CustomIterator<string> {
    // Pass a snapshot so mid-iteration mutations do not surprise the caller.
    return new NameRosterIterator([...this.#names]);
  }
}
