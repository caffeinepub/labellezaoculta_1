import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Camera, LogIn, LogOut, Menu, Settings, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { AdminPanel } from "./views/AdminPanel";
import { AlbumDetail } from "./views/AlbumDetail";
import { AlbumsView } from "./views/AlbumsView";
import { HomeGallery } from "./views/HomeGallery";

type View =
  | { name: "home" }
  | { name: "albums" }
  | { name: "album"; id: string }
  | { name: "admin" };

function useSeededData() {
  const { actor, isFetching } = useActor();

  useEffect(() => {
    if (!actor || isFetching) return;
    const key = "labellezaoculta_seeded_v1";
    if (localStorage.getItem(key)) return;
    actor
      .seedData()
      .then(() => localStorage.setItem(key, "1"))
      .catch(() => {
        /* ignore seed errors in production */
      });
  }, [actor, isFetching]);
}

// ── Navigation ────────────────────────────────────────────────────────────────

interface NavProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

function Nav({ currentView, onNavigate }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { identity, login, clear, isLoggingIn } = useInternetIdentity();
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

        {/* Desktop links */}
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

          {isLoggedIn && (
            <button
              type="button"
              onClick={() => handleNav({ name: "admin" })}
              className={`p-2 transition-all duration-200 rounded-sm ml-1 ${
                currentView.name === "admin"
                  ? "text-gold bg-primary/10"
                  : "text-text-dim hover:text-foreground hover:bg-surface-2"
              }`}
              data-ocid="nav.admin.link"
              aria-label="Panel de administración"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

          {isLoggedIn ? (
            <button
              type="button"
              onClick={clear}
              className="p-2 transition-all duration-200 rounded-sm ml-1 text-text-dim hover:text-foreground hover:bg-surface-2"
              data-ocid="nav.logout.button"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={login}
              disabled={isLoggingIn}
              className="ml-2 px-3 py-1.5 text-xs font-mono uppercase tracking-widest transition-all duration-200 rounded-sm border border-gold/30 text-gold hover:bg-gold/10 disabled:opacity-50"
              data-ocid="nav.login.button"
              aria-label="Iniciar sesión"
            >
              {isLoggingIn ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border border-gold/50 border-t-gold rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <LogIn className="w-3 h-3" />
                  Admin
                </span>
              )}
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden text-text-dim hover:text-foreground"
          onClick={() => setMenuOpen(!menuOpen)}
          data-ocid="nav.toggle"
          aria-label="Abrir menú"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav currentView={currentView} onNavigate={handleNavigate} />

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
    </div>
  );
}
