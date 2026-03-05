import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  Camera,
  LogIn,
  LogOut,
  Menu,
  Settings,
  ShoppingCart,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { CartDrawer } from "./components/CartDrawer";
import { useCart } from "./hooks/useCart";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { captureAdminToken } from "./utils/urlParams";
import { AdminPanel } from "./views/AdminPanel";
import { AlbumDetail } from "./views/AlbumDetail";
import { AlbumsView } from "./views/AlbumsView";
import { HomeGallery } from "./views/HomeGallery";
import { PaymentFailure } from "./views/PaymentFailure";
import { PaymentSuccess } from "./views/PaymentSuccess";

// Capture admin token immediately on page load before any redirect can strip it from the URL.
// Reads from ?caffeineAdminToken= (query string) or #caffeineAdminToken= (hash) and
// persists to localStorage so it survives the Internet Identity redirect.
if (typeof window !== "undefined") {
  captureAdminToken();
}

// Check path-based routing for payment redirects
function getInitialPaymentView(): "success" | "failure" | null {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname;
  if (path === "/payment-success") return "success";
  if (path === "/payment-failure") return "failure";
  return null;
}

type View =
  | { name: "home" }
  | { name: "albums" }
  | { name: "album"; id: string }
  | { name: "admin" };

// Seed data is disabled — the user has real content and doesn't need demo data.
function useSeededData() {
  // no-op
}

// ── Navigation ────────────────────────────────────────────────────────────────

interface NavProps {
  currentView: View;
  onNavigate: (view: View) => void;
  onCartOpen: () => void;
}

function Nav({ currentView, onNavigate, onCartOpen }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { identity, login, clear, isLoggingIn } = useInternetIdentity();
  const { cartCount } = useCart();
  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();

  const navLinks = [
    { label: "Galería", view: { name: "home" } as View },
    { label: "Álbumes", view: { name: "albums" } as View },
  ];

  function isActive(view: View): boolean {
    return view.name === currentView.name;
  }

  function handleNav(view: View) {
    onNavigate(view);
    setMenuOpen(false);
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40"
      style={{
        background: "oklch(0.082 0.004 285 / 0.82)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        borderBottom: "1px solid oklch(0.20 0.006 285 / 0.5)",
        boxShadow: "0 1px 0 oklch(0.78 0.14 75 / 0.04)",
      }}
      data-ocid="nav.section"
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          onClick={() => handleNav({ name: "home" })}
          className="flex items-center gap-2.5 group"
          data-ocid="nav.link"
          aria-label="Ir a la galería principal"
        >
          <Camera className="w-4 h-4 text-gold group-hover:text-gold-glow transition-colors" />
          <span className="font-display text-sm font-light tracking-[0.12em] text-foreground group-hover:text-primary transition-colors uppercase">
            labellezaoculta
          </span>
        </button>

        {/* Right side: desktop nav links + cart + auth buttons */}
        <div className="flex items-center gap-1">
          {/* Desktop-only nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                type="button"
                key={link.label}
                onClick={() => handleNav(link.view)}
                className={`px-4 py-1.5 text-xs font-mono uppercase tracking-widest transition-all duration-200 rounded-sm ${
                  isActive(link.view)
                    ? "text-gold bg-primary/10"
                    : "text-text-dim hover:text-foreground hover:bg-surface-2"
                }`}
                data-ocid={`nav.${link.label.toLowerCase()}.link`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Cart button */}
          <button
            type="button"
            onClick={onCartOpen}
            className="relative ml-1 p-2 text-text-dim hover:text-foreground hover:bg-surface-2 rounded-sm transition-all duration-200"
            aria-label={`Carrito (${cartCount} artículos)`}
            data-ocid="nav.toggle"
          >
            <ShoppingCart className="w-4 h-4" />
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] font-bold"
                style={{
                  background: "oklch(0.78 0.14 75)",
                  color: "oklch(0.10 0.004 285)",
                }}
              >
                {cartCount > 9 ? "9+" : cartCount}
              </motion.span>
            )}
          </button>

          {/* Always-visible: Admin settings icon (when logged in) */}
          {isLoggedIn && (
            <button
              type="button"
              onClick={() => handleNav({ name: "admin" })}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest transition-all duration-200 rounded-sm flex items-center gap-1.5 ${
                currentView.name === "admin"
                  ? "text-gold bg-primary/10"
                  : "text-text-dim hover:text-foreground hover:bg-surface-2"
              }`}
              data-ocid="nav.admin.link"
              aria-label="Panel de administración"
            >
              <Settings className="w-3 h-3" />
              <span>Admin</span>
            </button>
          )}

          {/* Always-visible: Login/Logout button */}
          {isLoggedIn ? (
            <button
              type="button"
              onClick={clear}
              className="ml-1 px-3 py-1.5 text-xs font-mono uppercase tracking-widest transition-all duration-200 rounded-sm border border-border/30 text-text-dim hover:text-foreground hover:bg-surface-2 flex items-center gap-1.5"
              data-ocid="nav.logout.button"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-3 h-3" />
              <span>Salir</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={login}
              disabled={isLoggingIn}
              className="ml-1 px-3 py-1.5 text-xs font-mono uppercase tracking-widest transition-all duration-200 rounded-sm border border-gold/40 text-gold hover:bg-gold/10 hover:border-gold/60 disabled:opacity-50 flex items-center gap-1.5"
              data-ocid="nav.login.button"
              aria-label="Iniciar sesión como administrador"
            >
              {isLoggingIn ? (
                <>
                  <span className="w-3 h-3 border border-gold/50 border-t-gold rounded-full animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3 h-3" />
                  <span>Admin</span>
                </>
              )}
            </button>
          )}

          {/* Mobile hamburger (for nav links only) */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden text-text-dim hover:text-foreground ml-1"
            onClick={() => setMenuOpen(!menuOpen)}
            data-ocid="nav.secondary_button"
            aria-label="Abrir menú"
          >
            {menuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="sm:hidden border-t border-border/20 bg-background/95 backdrop-blur-sm"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <button
                  type="button"
                  key={link.label}
                  onClick={() => handleNav(link.view)}
                  className={`w-full text-left px-3 py-2 text-sm font-mono uppercase tracking-widest transition-colors rounded-sm ${
                    isActive(link.view)
                      ? "text-gold bg-primary/10"
                      : "text-text-dim hover:text-foreground hover:bg-surface-2"
                  }`}
                  data-ocid={`nav.mobile.${link.label.toLowerCase()}.link`}
                >
                  {link.label}
                </button>
              ))}
              {isLoggedIn && (
                <button
                  type="button"
                  onClick={() => handleNav({ name: "admin" })}
                  className={`w-full text-left px-3 py-2 text-sm font-mono uppercase tracking-widest transition-colors rounded-sm flex items-center gap-2 ${
                    currentView.name === "admin"
                      ? "text-gold bg-primary/10"
                      : "text-text-dim hover:text-foreground hover:bg-surface-2"
                  }`}
                  data-ocid="nav.mobile.admin.link"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Administración
                </button>
              )}

              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    clear();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-mono uppercase tracking-widest transition-colors rounded-sm flex items-center gap-2 text-text-dim hover:text-foreground hover:bg-surface-2"
                  data-ocid="nav.mobile.logout.button"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar sesión
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    login();
                    setMenuOpen(false);
                  }}
                  disabled={isLoggingIn}
                  className="w-full text-left px-3 py-2 text-sm font-mono uppercase tracking-widest transition-colors rounded-sm flex items-center gap-2 text-gold hover:bg-gold/10 disabled:opacity-50"
                  data-ocid="nav.mobile.login.button"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {isLoggingIn ? "Entrando..." : "Iniciar sesión (Admin)"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/20 mt-16 py-8 px-6 text-center">
      <p className="text-text-subtle font-mono text-xs">
        © {year}.{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gold transition-colors duration-200"
        >
          Built with ♥ using caffeine.ai
        </a>
      </p>
    </footer>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [currentView, setCurrentView] = useState<View>({ name: "home" });
  const [cartOpen, setCartOpen] = useState(false);

  // Path-based routing for Stripe payment redirects
  const paymentView = getInitialPaymentView();

  useSeededData();

  const handleNavigate = useCallback((view: View) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  function renderView() {
    switch (currentView.name) {
      case "home":
        return <HomeGallery />;
      case "albums":
        return (
          <AlbumsView
            onAlbumClick={(id) => handleNavigate({ name: "album", id })}
          />
        );
      case "album":
        return (
          <AlbumDetail
            albumId={currentView.id}
            onBack={() => handleNavigate({ name: "albums" })}
          />
        );
      case "admin":
        return <AdminPanel />;
      default:
        return <HomeGallery />;
    }
  }

  // If the user was redirected from Stripe, show the payment result page
  function goHome() {
    window.location.assign("/");
  }

  if (paymentView === "success") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Nav
          currentView={currentView}
          onNavigate={handleNavigate}
          onCartOpen={() => setCartOpen(true)}
        />
        <div className="flex-1">
          <PaymentSuccess onContinue={goHome} />
        </div>
        <Footer />
        <Toaster theme="dark" richColors position="bottom-right" />
        <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      </div>
    );
  }

  if (paymentView === "failure") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Nav
          currentView={currentView}
          onNavigate={handleNavigate}
          onCartOpen={() => setCartOpen(true)}
        />
        <div className="flex-1">
          <PaymentFailure onContinue={goHome} />
        </div>
        <Footer />
        <Toaster theme="dark" richColors position="bottom-right" />
        <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav
        currentView={currentView}
        onNavigate={handleNavigate}
        onCartOpen={() => setCartOpen(true)}
      />

      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView.name + ("id" in currentView ? currentView.id : "")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>

      <Footer />
      <Toaster theme="dark" richColors position="bottom-right" />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
