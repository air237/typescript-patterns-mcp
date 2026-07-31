import { type Renderer } from "./Renderer.js";
import { Shape } from "./Shape.js";

/**
 * Refined abstraction — a Square.
 */
export class Square extends Shape {
  constructor(renderer: Renderer, private readonly side: number) {
    super(renderer);
  }

  override draw(): string {
    return this.renderer.renderSquare(this.side);
  }
}
