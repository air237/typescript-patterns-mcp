import { type Renderer } from "./Renderer.js";
import { Shape } from "./Shape.js";

/**
 * Refined abstraction — a Circle. Its `draw()` delegates to the injected
 * Renderer, never to a subclass hook.
 */
export class Circle extends Shape {
  constructor(renderer: Renderer, private readonly radius: number) {
    super(renderer);
  }

  override draw(): string {
    return this.renderer.renderCircle(this.radius);
  }
}
