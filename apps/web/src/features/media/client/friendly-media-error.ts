/**
 * Erro cuja mensagem já foi escrita em português para o dono da loja (validação local ou
 * resposta do nosso servidor). Só esta classe tem a mensagem mostrada como veio.
 */
export class MediaUserError extends Error {
  override name = 'MediaUserError';
}

const NETWORK_MESSAGE = 'Não foi possível enviar agora. Confira a internet e tente novamente.';
const DECODE_MESSAGE =
  'Não foi possível abrir esta foto. Se ela for HEIC (foto do iPhone) e você estiver no Android, escolha uma foto JPG ou PNG.';

const messagesByCode: Readonly<Record<string, string>> = {
  image_too_large: 'A foto deve ter no máximo 15 MB.',
  image_upload_too_large:
    'A foto ficou grande demais mesmo depois de reduzida. Escolha outra foto.',
  image_decode_failed: DECODE_MESSAGE,
  canvas_unavailable: DECODE_MESSAGE,
  canvas_export_failed: DECODE_MESSAGE,
  upload_too_large:
    'O vídeo passou do limite de 50 MB. Grave em Full HD (1080p), não em 4K, e tente de novo.',
  upload_failed: NETWORK_MESSAGE,
  video_timeout_gateway: 'O preparo demorou mais que o esperado. Tente novamente.',
};

const fallbackByKind = {
  photo: 'Não foi possível preparar esta foto. Escolha outra.',
  video: 'Não foi possível enviar o vídeo. Tente novamente.',
} as const;

/** `fetch` e Server Actions rejeitam com TypeError quando a conexão cai (Chrome, Firefox e Safari). */
function isNetworkFailure(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    /failed to fetch|networkerror|load failed|network request failed/i.test(error.message)
  );
}

/** Traduz qualquer falha de envio de foto ou vídeo; nunca mostra texto técnico ou em inglês. */
export function friendlyMediaError(error: unknown, kind: keyof typeof fallbackByKind = 'photo') {
  if (error instanceof MediaUserError && error.message) return error.message;
  const known = error instanceof Error ? messagesByCode[error.message] : undefined;
  if (known) return known;
  if (isNetworkFailure(error)) return NETWORK_MESSAGE;
  return fallbackByKind[kind];
}
