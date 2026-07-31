import { type RoundPeg } from "./RoundPeg.js";

/**
 * Client — knows only about RoundPeg, never learns that the peg might
 * actually be a wrapped SquarePeg.
 */
export class RoundHole {
  constructor(private readonly _radius: number) {}

  radius(): number {
    return this._radius;
  }

  fits(peg: RoundPeg): boolean {
    return this._radius >= peg.radius();
  }
}
