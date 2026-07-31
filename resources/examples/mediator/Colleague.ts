import { type ChatMediator } from "./ChatMediator.js";

/**
 * Colleague base — knows only its mediator, never a peer. The `mediator`
 * field is `readonly` so a colleague cannot be silently reassigned to a
 * different room mid-life.
 */
export abstract class Colleague {
  readonly received: string[] = [];

  constructor(
    readonly name: string,
    protected readonly mediator: ChatMediator,
  ) {}

  send(text: string): void {
    this.mediator.send(this, text);
  }

  receive(from: Colleague, text: string): void {
    this.received.push(`${from.name}: ${text}`);
  }
}
