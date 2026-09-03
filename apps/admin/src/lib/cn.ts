import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 조건부 className 결합 + Tailwind 충돌 해소 (web의 `cn`과 동일).
 * `text-sm`이 기본인 컴포넌트에 `className="text-[15px]"`를 넘겨도 순서와
 * 무관하게 나중 값이 이긴다.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
