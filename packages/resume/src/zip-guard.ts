// Zip-bomb guard: reads only the ZIP central directory, never inflates anything (ADR 0004: no content kept).
export const ZIP_MAX_UNCOMPRESSED = 20 * 1024 * 1024;
export const ZIP_MAX_ENTRIES = 500;
export const ZIP_MAX_RATIO = 100;

/** True when the archive is safe to hand to a decompressor. Any parse doubt returns false. */
export function isZipSafe(bytes: Uint8Array): boolean {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // End of central directory record: 22 bytes + comment up to 65535 bytes.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return false;
  const count = v.getUint16(eocd + 10, true);
  const cdSize = v.getUint32(eocd + 12, true);
  const cdOffset = v.getUint32(eocd + 16, true);
  // Zip64 markers: refuse, resumes never need them.
  if (count === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) return false;
  if (count > ZIP_MAX_ENTRIES || cdOffset + cdSize > eocd) return false;

  let pos = cdOffset;
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (pos + 46 > bytes.length || v.getUint32(pos, true) !== 0x02014b50) return false;
    const compressed = v.getUint32(pos + 20, true);
    const uncompressed = v.getUint32(pos + 24, true);
    if (compressed === 0xffffffff || uncompressed === 0xffffffff) return false;
    if (uncompressed > 0 && (compressed === 0 || uncompressed / compressed > ZIP_MAX_RATIO)) return false;
    total += uncompressed;
    if (total > ZIP_MAX_UNCOMPRESSED) return false;
    pos += 46 + v.getUint16(pos + 28, true) + v.getUint16(pos + 30, true) + v.getUint16(pos + 32, true);
  }
  return true;
}
