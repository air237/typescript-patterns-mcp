import { type Button } from "./Button.js";
import { type Checkbox } from "./Checkbox.js";

/**
 * Abstract factory declaring the whole family. Every concrete implementation
 * MUST provide a Button and a Checkbox that fit together.
 */
export interface GUIFactory {
  createButton(): Button;
  createCheckbox(): Checkbox;
}
