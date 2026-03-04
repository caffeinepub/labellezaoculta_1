import { Skeleton } from "@/components/ui/skeleton";
import type { Photo } from "../backend.d";
import { PhotoCard } from "./PhotoCard";

interface MasonryGridProps {
  photos: Photo[];
  loading?: boolean;
  onPhotoClick: (photo: Photo) => void;
  emptyMessage?: string;
  "data-ocid"?: string;
}

const SKELETON_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9"];
const SKELETON_HEIGHTS = [160, 220, 200, 240, 180, 260, 200, 180, 220];

function MasonrySkeleton() {
  return (
    <div className="masonry-responsive" data-ocid="gallery.loading_state">
      {SKELETON_KEYS.map((k, i) => (
        <div key={k} className="masonry-item">
          <Skeleton
            className="w-full rounded-sm"
            style={{ height: `${SKELETON_HEIGHTS[i]}px` }}
          />
        </div>
      ))}
    </div>
  );
}

export function MasonryGrid({
  photos,
  loading,
  onPhotoClick,
  emptyMessage = "No photos yet.",
  "data-ocid": dataOcid,
}: MasonryGridProps) {
  if (loading) {
    return <MasonrySkeleton />;
  }

  if (photos.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 text-center"
        data-ocid="gallery.empty_state"
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
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <p className="text-text-dim font-sans text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div data-ocid={dataOcid} className="masonry-responsive">
      {photos.map((photo, i) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          index={i}
          onClick={onPhotoClick}
          data-ocid={`gallery.item.${i + 1}`}
        />
      ))}
    </div>
  );
}
