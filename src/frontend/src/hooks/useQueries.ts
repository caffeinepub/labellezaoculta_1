import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Album, AlbumId, Photo } from "../backend.d";
import { createActorWithConfig } from "../config";
import { getSecretParameter } from "../utils/urlParams";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

// ── Query Hooks ───────────────────────────────────────────────────────────────

export function usePhotos() {
  const { actor, isFetching } = useActor();
  return useQuery<Photo[]>({
    queryKey: ["photos"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPhotos();
    },
    enabled: !!actor && !isFetching,
  });
}

export function usePhoto(id: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Photo | null>({
    queryKey: ["photo", id],
    queryFn: async () => {
      if (!actor || !id) return null;
      return actor.getPhoto(id);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useAlbums() {
  const { actor, isFetching } = useActor();
  return useQuery<Album[]>({
    queryKey: ["albums"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAlbums();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAlbum(id: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Album | null>({
    queryKey: ["album", id?.toString()],
    queryFn: async () => {
      if (!actor || id === null || id === undefined) return null;
      return actor.getAlbum(id);
    },
    enabled: !!actor && !isFetching && id !== null && id !== undefined,
  });
}

export function usePhotosByAlbum(albumId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Photo[]>({
    queryKey: ["photos", "album", albumId?.toString()],
    queryFn: async () => {
      if (!actor || albumId === null || albumId === undefined) return [];
      return actor.getPhotosByAlbum(albumId);
    },
    enabled:
      !!actor && !isFetching && albumId !== null && albumId !== undefined,
  });
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isCallerAdmin();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useIsRegistered() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isRegistered"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        await actor.getCallerUserRole();
        return true;
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useInitializeAdmin() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (adminToken: string) => {
      if (!identity) throw new Error("No autenticado");
      const actor = await createActorWithConfig({ agentOptions: { identity } });
      await actor._initializeAccessControlWithSecret(adminToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["isRegistered"] });
      queryClient.invalidateQueries({ queryKey: ["actor"] });
    },
  });
}

export function useRegisterAsAdmin() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!identity) throw new Error("No autenticado");
      const actor = await createActorWithConfig({ agentOptions: { identity } });

      // Try with Caffeine admin token first (when opened from Caffeine panel)
      const adminToken = getSecretParameter("caffeineAdminToken");
      if (adminToken) {
        try {
          await actor._initializeAccessControlWithSecret(adminToken);
          const isAdmin = await actor.isCallerAdmin();
          if (isAdmin) return;
        } catch {
          // Token didn't work, fall through to registerAsAdmin
        }
      }

      // Fall back to direct registerAsAdmin (first user to call becomes admin)
      try {
        await actor.registerAsAdmin();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // If the user is already registered as a non-admin user, that's the real error
        throw new Error(
          msg.includes("already") || msg.includes("registered")
            ? "Tu cuenta ya está registrada como usuario. Solo el primer inicio de sesión puede reclamar el acceso de administrador."
            : `No se pudo registrar como administrador: ${msg}`,
        );
      }

      // Verify assignment
      const isAdmin = await actor.isCallerAdmin();
      if (!isAdmin) {
        throw new Error(
          "El acceso de administrador ya fue reclamado por otra cuenta.",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["isRegistered"] });
      queryClient.invalidateQueries({ queryKey: ["actor"] });
    },
  });
}

// ── Mutation Hooks ────────────────────────────────────────────────────────────

export function useCreateAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
    }: { name: string; description: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createAlbum(name, description);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
    },
  });
}

export function useUpdateAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      coverBlobId,
    }: {
      id: AlbumId;
      name: string;
      description: string;
      coverBlobId: string | null | undefined;
    }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.updateAlbum(
        id,
        name,
        description,
        coverBlobId ?? null,
      );
      if (!result)
        throw new Error("Álbum no encontrado o no se pudo actualizar");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
    },
  });
}

export function useDeleteAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: AlbumId) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteAlbum(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      queryClient.invalidateQueries({ queryKey: ["photos"] });
    },
  });
}

export function useAddPhoto() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      description,
      albumId,
      blobId,
    }: {
      title: string;
      description: string;
      albumId: AlbumId;
      blobId: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addPhoto(title, description, albumId, blobId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      queryClient.invalidateQueries({ queryKey: ["albums"] });
    },
  });
}

export function useUpdatePhoto() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
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
      if (!actor) throw new Error("Not connected");
      return actor.updatePhoto(id, title, description, albumId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
    },
  });
}

export function useDeletePhoto() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.deletePhoto(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      queryClient.invalidateQueries({ queryKey: ["albums"] });
    },
  });
}
