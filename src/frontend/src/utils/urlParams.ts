/**
 * Utility functions for parsing and managing URL parameters.
 * The Caffeine platform injects the admin token as a regular query-string
 * parameter: ?caffeineAdminToken=<value>
 *
 * Internet Identity redirects wipe the query string, so we must save the
 * token to localStorage **before** triggering the II flow.
 */

const ADMIN_TOKEN_KEY = "caffeine_admin_token";

// ── Low-level helpers ────────────────────────────────────────────────────────

/**
 * Read a named parameter from the current URL.
 * Checks the regular query string first, then the hash fragment.
 */
export function getUrlParameter(paramName: string): string | null {
  // 1. Regular query string: ?key=value
  const qs = new URLSearchParams(window.location.search);
  const fromQs = qs.get(paramName);
  if (fromQs !== null) return fromQs;

  // 2. Hash fragment: #key=value  or  #/path?key=value
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    const hashContent = hash.substring(1);
    const qIdx = hashContent.indexOf("?");
    const hashQuery =
      qIdx !== -1 ? hashContent.substring(qIdx + 1) : hashContent;
    const fromHash = new URLSearchParams(hashQuery).get(paramName);
    if (fromHash !== null) return fromHash;
  }

  return null;
}

// ── Admin-token helpers (localStorage) ──────────────────────────────────────

/**
 * Read the admin token from the URL and persist it to localStorage.
 * Call this ONCE at the very top of App.tsx (before any React render),
 * so the token is saved before Internet Identity redirects away.
 */
export function captureAdminToken(): void {
  try {
    const token = getUrlParameter("caffeineAdminToken");
    if (token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      // Scrub the token from the visible URL bar without a page reload
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("caffeineAdminToken");
        window.history.replaceState(null, "", url.toString());
      } catch {
        // best-effort
      }
    }
  } catch {
    // localStorage may be blocked (private mode, etc.) — silently ignore
  }
}

/**
 * Retrieve the previously-captured admin token from localStorage.
 */
export function getStoredAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Remove the admin token from localStorage (e.g. after logout).
 */
export function clearStoredAdminToken(): void {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // ignore
  }
}

// ── Legacy helpers (kept for backward-compatibility) ─────────────────────────

/** @deprecated Use getStoredAdminToken() instead. */
export function getSessionParameter(key: string): string | null {
  try {
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** @deprecated Use captureAdminToken() instead. */
export function storeSessionParameter(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

/** @deprecated Use clearStoredAdminToken() instead. */
export function clearSessionParameter(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Returns the admin token from: URL query string → localStorage.
 * This replaces the old hash-only implementation.
 */
export function getPersistedUrlParameter(
  paramName: string,
  _storageKey?: string,
): string | null {
  const fromUrl = getUrlParameter(paramName);
  if (fromUrl !== null) return fromUrl;
  return getSessionParameter(paramName);
}

/**
 * Gets the admin token for the authorization component.
 * Reads from localStorage (where captureAdminToken saved it).
 */
export function getSecretParameter(paramName: string): string | null {
  // First try the URL (in case we're on the initial load and captureAdminToken
  // hasn't been called yet for some reason)
  const fromUrl = getUrlParameter(paramName);
  if (fromUrl !== null) return fromUrl;

  // Fall back to localStorage
  return getStoredAdminToken();
}
