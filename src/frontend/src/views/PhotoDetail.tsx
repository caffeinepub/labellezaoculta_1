import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  X,
  ZoomIn,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Photo } from "../backend.d";
import { useCart } from "../hooks/useCart";
import { useAlbum } from "../hooks/useQueries";
import {
  getDemoPlaceholderImage,
  getImageUrl,
  isDemo,
} from "../utils/imageUtils";

// Fetch image bytes and return a blob object URL so the browser always
// gets a properly typed image regardless of the server's Content-Type header.
async function fetchAsObjectUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let mime = "image/jpeg";
    if (bytes[0] === 0x89 && bytes[1] === 0x50) mime = "image/png";
    else if (bytes[0] === 0x47 && bytes[1] === 0x49) mime = "image/gif";
    else if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42
    )
      mime = "image/webp";
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

interface PhotoDetailProps {
  photo: Photo;
  allPhotos: Photo[];
  onClose: () => void;
  onNavigate: (photo: Photo) => void;
}

function NavArrow({
  direction,
  onClick,
  label,
  dataOcid,
}: {
  direction: "left" | "right";
  onClick: () => void;
  label: string;
  dataOcid: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-ocid={dataOcid}
      className="group flex items-center justify-center w-11 h-11 rounded-full"
      style={{
        background: "oklch(0.13 0.006 285 / 0.7)",
        backdropFilter: "blur(12px)",
        border: "1px solid oklch(0.28 0.008 285 / 0.6)",
        boxShadow: "0 4px 24px oklch(0 0 0 / 0.5)",
      }}
      whileHover={{
        scale: 1.08,
        backgroundColor: "oklch(0.18 0.008 285 / 0.85)",
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      {direction === "left" ? (
        <ChevronLeft className="w-5 h-5 text-text-dim group-hover:text-foreground transition-colors duration-150" />
      ) : (
        <ChevronRight className="w-5 h-5 text-text-dim group-hover:text-foreground transition-colors duration-150" />
      )}
    </motion.button>
  );
}

export function PhotoDetail({
  photo,
  allPhotos,
  onClose,
  onNavigate,
}: PhotoDetailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{
    mouseX: number;
    mouseY: number;
    posX: number;
    posY: number;
  } | null>(null);

  const { data: album } = useAlbum(photo.albumId);
  const { addToCart, cartItems } = useCart();

  const isForSale = photo.price > BigInt(0);
  const inCart = cartItems.some((i) => i.photo.id === photo.id);

  const currentIndex = allPhotos.findIndex((p) => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allPhotos.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(allPhotos[currentIndex - 1]);
  }, [hasPrev, currentIndex, allPhotos, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(allPhotos[currentIndex + 1]);
  }, [hasNext, currentIndex, allPhotos, onNavigate]);

  useEffect(() => {
    let cancelled = false;
    setImageLoaded(false);
    setZoom(100);
    setPosition({ x: 0, y: 0 });
    const idx = allPhotos.findIndex((p) => p.id === photo.id);
    if (isDemo(photo.blobId)) {
      setImageUrl(getDemoPlaceholderImage(Math.max(idx, 0)));
    } else {
      getImageUrl(photo.blobId).then(async (directUrl) => {
        if (cancelled || !directUrl) return;
        // Fetch as blob URL so the browser gets the correct Content-Type
        const objUrl = await fetchAsObjectUrl(directUrl);
        if (!cancelled) setImageUrl(objUrl ?? directUrl);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [photo.blobId, photo.id, allPhotos]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, goPrev, goNext]);

  // Reset position when zoom goes back to 100
  useEffect(() => {
    if (zoom === 100) setPosition({ x: 0, y: 0 });
  }, [zoom]);

  const canDrag = zoom > 100;
  const scale = zoom / 100;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!canDrag) return;
      e.preventDefault();
      setIsDragging(true);
      dragStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [canDrag, position],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragStart.current) return;
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      setPosition({
        x: dragStart.current.posX + dx,
        y: dragStart.current.posY + dy,
      });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStart.current = null;
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        data-ocid="photo.modal"
      >
        {/* True-black cinematic backdrop */}
        <motion.div
          className="absolute inset-0 cursor-zoom-out"
          style={{
            background: "oklch(0.04 0.002 285 / 0.98)",
            backdropFilter: "blur(2px)",
          }}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        />

        {/* ── Top bar: counter + close ──────────────────── */}
        <div
          className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-4"
          style={{
            background:
              "linear-gradient(to bottom, oklch(0.04 0.002 285 / 0.8), transparent)",
          }}
        >
          <span className="font-mono text-xs tracking-widest text-text-subtle uppercase">
            {String(currentIndex + 1).padStart(2, "0")} /{" "}
            {String(allPhotos.length).padStart(2, "0")}
          </span>

          <motion.button
            type="button"
            onClick={onClose}
            data-ocid="photo.close_button"
            aria-label="Cerrar"
            className="group flex items-center justify-center w-9 h-9 rounded-full"
            style={{
              background: "oklch(0.13 0.006 285 / 0.7)",
              backdropFilter: "blur(12px)",
              border: "1px solid oklch(0.28 0.008 285 / 0.5)",
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
          >
            <X className="w-4 h-4 text-text-dim group-hover:text-foreground transition-colors" />
          </motion.button>
        </div>

        {/* ── Side navigation ──────────────────────────── */}
        {hasPrev && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
            <NavArrow
              direction="left"
              onClick={goPrev}
              label="Foto anterior"
              dataOcid="photo.pagination_prev"
            />
          </div>
        )}
        {hasNext && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
            <NavArrow
              direction="right"
              onClick={goNext}
              label="Foto siguiente"
              dataOcid="photo.pagination_next"
            />
          </div>
        )}

        {/* ── Main panel ───────────────────────────────── */}
        <motion.div
          className="relative z-10 flex flex-col lg:flex-row max-w-6xl w-full mx-4 lg:mx-16 overflow-hidden"
          style={{
            maxHeight: "88vh",
            boxShadow:
              "0 40px 80px oklch(0 0 0 / 0.7), 0 0 0 1px oklch(0.22 0.006 285 / 0.4)",
          }}
          initial={{ scale: 0.97, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: 8 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image area */}
          <div
            className="relative flex-1 flex items-center justify-center overflow-hidden min-h-[300px] lg:min-h-0"
            style={{
              background: "oklch(0.07 0.003 285)",
              cursor: canDrag ? (isDragging ? "grabbing" : "grab") : "default",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {!imageLoaded && (
              <Skeleton
                className="absolute inset-0 rounded-none"
                data-ocid="photo.loading_state"
              />
            )}

            {imageUrl ? (
              <motion.img
                key={imageUrl}
                src={imageUrl}
                alt={photo.title}
                className="max-w-full object-contain select-none"
                style={{
                  maxHeight: "88vh",
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  transition: isDragging
                    ? "none"
                    : "transform 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
                  transformOrigin: "center center",
                }}
                draggable={false}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
                initial={{ opacity: 0, scale: 1.025 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
              />
            ) : (
              <div
                className="w-full h-full min-h-[400px]"
                style={{
                  background:
                    "linear-gradient(160deg, oklch(0.12 0.04 285), oklch(0.20 0.08 290))",
                }}
              />
            )}
          </div>

          {/* ── Info panel ─────────────────────────────── */}
          <div
            className="shrink-0 lg:w-72 xl:w-80 flex flex-col overflow-y-auto"
            style={{
              background: "oklch(0.095 0.004 285)",
              borderTop: "3px solid oklch(0.78 0.14 75 / 0.55)",
              borderLeft: "1px solid oklch(0.18 0.006 285)",
            }}
          >
            {/* Inner padding block */}
            <div className="p-6 flex flex-col flex-1">
              {/* Photo title */}
              <h1 className="font-display text-xl font-light text-foreground leading-snug mb-3">
                {photo.title}
              </h1>

              {photo.description && (
                <p className="text-text-dim text-sm leading-relaxed font-sans mb-4 pb-4 border-b border-border/20">
                  {photo.description}
                </p>
              )}

              {/* Price + Cart button */}
              {isForSale && (
                <div
                  className="mb-5 pb-4 border-b border-border/20"
                  data-ocid="photo.card"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-subtle mb-2">
                    Precio
                  </p>
                  <p
                    className="font-display text-2xl font-light mb-3"
                    style={{ color: "oklch(0.88 0.10 75)" }}
                  >
                    €{(Number(photo.price) / 100).toFixed(2)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!inCart) {
                        addToCart(photo);
                        toast.success("Añadido al carrito", {
                          description: photo.title,
                        });
                      }
                    }}
                    disabled={inCart}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm font-mono text-xs uppercase tracking-widest transition-all"
                    style={{
                      background: inCart
                        ? "oklch(0.78 0.14 75 / 0.15)"
                        : "oklch(0.78 0.14 75)",
                      color: inCart
                        ? "oklch(0.88 0.10 75)"
                        : "oklch(0.10 0.004 285)",
                      border: "1px solid oklch(0.78 0.14 75 / 0.4)",
                      cursor: inCart ? "default" : "pointer",
                    }}
                    data-ocid="photo.button"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {inCart ? "En el carrito" : "Añadir al carrito"}
                  </button>
                </div>
              )}

              {/* Album */}
              {album && (
                <div className="mb-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-subtle mb-1.5">
                    Álbum
                  </p>
                  <p className="font-display text-sm text-gold leading-tight">
                    {album.name}
                  </p>
                  {album.description && (
                    <p className="text-text-subtle text-xs font-sans leading-relaxed mt-1">
                      {album.description}
                    </p>
                  )}
                </div>
              )}

              {/* Zoom slider */}
              <div className="mb-4 pb-4 border-b border-border/20">
                <div className="flex items-center gap-2 mb-2">
                  <ZoomIn className="w-3 h-3 text-text-subtle" />
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-subtle">
                    Zoom
                  </p>
                  <span
                    className="ml-auto font-mono text-[10px] tabular-nums"
                    style={{ color: "oklch(0.78 0.14 75)" }}
                  >
                    {zoom}%
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={200}
                  step={5}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 appearance-none rounded-full outline-none focus-visible:ring-1 focus-visible:ring-gold/40"
                  style={{
                    background: `linear-gradient(to right, oklch(0.78 0.14 75) 0%, oklch(0.78 0.14 75) ${zoom - 100}%, oklch(0.22 0.006 285) ${zoom - 100}%, oklch(0.22 0.006 285) 100%)`,
                    accentColor: "oklch(0.78 0.14 75)",
                  }}
                  aria-label="Nivel de zoom"
                  data-ocid="photo.toggle"
                />
                {canDrag && (
                  <p className="text-text-subtle font-mono text-[10px] mt-1.5">
                    Arrastra la imagen para moverla
                  </p>
                )}
              </div>

              {/* Date */}
              <div className="mt-auto pt-4 border-t border-border/20">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-subtle mb-1.5">
                  Fecha
                </p>
                <p className="text-text-dim text-xs font-mono">
                  {new Date(
                    Number(photo.uploadedAt) / 1_000_000,
                  ).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              {/* Keyboard hint */}
              <div className="mt-5 flex items-center gap-3">
                {hasPrev && (
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-sm font-mono text-[10px] text-text-subtle"
                    style={{
                      background: "oklch(0.16 0.006 285)",
                      border: "1px solid oklch(0.24 0.008 285)",
                    }}
                  >
                    ←
                  </span>
                )}
                {hasNext && (
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-sm font-mono text-[10px] text-text-subtle"
                    style={{
                      background: "oklch(0.16 0.006 285)",
                      border: "1px solid oklch(0.24 0.008 285)",
                    }}
                  >
                    →
                  </span>
                )}
                {(hasPrev || hasNext) && (
                  <span className="text-text-subtle font-mono text-[10px] uppercase tracking-wider">
                    Navegar
                  </span>
                )}
                <span
                  className="ml-auto inline-flex items-center justify-center px-2 h-6 rounded-sm font-mono text-[10px] text-text-subtle"
                  style={{
                    background: "oklch(0.16 0.006 285)",
                    border: "1px solid oklch(0.24 0.008 285)",
                  }}
                >
                  esc
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
