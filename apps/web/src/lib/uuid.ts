/**
 * Moved to @daemun/shared so the admin panel can use the same implementation
 * (direct-to-storage uploads mint their own object keys). Re-exported here so
 * existing imports keep working.
 */
export { uuid } from "@daemun/shared";
