/**
 * Shared surface — both the real subject and the proxy implement it, so the
 * caller never distinguishes between them.
 *
 * NOTE: this is the GoF Proxy pattern, not JavaScript's built-in `Proxy`
 * primitive (though the primitive is one valid vehicle for implementing it).
 */
export interface Service {
  fetch(key: string): string;
}
