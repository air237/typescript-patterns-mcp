import { type Button } from "./Button.js";
import { Dialog } from "./Dialog.js";
import { WindowsButton } from "./WindowsButton.js";

/**
 * Concrete creator — decides the product family (Windows).
 */
export class WindowsDialog extends Dialog {
  protected override createButton(): Button {
    return new WindowsButton();
  }
}
