import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import { InternetIdentityProvider } from "./hooks/useInternetIdentity";
import "../index.css";

// Persist the Caffeine admin token from the URL hash into sessionStorage
// immediately on load — before React mounts — so it survives Internet Identity
// redirects that may clear or change the hash.
(function persistCaffeineToken() {
  try {
    const SESSION_KEY = "caffeineAdminToken";
    // Check if already stored
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // Try query string first: ?caffeineAdminToken=xxx
    const qp = new URLSearchParams(window.location.search);
    const fromQuery = qp.get(SESSION_KEY);
    if (fromQuery) {
      sessionStorage.setItem(SESSION_KEY, fromQuery);
      return;
    }

    // Try hash: #caffeineAdminToken=xxx  or  #/route?caffeineAdminToken=xxx
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const hashContent = hash.substring(1);
      const qIdx = hashContent.indexOf("?");
      const searchStr =
        qIdx === -1 ? hashContent : hashContent.substring(qIdx + 1);
      const hp = new URLSearchParams(searchStr);
      const fromHash = hp.get(SESSION_KEY);
      if (fromHash) {
        sessionStorage.setItem(SESSION_KEY, fromHash);
      }
    }
  } catch {
    // sessionStorage not available — silently ignore
  }
})();

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <InternetIdentityProvider>
      <App />
    </InternetIdentityProvider>
  </QueryClientProvider>,
);
