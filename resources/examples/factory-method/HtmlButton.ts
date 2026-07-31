import { type Button } from "./Button.js";

/**
 * Concrete product — HTML flavour.
 */
export class HtmlButton implements Button {
  render(): string {
    return "<button>Click me</button>";
  }

  onClick(handler: () => void): void {
    // In a real HTML button this would wire up an event listener.
    handler();
  }
}
