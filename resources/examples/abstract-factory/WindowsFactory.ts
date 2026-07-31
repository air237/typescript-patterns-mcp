import { type Button } from "./Button.js";
import { type Checkbox } from "./Checkbox.js";
import { type GUIFactory } from "./GUIFactory.js";

/**
 * Concrete factory producing Windows-styled products. Both products are
 * `final` (implicit in TS: not extended anywhere) and always come from the
 * same family, never mixed with macOS parts.
 */
class WindowsButton implements Button {
  paint(): string {
    return "[ Windows button ]";
  }
}
class WindowsCheckbox implements Checkbox {
  paint(): string {
    return "[x] Windows checkbox";
  }
}

export class WindowsFactory implements GUIFactory {
  createButton(): Button {
    return new WindowsButton();
  }
  createCheckbox(): Checkbox {
    return new WindowsCheckbox();
  }
}
