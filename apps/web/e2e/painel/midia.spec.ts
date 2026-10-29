import path from 'node:path';

import { expect, test, type AdminDb, type Page } from '../fixtures';

const PHOTO_FILE = path.resolve('e2e/arquivos/foto-teste.jpg');
const VIDEO_FILE = path.resolve('e2e/arquivos/video-teste.mp4');

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

test.describe('mídia dos produtos', () => {
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
