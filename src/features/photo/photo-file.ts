export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
/** Inspect dimensions before handing compressed raster data to the browser decoder. */
export function inspectPhoto(
  bytes: Uint8Array,
  mime: string,
): { width: number; height: number } {
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES)
    throw new Error('Choose a JPEG or PNG no larger than 8 MiB.');
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0,
    height = 0;
  if (
    mime === 'image/png' &&
    bytes.length >= 33 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v) &&
    data.getUint32(8) === 13 &&
    data.getUint32(12) === 0x49484452
  ) {
    width = data.getUint32(16);
    height = data.getUint32(20);
  } else if (mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      const size = offset + 2 <= bytes.length ? data.getUint16(offset) : 0;
      if (size < 2 || offset + size > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2].includes(marker) && size >= 8) {
        height = data.getUint16(offset + 3);
        width = data.getUint16(offset + 5);
        break;
      }
      offset += size;
    }
  }
  if (
    !width ||
    !height ||
    width > 8192 ||
    height > 8192 ||
    width * height > 24_000_000
  )
    throw new Error(
      'Invalid or unsupported photo. Use a JPEG or PNG up to 8192 pixels per side and 24 megapixels.',
    );
  return { width, height };
}
export type PhotoPreview = { url: string; width: number; height: number };
export async function preparePhoto(file: File): Promise<PhotoPreview> {
  if (file.size > MAX_PHOTO_BYTES)
    throw new Error('Choose a JPEG or PNG no larger than 8 MiB.');
  inspectPhoto(new Uint8Array(await file.arrayBuffer()), file.type);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      'The photo could not be decoded. Choose another JPEG or PNG.',
    );
  }
  try {
    if (
      bitmap.width > 8192 ||
      bitmap.height > 8192 ||
      bitmap.width * bitmap.height > 24_000_000
    )
      throw new Error('Decoded photo exceeds the pixel limit.');
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context)
      throw new Error('Photo review is unavailable in this browser.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error('Photo review could not be prepared.')),
        'image/jpeg',
        0.9,
      ),
    );
    return {
      url: URL.createObjectURL(blob),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    bitmap.close();
  }
}
