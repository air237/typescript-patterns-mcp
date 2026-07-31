import { type RoundPeg } from "./RoundPeg.js";
import { type SquarePeg } from "./SquarePeg.js";

/**
 * Object adapter — exposes a RoundPeg surface over a wrapped SquarePeg. A
 * square's smallest enclosing circle has radius `width * √2 / 2`.
 *
 * The wrapped `adaptee` is `readonly` so the adapter cannot be re-pointed
 * mid-flight — this is the classic anti-pattern the sibling `refactor`
 * recipe (`adapter-make-adaptee-readonly`) will catch on freestyle code.
 */
export class SquarePegAdapter implements RoundPeg {
  constructor(private readonly adaptee: SquarePeg) {}

  radius(): number {
    return (this.adaptee.width() * Math.SQRT2) / 2;
  }
}
