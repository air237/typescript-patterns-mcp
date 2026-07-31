import { type ChatMediator } from "./ChatMediator.js";
import { type Colleague } from "./Colleague.js";

/**
 * Concrete mediator — fans messages out to every peer except the sender,
 * and logs the transcript for debugging.
 */
export class ChatRoom implements ChatMediator {
  readonly transcript: string[] = [];
  readonly #members: Colleague[] = [];

  register(colleague: Colleague): void {
    this.#members.push(colleague);
  }

  send(from: Colleague, text: string): void {
    this.transcript.push(`${from.name}: ${text}`);
    // Iterate a snapshot so a `register()` during dispatch is safe.
    for (const peer of [...this.#members]) {
      if (peer !== from) peer.receive(from, text);
    }
  }
}
