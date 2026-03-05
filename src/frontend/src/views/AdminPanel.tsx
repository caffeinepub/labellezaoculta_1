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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  CheckCircle2,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Album, AlbumId, Photo } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAlbums,
  useCreateAlbum,
  useDeleteAlbum,
  useDeletePhoto,
  useIsAdmin,
  useIsRegistered,
  usePhotos,
  useRegisterAsAdmin,
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

  // Sync state when album prop changes (e.g. selecting a different album to edit)
  useEffect(() => {
    if (open) {
      setName(album?.name ?? "");
      setDescription(album?.description ?? "");
    }
  }, [open, album]);

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

// ── Multi Photo Upload Dialog ────────────────────────────────────────────────

type PhotoQueueItem = {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  description: string;
  // upload state
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  errorMsg?: string;
};

function MultiPhotoUploadDialog({
  open,
  onOpenChange,
  albums,
  identity,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  albums: Album[];
  identity?: import("@icp-sdk/core/agent").Identity;
  onComplete: () => void;
}) {
  const { actor } = useActor();
  const [albumIdStr, setAlbumIdStr] = useState(albums[0]?.id?.toString() ?? "");
  const [queue, setQueue] = useState<PhotoQueueItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync album selection when albums load
  useEffect(() => {
    if (albums.length > 0 && !albumIdStr) {
      setAlbumIdStr(albums[0].id.toString());
    }
  }, [albums, albumIdStr]);

  const resetDialog = () => {
    for (const item of queue) {
      URL.revokeObjectURL(item.previewUrl);
    }
    setQueue([]);
    setUploadedCount(0);
    setIsUploading(false);
    setAlbumIdStr(albums[0]?.id?.toString() ?? "");
  };

  const handleOpenChange = (v: boolean) => {
    if (!v && isUploading) return; // prevent close during upload
    if (!v) resetDialog();
    onOpenChange(v);
  };

  const addFilesToQueue = (files: FileList | File[]) => {
    const newItems: PhotoQueueItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({
        id: `${f.name}-${f.size}-${f.lastModified}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
        title: f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
        description: "",
        status: "pending" as const,
        progress: 0,
      }));
    setQueue((prev) => {
      // Deduplicate by id
      const existingIds = new Set(prev.map((i) => i.id));
      return [...prev, ...newItems.filter((i) => !existingIds.has(i.id))];
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    addFilesToQueue(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFilesToQueue(e.target.files);
    e.target.value = "";
  };

  const removeFromQueue = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const updateItemTitle = (id: string, title: string) => {
    setQueue((prev) => prev.map((i) => (i.id === id ? { ...i, title } : i)));
  };

  const handleUploadAll = async () => {
    if (!albumIdStr) {
      toast.error("Por favor selecciona un álbum");
      return;
    }
    const pending = queue.filter((i) => i.status === "pending");
    if (pending.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    const albumIdBigint: AlbumId = BigInt(albumIdStr);

    for (const item of pending) {
      if (!item.title.trim()) {
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "error", errorMsg: "El título es obligatorio" }
              : i,
          ),
        );
        continue;
      }

      setQueue((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "uploading", progress: 0 } : i,
        ),
      );

      try {
        const bytes = new Uint8Array(await item.file.arrayBuffer());
        const storageClient = await getStorageClient(identity);
        const { hash } = await storageClient.putFile(bytes, (pct) => {
          setQueue((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, progress: pct } : i)),
          );
        });

        if (!actor) throw new Error("No conectado al backend");
        await actor.addPhoto(
          item.title.trim(),
          item.description.trim(),
          albumIdBigint,
          hash,
        );

        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "done", progress: 100 } : i,
          ),
        );
        successCount++;
        setUploadedCount((c) => c + 1);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "error", errorMsg: msg } : i,
          ),
        );
      }
    }

    setIsUploading(false);

    const failedCount = pending.length - successCount;
    if (failedCount === 0) {
      toast.success(
        `${successCount} ${successCount === 1 ? "foto subida" : "fotos subidas"} correctamente`,
      );
      resetDialog();
      onComplete();
      onOpenChange(false);
    } else {
      toast.error(
        `${successCount} subidas, ${failedCount} con errores. Revisa los errores.`,
      );
    }
  };

  const pendingCount = queue.filter((i) => i.status === "pending").length;
  const doneCount = queue.filter((i) => i.status === "done").length;
  const errorCount = queue.filter((i) => i.status === "error").length;
  const hasQueue = queue.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="bg-surface-1 border-border/50 text-foreground sm:max-w-2xl w-full max-h-[90vh] flex flex-col"
        data-ocid="photo.dialog"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-display text-lg font-medium">
            Subir fotos
          </DialogTitle>
          <DialogDescription className="text-text-dim text-sm">
            Arrastra imágenes o haz clic para seleccionarlas. Puedes subir
            varias a la vez.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 mt-2">
          {/* Album selector */}
          <div className="space-y-1.5 shrink-0">
            <Label className="text-text-dim text-xs uppercase tracking-widest font-mono">
              Álbum destino
            </Label>
            <Select
              value={albumIdStr}
              onValueChange={setAlbumIdStr}
              disabled={isUploading}
            >
              <SelectTrigger
                className="bg-surface-2 border-border/50 text-foreground"
                data-ocid="photo.select"
              >
                <SelectValue placeholder="Selecciona un álbum..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border/50">
                {albums.map((a) => (
                  <SelectItem
                    key={a.id.toString()}
                    value={a.id.toString()}
                    className="text-foreground focus:bg-surface-2"
                  >
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Drop zone */}
          <div
            className={`shrink-0 relative border-2 border-dashed rounded-sm transition-all duration-200 select-none ${
              isDragOver
                ? "border-primary bg-primary/8 scale-[1.01]"
                : hasQueue
                  ? "border-border/30 bg-surface-2/30 py-4"
                  : "border-border/50 hover:border-border/80 bg-surface-2/20 py-10"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            data-ocid="photo.dropzone"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
            <button
              type="button"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Zona de arrastre de imágenes. Haz clic para seleccionar archivos."
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              data-ocid="photo.upload_button"
            />
            <div className="flex flex-col items-center gap-2 pointer-events-none">
              <motion.div
                animate={{ scale: isDragOver ? 1.15 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Upload
                  className={`w-7 h-7 transition-colors ${isDragOver ? "text-primary" : "text-text-dim"}`}
                />
              </motion.div>
              {hasQueue ? (
                <p className="text-text-dim text-xs font-mono">
                  Añadir más imágenes
                </p>
              ) : (
                <>
                  <p className="text-text-dim text-sm">
                    Arrastra imágenes aquí o{" "}
                    <span className="text-primary underline underline-offset-2">
                      selecciona archivos
                    </span>
                  </p>
                  <p className="text-text-subtle text-xs font-mono uppercase tracking-wider">
                    JPG · PNG · WEBP · GIF
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Queue preview */}
          <AnimatePresence initial={false}>
            {hasQueue && (
              <motion.div
                key="queue"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex-1 min-h-0"
              >
                {/* Progress summary */}
                {isUploading && (
                  <div
                    className="mb-3 space-y-1"
                    data-ocid="photo.loading_state"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-text-dim text-xs font-mono uppercase tracking-widest">
                        Progreso general
                      </span>
                      <span className="text-text-dim text-xs font-mono">
                        {uploadedCount} de {queue.length} fotos
                      </span>
                    </div>
                    <Progress
                      value={Math.round((uploadedCount / queue.length) * 100)}
                      className="h-1.5"
                    />
                  </div>
                )}

                {/* Partial failure summary */}
                {!isUploading && errorCount > 0 && (
                  <div
                    className="mb-3 flex items-center gap-2 text-destructive text-xs font-mono bg-destructive/10 border border-destructive/20 rounded-sm px-3 py-2"
                    data-ocid="photo.error_state"
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>
                      {errorCount}{" "}
                      {errorCount === 1 ? "foto falló" : "fotos fallaron"}
                      {doneCount > 0 && ` · ${doneCount} subidas correctamente`}
                    </span>
                  </div>
                )}

                <ScrollArea className="h-[260px] pr-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <AnimatePresence>
                      {queue.map((item, idx) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ duration: 0.2 }}
                          className={`relative rounded-sm border overflow-hidden flex flex-col ${
                            item.status === "error"
                              ? "border-destructive/50"
                              : item.status === "done"
                                ? "border-primary/40"
                                : "border-border/40"
                          } bg-surface-2`}
                          data-ocid={`photo.item.${idx + 1}`}
                        >
                          {/* Thumbnail */}
                          <div className="relative h-[90px] shrink-0 overflow-hidden">
                            <img
                              src={item.previewUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {/* Status overlay */}
                            {item.status === "done" && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <CheckCircle2 className="w-7 h-7 text-primary" />
                              </div>
                            )}
                            {item.status === "error" && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <XCircle className="w-7 h-7 text-destructive" />
                              </div>
                            )}
                            {item.status === "uploading" && (
                              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                <span className="text-white text-[10px] font-mono">
                                  {item.progress}%
                                </span>
                              </div>
                            )}
                            {/* Remove button */}
                            {item.status === "pending" && !isUploading && (
                              <button
                                type="button"
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromQueue(item.id);
                                }}
                                aria-label={`Quitar ${item.title}`}
                                data-ocid={`photo.delete_button.${idx + 1}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Per-photo upload progress bar */}
                          {item.status === "uploading" && (
                            <Progress
                              value={item.progress}
                              className="h-[3px] rounded-none"
                            />
                          )}

                          {/* Title & description */}
                          <div className="p-2 flex flex-col gap-1.5">
                            <Input
                              value={item.title}
                              onChange={(e) =>
                                updateItemTitle(item.id, e.target.value)
                              }
                              placeholder="Título..."
                              disabled={
                                item.status === "uploading" ||
                                item.status === "done"
                              }
                              className="h-7 text-xs bg-surface-1 border-border/40 text-foreground placeholder:text-text-subtle px-2"
                              data-ocid="photo.input"
                            />
                            {item.status === "error" && item.errorMsg && (
                              <p className="text-destructive text-[10px] font-mono leading-tight">
                                {item.errorMsg}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="gap-2 pt-4 shrink-0 border-t border-border/20 mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            className="text-text-dim"
            disabled={isUploading}
            data-ocid="photo.cancel_button"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleUploadAll}
            disabled={pendingCount === 0 || isUploading || !albumIdStr}
            className="bg-primary text-primary-foreground hover:bg-gold-glow gap-2"
            data-ocid="photo.submit_button"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {pendingCount > 0
                  ? `Subir ${pendingCount} ${pendingCount === 1 ? "foto" : "fotos"}`
                  : "Subir fotos"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Single Photo Edit Dialog ──────────────────────────────────────────────────

function PhotoFormDialog({
  open,
  onOpenChange,
  photo,
  albums,
  onEditSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  photo?: Photo | null;
  albums: Album[];
  onEditSubmit?: (data: {
    id: string;
    title: string;
    description: string;
    albumId: AlbumId;
  }) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(photo?.title ?? "");
  const [description, setDescription] = useState(photo?.description ?? "");
  const [albumIdStr, setAlbumIdStr] = useState(
    photo?.albumId?.toString() ?? albums[0]?.id?.toString() ?? "",
  );

  const handleOpen = (v: boolean) => {
    if (v) {
      setTitle(photo?.title ?? "");
      setDescription(photo?.description ?? "");
      setAlbumIdStr(
        photo?.albumId?.toString() ?? albums[0]?.id?.toString() ?? "",
      );
    }
    onOpenChange(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    if (!albumIdStr) {
      toast.error("Por favor selecciona un álbum");
      return;
    }
    if (onEditSubmit && photo) {
      onEditSubmit({
        id: photo.id,
        title: title.trim(),
        description: description.trim(),
        albumId: BigInt(albumIdStr),
      });
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
            Editar foto
          </DialogTitle>
          <DialogDescription className="text-text-dim text-sm">
            Actualiza los detalles de la foto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
              value={albumIdStr}
              onValueChange={setAlbumIdStr}
              data-ocid="photo.select"
            >
              <SelectTrigger className="bg-surface-2 border-border/50 text-foreground">
                <SelectValue placeholder="Selecciona un álbum..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border/50">
                {albums.map((a) => (
                  <SelectItem
                    key={a.id.toString()}
                    value={a.id.toString()}
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
              disabled={isPending}
              className="bg-primary text-primary-foreground hover:bg-gold-glow"
              data-ocid="photo.submit_button"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar cambios
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
  const [deleteId, setDeleteId] = useState<AlbumId | null>(null);

  const handleCreate = useCallback(
    ({ name, description }: { name: string; description: string }) => {
      createAlbum.mutate(
        { name, description },
        {
          onSuccess: () => {
            toast.success("Álbum creado");
            setCreateOpen(false);
          },
          onError: (e) => {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error(`No se pudo crear el álbum: ${msg}`);
          },
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
          coverBlobId: editAlbum.coverBlobId ?? undefined,
        },
        {
          onSuccess: () => {
            toast.success("Álbum actualizado");
            setEditAlbum(null);
          },
          onError: (e) => {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error(`No se pudo actualizar el álbum: ${msg}`);
          },
        },
      );
    },
    [editAlbum, updateAlbum],
  );

  const handleDelete = useCallback(() => {
    if (deleteId === null || deleteId === undefined) return;
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
        open={deleteId !== null && deleteId !== undefined}
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
  const { data: photos = [], isLoading, refetch: refetchPhotos } = usePhotos();
  const { data: albums = [] } = useAlbums();
  const updatePhoto = useUpdatePhoto();
  const deletePhoto = useDeletePhoto();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editPhoto, setEditPhoto] = useState<Photo | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const albumMap = Object.fromEntries(
    albums.map((a: Album) => [a.id.toString(), a.name]),
  );

  const handleUpdate = useCallback(
    ({
      id,
      title,
      description,
      albumId,
    }: {
      id: string;
      title: string;
      description: string;
      albumId: AlbumId;
    }) => {
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
          Subir fotos
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
                    {albumMap[photo.albumId.toString()] ??
                      photo.albumId.toString().slice(0, 8)}
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

      {/* Multi-upload dialog */}
      <MultiPhotoUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        albums={albums}
        identity={identity}
        onComplete={() => refetchPhotos()}
      />

      {/* Edit dialog */}
      <PhotoFormDialog
        open={!!editPhoto}
        onOpenChange={(v) => !v && setEditPhoto(null)}
        photo={editPhoto}
        albums={albums}
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

// ── Auto-Registration Screen ─────────────────────────────────────────────────

function AutoRegisterScreen({ onClear }: { onClear: () => void }) {
  const registerAsAdmin = useRegisterAsAdmin();

  const mutate = registerAsAdmin.mutate;
  useEffect(() => {
    mutate(undefined, {
      onError: () => {
        // Error is handled in the render below
      },
    });
  }, [mutate]);

  if (registerAsAdmin.isError) {
    const errorMsg =
      registerAsAdmin.error instanceof Error
        ? registerAsAdmin.error.message
        : String(registerAsAdmin.error);
    const isAlreadyClaimed =
      errorMsg.includes("ya está registrada") ||
      errorMsg.includes("ya fue reclamado") ||
      errorMsg.includes("already");

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
            {isAlreadyClaimed ? (
              <p className="text-text-dim text-sm font-sans">
                El acceso de administrador ya fue reclamado por otra cuenta de
                Internet Identity. Inicia sesión con la cuenta que usaste
                originalmente.
              </p>
            ) : (
              <p className="text-text-dim text-sm font-sans">{errorMsg}</p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={onClear}
            className="border-border/50 text-text-dim hover:text-foreground w-full"
            data-ocid="admin.secondary_button"
          >
            Cerrar sesión
          </Button>
        </motion.div>
      </main>
    );
  }

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
        data-ocid="admin.loading_state"
      >
        <div
          className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.15 0.04 285), oklch(0.22 0.08 290))",
          }}
        >
          <Loader2 className="w-7 h-7 text-gold animate-spin" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-medium text-foreground mb-2">
            Verificando acceso...
          </h1>
          <p className="text-text-dim text-sm font-sans">
            Configurando tu cuenta de administrador. Por favor espera.
          </p>
        </div>
      </motion.div>
    </main>
  );
}

// ── Main Admin Panel ─────────────────────────────────────────────────────────

export function AdminPanel() {
  const { login, clear, identity, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  useIsRegistered();

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

  // Logged in but not admin → always attempt auto-registration with the admin token.
  // useActor may have registered the user as #user before this runs, so we always retry.
  if (!isAdmin) {
    return <AutoRegisterScreen onClear={clear} />;
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
