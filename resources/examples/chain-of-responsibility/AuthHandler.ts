import { Handler } from "./Handler.js";

/**
 * Concrete handler — accepts `AUTH:*` requests and forwards everything else.
 */
export class AuthHandler extends Handler {
  override handle(request: string): string | null {
    if (request.startsWith("AUTH:")) {
      return `authed(${request.slice(5)})`;
    }
    return this.forward(request);
  }
}
