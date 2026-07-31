import { type ShapeVisitor } from "./ShapeVisitor.js";

/**
 * Element interface — every concrete shape MUST call `visitor.visit<Self>(this)`
 * inside its `accept()` implementation. That callback is the "double
 * dispatch" the pattern gets its power from.
 *
 * The `visitor-*` validator (Phase 9) flags freestyle Visitor code where
 * `accept()` does not correctly dispatch to the matching `visit*` overload.
 */
export interface Shape {
  accept<R>(visitor: ShapeVisitor<R>): R;
}
