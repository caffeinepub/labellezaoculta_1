import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Album } from "../backend.d";
import {
  getDemoPlaceholderImage,
  getImageUrl,
  isDemo,
} from "../utils/imageUtils";

interface AlbumCardProps {
  album: Album;
  index: number;
  onClick: (album: Album) => void;
  "data-ocid"?: string;
}

// Rich palette per-album — each feels like a different visual world
const ALBUM_GRADIENTS = [
  // Deep indigo → cobalt
  "linear-gradient(160deg, oklch(0.13 0.06 275) 0%, oklch(0.22 0.12 270) 50%, oklch(0.10 0.04 290) 100%)",
  // Warm ember
  "linear-gradient(160deg, oklch(0.15 0.07 40) 0%, oklch(0.25 0.13 35) 50%, oklch(0.11 0.04 50) 100%)",
  // Teal-forest
  "linear-gradient(160deg, oklch(0.13 0.05 180) 0%, oklch(0.21 0.10 175) 50%, oklch(0.10 0.03 190) 100%)",
  // Dusty rose
  "linear-gradient(160deg, oklch(0.16 0.07 340) 0%, oklch(0.26 0.13 335) 50%, oklch(0.12 0.04 350) 100%)",
  // Sage
  "linear-gradient(160deg, oklch(0.14 0.05 135) 0%, oklch(0.22 0.09 130) 50%, oklch(0.10 0.03 145) 100%)",
  // Copper-bronze
  "linear-gradient(160deg, oklch(0.17 0.08 55) 0%, oklch(0.27 0.14 50) 50%, oklch(0.13 0.05 65) 100%)",
];

export function AlbumCard({
  album,
  index,
  onClick,
  "data-ocid": dataOcid,
}: AlbumCardProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const gradient = ALBUM_GRADIENTS[index % ALBUM_GRADIENTS.length];

  useEffect(() => {
    let cancelled = false;
    const blobId = album.coverBlobId;
    if (!blobId) {
      setLoading(false);
      return;
    }
    if (isDemo(blobId)) {
      setCoverUrl(getDemoPlaceholderImage(index));
      setLoading(false);
    } else {
      getImageUrl(blobId).then((url) => {
        if (!cancelled) {
          setCoverUrl(url);
          setLoading(false);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [album.coverBlobId, index]);

  const photoCount = Number(album.photoCount);

  return (
    <motion.div
      className="group cursor-pointer relative overflow-hidden"
      onClick={() => onClick(album)}
      data-ocid={dataOcid}
      style={{
        background: "oklch(0.10 0.004 285)",
        boxShadow: "0 1px 3px oklch(0 0 0 / 0.4)",
      }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.55,
        delay: Math.min(index * 0.08, 0.6),
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={{
        boxShadow:
          "0 16px 48px oklch(0 0 0 / 0.6), 0 0 0 1px oklch(0.78 0.14 75 / 0.18)",
        y: -4,
      }}
    >
      {/* Cover image area */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {loading ? (
          <Skeleton className="w-full h-full rounded-none" />
        ) : coverUrl ? (
          <>
            <img
              src={coverUrl}
              alt={album.name}
              className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.04] group-hover:brightness-110 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              style={{ filter: "brightness(0.88) saturate(0.92)" }}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
            {!imageLoaded && (
              <div
                className="absolute inset-0"
                style={{ background: gradient }}
              />
            )}
          </>
        ) : (
          /* Rich gradient placeholder */
          <div
            className="w-full h-full relative"
            style={{ background: gradient }}
          >
            {/* Subtle texture pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 40%, oklch(1 0 0 / 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 70%, oklch(1 0 0 / 0.08) 0%, transparent 45%)",
              }}
            />
            {/* Album initial */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="font-display text-5xl font-extralight opacity-25"
                style={{ color: "oklch(0.85 0.02 90)" }}
              >
                {album.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* Cinematic hover overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              "linear-gradient(to top, oklch(0.06 0.003 285 / 0.7) 0%, transparent 50%)",
          }}
        />

        {/* Photo count — glass pill */}
        <div className="absolute top-3 right-3">
          <Badge
            variant="secondary"
            className="font-mono text-xs"
            style={{
              background: "oklch(0.08 0.003 285 / 0.75)",
              backdropFilter: "blur(8px)",
              border: "1px solid oklch(0.28 0.008 285 / 0.5)",
              color: "oklch(0.65 0.008 285)",
            }}
          >
            {photoCount}
          </Badge>
        </div>
      </div>

      {/* Info block */}
      <div
        className="px-5 py-4"
        style={{ borderTop: "1px solid oklch(0.16 0.006 285)" }}
      >
        <h3 className="font-display text-base font-light text-foreground group-hover:text-primary transition-colors duration-300 truncate leading-snug">
          {album.name}
        </h3>
        {album.description && (
          <p className="text-text-dim text-xs mt-1 line-clamp-2 font-sans leading-relaxed">
            {album.description}
          </p>
        )}
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className="block h-px w-4"
            style={{
              background:
                "linear-gradient(to right, oklch(0.78 0.14 75 / 0.4), transparent)",
              transition: "width 0.35s ease",
            }}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-text-subtle">
            {photoCount} {photoCount === 1 ? "photo" : "photos"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
