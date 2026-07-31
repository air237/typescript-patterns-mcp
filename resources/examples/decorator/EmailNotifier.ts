import { type Notifier } from "./Notifier.js";

/**
 * Concrete component — the plain base behaviour with no wrapping.
 */
export class EmailNotifier implements Notifier {
  readonly sent: string[] = [];

  send(message: string): void {
    this.sent.push(`[email] ${message}`);
  }
}
