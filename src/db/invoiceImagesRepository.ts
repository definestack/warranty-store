import * as Crypto from 'expo-crypto';

import { nowIso } from '../utils/date';
import type { ItemDocument, ItemDocumentKind } from '../types/warranty';
import { getDatabase } from './database';

/**
 * Rows still live in `invoice_images` and their files still sit in the invoices
 * directory; both names predate the invoice/warranty split and are retained
 * deliberately. The row's `kind` carries the meaning — never the table or file name.
 */
interface ItemDocumentRow {
  id: string;
  item_id: string;
  uri: string;
  sort_order: number;
  created_at: string;
  kind: string;
}

/** Documents pre-grouped by kind, each list ordered densely from zero within its kind. */
export interface GroupedDocuments {
  invoice: ItemDocument[];
  warranty: ItemDocument[];
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

export async function getDocumentsForItem(itemId: string): Promise<GroupedDocuments> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ItemDocumentRow>(
    'SELECT * FROM invoice_images WHERE item_id = ? ORDER BY kind ASC, sort_order ASC',
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
    `SELECT * FROM invoice_images WHERE item_id IN (${placeholders}) ORDER BY kind ASC, sort_order ASC`,
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

export interface ItemDocumentDraft {
  id: string;
  uri: string;
  isPersisted: boolean;
}

/**
 * Reconciles one kind's documents to `finalDocuments`, scoped so the other kind's rows
 * and ordering are never read or rewritten. Returns the URIs of rows that were dropped,
 * so the caller can discard their files.
 */
export async function saveDocumentsForItem(
  itemId: string,
  kind: ItemDocumentKind,
  finalDocuments: ItemDocumentDraft[]
): Promise<{ removedUris: string[] }> {
  const db = getDatabase();
  const existing = await db.getAllAsync<ItemDocumentRow>(
    'SELECT * FROM invoice_images WHERE item_id = ? AND kind = ? ORDER BY sort_order ASC',
    itemId,
    kind
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
          'INSERT INTO invoice_images (id, item_id, uri, sort_order, created_at, kind) VALUES (?, ?, ?, ?, ?, ?)',
          Crypto.randomUUID(),
          itemId,
          document.uri,
          index,
          nowIso(),
          kind
        );
      }
    }
  });

  return { removedUris: toRemove.map((row) => row.uri) };
}
