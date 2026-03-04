import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  ImagePlus,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { Album, Photo } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddPhoto,
  useAlbums,
  useCreateAlbum,
  useDeleteAlbum,
  useDeletePhoto,
  useIsAdmin,
  usePhotos,
  useUpdateAlbum,
  useUpdatePhoto,
} from "../hooks/useQueries";
import { getStorageClient } from "../hooks/useStorageClient";
import { getDemoPlaceholderImage, isDemo } from "../utils/imageUtils";

// ── Sub-components ─────────────────────────────────────────────────────────

function AlbumFormDialog({
  open,
  onOpenChange,
  album,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  album?: Album | null;
  onSubmit: (data: { name: string; description: string }) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(album?.name ?? "");
  const [description, setDescription] = useState(album?.description ?? "");

  // Reset when album changes
  const handleOpen = (v: boolean) => {
    if (v) {
      setName(album?.name ?? "");
      setDescription(album?.description ?? "");
    }
    onOpenChange(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre del álbum es obligatorio");
      return;
    }
    onSubmit({ name: name.trim(), description: description.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent
        className="bg-surface-1 border-border/50 text-foreground sm:max-w-md"
        data-ocid="album.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-medium">
            {album ? "Editar álbum" : "Nuevo álbum"}
          </DialogTitle>
          <DialogDescription className="text-text-dim text-sm">
            {album
              ? "Actualiza los detalles del álbum."
              : "Crea un nuevo álbum de fotos."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="album-name"
              className="text-text-dim text-xs uppercase tracking-widest font-mono"
            >
              Nombre
            </Label>
            <Input
              id="album-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Urban Decay"
              className="bg-surface-2 border-border/50 text-foreground placeholder:text-text-subtle"
              autoComplete="off"
              data-ocid="album.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="album-desc"
              className="text-text-dim text-xs uppercase tracking-widest font-mono"
            >
              Descripción
            </Label>
            <Textarea
              id="album-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of this album..."
              className="bg-surface-2 border-border/50 text-foreground placeholder:text-text-subtle resize-none"
              rows={3}
              data-ocid="album.textarea"
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-text-dim"
              data-ocid="album.cancel_button"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary text-primary-foreground hover:bg-gold-glow"
              data-ocid="album.submit_button"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {album ? "Guardar cambios" : "Crear álbum"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PhotoFormDialog({
  open,
  onOpenChange,
  photo,
  albums,
  identity,
  onEditSubmit,
  onUploadSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  photo?: Photo | null;
  albums: Album[];
  identity?: import("@icp-sdk/core/agent").Identity;
  onEditSubmit?: (data: {
    id: string;
    title: string;
    description: string;
    albumId: string;
  }) => void;
  onUploadSubmit?: (data: {
    title: string;
    description: string;
    albumId: string;
    file: File;
  }) => void;
  isPending: boolean;
}) {
  const isEdit = !!photo;
  const [title, setTitle] = useState(photo?.title ?? "");
  const [description, setDescription] = useState(photo?.description ?? "");
  const [albumId, setAlbumId] = useState(photo?.albumId ?? albums[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = (v: boolean) => {
    if (v) {
      setTitle(photo?.title ?? "");
      setDescription(photo?.description ?? "");
      setAlbumId(photo?.albumId ?? albums[0]?.id ?? "");
      setFile(null);
      setUploadProgress(0);
    }
    onOpenChange(v);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    if (!albumId) {
      toast.error("Por favor selecciona un álbum");
      return;
    }

    if (isEdit && onEditSubmit && photo) {
      onEditSubmit({
        id: photo.id,
        title: title.trim(),
        description: description.trim(),
        albumId,
      });
      return;
    }

    if (!isEdit && onUploadSubmit) {
      if (!file) {
        toast.error("Por favor selecciona una imagen");
        return;
      }
      setIsUploading(true);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const storageClient = await getStorageClient(identity);
        const { hash } = await storageClient.putFile(bytes, (pct) =>
          setUploadProgress(pct),
        );
        onUploadSubmit({
          title: title.trim(),
          description: description.trim(),
          albumId,
          file,
        });
        // We pass the hash through a closure trick; onUploadSubmit receives file but we need hash
        // Instead, call addPhoto directly in the parent
        // Re-design: pass hash directly via a callback
        (
          onUploadSubmit as unknown as (d: {
            title: string;
            description: string;
            albumId: string;
            blobId: string;
          }) => void
        )({
          title: title.trim(),
          description: description.trim(),
          albumId,
          blobId: hash,
        });
      } catch (err) {
        toast.error(
          `Error al subir: ${err instanceof Error ? err.message : "Error desconocido"}`,
        );
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent
        className="bg-surface-1 border-border/50 text-foreground sm:max-w-md"
        data-ocid="photo.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-medium">
            {isEdit ? "Editar foto" : "Subir foto"}
          </DialogTitle>
          <DialogDescription className="text-text-dim text-sm">
            {isEdit
              ? "Actualiza los detalles de la foto."
              : "Añade una nueva foto a tu colección."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* File upload (new only) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label className="text-text-dim text-xs uppercase tracking-widest font-mono">
                Imagen
              </Label>
              <button
                type="button"
                className={`w-full relative border border-dashed rounded-sm p-6 text-center cursor-pointer transition-colors ${
                  file
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/50 hover:border-border"
                }`}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Haz clic para seleccionar imagen"
                data-ocid="photo.upload_button"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {file ? (
                  <div className="flex items-center gap-3 justify-center">
                    <ImagePlus className="w-5 h-5 text-primary" />
                    <span className="text-foreground text-sm truncate max-w-[200px]">
                      {file.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-text-dim hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-text-dim mx-auto" />
                    <p className="text-text-dim text-sm">
                      Haz clic para seleccionar imagen
                    </p>
                    <p className="text-text-subtle text-xs">JPG, PNG, WEBP</p>
                  </div>
                )}
              </button>
              {isUploading && (
                <div className="space-y-1" data-ocid="photo.loading_state">
                  <Progress value={uploadProgress} className="h-1" />
                  <p className="text-text-dim text-xs font-mono text-right">
                    {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label
              htmlFor="photo-title"
              className="text-text-dim text-xs uppercase tracking-widest font-mono"
            >
              Título
            </Label>
            <Input
              id="photo-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Hora dorada en el puerto"
              className="bg-surface-2 border-border/50 text-foreground placeholder:text-text-subtle"
              data-ocid="photo.input"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="photo-desc"
              className="text-text-dim text-xs uppercase tracking-widest font-mono"
            >
              Descripción
            </Label>
            <Textarea
              id="photo-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional..."
              className="bg-surface-2 border-border/50 text-foreground placeholder:text-text-subtle resize-none"
              rows={2}
              data-ocid="photo.textarea"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-text-dim text-xs uppercase tracking-widest font-mono">
              Álbum
            </Label>
            <Select
              value={albumId}
              onValueChange={setAlbumId}
              data-ocid="photo.select"
            >
              <SelectTrigger className="bg-surface-2 border-border/50 text-foreground">
                <SelectValue placeholder="Selecciona un álbum..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border/50">
                {albums.map((a) => (
                  <SelectItem
                    key={a.id}
                    value={a.id}
                    className="text-foreground focus:bg-surface-2"
                  >
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-text-dim"
              data-ocid="photo.cancel_button"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || isUploading}
              className="bg-primary text-primary-foreground hover:bg-gold-glow"
              data-ocid="photo.submit_button"
            >
              {(isPending || isUploading) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isEdit ? "Guardar cambios" : "Subir foto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Albums Tab ──────────────────────────────────────────────────────────────

function AlbumsTab() {
  const { data: albums = [], isLoading } = useAlbums();
  const createAlbum = useCreateAlbum();
  const updateAlbum = useUpdateAlbum();
  const deleteAlbum = useDeleteAlbum();

  const [createOpen, setCreateOpen] = useState(false);
  const [editAlbum, setEditAlbum] = useState<Album | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = useCallback(
    ({ name, description }: { name: string; description: string }) => {
      createAlbum.mutate(
        { name, description },
        {
          onSuccess: () => {
            toast.success("Álbum creado");
            setCreateOpen(false);
          },
          onError: (e) => toast.error(`Error: ${e.message}`),
        },
      );
    },
    [createAlbum],
  );

  const handleUpdate = useCallback(
    ({ name, description }: { name: string; description: string }) => {
      if (!editAlbum) return;
      updateAlbum.mutate(
        {
          id: editAlbum.id,
          name,
          description,
          coverBlobId: editAlbum.coverBlobId ?? null,
        },
        {
          onSuccess: () => {
            toast.success("Álbum actualizado");
            setEditAlbum(null);
          },
          onError: (e) => toast.error(`Error: ${e.message}`),
        },
      );
    },
    [editAlbum, updateAlbum],
  );

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteAlbum.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Álbum eliminado");
        setDeleteId(null);
      },
      onError: (e) => toast.error(`Error: ${e.message}`),
    });
  }, [deleteId, deleteAlbum]);

  return (
    <div className="space-y-4" data-ocid="admin.albums.panel">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-medium text-foreground">
          Álbumes
        </h2>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-gold-glow gap-2"
          data-ocid="admin.albums.open_modal_button"
        >
          <Plus className="w-4 h-4" />
          Nuevo álbum
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2" data-ocid="admin.albums.loading_state">
          {["sk-al1", "sk-al2", "sk-al3", "sk-al4"].map((k) => (
            <Skeleton key={k} className="h-12 w-full rounded-sm" />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div
          className="text-center py-16 text-text-dim text-sm"
          data-ocid="admin.albums.empty_state"
        >
          Sin álbumes. Crea el primero.
        </div>
      ) : (
        <div
          className="rounded-sm border border-border/50 overflow-hidden"
          data-ocid="admin.albums.table"
        >
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-text-dim font-mono text-xs uppercase tracking-wider">
                  Nombre
                </TableHead>
                <TableHead className="text-text-dim font-mono text-xs uppercase tracking-wider">
                  Fotos
                </TableHead>
                <TableHead className="text-text-dim font-mono text-xs uppercase tracking-wider">
                  Creado
                </TableHead>
                <TableHead className="text-right text-text-dim font-mono text-xs uppercase tracking-wider">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {albums.map((album: Album, i: number) => (
                <TableRow
                  key={album.id}
                  className="border-border/20 hover:bg-surface-2/50"
                  data-ocid={`admin.albums.row.${i + 1}`}
                >
                  <TableCell className="font-display text-sm text-foreground">
                    {album.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-border/50 text-text-dim font-mono text-xs"
                    >
                      {Number(album.photoCount)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-text-dim text-xs font-mono">
                    {new Date(
                      Number(album.createdAt) / 1_000_000,
                    ).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-text-dim hover:text-foreground"
                        onClick={() => setEditAlbum(album)}
                        data-ocid={`admin.albums.edit_button.${i + 1}`}
                        aria-label={`Editar ${album.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-text-dim hover:text-destructive"
                        onClick={() => setDeleteId(album.id)}
                        data-ocid={`admin.albums.delete_button.${i + 1}`}
                        aria-label={`Eliminar ${album.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create dialog */}
      <AlbumFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        isPending={createAlbum.isPending}
      />

      {/* Edit dialog */}
      <AlbumFormDialog
        open={!!editAlbum}
        onOpenChange={(v) => !v && setEditAlbum(null)}
        album={editAlbum}
        onSubmit={handleUpdate}
        isPending={updateAlbum.isPending}
      />

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent
          className="bg-surface-1 border-border/50"
          data-ocid="admin.albums.dialog"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-foreground">
              ¿Eliminar álbum?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-dim">
              Esto eliminará permanentemente el álbum y todas sus fotos. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-transparent border-border/50 text-text-dim hover:text-foreground"
              data-ocid="admin.albums.cancel_button"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              data-ocid="admin.albums.confirm_button"
            >
              {deleteAlbum.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Eliminar álbum
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Photos Tab ──────────────────────────────────────────────────────────────

function PhotosTab({
  identity,
}: { identity?: import("@icp-sdk/core/agent").Identity }) {
  const { data: photos = [], isLoading } = usePhotos();
  const { data: albums = [] } = useAlbums();
  const addPhoto = useAddPhoto();
  const updatePhoto = useUpdatePhoto();
  const deletePhoto = useDeletePhoto();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editPhoto, setEditPhoto] = useState<Photo | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const albumMap = Object.fromEntries(albums.map((a: Album) => [a.id, a.name]));

  const handleUpload = useCallback(
    (data: {
      title: string;
      description: string;
      albumId: string;
      blobId: string;
    }) => {
      addPhoto.mutate(data, {
        onSuccess: () => {
          toast.success("Foto subida");
          setUploadOpen(false);
        },
        onError: (e) => toast.error(`Error: ${e.message}`),
      });
    },
    [addPhoto],
  );

  const handleUpdate = useCallback(
    ({
      id,
      title,
      description,
      albumId,
    }: { id: string; title: string; description: string; albumId: string }) => {
      updatePhoto.mutate(
        { id, title, description, albumId },
        {
          onSuccess: () => {
            toast.success("Foto actualizada");
            setEditPhoto(null);
          },
          onError: (e) => toast.error(`Error: ${e.message}`),
        },
      );
    },
    [updatePhoto],
  );

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deletePhoto.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Foto eliminada");
        setDeleteId(null);
      },
      onError: (e) => toast.error(`Error: ${e.message}`),
    });
  }, [deleteId, deletePhoto]);

  return (
    <div className="space-y-4" data-ocid="admin.photos.panel">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-medium text-foreground">
          Fotos
        </h2>
        <Button
          size="sm"
          onClick={() => setUploadOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-gold-glow gap-2"
          disabled={albums.length === 0}
          data-ocid="admin.photos.open_modal_button"
        >
          <Plus className="w-4 h-4" />
          Subir foto
        </Button>
      </div>

      {albums.length === 0 && (
        <p className="text-text-dim text-xs bg-surface-2 rounded-sm px-3 py-2 border border-border/30">
          Crea un álbum antes de subir fotos.
        </p>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2" data-ocid="admin.photos.loading_state">
          {["sk-ph1", "sk-ph2", "sk-ph3", "sk-ph4"].map((k) => (
            <Skeleton key={k} className="h-12 w-full rounded-sm" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div
          className="text-center py-16 text-text-dim text-sm"
          data-ocid="admin.photos.empty_state"
        >
          Sin fotos. Sube la primera.
        </div>
      ) : (
        <div
          className="rounded-sm border border-border/50 overflow-hidden"
          data-ocid="admin.photos.table"
        >
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-text-dim font-mono text-xs uppercase tracking-wider w-12">
                  Vista
                </TableHead>
                <TableHead className="text-text-dim font-mono text-xs uppercase tracking-wider">
                  Título
                </TableHead>
                <TableHead className="text-text-dim font-mono text-xs uppercase tracking-wider">
                  Álbum
                </TableHead>
                <TableHead className="text-text-dim font-mono text-xs uppercase tracking-wider">
                  Subida
                </TableHead>
                <TableHead className="text-right text-text-dim font-mono text-xs uppercase tracking-wider">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {photos.map((photo: Photo, i: number) => (
                <TableRow
                  key={photo.id}
                  className="border-border/20 hover:bg-surface-2/50"
                  data-ocid={`admin.photos.row.${i + 1}`}
                >
                  <TableCell>
                    <div className="w-9 h-9 rounded-sm overflow-hidden bg-surface-2">
                      {isDemo(photo.blobId) ? (
                        <img
                          src={getDemoPlaceholderImage(i)}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{
                            background:
                              "linear-gradient(135deg, oklch(0.15 0.02 285), oklch(0.22 0.06 290))",
                          }}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-sans text-sm text-foreground truncate max-w-[180px]">
                    {photo.title}
                  </TableCell>
                  <TableCell className="text-text-dim text-xs">
                    {albumMap[photo.albumId] ?? photo.albumId.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-text-dim text-xs font-mono">
                    {new Date(
                      Number(photo.uploadedAt) / 1_000_000,
                    ).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-text-dim hover:text-foreground"
                        onClick={() => setEditPhoto(photo)}
                        data-ocid={`admin.photos.edit_button.${i + 1}`}
                        aria-label={`Editar ${photo.title}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-text-dim hover:text-destructive"
                        onClick={() => setDeleteId(photo.id)}
                        data-ocid={`admin.photos.delete_button.${i + 1}`}
                        aria-label={`Eliminar ${photo.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Upload dialog */}
      <PhotoFormDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        albums={albums}
        identity={identity}
        onUploadSubmit={
          handleUpload as unknown as (d: {
            title: string;
            description: string;
            albumId: string;
            file: File;
          }) => void
        }
        isPending={addPhoto.isPending}
      />

      {/* Edit dialog */}
      <PhotoFormDialog
        open={!!editPhoto}
        onOpenChange={(v) => !v && setEditPhoto(null)}
        photo={editPhoto}
        albums={albums}
        identity={identity}
        onEditSubmit={handleUpdate}
        isPending={updatePhoto.isPending}
      />

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent
          className="bg-surface-1 border-border/50"
          data-ocid="admin.photos.dialog"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-foreground">
              ¿Eliminar foto?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-dim">
              Esto eliminará permanentemente esta foto. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-transparent border-border/50 text-text-dim hover:text-foreground"
              data-ocid="admin.photos.cancel_button"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              data-ocid="admin.photos.confirm_button"
            >
              {deletePhoto.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Eliminar foto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Main Admin Panel ─────────────────────────────────────────────────────────

export function AdminPanel() {
  const { login, clear, identity, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  const isLoggedIn = !!identity;

  if (isInitializing || adminLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-[60vh]"
        data-ocid="admin.loading_state"
      >
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto" />
          <p className="text-text-dim text-sm font-mono uppercase tracking-widest">
            Iniciando...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!isLoggedIn) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-6"
        data-ocid="admin.page"
      >
        <motion.div
          className="max-w-sm w-full text-center space-y-6"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.15 0.04 285), oklch(0.22 0.08 290))",
            }}
          >
            <ShieldAlert className="w-7 h-7 text-gold" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-medium text-foreground mb-2">
              Acceso de administrador
            </h1>
            <p className="text-text-dim text-sm font-sans">
              Inicia sesión para gestionar tu colección de fotos.
            </p>
          </div>
          <Button
            onClick={login}
            disabled={isLoggingIn}
            className="w-full bg-primary text-primary-foreground hover:bg-gold-glow gap-2"
            data-ocid="admin.primary_button"
          >
            {isLoggingIn ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {isLoggingIn ? "Conectando..." : "Iniciar sesión"}
          </Button>
        </motion.div>
      </main>
    );
  }

  // Logged in but not admin
  if (!isAdmin) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-6"
        data-ocid="admin.page"
      >
        <motion.div
          className="max-w-sm w-full text-center space-y-6"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.22 0.12 25), oklch(0.15 0.08 30))",
            }}
          >
            <ShieldAlert className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-medium text-foreground mb-2">
              Acceso denegado
            </h1>
            <p className="text-text-dim text-sm font-sans">
              Tu cuenta no tiene privilegios de administrador.
            </p>
            <p className="text-text-subtle font-mono text-xs mt-2 break-all">
              {identity.getPrincipal().toString()}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={clear}
            className="border-border/50 text-text-dim hover:text-foreground"
            data-ocid="admin.secondary_button"
          >
            Cerrar sesión
          </Button>
        </motion.div>
      </main>
    );
  }

  // Admin panel
  return (
    <main className="min-h-screen" data-ocid="admin.page">
      {/* Header */}
      <section className="pt-16 pb-8 px-6 border-b border-border/20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-dim mb-1">
              Gestión
            </p>
            <h1 className="font-display text-3xl font-medium text-foreground">
              Panel de administración
            </h1>
          </motion.div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="border-primary/30 text-gold font-mono text-xs hidden sm:flex"
            >
              Admin
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              className="text-text-dim hover:text-foreground"
              data-ocid="admin.secondary_button"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="px-4 sm:px-6 py-8 max-w-5xl mx-auto">
        <Tabs defaultValue="albums" data-ocid="admin.tab">
          <TabsList className="bg-surface-2 border border-border/30 mb-6">
            <TabsTrigger
              value="albums"
              className="data-[state=active]:bg-surface-3 data-[state=active]:text-foreground text-text-dim font-mono text-xs uppercase tracking-wider"
              data-ocid="admin.albums.tab"
            >
              Álbumes
            </TabsTrigger>
            <TabsTrigger
              value="photos"
              className="data-[state=active]:bg-surface-3 data-[state=active]:text-foreground text-text-dim font-mono text-xs uppercase tracking-wider"
              data-ocid="admin.photos.tab"
            >
              Fotos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="albums">
            <AlbumsTab />
          </TabsContent>
          <TabsContent value="photos">
            <PhotosTab identity={identity} />
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
