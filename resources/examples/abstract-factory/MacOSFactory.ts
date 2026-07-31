import { type Button } from "./Button.js";
import { type Checkbox } from "./Checkbox.js";
import { type GUIFactory } from "./GUIFactory.js";

/**
 * Concrete factory producing macOS-styled products.
 */
class MacOSButton implements Button {
  paint(): string {
    return "( macOS button )";
  }
}
class MacOSCheckbox implements Checkbox {
  paint(): string {
    return "☑ macOS checkbox";
  }
}

export class MacOSFactory implements GUIFactory {
  createButton(): Button {
    return new MacOSButton();
  }
  createCheckbox(): Checkbox {
    return new MacOSCheckbox();
  }
}
