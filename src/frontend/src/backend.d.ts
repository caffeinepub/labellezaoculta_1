import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Album {
    id: AlbumId;
    name: string;
    createdAt: bigint;
    description: string;
    coverBlobId?: string;
    photoCount: bigint;
}
export type PhotoId = string;
export type AlbumId = bigint;
export interface UserProfile {
    name: string;
}
export interface Photo {
    id: PhotoId;
    title: string;
    description: string;
    blobId: string;
    albumId: AlbumId;
    uploadedAt: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addPhoto(title: string, description: string, albumId: AlbumId, blobId: string): Promise<Photo | null>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createAlbum(name: string, description: string): Promise<Album>;
    deleteAlbum(id: AlbumId): Promise<boolean>;
    deletePhoto(id: PhotoId): Promise<boolean>;
    getAlbum(id: AlbumId): Promise<Album | null>;
    getAlbums(): Promise<Array<Album>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getPhoto(id: PhotoId): Promise<Photo | null>;
    getPhotos(): Promise<Array<Photo>>;
    getPhotosByAlbum(albumId: AlbumId): Promise<Array<Photo>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    registerAsAdmin(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    seedData(): Promise<void>;
    updateAlbum(id: AlbumId, name: string, description: string, coverBlobId: string | null): Promise<boolean>;
    updatePhoto(id: PhotoId, title: string, description: string, albumId: AlbumId): Promise<boolean>;
}
