import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Photo } from "../backend.d";
import {
  getDemoPlaceholderImage,
  getImageUrl,
  isDemo,
} from "../utils/imageUtils";

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

  const gradient = PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length];
  const fallbackHeight = CARD_HEIGHTS[index % CARD_HEIGHTS.length];

  useEffect(() => {
    let cancelled = false;
    if (isDemo(photo.blobId)) {
      const placeholder = getDemoPlaceholderImage(index);
      setImageUrl(placeholder);
      setLoading(false);
    } else {
      getImageUrl(photo.blobId).then((url) => {
        if (!cancelled) {
          setImageUrl(url);
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
          <img
            src={imageUrl}
            alt={photo.title}
            className={`w-full object-cover block photo-card-img transition-all duration-700 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
            style={{ minHeight: `${fallbackHeight}px`, display: "block" }}
          />
          {!imageLoaded && (
            <div
              className="absolute inset-0"
              style={{ background: gradient }}
            />
          )}
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
        </div>
      </div>

      {/* Gold inset frame on hover — drawn via box-shadow animation */}
      <div className="photo-card-frame absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.div>
  );
}
