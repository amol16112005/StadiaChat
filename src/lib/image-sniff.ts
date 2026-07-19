/** Magic-byte image detection (do not trust client MIME alone). */
export function sniffImage(
  buf: Buffer | Uint8Array
): { ext: string; mime: string } | null {
  if (buf.length < 12) return null;
  const b = buf instanceof Buffer ? buf : Buffer.from(buf);

  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { ext: ".jpg", mime: "image/jpeg" };
  }
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { ext: ".png", mime: "image/png" };
  }
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    return { ext: ".gif", mime: "image/gif" };
  }
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return { ext: ".webp", mime: "image/webp" };
  }
  return null;
}
