/**
 * Motivo do cancelamento entregue ao AbortSignal da requisição quando ela já respondeu 504. O
 * handler que ainda roda para no próximo ponto de checagem, sem gravar mais nada.
 */
export class RequestCancelledError extends Error {
  override readonly name = 'RequestCancelledError';

  constructor() {
    super('A requisição foi cancelada depois do tempo limite.');
  }
}
