import { type LightState } from "./LightState.js";
import { GreenState } from "./GreenState.js";

/**
 * Concrete state — Red transitions to Green.
 */
export class RedState implements LightState {
  readonly name = "red";

  next(): LightState {
    return new GreenState();
  }
}
