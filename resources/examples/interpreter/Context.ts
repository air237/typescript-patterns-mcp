/**
 * Shared evaluation context — maps variable names to boolean bindings.
 * Both terminal and non-terminal expressions read from the same context.
 */
export class Context {
  readonly #bindings = new Map<string, boolean>();

  bind(name: string, value: boolean): this {
    this.#bindings.set(name, value);
    return this;
  }

  lookup(name: string): boolean {
    const v = this.#bindings.get(name);
    if (v === undefined) throw new Error(`Unbound variable: ${name}`);
    return v;
  }
}
