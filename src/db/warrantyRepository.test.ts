import { getDatabase, initDatabase } from './database';
import {
  createItem,
  deleteItem,
  getAllItems,
  getItemById,
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
    expect(created.invoiceUri).toBeUndefined();
  });

  it('persists optional fields when provided', async () => {
    const created = await createItem({
      ...baseItem,
      category: 'Appliances',
      brand: 'LG',
      price: 24999.5,
      store: 'Croma',
      notes: 'Bought during the sale',
      invoiceUri: 'file:///invoice.jpg',
    });

    expect(created.category).toBe('Appliances');
    expect(created.brand).toBe('LG');
    expect(created.price).toBe(24999.5);
    expect(created.store).toBe('Croma');
    expect(created.notes).toBe('Bought during the sale');
    expect(created.invoiceUri).toBe('file:///invoice.jpg');
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
});
