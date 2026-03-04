import { HttpAgent } from "@icp-sdk/core/agent";
import { useMemo } from "react";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";
import { useInternetIdentity } from "./useInternetIdentity";

let _storageClientPromise: Promise<StorageClient> | null = null;

export async function getStorageClient(
  identity?: import("@icp-sdk/core/agent").Identity,
): Promise<StorageClient> {
  const cfg = await loadConfig();
  const agent = new HttpAgent({
    host: cfg.backend_host ?? "",
    identity,
  });
  return new StorageClient(
    "photos",
    cfg.backend_host ?? "",
    cfg.backend_canister_id ?? "",
    cfg.project_id ?? "",
    agent,
  );
}

export function useStorageClient() {
  const { identity } = useInternetIdentity();

  const clientPromise = useMemo(() => {
    return getStorageClient(identity);
  }, [identity]);

  return clientPromise;
}
