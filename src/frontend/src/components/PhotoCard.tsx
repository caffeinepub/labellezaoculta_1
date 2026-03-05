import { Skeleton } from "@/components/ui/skeleton";
import { Search, ShoppingCart } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Photo } from "../backend.d";
import { useCart } from "../hooks/useCart";
import {
  getDemoPlaceholderImage,
  getImageUrl,
  isDemo,
} from "../utils/imageUtils";
import { ZoomOverlay } from "./ZoomOverlay";

// Fetch image as object URL (fallback for CORS / Content-Type issues)
async function fetchAsObjectUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // Detect MIME type from bytes
    let mime = "image/jpeg";
    if (bytes[0] === 0xff && bytes[1] === 0xd8) mime = "image/jpeg";
    else if (bytes[0] === 0x89 && bytes[1] === 0x50) mime = "image/png";
    else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)
      mime = "image/gif";
    else if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes.length > 11 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    )
      mime = "image/webp";
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

interface PhotoCardProps {
  photo: Photo;
  index: number;
  onClick: (photo: Photo) => void;
  "data-ocid"?: string;
}

// Rich, varied gradient palettes — each unique, none generic blue-grey
const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(160deg, oklch(0.13 0.04 280) 0%, oklch(0.19 0.09 275) 45%, oklch(0.11 0.03 295) 100%)",
  "linear-gradient(160deg, oklch(0.14 0.05 55)  0%, oklch(0.21 0.10 50)  45%, oklch(0.10 0.03 65)  100%)",
  "linear-gradient(160deg, oklch(0.12 0.04 195) 0%, oklch(0.18 0.08 190) 45%, oklch(0.09 0.02 185) 100%)",
  "linear-gradient(160deg, oklch(0.15 0.06 345) 0%, oklch(0.22 0.11 340) 45%, oklch(0.11 0.04 355) 100%)",
  "linear-gradient(160deg, oklch(0.13 0.04 130) 0%, oklch(0.19 0.08 125) 45%, oklch(0.10 0.02 140) 100%)",
  "linear-gradient(160deg, oklch(0.16 0.07 28)  0%, oklch(0.23 0.12 22)  45%, oklch(0.12 0.04 35)  100%)",
  "linear-gradient(160deg, oklch(0.11 0.03 245) 0%, oklch(0.17 0.07 250) 45%, oklch(0.09 0.02 240) 100%)",
  "linear-gradient(160deg, oklch(0.14 0.03 90)  0%, oklch(0.20 0.07 85)  45%, oklch(0.10 0.02 95)  100%)",
];

// Vary card heights organically — simulates real photo aspect ratios
const CARD_HEIGHTS = [280, 360, 240, 320, 400, 260, 340, 300, 380, 220];

export function PhotoCard({
  photo,
  index,
  onClick,
  "data-ocid": dataOcid,
}: PhotoCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const { addToCart, cartItems } = useCart();

  const gradient = PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length];
  const fallbackHeight = CARD_HEIGHTS[index % CARD_HEIGHTS.length];
  const isForSale = photo.price > BigInt(0);
  const inCart = cartItems.some((i) => i.photo.id === photo.id);

  useEffect(() => {
    let cancelled = false;
    if (isDemo(photo.blobId)) {
      const placeholder = getDemoPlaceholderImage(index);
      setImageUrl(placeholder);
      setLoading(false);
    } else {
      // First try the direct URL; if that fails we fall back to a blob object URL
      getImageUrl(photo.blobId)
        .then(async (directUrl) => {
          if (cancelled) return;
          if (!directUrl) {
            setImageUrl(null);
            setLoading(false);
            return;
          }
          // Probe via fetch to check if the URL is actually reachable and
          // to obtain a blob URL so the browser always has a valid Content-Type.
          const objUrl = await fetchAsObjectUrl(directUrl);
          if (!cancelled) {
            setImageUrl(objUrl ?? directUrl);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setImageUrl(null);
            setLoading(false);
          }
        });
    }
    return () => {
      cancelled = true;
    };
  }, [photo.blobId, index]);

  if (loading) {
    return (
      <div className="masonry-item">
        <Skeleton
          className="w-full rounded-none"
          style={{ height: `${fallbackHeight}px` }}
          data-ocid="photo.loading_state"
        />
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="masonry-item photo-card-root group cursor-pointer relative overflow-hidden"
        onClick={() => onClick(photo)}
        data-ocid={dataOcid}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          delay: Math.min(index * 0.055, 0.55),
          ease: [0.25, 0.1, 0.25, 1],
        }}
      >
        {/* Image or gradient placeholder */}
        {imageUrl ? (
          <>
            <div
              className="absolute inset-0 transition-opacity duration-500"
              style={{
                background: gradient,
                opacity: imageLoaded ? 0 : 1,
                pointerEvents: "none",
              }}
            />
            <img
              src={imageUrl}
              alt={photo.title}
              className="w-full object-cover block photo-card-img"
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                // If the image fails to render, clear it so the gradient placeholder shows
                setImageUrl(null);
                setImageLoaded(false);
              }}
              loading="lazy"
              style={{ minHeight: `${fallbackHeight}px`, display: "block" }}
            />
          </>
        ) : (
          <div
            className="w-full"
            style={{ height: `${fallbackHeight}px`, background: gradient }}
          />
        )}

        {/* Deep cinematic overlay — rich multi-stop gradient */}
        <div className="photo-card-overlay absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end">
          {/* Ambient top vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, oklch(0.05 0.003 285 / 0.15) 0%, transparent 35%, oklch(0.05 0.003 285 / 0.7) 70%, oklch(0.05 0.003 285 / 0.97) 100%)",
            }}
          />

          {/* Action icons — top-right corner */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
            {/* Zoom icon */}
            {imageUrl && (
              <motion.button
                type="button"
                aria-label="Ampliar foto"
                data-ocid="photo.toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomOpen(true);
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  background: "oklch(0.10 0.004 285 / 0.80)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid oklch(0.30 0.008 285 / 0.6)",
                }}
                whileHover={{
                  scale: 1.1,
                  backgroundColor: "oklch(0.18 0.006 285 / 0.9)",
                }}
                whileTap={{ scale: 0.93 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.05 }}
              >
                <Search className="w-4 h-4 text-foreground" />
              </motion.button>
            )}

            {/* Cart icon — only if for sale */}
            {isForSale && (
              <motion.button
                type="button"
                aria-label={inCart ? "Ya en el carrito" : "Añadir al carrito"}
                data-ocid="photo.button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!inCart) {
                    addToCart(photo);
                    toast.success("Añadido al carrito", {
                      description: photo.title,
                    });
                  }
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: inCart
                    ? "oklch(0.78 0.14 75 / 0.3)"
                    : "oklch(0.10 0.004 285 / 0.80)",
                  backdropFilter: "blur(8px)",
                  border: inCart
                    ? "1px solid oklch(0.78 0.14 75 / 0.5)"
                    : "1px solid oklch(0.30 0.008 285 / 0.6)",
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.93 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <ShoppingCart
                  className="w-4 h-4"
                  style={{
                    color: inCart
                      ? "oklch(0.88 0.10 75)"
                      : "oklch(0.85 0.01 285)",
                  }}
                />
              </motion.button>
            )}
          </div>

          {/* Text content */}
          <div className="relative p-4 pb-5">
            <h3 className="font-display text-sm font-light text-foreground tracking-[0.04em] leading-snug">
              {photo.title}
            </h3>
            {photo.description && (
              <p className="text-text-dim text-xs mt-1 line-clamp-2 font-sans leading-relaxed opacity-80">
                {photo.description}
              </p>
            )}
            {isForSale && (
              <p
                className="mt-1.5 font-mono text-xs font-medium"
                style={{ color: "oklch(0.88 0.10 75)" }}
              >
                €{(Number(photo.price) / 100).toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* Gold inset frame on hover — drawn via box-shadow animation */}
        <div className="photo-card-frame absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </motion.div>

      {/* Zoom overlay — rendered outside the card to avoid overflow:hidden clipping */}
      {zoomOpen && imageUrl && (
        <ZoomOverlay
          imageUrl={imageUrl}
          title={photo.title}
          onClose={() => setZoomOpen(false)}
        />
      )}
    </>
  );
}
