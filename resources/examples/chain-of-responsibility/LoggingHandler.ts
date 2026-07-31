import { Handler } from "./Handler.js";

/**
 * Concrete handler — accepts `LOG:*` requests, forwards otherwise.
 */
export class LoggingHandler extends Handler {
  readonly entries: string[] = [];

  override handle(request: string): string | null {
    if (request.startsWith("LOG:")) {
      const line = request.slice(4);
      this.entries.push(line);
      return `logged(${line})`;
    }
    return this.forward(request);
  }
}
