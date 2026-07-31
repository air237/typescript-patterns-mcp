import { type LightState } from "./LightState.js";
import { RedState } from "./RedState.js";

/**
 * Concrete state — Yellow transitions to Red.
 */
export class YellowState implements LightState {
  readonly name = "yellow";

  next(): LightState {
    return new RedState();
  }
}
