import { type Component } from "./Component.js";

/**
 * Composite — a box that recursively sums the cost of its children.
 *
 * The `children` field is `readonly` (the array reference cannot be replaced)
 * and the getter returns a `readonly` view so callers cannot mutate the
 * internal collection — the two structural rules the `composite-*` validator
 * will enforce on freestyle code.
 */
export class Box implements Component {
  readonly #children: Component[] = [];

  add(child: Component): this {
    this.#children.push(child);
    return this;
  }

  cost(): number {
    let total = 0;
    for (const child of this.#children) total += child.cost();
    return total;
  }

  children(): readonly Component[] {
    return [...this.#children];
  }
}
