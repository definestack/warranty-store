import * as Crypto from 'expo-crypto';

import { addMonths, nowIso } from '../utils/date';
import type {
  NewWarrantyItem,
  WarrantyItem,
  WarrantyItemUpdate,
} from '../types/warranty';
import { getDatabase } from './database';

interface WarrantyItemRow {
  id: string;
  name: string;
  purchase_date: string;
  warranty_months: number;
  expiry_date: string;
  category: string | null;
  notes: string | null;
  invoice_uri: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToItem(row: WarrantyItemRow): WarrantyItem {
  return {
    id: row.id,
    name: row.name,
    purchaseDate: row.purchase_date,
    warrantyMonths: row.warranty_months,
    expiryDate: row.expiry_date,
    category: row.category ?? undefined,
    notes: row.notes ?? undefined,
    invoiceUri: row.invoice_uri ?? undefined,
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
      (id, name, purchase_date, warranty_months, expiry_date, category, notes, invoice_uri, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name,
    input.purchaseDate,
    input.warrantyMonths,
    expiryDate,
    input.category ?? null,
    input.notes ?? null,
    input.invoiceUri ?? null,
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
  return rows.map(mapRowToItem);
}

export async function getItemById(id: string): Promise<WarrantyItem | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<WarrantyItemRow>(
    'SELECT * FROM warranty_items WHERE id = ?',
    id
  );
  return row ? mapRowToItem(row) : null;
}

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
         category = ?, notes = ?, invoice_uri = ?, updated_at = ?
     WHERE id = ?`,
    merged.name,
    merged.purchaseDate,
    merged.warrantyMonths,
    expiryDate,
    merged.category ?? null,
    merged.notes ?? null,
    merged.invoiceUri ?? null,
    updatedAt,
    id
  );

  return { ...merged, expiryDate, updatedAt };
}

export async function deleteItem(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM warranty_items WHERE id = ?', id);
}
