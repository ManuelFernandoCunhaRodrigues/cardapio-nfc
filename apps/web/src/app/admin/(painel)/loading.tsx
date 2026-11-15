/**
 * As telas do painel leem o banco a cada visita e levam alguns segundos. Com este arquivo, a troca
 * de tela responde na hora, e os pedidos antecipados dos links param aqui, sem buscar os dados.
 */
export default function AdminPanelLoading() {
  return (
    <div
      aria-live="polite"
      className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-muted"
      role="status"
    >
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-border border-t-brand motion-reduce:hidden"
      />
      Carregando…
    </div>
  );
}
