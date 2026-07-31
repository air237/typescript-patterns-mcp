import { type Notifier } from "./Notifier.js";

/**
 * Base decorator — holds the wrapped Notifier as a `readonly` field and
 * forwards `send()` by default. Concrete decorators override to add
 * behaviour on top of the forwarded call.
 */
export abstract class NotifierDecorator implements Notifier {
  constructor(protected readonly wrapped: Notifier) {}

  send(message: string): void {
    this.wrapped.send(message);
  }
}
