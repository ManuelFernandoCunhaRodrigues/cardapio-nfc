const STORAGE_KEY = 'salgae:product-origin';

type ProductOrigin = { source: string; destination: string; createdAt: number };

export function rememberProductOrigin(destination: string) {
  if (typeof window === 'undefined') return;
  const value: ProductOrigin = { source: window.location.href, destination: new URL(destination, window.location.origin).href, createdAt: Date.now() };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function hasInternalProductOrigin(currentUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const value = JSON.parse(raw) as ProductOrigin;
      const sameOrigin = new URL(value.source).origin === window.location.origin;
      const sameDestination = new URL(value.destination).pathname === new URL(currentUrl).pathname;
      if (sameOrigin && sameDestination && Date.now() - value.createdAt < 60 * 60 * 1_000) return true;
    }
    return Boolean(document.referrer) && new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function clearProductOrigin() {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(STORAGE_KEY);
}
