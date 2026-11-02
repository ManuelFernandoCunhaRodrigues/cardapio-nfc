/**
 * Fotos enviadas pelo painel são guardadas como duas variantes WebP com o mesmo caminho-base;
 * caminhos com extensão são arquivos únicos (como vídeos e imagens antigas).
 */
export function mediaObjectPaths(basePath: string): string[] {
  return /\.[a-z0-9]{2,5}$/i.test(basePath)
    ? [basePath]
    : [`${basePath}-detail.webp`, `${basePath}-card.webp`];
}
