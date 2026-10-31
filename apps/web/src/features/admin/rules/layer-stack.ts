// Camadas abertas do painel, da mais antiga para a de cima (ex.: "Remover foto" aberta sobre a
// gaveta do destaque). Só a de cima responde ao teclado; as de baixo ficam cobertas.
export function createLayerStack() {
  const layers: symbol[] = [];
  const listeners = new Set<() => void>();

  function notify() {
    listeners.forEach((listener) => listener());
  }

  return {
    open(layer: symbol) {
      layers.push(layer);
      notify();
    },
    close(layer: symbol) {
      const position = layers.indexOf(layer);
      if (position === -1) return;
      layers.splice(position, 1);
      notify();
    },
    isTop(layer: symbol) {
      return layers.at(-1) === layer;
    },
    isCovered(layer: symbol) {
      const position = layers.indexOf(layer);
      return position !== -1 && position < layers.length - 1;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
