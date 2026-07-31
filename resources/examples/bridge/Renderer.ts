/**
 * Implementor — the low-level drawing API. Renderer is the "implementation"
 * side of the Bridge; concrete Renderers vary independently from concrete
 * Shapes.
 */
export interface Renderer {
  renderCircle(radius: number): string;
  renderSquare(side: number): string;
}
