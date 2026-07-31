import { GreenState } from "./GreenState.js";
import { type LightState } from "./LightState.js";

/**
 * Context — holds the current state and delegates `tick()` to it. All the
 * client sees is `.currentName()` — the state graph is invisible.
 *
 * `#state` is the mutable field the State pattern deliberately keeps
 * private; only `tick()` may rotate it.
 */
export class TrafficLight {
  #state: LightState = new GreenState();

  currentName(): string {
    return this.#state.name;
  }

  tick(): void {
    this.#state = this.#state.next();
  }
}
