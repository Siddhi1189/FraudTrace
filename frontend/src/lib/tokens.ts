/**
 * Runtime Design Token Helper
 * Reads token values directly from :root CSS variables at runtime.
 * Used for canvas renderers (Cytoscape.js) and SVG charting (Recharts).
 * Strictly contains NO hex values; all token definitions live exclusively in index.css.
 */

export function getToken(varName: string): string {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const property = varName.startsWith('--') ? varName : `--${varName}`;
    const value = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
    if (value) {
      return value;
    }
  }
  return '';
}

/**
 * Accessor object returning dynamic token getters for Cytoscape and chart engines.
 */
export const graphTokens = {
  get nodeAccount() { return getToken('--node-account'); },
  get nodeDevice() { return getToken('--node-device'); },
  get nodeMerchant() { return getToken('--node-merchant'); },
  get edgeDefault() { return getToken('--edge-default'); },
  get edgeSuspicious() { return getToken('--edge-suspicious'); },
  get canvasBg() { return getToken('--graph-canvas-bg'); },
  get gridDot() { return getToken('--graph-grid-dot'); },
  get textPrimary() { return getToken('--text'); },
  get textMuted() { return getToken('--text-2'); },
  get border() { return getToken('--border'); },
  get borderStrong() { return getToken('--border-strong'); },
  get primary() { return getToken('--primary'); },
  get surface() { return getToken('--surface'); },
  get sevLow() { return getToken('--sev-low'); },
  get sevMedium() { return getToken('--sev-medium'); },
  get sevHigh() { return getToken('--sev-high'); },
  get sevCritical() { return getToken('--sev-critical'); },
  get accent() { return getToken('--accent'); },
  get onPrimary() { return getToken('--on-primary'); },
  get onSecondary() { return getToken('--on-secondary'); },
  get onGhost() { return getToken('--on-ghost'); },
  get onDanger() { return getToken('--on-danger'); },
  get fontUi() { return getToken('--font-ui') || 'Poppins, sans-serif'; },
  get fontDisplay() { return getToken('--font-display') || 'EB Garamond, serif'; },
  get fontMono() { return getToken('--font-mono') || 'JetBrains Mono, monospace'; },
};
