import { type Shape } from "./Shape.js";
import { type ShapeVisitor } from "./ShapeVisitor.js";

/**
 * Concrete element — a Circle. Its `accept()` calls back to
 * `visitor.visitCircle(this)` so the visitor receives the fully-typed
 * concrete element, not the base `Shape`.
 */
export class Circle implements Shape {
  constructor(readonly radius: number) {}

  accept<R>(visitor: ShapeVisitor<R>): R {
    return visitor.visitCircle(this);
  }
}

/**
 * Concrete element — a Square.
 */
export class Square implements Shape {
  constructor(readonly side: number) {}

  accept<R>(visitor: ShapeVisitor<R>): R {
    return visitor.visitSquare(this);
  }
}

/**
 * Sample visitor — renders shapes as SVG strings. Demonstrates that a new
 * operation over the Shape hierarchy needs zero changes to `Circle` or
 * `Square`, just a fresh ShapeVisitor implementation.
 */
export class SvgRenderer implements ShapeVisitor<string> {
  visitCircle(shape: Circle): string {
    return `<circle r="${shape.radius}" />`;
  }
  visitSquare(shape: Square): string {
    return `<rect width="${shape.side}" height="${shape.side}" />`;
  }
}
