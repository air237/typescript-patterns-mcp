/**
 * Visitor interface — one `visit*` overload per concrete element type.
 * Adding a new visitor is a matter of implementing this interface; adding
 * a new element type requires touching the interface and every visitor —
 * that trade-off is intentional in the pattern.
 */
export interface ShapeVisitor<R> {
  visitCircle(shape: import("./Shapes.js").Circle): R;
  visitSquare(shape: import("./Shapes.js").Square): R;
}
