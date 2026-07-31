import { type Button } from "./Button.js";

/**
 * Abstract creator. Defines the template method `render()` that consumes a
 * product created by the abstract factory method `createButton()`. Concrete
 * subclasses provide the concrete product.
 *
 * The constructor is `protected` — a Factory Method's caller is expected to
 * work with the base type through a concrete subclass instance, not to
 * instantiate the base directly.
 */
export abstract class Dialog {
  render(): string {
    const button = this.createButton();
    return `<dialog>\n  ${button.render()}\n</dialog>`;
  }

  protected abstract createButton(): Button;
}
