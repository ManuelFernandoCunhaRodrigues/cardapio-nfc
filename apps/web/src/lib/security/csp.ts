type CspOptions = {
  /** URL do projeto Supabase: imagens, vídeos, envio de arquivos e login vêm de lá. */
  supabaseUrl?: string;
  /** Em `next dev` o React precisa de `eval` para as ferramentas de depuração. */
  development?: boolean;
  /** Site servido por https (stage e produção): pedidos http da página sobem para https. */
  upgradeInsecureRequests?: boolean;
};

type HttpsEnv = Readonly<Record<string, string | undefined>>;

/**
 * O site é servido só por https? Vale quando o endereço público é https ou quando a build roda
 * na Vercel, que serve todo projeto (stage, produção e prévias) por https, mesmo sem
 * `NEXT_PUBLIC_SITE_URL`. No CI o site roda em http://127.0.0.1 e fica de fora.
 */
export function isServedOverHttps(env: HttpsEnv): boolean {
  return env.VERCEL === '1' || Boolean(env.NEXT_PUBLIC_SITE_URL?.startsWith('https://'));
}

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
  upgradeInsecureRequests = false,
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

  const policy = Object.entries(directives).map(
    ([directive, sources]) => `${directive} ${sources.join(' ')}`,
  );
  if (upgradeInsecureRequests) policy.push('upgrade-insecure-requests');
  return policy.join('; ');
}
