import { motion } from "motion/react";
import { useState } from "react";
import type { Photo } from "../backend.d";
import { MasonryGrid } from "../components/MasonryGrid";
import { usePhotos } from "../hooks/useQueries";
import { PhotoDetail } from "./PhotoDetail";

export function HomeGallery() {
  const { data: photos = [], isLoading } = usePhotos();
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  return (
    <main data-ocid="home.page">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden pt-28 pb-16 px-6"
        data-ocid="home.section"
      >
        {/* Background image — more visible, more atmospheric */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url('/assets/generated/hero-bg.dim_1920x1080.jpg')`,
            backgroundSize: "cover",
            backgroundPosition: "center 35%",
            opacity: 0.22,
            transform: "scale(1.03)",
          }}
        />

        {/* Multi-stop fade to black — preserves depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              "linear-gradient(to bottom,",
              "  oklch(0.082 0.004 285 / 0.5) 0%,",
              "  oklch(0.082 0.004 285 / 0.1) 30%,",
              "  oklch(0.082 0.004 285 / 0.15) 60%,",
              "  oklch(0.082 0.004 285 / 1) 100%",
              ")",
            ].join(" "),
          }}
        />

        {/* Side vignettes */}
        <div
          className="absolute inset-y-0 left-0 w-32 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, oklch(0.082 0.004 285), transparent)",
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-32 pointer-events-none"
          style={{
            background:
              "linear-gradient(to left, oklch(0.082 0.004 285), transparent)",
          }}
        />

        <div className="relative max-w-7xl mx-auto">
          {/* Eye-brow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center gap-3 mb-5"
          >
            <span
              className="block h-px w-8 shrink-0"
              style={{
                background:
                  "linear-gradient(to right, oklch(0.78 0.14 75), oklch(0.78 0.14 75 / 0))",
              }}
            />
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-gold-dim">
              La Belleza Oculta
            </p>
          </motion.div>

          {/* Headline — two distinct lines, strong weight contrast */}
          <motion.h1
            className="font-display leading-[0.95] tracking-tight"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.1,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <span className="block text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extralight text-foreground">
              La Belleza
            </span>
            <span className="block text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-light italic text-primary mt-1">
              Oculta
            </span>
          </motion.h1>

          {/* Gold rule — signature animation */}
          <motion.div
            className="my-7"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.2 }}
          >
            <span className="hero-rule" />
          </motion.div>

          {/* Descriptor */}
          <motion.p
            className="text-text-dim font-sans text-sm max-w-sm leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            Fotografía que revela lo invisible — una colección de imágenes
            capturadas en momentos de quietud y luz.
          </motion.p>

          {/* Stats row */}
          {!isLoading && photos.length > 0 && (
            <motion.div
              className="mt-10 flex items-center gap-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <div>
                <p
                  className="font-display text-3xl font-extralight tabular-nums"
                  style={{ color: "oklch(0.88 0.10 75)" }}
                >
                  {String(photos.length).padStart(2, "0")}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-subtle mt-0.5">
                  Fotografías
                </p>
              </div>
              <div
                className="self-stretch w-px"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, oklch(0.30 0.006 285), transparent)",
                }}
              />
              <div>
                <p
                  className="font-display text-3xl font-extralight"
                  style={{ color: "oklch(0.72 0.06 285)" }}
                >
                  ∞
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-subtle mt-0.5">
                  Historias
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 mb-6">
        <div
          className="h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, oklch(0.78 0.14 75 / 0.2) 30%, oklch(0.22 0.006 285 / 0.4) 70%, transparent)",
          }}
        />
      </div>

      {/* ── Gallery ─────────────────────────────────────────── */}
      <section className="px-3 sm:px-6 pb-20 max-w-7xl mx-auto">
        <MasonryGrid
          photos={photos}
          loading={isLoading}
          onPhotoClick={setSelectedPhoto}
          emptyMessage="Aún no hay fotografías."
          data-ocid="home.list"
        />
      </section>

      {/* Lightbox */}
      {selectedPhoto && (
        <PhotoDetail
          photo={selectedPhoto}
          allPhotos={photos}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={setSelectedPhoto}
        />
      )}
    </main>
  );
}
