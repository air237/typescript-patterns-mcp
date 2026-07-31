import { Shape } from "./Shape.js";

/**
 * Concrete prototype — extends the copy-constructor chain and honours the
 * `clone()` contract by returning a `Circle`, not a bare `Shape`.
 */
export class Circle extends Shape {
  radius: number;

  constructor(source: Circle | { x: number; y: number; color: string; radius: number }) {
    super(source);
    this.radius = source.radius;
  }

  override clone(): Circle {
    return new Circle(this);
  }

  equals(other: Circle): boolean {
    return this.equalsBase(other) && this.radius === other.radius;
  }
}
