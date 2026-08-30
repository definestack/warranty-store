import type { ExtendedWarranty, WarrantyDurationUnit } from '../types/warranty';
import { deriveCoverageEndDate } from '../utils/coverage';
import { nowIso } from '../utils/date';
import { getDatabase } from './database';
import type { GroupedDocuments } from './invoiceImagesRepository';
import { getDocumentsForExtendedWarranties } from './invoiceImagesRepository';

interface ExtendedWarrantyRow {
  id: string;
  item_id: string;
  provider: string | null;
  duration_value: number;
  duration_unit: string;
  starts_on: string;
  ends_on: string;
  cost: number | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * An extended warranty as the edit screen holds it. The id is minted on the client when
 * the user adds the entry, so its documents can reference it before it has ever been
 * saved; `isPersisted` says whether a row already exists under that id.
 *
 * There is deliberately no end date here — it is derived on every write.
 */
export interface ExtendedWarrantyDraft {
  id: string;
  provider?: string;
  durationValue: number;
  durationUnit: WarrantyDurationUnit;
  startsOn: string;
  cost?: number;
  notes?: string;
  isPersisted: boolean;
}

/** Anything unrecognised is read as months, the unit a bare number would have meant. */
function parseDurationUnit(raw: string): WarrantyDurationUnit {
  return raw === 'years' ? 'years' : 'months';
}

function mapRowToExtendedWarranty(
  row: ExtendedWarrantyRow,
  documents: GroupedDocuments
): ExtendedWarranty {
  return {
    id: row.id,
    itemId: row.item_id,
    provider: row.provider ?? undefined,
    durationValue: row.duration_value,
    durationUnit: parseDurationUnit(row.duration_unit),
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    cost: row.cost ?? undefined,
    notes: row.notes ?? undefined,
    sortOrder: row.sort_order,
    invoiceDocuments: documents.invoice,
    warrantyDocuments: documents.warranty,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function emptyGroups(): GroupedDocuments {
  return { invoice: [], warranty: [] };
}

async function attachDocuments(rows: ExtendedWarrantyRow[]): Promise<ExtendedWarranty[]> {
  const documentsById = await getDocumentsForExtendedWarranties(rows.map((row) => row.id));
  return rows.map((row) => mapRowToExtendedWarranty(row, documentsById.get(row.id) ?? emptyGroups()));
}

export async function getExtendedWarrantiesForItem(itemId: string): Promise<ExtendedWarranty[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ExtendedWarrantyRow>(
    'SELECT * FROM extended_warranties WHERE item_id = ? ORDER BY sort_order ASC',
    itemId
  );
  return attachDocuments(rows);
}

export async function getExtendedWarrantiesForItems(
  itemIds: string[]
): Promise<Map<string, ExtendedWarranty[]>> {
  const result = new Map<string, ExtendedWarranty[]>();
  if (itemIds.length === 0) return result;

  // Seeded up front so an item with no extended cover answers with an empty list rather
  // than undefined.
  for (const itemId of itemIds) {
    result.set(itemId, []);
  }

  const db = getDatabase();
  const placeholders = itemIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<ExtendedWarrantyRow>(
    `SELECT * FROM extended_warranties WHERE item_id IN (${placeholders})
     ORDER BY item_id ASC, sort_order ASC`,
    ...itemIds
  );

  for (const extended of await attachDocuments(rows)) {
    result.get(extended.itemId)?.push(extended);
  }
  return result;
}

/**
 * Rejected before anything is written, so an invalid entry cannot leave the item's cover
 * half-reconciled. Optional fields are only checked when they were given a value.
 */
function assertValid(draft: ExtendedWarrantyDraft): void {
  if (!Number.isInteger(draft.durationValue) || draft.durationValue <= 0) {
    throw new Error(
      `Extended warranty ${draft.id} has an invalid duration: ${draft.durationValue}`
    );
  }
  if (draft.cost !== undefined && (Number.isNaN(draft.cost) || draft.cost < 0)) {
    throw new Error(`Extended warranty ${draft.id} has an invalid cost: ${draft.cost}`);
  }
}

/**
 * Reconciles the item's extended cover to `drafts`: rows no longer listed are deleted,
 * listed rows are updated in place, new ones are inserted under the id they were given,
 * and `sort_order` is renumbered densely from zero in list order.
 *
 * Returns the ids that were removed so the caller can discard their documents and files.
 */
export async function saveExtendedWarrantiesForItem(
  itemId: string,
  drafts: ExtendedWarrantyDraft[]
): Promise<{ removedIds: string[] }> {
  for (const draft of drafts) {
    assertValid(draft);
  }

  const db = getDatabase();
  const existing = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM extended_warranties WHERE item_id = ? ORDER BY sort_order ASC',
    itemId
  );

  const keepIds = new Set(drafts.filter((draft) => draft.isPersisted).map((draft) => draft.id));
  const toRemove = existing.filter((row) => !keepIds.has(row.id));
  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    for (const row of toRemove) {
      await db.runAsync('DELETE FROM extended_warranties WHERE id = ?', row.id);
    }

    for (let index = 0; index < drafts.length; index += 1) {
      const draft = drafts[index];
      const endsOn = deriveCoverageEndDate(
        draft.startsOn,
        draft.durationValue,
        draft.durationUnit
      );

      if (draft.isPersisted) {
        await db.runAsync(
          `UPDATE extended_warranties
           SET provider = ?, duration_value = ?, duration_unit = ?, starts_on = ?, ends_on = ?,
               cost = ?, notes = ?, sort_order = ?, updated_at = ?
           WHERE id = ?`,
          draft.provider ?? null,
          draft.durationValue,
          draft.durationUnit,
          draft.startsOn,
          endsOn,
          draft.cost ?? null,
          draft.notes ?? null,
          index,
          timestamp,
          draft.id
        );
      } else {
        await db.runAsync(
          `INSERT INTO extended_warranties
            (id, item_id, provider, duration_value, duration_unit, starts_on, ends_on, cost,
             notes, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          draft.id,
          itemId,
          draft.provider ?? null,
          draft.durationValue,
          draft.durationUnit,
          draft.startsOn,
          endsOn,
          draft.cost ?? null,
          draft.notes ?? null,
          index,
          timestamp,
          timestamp
        );
      }
    }
  });

  return { removedIds: toRemove.map((row) => row.id) };
}

/**
 * Drops every extended warranty on the item, returning their ids so the caller can clean
 * up their documents. Used when the item itself is deleted.
 */
export async function deleteExtendedWarrantiesForItem(itemId: string): Promise<string[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM extended_warranties WHERE item_id = ?',
    itemId
  );

  await db.runAsync('DELETE FROM extended_warranties WHERE item_id = ?', itemId);

  return rows.map((row) => row.id);
}

/** Inserts extended cover exactly as exported, preserving ids, dates and order. */
export async function insertImportedExtendedWarranties(
  extendedWarranties: ExtendedWarranty[]
): Promise<void> {
  if (extendedWarranties.length === 0) return;

  const db = getDatabase();
  for (const extended of extendedWarranties) {
    await db.runAsync(
      `INSERT INTO extended_warranties
        (id, item_id, provider, duration_value, duration_unit, starts_on, ends_on, cost,
         notes, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      extended.id,
      extended.itemId,
      extended.provider ?? null,
      extended.durationValue,
      extended.durationUnit,
      extended.startsOn,
      extended.endsOn,
      extended.cost ?? null,
      extended.notes ?? null,
      extended.sortOrder,
      extended.createdAt,
      extended.updatedAt
    );
  }
}
