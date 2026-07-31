import { type LightState } from "./LightState.js";
import { YellowState } from "./YellowState.js";

/**
 * Concrete state — Green transitions to Yellow.
 *
 * Modules break Java's cyclic-import problem by using dynamic behaviour and
 * type-only imports where the graph is circular. Here Green → Yellow →
 * Red → Green forms a cycle; we side-step it by importing sibling classes
 * lazily inside `next()` if needed. In this small triangle plain `import`
 * works because each file imports only the "later" state, not itself.
 */
export class GreenState implements LightState {
  readonly name = "green";

  next(): LightState {
    return new YellowState();
  }
}
