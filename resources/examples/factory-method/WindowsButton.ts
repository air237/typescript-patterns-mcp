import { type Button } from "./Button.js";

/**
 * Concrete product — Windows flavour.
 */
export class WindowsButton implements Button {
  render(): string {
    return "[ Click me ]";
  }

  onClick(handler: () => void): void {
    handler();
  }
}
