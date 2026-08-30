import { getDatabase, initDatabase } from './database';
import { saveExtendedWarrantiesForItem } from './extendedWarrantyRepository';
import { saveDocumentsForScope } from './invoiceImagesRepository';
import {
  createItem,
  deleteItem,
  getAllItems,
  getExistingItemIds,
  getItemById,
  insertImportedItems,
  updateItem,
} from './warrantyRepository';
import type { NewWarrantyItem } from '../types/warranty';

const baseItem: NewWarrantyItem = {
  name: 'Washing Machine',
  purchaseDate: '2026-01-15',
  warrantyMonths: 12,
};

beforeAll(async () => {
  await initDatabase();
});

beforeEach(async () => {
  await getDatabase().runAsync('DELETE FROM invoice_images');
  await getDatabase().runAsync('DELETE FROM extended_warranties');
  await getDatabase().runAsync('DELETE FROM warranty_items');
});

describe('createItem', () => {
  it('persists the item and computes the expiry date from purchase date + warranty months', async () => {
    const created = await createItem(baseItem);

    expect(created.id).toEqual(expect.any(String));
    expect(created.name).toBe('Washing Machine');
    expect(created.purchaseDate).toBe('2026-01-15');
    expect(created.warrantyMonths).toBe(12);
    expect(created.expiryDate).toBe('2027-01-15');
    expect(created.createdAt).toBe(created.updatedAt);
  });

  it('leaves optional fields undefined when not provided', async () => {
    const created = await createItem(baseItem);

    expect(created.category).toBeUndefined();
    expect(created.brand).toBeUndefined();
    expect(created.price).toBeUndefined();
    expect(created.store).toBeUndefined();
    expect(created.notes).toBeUndefined();
    expect(created.invoiceDocuments).toEqual([]);
    expect(created.warrantyDocuments).toEqual([]);
  });

  it('persists optional fields when provided', async () => {
    const created = await createItem({
      ...baseItem,
      category: 'Appliances',
      brand: 'LG',
      price: 24999.5,
      store: 'Croma',
      notes: 'Bought during the sale',
    });

    expect(created.category).toBe('Appliances');
    expect(created.brand).toBe('LG');
    expect(created.price).toBe(24999.5);
    expect(created.store).toBe('Croma');
    expect(created.notes).toBe('Bought during the sale');
  });

  it('persists a photoUri and round-trips it through getItemById and getAllItems', async () => {
    const created = await createItem({ ...baseItem, photoUri: 'file:///photos/photo-1.jpg' });

    expect(created.photoUri).toBe('file:///photos/photo-1.jpg');
    expect((await getItemById(created.id))?.photoUri).toBe('file:///photos/photo-1.jpg');
    expect((await getAllItems())[0].photoUri).toBe('file:///photos/photo-1.jpg');
  });

  it('reads back an undefined photoUri when none was provided', async () => {
    const created = await createItem(baseItem);

    expect(created.photoUri).toBeUndefined();
    expect((await getItemById(created.id))?.photoUri).toBeUndefined();
  });
});

describe('getAllItems', () => {
  it('returns an empty array when there are no items', async () => {
    expect(await getAllItems()).toEqual([]);
  });

  it('returns items ordered by most recently created first', async () => {
    jest.useFakeTimers();
    try {
      const first = await createItem({ ...baseItem, name: 'First' });
      jest.advanceTimersByTime(1000);
      const second = await createItem({ ...baseItem, name: 'Second' });

      const items = await getAllItems();
      expect(items.map((item) => item.id)).toEqual([second.id, first.id]);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('getItemById', () => {
  it('returns the matching item', async () => {
    const created = await createItem(baseItem);
    expect(await getItemById(created.id)).toEqual(created);
  });

  it('returns null for an unknown id', async () => {
    expect(await getItemById('missing-id')).toBeNull();
  });

  it('exposes documents already grouped by kind, each ordered by sort order', async () => {
    const created = await createItem(baseItem);
    await saveDocumentsForScope({ itemId: created.id, kind: 'invoice' }, [
      { id: 'temp-1', uri: 'file:///1.jpg', isPersisted: false },
      { id: 'temp-2', uri: 'file:///2.jpg', isPersisted: false },
    ]);
    await saveDocumentsForScope({ itemId: created.id, kind: 'warranty' }, [
      { id: 'temp-3', uri: 'file:///card.jpg', isPersisted: false },
    ]);

    const fetched = await getItemById(created.id);
    expect(fetched?.invoiceDocuments.map((document) => document.uri)).toEqual([
      'file:///1.jpg',
      'file:///2.jpg',
    ]);
    expect(fetched?.warrantyDocuments.map((document) => document.uri)).toEqual(['file:///card.jpg']);
    expect(fetched?.warrantyDocuments[0].kind).toBe('warranty');
  });
});

describe('updateItem', () => {
  it('merges the updates and recalculates the expiry date', async () => {
    const created = await createItem(baseItem);
    const updated = await updateItem(created.id, { warrantyMonths: 24 });

    expect(updated.warrantyMonths).toBe(24);
    expect(updated.expiryDate).toBe('2028-01-15');
    expect(updated.name).toBe(created.name);
  });

  it('recalculates the expiry date when the purchase date changes', async () => {
    const created = await createItem(baseItem);
    const updated = await updateItem(created.id, { purchaseDate: '2026-06-01' });

    expect(updated.expiryDate).toBe('2027-06-01');
  });

  it('persists brand and price updates', async () => {
    const created = await createItem(baseItem);
    const updated = await updateItem(created.id, { brand: 'Bosch', price: 32000 });

    expect(updated.brand).toBe('Bosch');
    expect(updated.price).toBe(32000);
  });

  it('persists store updates', async () => {
    const created = await createItem(baseItem);
    const updated = await updateItem(created.id, { store: 'Amazon India' });

    expect(updated.store).toBe('Amazon India');
  });

  it('persists a photoUri update', async () => {
    const created = await createItem(baseItem);
    const updated = await updateItem(created.id, { photoUri: 'file:///photos/photo-2.jpg' });

    expect(updated.photoUri).toBe('file:///photos/photo-2.jpg');
    expect((await getItemById(created.id))?.photoUri).toBe('file:///photos/photo-2.jpg');
  });

  it('clears the stored photo when photoUri is passed explicitly as undefined', async () => {
    const created = await createItem({ ...baseItem, photoUri: 'file:///photos/photo-1.jpg' });

    const updated = await updateItem(created.id, { photoUri: undefined });

    expect(updated.photoUri).toBeUndefined();
    expect((await getItemById(created.id))?.photoUri).toBeUndefined();
  });

  it('preserves the stored photo when the photoUri key is omitted', async () => {
    const created = await createItem({ ...baseItem, photoUri: 'file:///photos/photo-1.jpg' });

    const updated = await updateItem(created.id, { name: 'Renamed' });

    expect(updated.photoUri).toBe('file:///photos/photo-1.jpg');
    expect((await getItemById(created.id))?.photoUri).toBe('file:///photos/photo-1.jpg');
  });

  it('throws for an unknown id', async () => {
    await expect(updateItem('missing-id', { name: 'x' })).rejects.toThrow(
      'Warranty item missing-id not found'
    );
  });
});

describe('deleteItem', () => {
  it('removes the item', async () => {
    const created = await createItem(baseItem);
    await deleteItem(created.id);
    expect(await getItemById(created.id)).toBeNull();
  });

  it('does not throw when deleting an id that does not exist', async () => {
    await expect(deleteItem('missing-id')).resolves.toBeUndefined();
  });

  it('also removes the item document rows of both kinds', async () => {
    const created = await createItem(baseItem);
    await saveDocumentsForScope({ itemId: created.id, kind: 'invoice' }, [
      { id: 'temp-1', uri: 'file:///1.jpg', isPersisted: false },
    ]);
    await saveDocumentsForScope({ itemId: created.id, kind: 'warranty' }, [
      { id: 'temp-2', uri: 'file:///card.jpg', isPersisted: false },
    ]);

    await deleteItem(created.id);

    const rows = await getDatabase().getAllAsync(
      'SELECT * FROM invoice_images WHERE item_id = ?',
      created.id
    );
    expect(rows).toHaveLength(0);
  });

  it('also removes the item’s extended warranties and their documents', async () => {
    const created = await createItem(baseItem);
    await saveExtendedWarrantiesForItem(created.id, [
      {
        id: 'ew-1',
        durationValue: 24,
        durationUnit: 'months',
        startsOn: '2027-01-16',
        isPersisted: false,
      },
    ]);
    await saveDocumentsForScope({ itemId: created.id, extendedWarrantyId: 'ew-1', kind: 'invoice' }, [
      { id: 'temp-ew', uri: 'file:///ew-invoice.jpg', isPersisted: false },
    ]);

    await deleteItem(created.id);

    const extended = await getDatabase().getAllAsync(
      'SELECT * FROM extended_warranties WHERE item_id = ?',
      created.id
    );
    const documents = await getDatabase().getAllAsync(
      'SELECT * FROM invoice_images WHERE item_id = ?',
      created.id
    );
    expect(extended).toHaveLength(0);
    expect(documents).toHaveLength(0);
  });
});

describe('extended cover on a read item', () => {
  async function withExtendedCover(itemId: string) {
    await saveExtendedWarrantiesForItem(itemId, [
      {
        id: 'ew-1',
        provider: 'ABC Protection',
        durationValue: 24,
        durationUnit: 'months',
        startsOn: '2027-01-16',
        isPersisted: false,
      },
    ]);
  }

  it('loads an item’s extended warranties with it', async () => {
    const created = await createItem(baseItem);
    await withExtendedCover(created.id);

    const stored = await getItemById(created.id);

    expect(stored?.extendedWarranties.map((entry) => entry.id)).toEqual(['ew-1']);
    expect(stored?.extendedWarranties[0].provider).toBe('ABC Protection');
  });

  it('derives the coverage end date as the furthest of the periods', async () => {
    const created = await createItem(baseItem);
    await withExtendedCover(created.id);

    const stored = await getItemById(created.id);

    // Manufacturer cover ends 2027-01-15; the extended period runs to 2029-01-15.
    expect(stored?.expiryDate).toBe('2027-01-15');
    expect(stored?.coverageEndDate).toBe('2029-01-15');
  });

  it('leaves the coverage end date equal to the expiry date without extended cover', async () => {
    const created = await createItem(baseItem);

    const stored = await getItemById(created.id);

    expect(stored?.extendedWarranties).toEqual([]);
    expect(stored?.coverageEndDate).toBe(stored?.expiryDate);
  });

  it('applies the same derivation to the list read', async () => {
    const withCover = await createItem(baseItem);
    const withoutCover = await createItem({ ...baseItem, name: 'Kettle' });
    await withExtendedCover(withCover.id);

    const items = await getAllItems();
    const covered = items.find((item) => item.id === withCover.id);
    const bare = items.find((item) => item.id === withoutCover.id);

    expect(covered?.extendedWarranties).toHaveLength(1);
    expect(covered?.coverageEndDate).toBe('2029-01-15');
    expect(bare?.extendedWarranties).toEqual([]);
    expect(bare?.coverageEndDate).toBe(bare?.expiryDate);
  });

  it('recomputes the coverage end date when an update moves the expiry date', async () => {
    const created = await createItem(baseItem);

    const updated = await updateItem(created.id, { warrantyMonths: 60 });

    // The manufacturer period now outlasts nothing else, but it did move.
    expect(updated.expiryDate).toBe('2031-01-15');
    expect(updated.coverageEndDate).toBe('2031-01-15');
  });
});

describe('getExistingItemIds', () => {
  it('returns only the ids already stored', async () => {
    const created = await createItem(baseItem);

    const existing = await getExistingItemIds([created.id, 'not-in-db']);

    expect(existing).toEqual(new Set([created.id]));
  });

  it('returns an empty set for an empty id list', async () => {
    await createItem(baseItem);

    expect(await getExistingItemIds([])).toEqual(new Set());
  });
});

describe('insertImportedItems', () => {
  const imported = {
    id: 'imported-1',
    name: 'Imported Fridge',
    purchaseDate: '2026-02-01',
    warrantyMonths: 24,
    expiryDate: '2028-02-01',
    category: 'appliances',
    brand: 'LG',
    price: 899,
    store: 'Reliance',
    notes: 'From backup',
    invoiceDocuments: [
      {
        id: 'img-9',
        itemId: 'imported-1',
        kind: 'invoice' as const,
        uri: 'file:///mock-documents/invoices/invoice-img-9.jpg',
        sortOrder: 0,
        createdAt: '2026-02-01T00:00:00.000Z',
      },
    ],
    warrantyDocuments: [
      {
        id: 'img-10',
        itemId: 'imported-1',
        kind: 'warranty' as const,
        uri: 'file:///mock-documents/invoices/invoice-img-10.jpg',
        sortOrder: 0,
        createdAt: '2026-02-01T00:00:00.000Z',
      },
    ],
    extendedWarranties: [],
    coverageEndDate: '2028-02-01',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-02T00:00:00.000Z',
  };

  it('inserts items verbatim, preserving ids, expiry dates and timestamps', async () => {
    await insertImportedItems([imported]);

    const stored = await getItemById('imported-1');
    expect(stored).toMatchObject({
      id: 'imported-1',
      name: 'Imported Fridge',
      expiryDate: '2028-02-01',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-02T00:00:00.000Z',
    });
  });

  it('inserts the accompanying document rows, preserving each kind', async () => {
    await insertImportedItems([imported]);

    const stored = await getItemById('imported-1');
    expect(stored?.invoiceDocuments).toEqual([
      {
        id: 'img-9',
        itemId: 'imported-1',
        kind: 'invoice',
        uri: 'file:///mock-documents/invoices/invoice-img-9.jpg',
        sortOrder: 0,
        createdAt: '2026-02-01T00:00:00.000Z',
      },
    ]);
    expect(stored?.warrantyDocuments).toEqual([
      {
        id: 'img-10',
        itemId: 'imported-1',
        kind: 'warranty',
        uri: 'file:///mock-documents/invoices/invoice-img-10.jpg',
        sortOrder: 0,
        createdAt: '2026-02-01T00:00:00.000Z',
      },
    ]);
  });

  it('leaves existing items untouched', async () => {
    const existing = await createItem(baseItem);

    await insertImportedItems([imported]);

    expect(await getItemById(existing.id)).not.toBeNull();
    expect(await getAllItems()).toHaveLength(2);
  });

  it('preserves photoUri exactly as given, including items with none', async () => {
    await insertImportedItems([
      { ...imported, photoUri: 'file:///mock-documents/photos/photo-imported-1.jpg' },
      { ...imported, id: 'imported-2', invoiceDocuments: [], warrantyDocuments: [], photoUri: undefined },
    ]);

    expect((await getItemById('imported-1'))?.photoUri).toBe(
      'file:///mock-documents/photos/photo-imported-1.jpg'
    );
    expect((await getItemById('imported-2'))?.photoUri).toBeUndefined();
  });

  it('does nothing for an empty list', async () => {
    await expect(insertImportedItems([])).resolves.toBeUndefined();
    expect(await getAllItems()).toHaveLength(0);
  });
});
