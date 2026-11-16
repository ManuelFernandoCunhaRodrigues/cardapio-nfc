// Esqueleto leve das listas enquanto a página nova chega (navegação sem pré-carga ou internet
// lenta). Sem pulsar com movimento reduzido.
export default function ListsLoading() {
  return (
    <div className="px-4 pb-6 pt-1" role="status">
      <span className="sr-only">Carregando o cardápio…</span>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        <div className="h-12 rounded-full bg-sand" />
        <div className="mt-3 h-[clamp(180px,28svh,252px)] rounded-[24px] bg-sand" />
        <div className="mt-5 flex gap-3.5">
          {[0, 1, 2, 3, 4].map((item) => (
            <div className="size-[52px] shrink-0 rounded-full bg-sand" key={item} />
          ))}
        </div>
        <div className="mt-6 h-5 w-32 rounded-full bg-sand" />
        <div className="mt-3 flex gap-3 overflow-hidden">
          {[0, 1, 2].map((item) => (
            <div
              className="h-[242px] w-[38%] shrink-0 rounded-product bg-white shadow-card"
              key={item}
            >
              <div className="h-[108px] rounded-t-product bg-sand" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
