// apps/admin/src/lib/cn.ts
import { clsx, type ClassValue } from "clsx";

/** 조건부 className 결합. 관리 도구라 tailwind-merge까지는 안 쓴다. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
