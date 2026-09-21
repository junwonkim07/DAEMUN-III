import { extensionOf, UPLOAD_EXTENSIONS } from "@daemun/shared";

export function resolutionDocumentInfo(url: string, originalName?: string | null) {
  const pathname = new URL(url, "https://site.invalid").pathname;
  const extension = extensionOf(pathname);
  const filename = originalName || decodeURIComponent(pathname.split("/").pop() || "resolution");
  return {
    filename,
    label: UPLOAD_EXTENSIONS.includes(extension) ? extension.slice(1).toUpperCase() : "FILE",
  };
}

/** Blob URLs honor `download` even when the source is a different storage origin. */
export async function downloadResolution(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Download failed. Please try again.");
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser time to start consuming the download before releasing it.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
