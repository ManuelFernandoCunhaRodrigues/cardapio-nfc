type CspOptions = {
  /** URL do projeto Supabase: imagens, vídeos, envio de arquivos e login vêm de lá. */
  supabaseUrl?: string;
  /** Em `next dev` o React precisa de `eval` para as ferramentas de depuração. */
  development?: boolean;
};

function originOf(url: string | undefined): string[] {
  if (!url) return [];
  try {
    return [new URL(url).origin];
  } catch {
    return [];
  }
}

/**
 * Content-Security-Policy do site.
 *
 * Os scripts em linha continuam permitidos porque o Next injeta o payload das páginas em
 * `<script>` sem nonce; um nonce exigiria renderizar cada página a cada visita e perder as
 * páginas estáticas do cardápio. O ganho está no resto: nenhum script de outro domínio, nenhum
 * `eval` em produção, nada de `<object>`, a página não pode ser emoldurada e formulários só
 * enviam para o próprio site.
 */
export function buildContentSecurityPolicy({
  supabaseUrl,
  development = false,
}: CspOptions = {}): string {
  const supabase = originOf(supabaseUrl);
  const supabaseRealtime = supabase.map((origin) => origin.replace(/^http/, 'ws'));

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(development ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', ...supabase],
    'media-src': ["'self'", 'blob:', ...supabase],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...supabase, ...supabaseRealtime],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'manifest-src': ["'self'"],
  };

  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}
