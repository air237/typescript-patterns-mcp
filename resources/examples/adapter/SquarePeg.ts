/**
 * Adaptee — legacy class with an incompatible surface. It only knows
 * `width()`, not `radius()`, and we do not own its source code.
 */
export class SquarePeg {
  constructor(private readonly _width: number) {}

  width(): number {
    return this._width;
  }
}
