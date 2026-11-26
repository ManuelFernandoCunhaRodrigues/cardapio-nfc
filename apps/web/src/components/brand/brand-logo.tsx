import Image from 'next/image';

const LOGO_SRC = '/brand/salgae-logo-recortada.webp';
const LOGO_HEIGHT_PER_WIDTH = 583 / 1042;

/**
 * `width` é a largura exibida em CSS: o `srcset` sai em 1x/2x desse tamanho, e não da largura do
 * arquivo original. A logo fica sempre no topo da tela, então carrega já (`priority` foi
 * descontinuado no Next 16).
 */
export function BrandLogo({
  alt = 'Salgaê',
  className,
  width,
}: Readonly<{ alt?: string; className?: string; width: number }>) {
  return (
    <Image
      alt={alt}
      className={className}
      height={Math.round(width * LOGO_HEIGHT_PER_WIDTH)}
      loading="eager"
      src={LOGO_SRC}
      width={width}
    />
  );
}
