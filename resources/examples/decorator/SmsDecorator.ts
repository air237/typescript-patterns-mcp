import { NotifierDecorator } from "./NotifierDecorator.js";

/**
 * Concrete decorator — adds an SMS channel on top of any Notifier. The
 * `super.send(...)` call is the key ingredient: it forwards to the wrapped
 * component so decorators can stack.
 */
export class SmsDecorator extends NotifierDecorator {
  readonly smsSent: string[] = [];

  override send(message: string): void {
    super.send(message);
    this.smsSent.push(`[sms] ${message}`);
  }
}
