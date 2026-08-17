export const MAX_IMAGE_DIMENSION = 1568;
export const JPEG_QUALITY = 0.85;
/** Scales width/height down to fit within maxDim on the long edge, preserving
 * aspect ratio. Returns the original dimensions unchanged if already small enough. */
export function computeScaledDimensions(width, height, maxDim = MAX_IMAGE_DIMENSION) {
  if (width <= maxDim && height <= maxDim) return { width, height };
  const scale = maxDim / Math.max(width, height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read that photo."));
    img.src = src;
  });
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}
/** Resizes an existing data URL image down to maxDim, re-encoded as JPEG. */
export async function resizeDataUrl(dataUrl, maxDim = MAX_IMAGE_DIMENSION, quality = JPEG_QUALITY) {
  const img = await loadImage(dataUrl);
  const { width, height } = computeScaledDimensions(img.naturalWidth, img.naturalHeight, maxDim);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}
/** Reads a File (e.g. from an <input type="file">) and resizes it down to maxDim. */
export async function resizeImageFile(file, maxDim = MAX_IMAGE_DIMENSION, quality = JPEG_QUALITY) {
  const dataUrl = await fileToDataUrl(file);
  return resizeDataUrl(dataUrl, maxDim, quality);
}
