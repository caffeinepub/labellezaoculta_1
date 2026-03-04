import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { Photo } from "../backend.d";
import { MasonryGrid } from "../components/MasonryGrid";
import { useAlbum, usePhotosByAlbum } from "../hooks/useQueries";
import { PhotoDetail } from "./PhotoDetail";

interface AlbumDetailProps {
  albumId: string;
  onBack: () => void;
}

export function AlbumDetail({ albumId, onBack }: AlbumDetailProps) {
  const { data: album, isLoading: albumLoading } = useAlbum(albumId);
  const { data: photos = [], isLoading: photosLoading } =
    usePhotosByAlbum(albumId);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  return (
    <main data-ocid="album-detail.page" className="min-h-screen">
      {/* Header */}
      <section className="pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-6 text-text-dim hover:text-foreground -ml-2 group"
            data-ocid="album-detail.secondary_button"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
            Todos los álbumes
          </Button>

          {albumLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
          ) : album ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-dim mb-2">
                    Álbum
                  </p>
                  <h1 className="font-display text-3xl sm:text-4xl font-light text-foreground">
                    {album.name}
                  </h1>
                  {album.description && (
                    <p className="mt-2 text-text-dim font-sans text-sm max-w-xl leading-relaxed">
                      {album.description}
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className="border-border/50 text-text-dim font-mono text-xs mt-1"
                >
                  {Number(album.photoCount)}{" "}
                  {Number(album.photoCount) === 1 ? "foto" : "fotos"}
                </Badge>
              </div>
            </motion.div>
          ) : (
            <p className="text-text-dim">Álbum no encontrado.</p>
          )}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(to right, oklch(0.78 0.14 75 / 0.3), oklch(0.22 0.006 285 / 0), transparent)",
          }}
        />
      </div>

      {/* Photos */}
      <section className="px-4 sm:px-6 pb-16 max-w-7xl mx-auto">
        <MasonryGrid
          photos={photos}
          loading={photosLoading}
          onPhotoClick={setSelectedPhoto}
          emptyMessage="Este álbum aún no tiene fotos."
          data-ocid="album-detail.list"
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
