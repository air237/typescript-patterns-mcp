import { NotifierDecorator } from "./NotifierDecorator.js";

/**
 * Concrete decorator — adds a Slack channel. Composes on top of any other
 * Notifier: `new SlackDecorator(new SmsDecorator(new EmailNotifier()))`
 * sends over email + sms + slack.
 */
export class SlackDecorator extends NotifierDecorator {
  readonly slackSent: string[] = [];

  override send(message: string): void {
    super.send(message);
    this.slackSent.push(`[slack] ${message}`);
  }
}
