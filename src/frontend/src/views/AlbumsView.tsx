import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";
import type { Album } from "../backend.d";
import { AlbumCard } from "../components/AlbumCard";
import { useAlbums } from "../hooks/useQueries";

interface AlbumsViewProps {
  onAlbumClick: (albumId: string) => void;
}

function AlbumsSkeleton() {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      data-ocid="albums.loading_state"
    >
      {["sk-a1", "sk-a2", "sk-a3", "sk-a4", "sk-a5", "sk-a6"].map((k) => (
        <div key={k} className="space-y-3">
          <Skeleton className="w-full aspect-[4/3] rounded-sm" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function AlbumsView({ onAlbumClick }: AlbumsViewProps) {
  const { data: albums = [], isLoading } = useAlbums();

  return (
    <main data-ocid="albums.page" className="min-h-screen">
      {/* Header */}
      <section className="pt-20 pb-10 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-dim mb-3">
              Colecciones
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-light text-foreground">
              Álbumes
            </h1>
            <p className="mt-3 text-text-dim font-sans text-sm max-w-md leading-relaxed">
              Fotografía organizada en colecciones — cada álbum, un recorrido
              por un mundo visual único.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Albums grid */}
      <section className="px-4 sm:px-6 pb-16 max-w-7xl mx-auto">
        {isLoading ? (
          <AlbumsSkeleton />
        ) : albums.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-24 text-center"
            data-ocid="albums.empty_state"
          >
            <div
              className="w-16 h-16 rounded-full mb-4 flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.15 0.02 285), oklch(0.20 0.06 290))",
              }}
            >
              <svg
                className="w-7 h-7 text-text-dim"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-text-dim font-sans text-sm">
              Aún no hay álbumes creados.
            </p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            data-ocid="albums.list"
          >
            {albums.map((album: Album, i: number) => (
              <AlbumCard
                key={album.id}
                album={album}
                index={i}
                onClick={(a) => onAlbumClick(a.id)}
                data-ocid={`albums.item.${i + 1}`}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
