import { loadConfig } from "../config";

const DEMO_GRADIENTS = [
  "linear-gradient(135deg, oklch(0.15 0.03 285) 0%, oklch(0.22 0.08 280) 50%, oklch(0.12 0.02 300) 100%)",
  "linear-gradient(135deg, oklch(0.12 0.02 50) 0%, oklch(0.20 0.06 45) 50%, oklch(0.10 0.02 60) 100%)",
  "linear-gradient(135deg, oklch(0.14 0.04 185) 0%, oklch(0.19 0.07 190) 50%, oklch(0.11 0.02 180) 100%)",
  "linear-gradient(135deg, oklch(0.16 0.05 340) 0%, oklch(0.21 0.09 345) 50%, oklch(0.12 0.03 330) 100%)",
  "linear-gradient(135deg, oklch(0.13 0.03 130) 0%, oklch(0.18 0.06 135) 50%, oklch(0.10 0.02 125) 100%)",
  "linear-gradient(135deg, oklch(0.17 0.04 60) 0%, oklch(0.24 0.10 65) 50%, oklch(0.14 0.03 55) 100%)",
  "linear-gradient(135deg, oklch(0.11 0.03 250) 0%, oklch(0.17 0.07 255) 50%, oklch(0.09 0.02 245) 100%)",
  "linear-gradient(135deg, oklch(0.15 0.02 0) 0%, oklch(0.20 0.05 5) 50%, oklch(0.12 0.02 355) 100%)",
];

export function getDemoGradient(index: number): string {
  return DEMO_GRADIENTS[index % DEMO_GRADIENTS.length];
}

export function isDemo(blobId: string): boolean {
  return blobId === "demo" || blobId.startsWith("demo");
}

let _configCache: {
  backend_host: string;
  backend_canister_id: string;
  project_id: string;
} | null = null;

async function getConfig() {
  if (_configCache) return _configCache;
  const cfg = await loadConfig();
  _configCache = {
    backend_host: cfg.backend_host ?? "",
    backend_canister_id: cfg.backend_canister_id ?? "",
    project_id: cfg.project_id ?? "",
  };
  return _configCache;
}

export async function getImageUrl(blobId: string): Promise<string | null> {
  if (isDemo(blobId)) return null;
  const cfg = await getConfig();
  const GATEWAY_VERSION = "v1";
  return `${cfg.backend_host}/${GATEWAY_VERSION}/blob/?blob_hash=${encodeURIComponent(blobId)}&owner_id=${encodeURIComponent(cfg.backend_canister_id)}&project_id=${encodeURIComponent(cfg.project_id)}`;
}

// Demo placeholder image assets (used for seed data visuals)
export const DEMO_PLACEHOLDER_IMAGES = [
  "/assets/generated/photo-placeholder-1.dim_800x600.jpg",
  "/assets/generated/photo-placeholder-2.dim_600x800.jpg",
  "/assets/generated/photo-placeholder-3.dim_800x500.jpg",
  "/assets/generated/photo-placeholder-4.dim_700x700.jpg",
  "/assets/generated/photo-placeholder-5.dim_800x600.jpg",
];

export function getDemoPlaceholderImage(index: number): string {
  return DEMO_PLACEHOLDER_IMAGES[index % DEMO_PLACEHOLDER_IMAGES.length];
}
