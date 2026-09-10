/**
 * Picks the storage driver from UPLOAD_DRIVER. Defaults to "local", which is
 * the behaviour every existing deployment already has — set the variable only
 * where a different backend is wanted.
 */
import { env } from "../../env";
import { blobDriver } from "./blob";
import { localDriver } from "./local";
import type { StorageDriver } from "./types";

const drivers: Record<string, StorageDriver> = {
  local: localDriver,
  blob: blobDriver,
};

function pick(): StorageDriver {
  const driver = drivers[env.uploadDriver];
  if (!driver) {
    throw new Error(
      `Unknown UPLOAD_DRIVER "${env.uploadDriver}" (available: ${Object.keys(drivers).join(", ")})`,
    );
  }
  return driver;
}

export const storage = pick();
export type { StorageDriver, StoredObject } from "./types";
