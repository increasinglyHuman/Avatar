/**
 * Detect whether Avatar is running inside an iframe.
 * Direct port from Glitch's EmbedDetection.ts.
 */
export function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function getParentOrigin(): string | null {
  if (!isEmbedded()) return null;
  try {
    const url = new URL(document.referrer);
    return url.origin;
  } catch {
    return null;
  }
}
