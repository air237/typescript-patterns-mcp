/**
 * State — every concrete traffic-light state implements this. The Context
 * (TrafficLight) delegates its behaviour to whichever state is current.
 *
 * Each state's `next()` returns the state the Context should transition to,
 * so the state graph is authoritative and closed to external modification.
 */
export interface LightState {
  readonly name: string;
  next(): LightState;
}
