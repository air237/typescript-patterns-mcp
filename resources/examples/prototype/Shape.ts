/**
 * Prototype base — every Shape can copy itself without the caller knowing its
 * concrete class.
 *
 * The Java sibling uses `implements Cloneable` + `Object.clone()`. In
 * TypeScript we lean on the copy-constructor idiom + an explicit `clone()`
 * method returning the same static type. Subclasses forward to their own
 * copy-constructor via `super`, so private fields are copied through the
 * inheritance chain.
 */
export abstract class Shape {
  x: number;
  y: number;
  color: string;

  protected constructor(source: Shape | { x: number; y: number; color: string }) {
    this.x = source.x;
    this.y = source.y;
    this.color = source.color;
  }

  abstract clone(): Shape;

  /** Value equality on the shared fields — subclasses extend as needed. */
  equalsBase(other: Shape): boolean {
    return this.x === other.x && this.y === other.y && this.color === other.color;
  }
}
