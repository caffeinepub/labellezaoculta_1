/**
 * Utility functions for parsing and managing URL parameters.
 * Handles the Caffeine admin token which is injected as ?caffeineAdminToken=...
 * in the query string. This token must be saved to localStorage before
 * Internet Identity redirects (which strips the query string).
 */

const ADMIN_TOKEN_KEY = "caffeine_admin_token";

/**
 * Reads the admin token from the URL (query string or hash) and saves it
 * to localStorage for persistence across Internet Identity redirects.
 * Call this as early as possible on page load.
 */
export function captureAdminToken(): void {
  try {
    // Check query string: ?caffeineAdminToken=xxx
    const urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get("caffeineAdminToken");

    // Fallback: check hash fragment: #caffeineAdminToken=xxx or #/path?caffeineAdminToken=xxx
    if (!token) {
      const hash = window.location.hash;
      if (hash && hash.length > 1) {
        const hashContent = hash.substring(1);
        // Try as direct hash params: #caffeineAdminToken=xxx
        const hashParams = new URLSearchParams(hashContent);
        token = hashParams.get("caffeineAdminToken");

        // Try as hash query: #/path?caffeineAdminToken=xxx
        if (!token) {
          const qIdx = hashContent.indexOf("?");
          if (qIdx !== -1) {
            const hashQuery = new URLSearchParams(
              hashContent.substring(qIdx + 1),
            );
            token = hashQuery.get("caffeineAdminToken");
          }
        }
      }
    }

    if (token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    }
  } catch {
    // silently ignore storage errors
  }
}

/**
 * Returns the stored admin token from localStorage.
 */
export function getStoredAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Clears the admin token from localStorage.
 */
export function clearStoredAdminToken(): void {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // silently ignore
  }
}

/**
 * Gets the admin token for use during actor initialization.
 * Reads from localStorage first (persisted across redirects), then URL.
 * This is the function used by useActor.ts.
 */
export function getSecretParameter(paramName: string): string | null {
  // For the admin token specifically, use the persisted value
  if (paramName === "caffeineAdminToken") {
    const stored = getStoredAdminToken();
    if (stored) return stored;
  }

  // Read from query string
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const val = urlParams.get(paramName);
    if (val) return val;
  } catch {
    // ignore
  }

  // Read from hash
  try {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const hashContent = hash.substring(1);
      const hashParams = new URLSearchParams(hashContent);
      const val = hashParams.get(paramName);
      if (val) return val;

      const qIdx = hashContent.indexOf("?");
      if (qIdx !== -1) {
        const hashQuery = new URLSearchParams(hashContent.substring(qIdx + 1));
        const val2 = hashQuery.get(paramName);
        if (val2) return val2;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Extracts a URL parameter from the current URL.
 * Works with both query strings and hash-based routing.
 */
export function getUrlParameter(paramName: string): string | null {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const val = urlParams.get(paramName);
    if (val !== null) return val;

    const hash = window.location.hash;
    const queryStartIndex = hash.indexOf("?");
    if (queryStartIndex !== -1) {
      const hashQuery = hash.substring(queryStartIndex + 1);
      return new URLSearchParams(hashQuery).get(paramName);
    }
  } catch {
    // ignore
  }
  return null;
}
