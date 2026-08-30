import * as Crypto from 'expo-crypto';

import { getCoverageEndDate } from '../utils/coverage';
import { addMonths, nowIso } from '../utils/date';
import type {
  ExtendedWarranty,
  NewWarrantyItem,
  WarrantyItem,
  WarrantyItemUpdate,
} from '../types/warranty';
import { getDatabase } from './database';
import {
  deleteExtendedWarrantiesForItem,
  getExtendedWarrantiesForItem,
  getExtendedWarrantiesForItems,
  insertImportedExtendedWarranties,
} from './extendedWarrantyRepository';
import type { GroupedDocuments } from './invoiceImagesRepository';
import { getDocumentsForItem, getDocumentsForItems } from './invoiceImagesRepository';

interface WarrantyItemRow {
  id: string;
  name: string;
  purchase_date: string;
  warranty_months: number;
  expiry_date: string;
  category: string | null;
  brand: string | null;
  price: number | null;
  store: string | null;
  notes: string | null;
  photo_uri: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToItem(
  row: WarrantyItemRow,
  documents: GroupedDocuments,
  extendedWarranties: ExtendedWarranty[]
): WarrantyItem {
  return {
    id: row.id,
    name: row.name,
    purchaseDate: row.purchase_date,
    warrantyMonths: row.warranty_months,
    expiryDate: row.expiry_date,
    category: row.category ?? undefined,
    brand: row.brand ?? undefined,
    price: row.price ?? undefined,
    store: row.store ?? undefined,
    notes: row.notes ?? undefined,
    photoUri: row.photo_uri ?? undefined,
    invoiceDocuments: documents.invoice,
    warrantyDocuments: documents.warranty,
    extendedWarranties,
    // Derived here rather than stored, so it can never drift from the periods it
    // summarises. This is what the item's status is read from — not expiry_date.
    coverageEndDate: getCoverageEndDate(row.expiry_date, extendedWarranties),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createItem(input: NewWarrantyItem): Promise<WarrantyItem> {
  const db = getDatabase();
  const id = Crypto.randomUUID();
  const timestamp = nowIso();
  const expiryDate = addMonths(input.purchaseDate, input.warrantyMonths);

  await db.runAsync(
    `INSERT INTO warranty_items
      (id, name, purchase_date, warranty_months, expiry_date, category, brand, price, store, notes, photo_uri, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name,
    input.purchaseDate,
    input.warrantyMonths,
    expiryDate,
    input.category ?? null,
    input.brand ?? null,
    input.price ?? null,
    input.store ?? null,
    input.notes ?? null,
    input.photoUri ?? null,
    timestamp,
    timestamp
  );

  const created = await getItemById(id);
  if (!created) {
    throw new Error(`Failed to read back created warranty item ${id}`);
  }
  return created;
}

export async function getAllItems(): Promise<WarrantyItem[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<WarrantyItemRow>(
    'SELECT * FROM warranty_items ORDER BY created_at DESC'
  );
  const itemIds = rows.map((row) => row.id);
  const documentsByItem = await getDocumentsForItems(itemIds);
  const extendedByItem = await getExtendedWarrantiesForItems(itemIds);
  return rows.map((row) =>
    mapRowToItem(
      row,
      documentsByItem.get(row.id) ?? { invoice: [], warranty: [] },
      extendedByItem.get(row.id) ?? []
    )
  );
}

export async function getItemById(id: string): Promise<WarrantyItem | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<WarrantyItemRow>(
    'SELECT * FROM warranty_items WHERE id = ?',
    id
  );
  if (!row) return null;
  const documents = await getDocumentsForItem(id);
  const extendedWarranties = await getExtendedWarrantiesForItem(id);
  return mapRowToItem(row, documents, extendedWarranties);
}

/**
 * Merges `updates` over the stored item, so an omitted key preserves its current value.
 * Note the corollary for `photoUri`: passing it explicitly as `undefined` clears the
 * stored photo, which is how the Add/Edit screen expresses "remove the photo". Callers
 * that only mean to leave the photo alone must omit the key entirely.
 */
export async function updateItem(
  id: string,
  updates: WarrantyItemUpdate
): Promise<WarrantyItem> {
  const existing = await getItemById(id);
  if (!existing) {
    throw new Error(`Warranty item ${id} not found`);
  }

  const merged: WarrantyItem = { ...existing, ...updates };
  const expiryDate = addMonths(merged.purchaseDate, merged.warrantyMonths);
  const updatedAt = nowIso();

  const db = getDatabase();
  await db.runAsync(
    `UPDATE warranty_items
     SET name = ?, purchase_date = ?, warranty_months = ?, expiry_date = ?,
         category = ?, brand = ?, price = ?, store = ?, notes = ?, photo_uri = ?,
         updated_at = ?
     WHERE id = ?`,
    merged.name,
    merged.purchaseDate,
    merged.warrantyMonths,
    expiryDate,
    merged.category ?? null,
    merged.brand ?? null,
    merged.price ?? null,
    merged.store ?? null,
    merged.notes ?? null,
    merged.photoUri ?? null,
    updatedAt,
    id
  );

  // Recomputed rather than carried over from `existing`: the expiry date may have just
  // moved, and the coverage end date is derived from it.
  return {
    ...merged,
    expiryDate,
    coverageEndDate: getCoverageEndDate(expiryDate, merged.extendedWarranties),
    updatedAt,
  };
}

/** Which of the given item ids are already stored — used to merge a backup without duplicating items. */
export async function getExistingItemIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();

  const db = getDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  const rows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM warranty_items WHERE id IN (${placeholders})`,
    ...ids
  );
  return new Set(rows.map((row) => row.id));
}

/**
 * Inserts restored items exactly as they were exported — ids, expiry dates and
 * timestamps are preserved rather than regenerated, so a restored library matches
 * the backup. Callers must filter out ids that already exist first
 * (see `getExistingItemIds`); existing rows are never modified or removed.
 */
export async function insertImportedItems(items: WarrantyItem[]): Promise<void> {
  if (items.length === 0) return;

  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    for (const item of items) {
      await db.runAsync(
        `INSERT INTO warranty_items
          (id, name, purchase_date, warranty_months, expiry_date, category, brand, price, store, notes, photo_uri, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        item.name,
        item.purchaseDate,
        item.warrantyMonths,
        item.expiryDate,
        item.category ?? null,
        item.brand ?? null,
        item.price ?? null,
        item.store ?? null,
        item.notes ?? null,
        item.photoUri ?? null,
        item.createdAt,
        item.updatedAt
      );

      await insertImportedExtendedWarranties(item.extendedWarranties);

      const documents = [
        ...item.invoiceDocuments,
        ...item.warrantyDocuments,
        ...item.extendedWarranties.flatMap((extended) => [
          ...extended.invoiceDocuments,
          ...extended.warrantyDocuments,
        ]),
      ];
      for (const document of documents) {
        await db.runAsync(
          `INSERT INTO invoice_images
            (id, item_id, uri, sort_order, created_at, kind, extended_warranty_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          document.id,
          item.id,
          document.uri,
          document.sortOrder,
          document.createdAt,
          document.kind,
          document.extendedWarrantyId ?? null
        );
      }
    }
  });
}

export async function deleteItem(id: string): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    // Documents of every scope go with the item: extended warranty documents carry the
    // item id too, so this one statement covers them as well.
    await db.runAsync('DELETE FROM invoice_images WHERE item_id = ?', id);
    await deleteExtendedWarrantiesForItem(id);
    await db.runAsync('DELETE FROM warranty_items WHERE id = ?', id);
  });
}
