import * as Crypto from 'expo-crypto';

import { nowIso } from '../utils/date';
import type { InvoiceImage } from '../types/warranty';
import { getDatabase } from './database';

interface InvoiceImageRow {
  id: string;
  item_id: string;
  uri: string;
  sort_order: number;
  created_at: string;
}

function mapRowToImage(row: InvoiceImageRow): InvoiceImage {
  return {
    id: row.id,
    itemId: row.item_id,
    uri: row.uri,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function getImagesForItem(itemId: string): Promise<InvoiceImage[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<InvoiceImageRow>(
    'SELECT * FROM invoice_images WHERE item_id = ? ORDER BY sort_order ASC',
    itemId
  );
  return rows.map(mapRowToImage);
}

export async function getImagesForItems(itemIds: string[]): Promise<Map<string, InvoiceImage[]>> {
  const result = new Map<string, InvoiceImage[]>();
  if (itemIds.length === 0) return result;

  const db = getDatabase();
  const placeholders = itemIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<InvoiceImageRow>(
    `SELECT * FROM invoice_images WHERE item_id IN (${placeholders}) ORDER BY sort_order ASC`,
    ...itemIds
  );

  for (const row of rows) {
    const image = mapRowToImage(row);
    const existing = result.get(image.itemId);
    if (existing) {
      existing.push(image);
    } else {
      result.set(image.itemId, [image]);
    }
  }
  return result;
}

export interface InvoiceImageDraft {
  id: string;
  uri: string;
  isPersisted: boolean;
}

export async function saveInvoiceImagesForItem(
  itemId: string,
  finalImages: InvoiceImageDraft[]
): Promise<{ removedUris: string[] }> {
  const db = getDatabase();
  const existing = await getImagesForItem(itemId);
  const keepIds = new Set(finalImages.filter((img) => img.isPersisted).map((img) => img.id));
  const toRemove = existing.filter((row) => !keepIds.has(row.id));

  await db.withTransactionAsync(async () => {
    for (const row of toRemove) {
      await db.runAsync('DELETE FROM invoice_images WHERE id = ?', row.id);
    }

    for (let index = 0; index < finalImages.length; index += 1) {
      const image = finalImages[index];
      if (image.isPersisted) {
        await db.runAsync('UPDATE invoice_images SET sort_order = ? WHERE id = ?', index, image.id);
      } else {
        await db.runAsync(
          'INSERT INTO invoice_images (id, item_id, uri, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
          Crypto.randomUUID(),
          itemId,
          image.uri,
          index,
          nowIso()
        );
      }
    }
  });

  return { removedUris: toRemove.map((row) => row.uri) };
}
