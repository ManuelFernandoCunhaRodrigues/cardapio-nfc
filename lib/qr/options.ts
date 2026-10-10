/** Cores da marca usadas no QR: tinta sobre creme (contraste alto para leitores). */
export const QR_DARK = '#17110D';
export const QR_LIGHT = '#FAF7EF';
export const DEFAULT_QR_URL = 'https://salgae-homologacao.vercel.app';

export type QrFileOptions = {
  errorCorrectionLevel: 'M';
  margin: number;
  width: number;
  color: { dark: string; light: string };
};

/** Opções fixas do QR de mesa: correção M, margem de 4 módulos e 1024 px no PNG. */
export function buildQrOptions(width = 1024): QrFileOptions {
  return { errorCorrectionLevel: 'M', margin: 4, width, color: { dark: QR_DARK, light: QR_LIGHT } };
}

/** Valida a URL do QR: só HTTPS absoluto, sem credenciais. */
export function normalizeQrUrl(input: string | undefined): string {
  const url = new URL(input ?? DEFAULT_QR_URL);
  if (url.protocol !== 'https:') throw new Error('A URL do QR precisa usar HTTPS.');
  if (url.username || url.password) throw new Error('A URL do QR não pode conter credenciais.');
  const text = url.toString();
  // Raiz sem query/hash fica sem a barra final (URL mais curta = QR menos denso).
  return url.pathname === '/' && !url.search && !url.hash ? text.slice(0, -1) : text;
}

/** Nome de arquivo estável a partir do host (ex.: salgae-homologacao-vercel-app). */
export function qrFileSlug(url: string): string {
  return new URL(url).host.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
