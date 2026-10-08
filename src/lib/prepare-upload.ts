// Listing photos are shown small (cards, galleries), but phones and cameras produce 3-5 MB originals.
// Shrinking them in the browser before they go to storage keeps every page fast for visitors on mobile data.
const MAX_EDGE = 1800;

export async function preparePhotoForUpload(file: File): Promise<File> {
  if (!/^image\/(jpe?g|png|webp)$/i.test(file.type) || typeof document === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/webp", 0.82));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file; // anything unusual: upload the original rather than block the upload
  }
}
