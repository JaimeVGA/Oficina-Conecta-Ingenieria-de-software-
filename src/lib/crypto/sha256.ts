/**
 * Calcula hash SHA-256 en hexadecimal minúsculas en navegador (Web Crypto API)
 * para detección de duplicados dentro del mismo documento (RF-004, RN-005).
 */
export async function computeFileSha256(file: File | ArrayBuffer): Promise<string> {
  const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
