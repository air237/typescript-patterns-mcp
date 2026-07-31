import { type Renderer } from "./Renderer.js";

/**
 * Concrete implementor — emits a raster-style caption.
 */
export class RasterRenderer implements Renderer {
  renderCircle(radius: number): string {
    return `[Circle r=${radius} rasterised]`;
  }
  renderSquare(side: number): string {
    return `[Square ${side}x${side} rasterised]`;
  }
}
