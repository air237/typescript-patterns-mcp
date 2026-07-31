import { type Renderer } from "./Renderer.js";

/**
 * Abstraction — holds a Renderer via composition, NOT inheritance. This is
 * the whole point of Bridge: Shape's hierarchy grows on the "what" axis
 * while Renderer's grows on the "how" axis, and the two never collide.
 *
 * The `renderer` field is `readonly` — swapping a shape's renderer mid-life
 * is the classic Bridge anti-pattern.
 */
export abstract class Shape {
  constructor(protected readonly renderer: Renderer) {}

  abstract draw(): string;
}
