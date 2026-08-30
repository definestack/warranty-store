import * as Crypto from 'expo-crypto';

import { nowIso } from '../utils/date';
import type { ItemDocument, ItemDocumentKind } from '../types/warranty';
import { getDatabase } from './database';

/**
 * Rows still live in `invoice_images` and their files still sit in the invoices
 * directory; both names predate the invoice/warranty split and are retained
 * deliberately. The row's `kind` and `extended_warranty_id` carry the meaning — never the
 * table or file name.
 */
interface ItemDocumentRow {
  id: string;
  item_id: string;
  uri: string;
  sort_order: number;
  created_at: string;
  kind: string;
  extended_warranty_id: string | null;
}

/** Documents pre-grouped by kind, each list ordered densely from zero within its kind. */
export interface GroupedDocuments {
  invoice: ItemDocument[];
  warranty: ItemDocument[];
}

/**
 * Which of an item's document buckets a read or write applies to. `extendedWarrantyId`
 * absent means the item's own documents; set means that extended warranty's.
 */
export interface DocumentScope {
  itemId: string;
  extendedWarrantyId?: string;
}

/** A scope narrowed to one kind — the section a document is actually filed in. */
export interface DocumentSection extends DocumentScope {
  kind: ItemDocumentKind;
}

/** Anything unrecognised is treated as an invoice, matching the migration's default. */
function parseKind(raw: string): ItemDocumentKind {
  return raw === 'warranty' ? 'warranty' : 'invoice';
}

function mapRowToDocument(row: ItemDocumentRow): ItemDocument {
  return {
    id: row.id,
    itemId: row.item_id,
    kind: parseKind(row.kind),
    extendedWarrantyId: row.extended_warranty_id ?? undefined,
    uri: row.uri,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function emptyGroups(): GroupedDocuments {
  return { invoice: [], warranty: [] };
}

function addToGroups(groups: GroupedDocuments, row: ItemDocumentRow): void {
  const document = mapRowToDocument(row);
  groups[document.kind].push(document);
}

/** The item's own documents. An extended warranty's are read separately, by its id. */
export async function getDocumentsForItem(itemId: string): Promise<GroupedDocuments> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ItemDocumentRow>(
    `SELECT * FROM invoice_images
     WHERE item_id = ? AND extended_warranty_id IS NULL
     ORDER BY kind ASC, sort_order ASC`,
    itemId
  );

  const groups = emptyGroups();
  for (const row of rows) {
    addToGroups(groups, row);
  }
  return groups;
}

export async function getDocumentsForItems(
  itemIds: string[]
): Promise<Map<string, GroupedDocuments>> {
  const result = new Map<string, GroupedDocuments>();
  if (itemIds.length === 0) return result;

  // Seeded up front so an item with no documents still answers with two empty lists
  // rather than undefined.
  for (const itemId of itemIds) {
    result.set(itemId, emptyGroups());
  }

  const db = getDatabase();
  const placeholders = itemIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<ItemDocumentRow>(
    `SELECT * FROM invoice_images
     WHERE item_id IN (${placeholders}) AND extended_warranty_id IS NULL
     ORDER BY kind ASC, sort_order ASC`,
    ...itemIds
  );

  for (const row of rows) {
    const groups = result.get(row.item_id);
    if (groups) {
      addToGroups(groups, row);
    }
  }
  return result;
}

/** The documents of each given extended warranty, grouped by kind within that scope. */
export async function getDocumentsForExtendedWarranties(
  extendedWarrantyIds: string[]
): Promise<Map<string, GroupedDocuments>> {
  const result = new Map<string, GroupedDocuments>();
  if (extendedWarrantyIds.length === 0) return result;

  for (const id of extendedWarrantyIds) {
    result.set(id, emptyGroups());
  }

  const db = getDatabase();
  const placeholders = extendedWarrantyIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<ItemDocumentRow>(
    `SELECT * FROM invoice_images
     WHERE extended_warranty_id IN (${placeholders})
     ORDER BY kind ASC, sort_order ASC`,
    ...extendedWarrantyIds
  );

  for (const row of rows) {
    const groups = row.extended_warranty_id ? result.get(row.extended_warranty_id) : undefined;
    if (groups) {
      addToGroups(groups, row);
    }
  }
  return result;
}

export interface ItemDocumentDraft {
  id: string;
  uri: string;
  isPersisted: boolean;
}

/**
 * Reconciles one section's documents to `finalDocuments`, scoped so no other section's
 * rows or ordering are read or rewritten — not the other kind, and not the same kind in
 * another scope. Returns the URIs of rows that were dropped, so the caller can discard
 * their files.
 */
export async function saveDocumentsForScope(
  section: DocumentSection,
  finalDocuments: ItemDocumentDraft[]
): Promise<{ removedUris: string[] }> {
  const db = getDatabase();
  const scopeId = section.extendedWarrantyId ?? null;
  // `IS` rather than `=` so a null scope matches the item's own rows.
  const existing = await db.getAllAsync<ItemDocumentRow>(
    `SELECT * FROM invoice_images
     WHERE item_id = ? AND kind = ? AND extended_warranty_id IS ?
     ORDER BY sort_order ASC`,
    section.itemId,
    section.kind,
    scopeId
  );

  const keepIds = new Set(
    finalDocuments.filter((document) => document.isPersisted).map((document) => document.id)
  );
  const toRemove = existing.filter((row) => !keepIds.has(row.id));

  await db.withTransactionAsync(async () => {
    for (const row of toRemove) {
      await db.runAsync('DELETE FROM invoice_images WHERE id = ?', row.id);
    }

    for (let index = 0; index < finalDocuments.length; index += 1) {
      const document = finalDocuments[index];
      if (document.isPersisted) {
        await db.runAsync(
          'UPDATE invoice_images SET sort_order = ? WHERE id = ?',
          index,
          document.id
        );
      } else {
        await db.runAsync(
          `INSERT INTO invoice_images
            (id, item_id, uri, sort_order, created_at, kind, extended_warranty_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          Crypto.randomUUID(),
          section.itemId,
          document.uri,
          index,
          nowIso(),
          section.kind,
          scopeId
        );
      }
    }
  });

  return { removedUris: toRemove.map((row) => row.uri) };
}

/**
 * Drops every document belonging to the given extended warranties, of both kinds, and
 * reports their URIs so the caller can discard the files. Used when an extended warranty
 * is removed from an item.
 */
export async function deleteDocumentsForExtendedWarranties(
  extendedWarrantyIds: string[]
): Promise<{ removedUris: string[] }> {
  if (extendedWarrantyIds.length === 0) return { removedUris: [] };

  const db = getDatabase();
  const placeholders = extendedWarrantyIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<ItemDocumentRow>(
    `SELECT * FROM invoice_images WHERE extended_warranty_id IN (${placeholders})`,
    ...extendedWarrantyIds
  );

  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync('DELETE FROM invoice_images WHERE id = ?', row.id);
    }
  });

  return { removedUris: rows.map((row) => row.uri) };
}
