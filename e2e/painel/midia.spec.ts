import path from 'node:path';

import { expect, test, type AdminDb, type Page } from '../fixtures';

const PHOTO_FILE = path.join(__dirname, '../arquivos/foto-teste.jpg');
const VIDEO_FILE = path.join(__dirname, '../arquivos/video-teste.mp4');

async function createProduct(page: Page, adminDb: AdminDb, name: string) {
  await page.goto('/admin/produtos/novo');
  await page.getByRole('textbox', { name: 'Nome do produto', exact: true }).fill(name);
  await page.getByRole('textbox', { name: 'Preço' }).fill('12,34');
  await page.getByRole('button', { name: 'Coxinhas', exact: true }).click();
  await page.getByRole('button', { name: 'Criar produto' }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/admin\/produtos\/[0-9a-f-]{36}\?criado=1$/);

  const id = new URL(page.url()).pathname.split('/').pop();
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  adminDb.track('products', id!);
  const { data, error } = await adminDb.client
    .from('products')
    .select('slug')
    .eq('id', id!)
    .single();
  expect(error).toBeNull();
  expect(data).not.toBeNull();
  return { id: id!, slug: data!.slug };
}

async function deleteProduct(page: Page, name: string) {
  await page.goto('/admin/produtos');
  const row = page.getByRole('row').filter({ hasText: name });
  if ((await row.count()) === 0) return;
  // "Mais ações" é um <summary>, não um botão no Chromium.
  await row.getByLabel(`Mais ações para ${name}`).click();
  await row.getByRole('button', { name: 'Excluir', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: `Excluir ${name}?` });
  await dialog.getByRole('button', { name: 'Excluir de vez' }).click();
  await expect(row).toHaveCount(0);
}

async function expectStorageObjectRemoved(adminDb: AdminDb, bucket: string, objectPath: string) {
  const { error } = await adminDb.client.storage.from(bucket).download(objectPath);
  expect(error, `${bucket}/${objectPath} ainda existe após excluir o produto`).not.toBeNull();
}

/**
 * Gera uma foto no tamanho máximo do painel, com ruído só no brilho. O JPEG reduzido passa de 2 MB,
 * e o WebP gerado na API ainda cabe no limite de 1 MiB do bucket, o que ruído em todas as cores não
 * permite. Vai em PNG para o painel recodificar os mesmos pixels.
 */
async function createDetailedPhoto(page: Page): Promise<Buffer> {
  const dataUrl = await page.evaluate(async () => {
    const SIDE = 2048;
    const NOISE_AMPLITUDE = 120;
    const canvas = document.createElement('canvas');
    canvas.width = SIDE;
    canvas.height = SIDE;
    const image = new ImageData(SIDE, SIDE);
    for (let index = 0; index < image.data.length; index += 4) {
      const brightness = 128 + Math.floor((Math.random() - 0.5) * NOISE_AMPLITUDE);
      image.data.set([brightness, brightness, brightness, 255], index);
    }
    canvas.getContext('2d')!.putImageData(image, 0, 0);
    const jpeg = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );
    if (!jpeg || jpeg.size < 2_000_000) {
      throw new Error(`A foto de teste ficou pequena demais: ${jpeg?.size} bytes.`);
    }
    return canvas.toDataURL('image/png');
  });
  return Buffer.from(dataUrl.split(',')[1]!, 'base64');
}

test.describe('mídia dos produtos', () => {
  test('aceita foto grande e cheia de detalhes', async ({ page, adminDb, uniqueName }) => {
    test.slow();
    const name = uniqueName('produto-foto-grande');
    const product = await createProduct(page, adminDb, name);
    let imagePath: string | null = null;

    try {
      await page.getByLabel('Escolher foto', { exact: true }).setInputFiles({
        name: 'foto-grande.png',
        mimeType: 'image/png',
        buffer: await createDetailedPhoto(page),
      });
      await expect(page.getByText('Foto otimizada e salva com sucesso.')).toBeVisible({
        timeout: 30_000,
      });

      const { data, error } = await adminDb.client
        .from('products')
        .select('image_path')
        .eq('id', product.id)
        .single();
      expect(error).toBeNull();
      imagePath = data?.image_path ?? null;
      expect(imagePath).not.toBeNull();
    } finally {
      await deleteProduct(page, name);
      if (imagePath) {
        await expectStorageObjectRemoved(adminDb, 'product-images', `${imagePath}-detail.webp`);
        await expectStorageObjectRemoved(adminDb, 'product-images', `${imagePath}-card.webp`);
      }
    }
  });

  test('envia foto e mostra a imagem do Storage no detalhe público', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const name = uniqueName('produto-foto');
    const product = await createProduct(page, adminDb, name);
    let imagePath: string | null = null;

    try {
      await page.getByLabel('Escolher foto', { exact: true }).setInputFiles(PHOTO_FILE);
      await expect(page.getByText('Foto otimizada e salva com sucesso.')).toBeVisible();

      const { data, error } = await adminDb.client
        .from('products')
        .select('image_path')
        .eq('id', product.id)
        .single();
      expect(error).toBeNull();
      imagePath = data?.image_path ?? null;
      expect(imagePath).not.toBeNull();

      await page.goto(`/produto/${product.slug}`);
      const image = page.getByRole('img', { name, exact: true });
      await expect(image).toHaveAttribute(
        'src',
        new RegExp(`/storage/v1/object/public/product-images/${imagePath}-detail\\.webp$`),
      );
      await expect
        .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
        .toBeGreaterThan(0);
    } finally {
      await deleteProduct(page, name);
      if (imagePath) {
        await expectStorageObjectRemoved(adminDb, 'product-images', `${imagePath}-detail.webp`);
        await expectStorageObjectRemoved(adminDb, 'product-images', `${imagePath}-card.webp`);
      }
    }
  });

  test('remove a foto e devolve o foco ao título da mídia', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    const name = uniqueName('produto-remover-foto');
    await createProduct(page, adminDb, name);

    try {
      await page.getByLabel('Escolher foto', { exact: true }).setInputFiles(PHOTO_FILE);
      await expect(page.getByText('Foto otimizada e salva com sucesso.')).toBeVisible();
      await page.reload();

      await page.getByRole('button', { name: 'Remover foto' }).click();
      await page
        .getByRole('dialog', { name: 'Remover foto deste produto?' })
        .getByRole('button', { name: 'Excluir de vez' })
        .click();

      await expect(page.getByText('Foto removida.')).toBeVisible();
      await expect(page.locator('[role="dialog"]')).toHaveCount(0);
      // O botão "Remover foto" some com a foto: o foco vai para o título da seção.
      await expect(page.getByRole('heading', { level: 2, name: 'Foto e vídeo' })).toBeFocused();
    } finally {
      await deleteProduct(page, name);
    }
  });

  test('envia vídeo e mostra o arquivo do Storage no detalhe público', async ({
    page,
    adminDb,
    uniqueName,
  }) => {
    test.setTimeout(120_000);
    const name = uniqueName('produto-video');
    const product = await createProduct(page, adminDb, name);
    let imagePath: string | null = null;
    let videoPath: string | null = null;

    try {
      await page.getByLabel('Escolher foto', { exact: true }).setInputFiles(PHOTO_FILE);
      await expect(page.getByText('Foto otimizada e salva com sucesso.')).toBeVisible();
      const imageResult = await adminDb.client
        .from('products')
        .select('image_path')
        .eq('id', product.id)
        .single();
      expect(imageResult.error).toBeNull();
      imagePath = imageResult.data?.image_path ?? null;

      await page.getByLabel('Escolher vídeo', { exact: true }).setInputFiles(VIDEO_FILE);
      await expect(page.getByText(/Vídeo compactado e salvo:/)).toBeVisible({ timeout: 60_000 });

      const { data, error } = await adminDb.client
        .from('products')
        .select('video_path')
        .eq('id', product.id)
        .single();
      expect(error).toBeNull();
      videoPath = data?.video_path ?? null;
      expect(videoPath).not.toBeNull();

      await page.goto(`/produto/${product.slug}`);
      await page.getByRole('button', { name: `Assistir vídeo de ${name}` }).click();
      const video = page.getByLabel(`Vídeo de ${name}`);
      await expect(video).toHaveAttribute(
        'src',
        new RegExp(`/storage/v1/object/public/product-videos/${videoPath}$`),
      );
    } finally {
      await deleteProduct(page, name);
      if (imagePath) {
        await expectStorageObjectRemoved(adminDb, 'product-images', `${imagePath}-detail.webp`);
        await expectStorageObjectRemoved(adminDb, 'product-images', `${imagePath}-card.webp`);
      }
      if (videoPath) await expectStorageObjectRemoved(adminDb, 'product-videos', videoPath);
    }
  });
});
