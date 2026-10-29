import type { AdminProduct } from '@/lib/admin/catalog';

export type ProductSituation = 'menu' | 'unavailable' | 'hidden';
export type ProductFilter = 'all' | 'unavailable' | 'without-image' | 'hidden';
export type AttentionReason = 'unavailable' | 'without-image';
export type HighlightTargetKind = 'menu' | 'category' | 'product' | 'custom';

export function productSituationFromFields(
  product: Pick<AdminProduct, 'is_active' | 'is_available'>,
): ProductSituation {
  if (!product.is_active) return 'hidden';
  return product.is_available ? 'menu' : 'unavailable';
}

export function fieldsFromProductSituation(
  situation: ProductSituation,
): Pick<AdminProduct, 'is_active' | 'is_available'> {
  if (situation === 'menu') return { is_active: true, is_available: true };
  if (situation === 'unavailable') return { is_active: true, is_available: false };
  return { is_active: false, is_available: false };
}

export function attentionReasons(
  product: Pick<AdminProduct, 'is_active' | 'is_available' | 'image_path'>,
): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  if (product.is_active && !product.is_available) reasons.push('unavailable');
  if (!product.image_path) reasons.push('without-image');
  return reasons;
}

export function productsNeedingAttention<
  T extends Pick<AdminProduct, 'is_active' | 'is_available' | 'image_path'>,
>(products: T[]) {
  return products.flatMap((product) => {
    const reasons = attentionReasons(product);
    return reasons.length ? [{ product, reasons }] : [];
  });
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export function filterAdminProducts<T extends AdminProduct>(
  products: T[],
  options: { term?: string; categoryId?: string; filter?: ProductFilter },
): T[] {
  const term = normalize(options.term ?? '');
  return products.filter((product) => {
    if (options.categoryId && product.category_id !== options.categoryId) return false;
    if (term && !normalize(product.name).includes(term)) return false;
    if (options.filter === 'unavailable' && (product.is_available || !product.is_active))
      return false;
    if (options.filter === 'without-image' && product.image_path) return false;
    if (options.filter === 'hidden' && product.is_active) return false;
    return true;
  });
}

export function buildHighlightTarget(kind: HighlightTargetKind, value = ''): string | null {
  const trimmed = value.trim();
  if (kind === 'menu') return '/cardapio';
  if (kind === 'category') return trimmed ? `/cardapio#${trimmed}` : null;
  if (kind === 'product') return trimmed ? `/produto/${trimmed}` : null;
  return trimmed || null;
}

export function highlightTargetKind(target: string | null): HighlightTargetKind {
  if (!target || target === '/cardapio') return 'menu';
  if (target.startsWith('/cardapio#')) return 'category';
  if (target.startsWith('/produto/')) return 'product';
  return 'custom';
}

export type OpeningHourInput = { day: number; closed: boolean; open: string; close: string };

export function buildOpeningHours(values: Record<string, string | boolean>): OpeningHourInput[] {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    closed: values[`closed-${day}`] === true || values[`closed-${day}`] === 'on',
    open: String(values[`open-${day}`] ?? '08:00'),
    close: String(values[`close-${day}`] ?? '18:00'),
  }));
}

export function copyOpeningHourToEveryDay(
  hours: OpeningHourInput[],
  sourceDay: number,
): OpeningHourInput[] {
  const source = hours.find((hour) => hour.day === sourceDay);
  if (!source) return hours;
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    closed: source.closed,
    open: source.open,
    close: source.close,
  }));
}

export type CreationStage = 'product' | 'image' | 'video' | 'done';
export type CreationProgressStatus = 'pending' | 'current' | 'complete' | 'failed';
export type CreationProgressStep = {
  value: Exclude<CreationStage, 'done'>;
  status: CreationProgressStatus;
};

export function creationProgressSteps(options: {
  hasImage: boolean;
  hasVideo: boolean;
  stage: CreationStage | null;
  failedStep?: Exclude<CreationStage, 'done'> | null;
}): CreationProgressStep[] {
  const values: Array<Exclude<CreationStage, 'done'>> = ['product'];
  if (options.hasImage) values.push('image');
  if (options.hasVideo) values.push('video');
  const current =
    options.stage === 'done' ? values.length : options.stage ? values.indexOf(options.stage) : -1;
  return values.map((value, index) => ({
    value,
    status:
      options.failedStep === value
        ? 'failed'
        : index < current
          ? 'complete'
          : index === current
            ? 'current'
            : 'pending',
  }));
}
export type CreationFlowResult = {
  productId: string;
  image: 'skipped' | 'success' | 'error';
  video: 'skipped' | 'success' | 'error';
};

export async function runProductCreationFlow(options: {
  createProduct: () => Promise<{ productId: string }>;
  uploadImage?: (productId: string) => Promise<void>;
  uploadVideo?: (productId: string) => Promise<void>;
  onStage?: (stage: CreationStage) => void;
}): Promise<CreationFlowResult> {
  options.onStage?.('product');
  const { productId } = await options.createProduct();
  let image: CreationFlowResult['image'] = options.uploadImage ? 'success' : 'skipped';
  let video: CreationFlowResult['video'] = options.uploadVideo ? 'success' : 'skipped';
  if (options.uploadImage) {
    options.onStage?.('image');
    try {
      await options.uploadImage(productId);
    } catch {
      image = 'error';
    }
  }
  if (options.uploadVideo && image !== 'error') {
    options.onStage?.('video');
    try {
      await options.uploadVideo(productId);
    } catch {
      video = 'error';
    }
  } else if (options.uploadVideo) {
    video = 'skipped';
  }
  options.onStage?.('done');
  return { productId, image, video };
}

export function singleFlight<TArgs extends unknown[], TResult>(
  task: (...args: TArgs) => Promise<TResult>,
) {
  let current: Promise<TResult> | null = null;
  return (...args: TArgs): Promise<TResult> => {
    if (current) return current;
    current = task(...args).finally(() => {
      current = null;
    });
    return current;
  };
}
