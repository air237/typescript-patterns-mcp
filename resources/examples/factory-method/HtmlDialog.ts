import { type Button } from "./Button.js";
import { Dialog } from "./Dialog.js";
import { HtmlButton } from "./HtmlButton.js";

/**
 * Concrete creator — decides the product family (HTML).
 */
export class HtmlDialog extends Dialog {
  protected override createButton(): Button {
    return new HtmlButton();
  }
}
