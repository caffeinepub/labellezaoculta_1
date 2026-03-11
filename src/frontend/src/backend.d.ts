import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserProfile {
    name: string;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface Album {
    id: bigint;
    name: string;
    createdAt: bigint;
    description: string;
    coverBlobId?: string;
    photoCount: bigint;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface Photo {
    id: string;
    title: string;
    description: string;
    blobId: string;
    albumId: bigint;
    price: bigint;
    uploadedAt: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addPhoto(title: string, description: string, albumId: bigint, blobId: string, price: bigint): Promise<Photo | null>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createAlbum(name: string, description: string): Promise<Album>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    deleteAlbum(id: bigint): Promise<boolean>;
    deletePhoto(id: string): Promise<boolean>;
    getAlbum(id: bigint): Promise<Album | null>;
    getAlbums(): Promise<Array<Album>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getPhoto(id: string): Promise<Photo | null>;
    getPhotos(): Promise<Array<Photo>>;
    getPhotosByAlbum(albumId: bigint): Promise<Array<Photo>>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    registerAsAdmin(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    seedData(): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateAlbum(id: bigint, name: string, description: string, coverBlobId: string | null): Promise<boolean>;
    updatePhoto(id: string, title: string, description: string, albumId: bigint, price: bigint): Promise<boolean>;
}
