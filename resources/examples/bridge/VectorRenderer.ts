import { type Renderer } from "./Renderer.js";

/**
 * Concrete implementor — emits SVG-style output.
 */
export class VectorRenderer implements Renderer {
  renderCircle(radius: number): string {
    return `<circle r="${radius}" />`;
  }
  renderSquare(side: number): string {
    return `<rect width="${side}" height="${side}" />`;
  }
}
