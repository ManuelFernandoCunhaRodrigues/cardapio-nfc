export default function PublicLoading() {
  return <main aria-label="Carregando cardápio" className="animate-pulse space-y-6 p-4"><div className="h-20 rounded-card bg-sand" /><div className="h-12 rounded-full bg-sand" /><div className="h-52 rounded-card bg-sand" /><div className="flex gap-3">{Array.from({ length: 5 }, (_, index) => <div className="size-16 shrink-0 rounded-full bg-sand" key={index} />)}</div><div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }, (_, index) => <div className="h-52 rounded-product bg-sand" key={index} />)}</div></main>;
}
