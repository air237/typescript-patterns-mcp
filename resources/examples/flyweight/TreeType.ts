/**
 * Flyweight — the immutable, shared intrinsic state. Every `TreeType` object
 * is reference-shared across all `Tree` instances that happen to have the
 * same (name, texture, colour) tuple.
 *
 * Immutability is enforced two ways:
 *   1. Fields are `readonly`.
 *   2. `Object.freeze(this)` at the end of the constructor blocks even
 *      `Reflect.set` mutations.
 */
export class TreeType {
  readonly name: string;
  readonly texture: string;
  readonly color: string;

  constructor(name: string, texture: string, color: string) {
    this.name = name;
    this.texture = texture;
    this.color = color;
    Object.freeze(this);
  }

  key(): string {
    return `${this.name}|${this.texture}|${this.color}`;
  }
}
