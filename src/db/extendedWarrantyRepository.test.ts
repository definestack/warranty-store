import { getDatabase, initDatabase } from './database';
import type { ExtendedWarrantyDraft } from './extendedWarrantyRepository';
import {
  deleteExtendedWarrantiesForItem,
  getExtendedWarrantiesForItem,
  getExtendedWarrantiesForItems,
  saveExtendedWarrantiesForItem,
} from './extendedWarrantyRepository';
import { saveDocumentsForScope } from './invoiceImagesRepository';
import { createItem } from './warrantyRepository';

beforeAll(async () => {
  await initDatabase();
});

beforeEach(async () => {
  await getDatabase().runAsync('DELETE FROM extended_warranties');
  await getDatabase().runAsync('DELETE FROM invoice_images');
  await getDatabase().runAsync('DELETE FROM warranty_items');
});

async function makeItem(name = 'Television') {
  return createItem({ name, purchaseDate: '2026-01-15', warrantyMonths: 12 });
}

function draft(overrides: Partial<ExtendedWarrantyDraft> & { id: string }): ExtendedWarrantyDraft {
  return {
    durationValue: 24,
    durationUnit: 'months',
    startsOn: '2027-01-16',
    isPersisted: false,
    ...overrides,
  };
}

describe('getExtendedWarrantiesForItem', () => {
  it('returns an empty list for an item with no extended cover', async () => {
    const item = await makeItem();
    expect(await getExtendedWarrantiesForItem(item.id)).toEqual([]);
  });

  it('returns them in stable order, numbered densely from zero', async () => {
    const item = await makeItem();
    await saveExtendedWarrantiesForItem(item.id, [
      draft({ id: 'ew-1', provider: 'First' }),
      draft({ id: 'ew-2', provider: 'Second' }),
      draft({ id: 'ew-3', provider: 'Third' }),
    ]);

    const extended = await getExtendedWarrantiesForItem(item.id);

    expect(extended.map((entry) => entry.provider)).toEqual(['First', 'Second', 'Third']);
    expect(extended.map((entry) => entry.sortOrder)).toEqual([0, 1, 2]);
  });

  it('reads back every recorded field', async () => {
    const item = await makeItem();
    await saveExtendedWarrantiesForItem(item.id, [
      draft({
        id: 'ew-1',
        provider: 'ABC Protection',
        durationValue: 2,
        durationUnit: 'years',
        startsOn: '2027-01-16',
        cost: 4999,
        notes: 'Bought online',
      }),
    ]);

    const [extended] = await getExtendedWarrantiesForItem(item.id);

    expect(extended).toMatchObject({
      id: 'ew-1',
      itemId: item.id,
      provider: 'ABC Protection',
      durationValue: 2,
      durationUnit: 'years',
      startsOn: '2027-01-16',
      endsOn: '2029-01-15',
      cost: 4999,
      notes: 'Bought online',
      sortOrder: 0,
    });
  });

  it('reports omitted optional fields as absent rather than null', async () => {
    const item = await makeItem();
    await saveExtendedWarrantiesForItem(item.id, [draft({ id: 'ew-1' })]);

    const [extended] = await getExtendedWarrantiesForItem(item.id);

    expect(extended.provider).toBeUndefined();
    expect(extended.cost).toBeUndefined();
    expect(extended.notes).toBeUndefined();
  });

  it('carries each entry’s own documents, grouped by kind', async () => {
    const item = await makeItem();
    await saveExtendedWarrantiesForItem(item.id, [draft({ id: 'ew-1' }), draft({ id: 'ew-2' })]);
    await saveDocumentsForScope({ itemId: item.id, extendedWarrantyId: 'ew-1', kind: 'invoice' }, [
      { id: 'temp-a', uri: 'file:///ew1-invoice.jpg', isPersisted: false },
    ]);
    await saveDocumentsForScope({ itemId: item.id, extendedWarrantyId: 'ew-1', kind: 'warranty' }, [
      { id: 'temp-b', uri: 'file:///ew1-cert.jpg', isPersisted: false },
      { id: 'temp-c', uri: 'file:///ew1-terms.jpg', isPersisted: false },
    ]);

    const extended = await getExtendedWarrantiesForItem(item.id);

    expect(extended[0].invoiceDocuments.map((doc) => doc.uri)).toEqual([
      'file:///ew1-invoice.jpg',
    ]);
    expect(extended[0].warrantyDocuments.map((doc) => doc.uri)).toEqual([
      'file:///ew1-cert.jpg',
      'file:///ew1-terms.jpg',
    ]);
    expect(extended[1].invoiceDocuments).toEqual([]);
    expect(extended[1].warrantyDocuments).toEqual([]);
  });
});

describe('getExtendedWarrantiesForItems', () => {
  it('groups by item and keeps each item’s order', async () => {
    const itemA = await makeItem('A');
    const itemB = await makeItem('B');
    await saveExtendedWarrantiesForItem(itemA.id, [
      draft({ id: 'a-1', provider: 'First' }),
      draft({ id: 'a-2', provider: 'Second' }),
    ]);
    await saveExtendedWarrantiesForItem(itemB.id, [draft({ id: 'b-1', provider: 'Only' })]);

    const grouped = await getExtendedWarrantiesForItems([itemA.id, itemB.id]);

    expect(grouped.get(itemA.id)?.map((entry) => entry.provider)).toEqual(['First', 'Second']);
    expect(grouped.get(itemB.id)?.map((entry) => entry.provider)).toEqual(['Only']);
  });

  it('yields an empty list, not undefined, for an item with no extended cover', async () => {
    const item = await makeItem();
    const grouped = await getExtendedWarrantiesForItems([item.id]);
    expect(grouped.get(item.id)).toEqual([]);
  });

  it('returns an empty map for an empty id list', async () => {
    expect(await getExtendedWarrantiesForItems([])).toEqual(new Map());
  });
});

describe('saveExtendedWarrantiesForItem', () => {
  it('inserts new entries under the id they were given', async () => {
    const item = await makeItem();

    const { removedIds } = await saveExtendedWarrantiesForItem(item.id, [
      draft({ id: 'client-minted-id' }),
    ]);

    expect(removedIds).toEqual([]);
    const [extended] = await getExtendedWarrantiesForItem(item.id);
    expect(extended.id).toBe('client-minted-id');
  });

  it('updates an existing entry in place, keeping its id', async () => {
    const item = await makeItem();
    await saveExtendedWarrantiesForItem(item.id, [draft({ id: 'ew-1', provider: 'Old' })]);

    await saveExtendedWarrantiesForItem(item.id, [
      draft({ id: 'ew-1', provider: 'New', cost: 1500, isPersisted: true }),
    ]);

    const extended = await getExtendedWarrantiesForItem(item.id);
    expect(extended).toHaveLength(1);
    expect(extended[0]).toMatchObject({ id: 'ew-1', provider: 'New', cost: 1500 });
  });

  it('removes dropped entries, closes the numbering gap and reports their ids', async () => {
    const item = await makeItem();
    await saveExtendedWarrantiesForItem(item.id, [
      draft({ id: 'ew-1', provider: 'First' }),
      draft({ id: 'ew-2', provider: 'Second' }),
      draft({ id: 'ew-3', provider: 'Third' }),
    ]);

    const { removedIds } = await saveExtendedWarrantiesForItem(item.id, [
      draft({ id: 'ew-1', provider: 'First', isPersisted: true }),
      draft({ id: 'ew-3', provider: 'Third', isPersisted: true }),
    ]);

    expect(removedIds).toEqual(['ew-2']);
    const extended = await getExtendedWarrantiesForItem(item.id);
    expect(extended.map((entry) => entry.id)).toEqual(['ew-1', 'ew-3']);
    expect(extended.map((entry) => entry.sortOrder)).toEqual([0, 1]);
  });

  it('reorders entries according to the list order', async () => {
    const item = await makeItem();
    await saveExtendedWarrantiesForItem(item.id, [
      draft({ id: 'ew-1', provider: 'First' }),
      draft({ id: 'ew-2', provider: 'Second' }),
    ]);

    await saveExtendedWarrantiesForItem(item.id, [
      draft({ id: 'ew-2', provider: 'Second', isPersisted: true }),
      draft({ id: 'ew-1', provider: 'First', isPersisted: true }),
    ]);

    const extended = await getExtendedWarrantiesForItem(item.id);
    expect(extended.map((entry) => entry.id)).toEqual(['ew-2', 'ew-1']);
    expect(extended.map((entry) => entry.sortOrder)).toEqual([0, 1]);
  });

  it('clears every entry when saved with an empty list', async () => {
    const item = await makeItem();
    await saveExtendedWarrantiesForItem(item.id, [draft({ id: 'ew-1' }), draft({ id: 'ew-2' })]);

    const { removedIds } = await saveExtendedWarrantiesForItem(item.id, []);

    expect(removedIds.sort()).toEqual(['ew-1', 'ew-2']);
    expect(await getExtendedWarrantiesForItem(item.id)).toEqual([]);
  });

  it('leaves another item’s extended cover untouched', async () => {
    const itemA = await makeItem('A');
    const itemB = await makeItem('B');
    await saveExtendedWarrantiesForItem(itemA.id, [draft({ id: 'a-1' })]);
    await saveExtendedWarrantiesForItem(itemB.id, [draft({ id: 'b-1' })]);

    await saveExtendedWarrantiesForItem(itemA.id, []);

    expect(await getExtendedWarrantiesForItem(itemB.id)).toHaveLength(1);
  });
});

describe('the end date is always derived, never accepted', () => {
  it('derives it on insert', async () => {
    const item = await makeItem();
    await saveExtendedWarrantiesForItem(item.id, [
      draft({ id: 'ew-1', startsOn: '2027-08-28', durationValue: 24, durationUnit: 'months' }),
    ]);

    const [extended] = await getExtendedWarrantiesForItem(item.id);
    expect(extended.endsOn).toBe('2029-08-27');
  });

  it('re-derives it on update when the duration changes', async () => {
    const item = await makeItem();
    await saveExtendedWarrantiesForItem(item.id, [
      draft({ id: 'ew-1', startsOn: '2027-08-28', durationValue: 12, durationUnit: 'months' }),
    ]);

    await saveExtendedWarrantiesForItem(item.id, [
      draft({
        id: 'ew-1',
        startsOn: '2027-08-28',
        durationValue: 24,
        durationUnit: 'months',
        isPersisted: true,
      }),
    ]);

    const [extended] = await getExtendedWarrantiesForItem(item.id);
    expect(extended.endsOn).toBe('2029-08-27');
  });

  it('ignores an end date supplied by the caller', async () => {
    const item = await makeItem();
    await saveExtendedWarrantiesForItem(item.id, [
      {
        ...draft({ id: 'ew-1', startsOn: '2027-08-28', durationValue: 24 }),
        endsOn: '2099-01-01',
      } as ExtendedWarrantyDraft,
    ]);

    const [extended] = await getExtendedWarrantiesForItem(item.id);
    expect(extended.endsOn).toBe('2029-08-27');
  });
});

describe('validation at the repository boundary', () => {
  it('rejects a zero duration', async () => {
    const item = await makeItem();
    await expect(
      saveExtendedWarrantiesForItem(item.id, [draft({ id: 'ew-1', durationValue: 0 })])
    ).rejects.toThrow(/duration/i);
  });

  it('rejects a negative duration', async () => {
    const item = await makeItem();
    await expect(
      saveExtendedWarrantiesForItem(item.id, [draft({ id: 'ew-1', durationValue: -6 })])
    ).rejects.toThrow(/duration/i);
  });

  it('rejects a fractional duration', async () => {
    const item = await makeItem();
    await expect(
      saveExtendedWarrantiesForItem(item.id, [draft({ id: 'ew-1', durationValue: 1.5 })])
    ).rejects.toThrow(/duration/i);
  });

  it('rejects a negative cost', async () => {
    const item = await makeItem();
    await expect(
      saveExtendedWarrantiesForItem(item.id, [draft({ id: 'ew-1', cost: -1 })])
    ).rejects.toThrow(/cost/i);
  });

  it('accepts a zero cost', async () => {
    const item = await makeItem();
    await saveExtendedWarrantiesForItem(item.id, [draft({ id: 'ew-1', cost: 0 })]);

    const [extended] = await getExtendedWarrantiesForItem(item.id);
    expect(extended.cost).toBe(0);
  });

  it('writes nothing when one entry in the list is invalid', async () => {
    const item = await makeItem();
    await saveExtendedWarrantiesForItem(item.id, [draft({ id: 'ew-1', provider: 'Kept' })]);

    await expect(
      saveExtendedWarrantiesForItem(item.id, [
        draft({ id: 'ew-1', provider: 'Kept', isPersisted: true }),
        draft({ id: 'ew-2', durationValue: 0 }),
      ])
    ).rejects.toThrow(/duration/i);

    const extended = await getExtendedWarrantiesForItem(item.id);
    expect(extended.map((entry) => entry.id)).toEqual(['ew-1']);
  });
});

describe('deleteExtendedWarrantiesForItem', () => {
  it('removes every entry for the item and reports their ids', async () => {
    const item = await makeItem();
    await saveExtendedWarrantiesForItem(item.id, [draft({ id: 'ew-1' }), draft({ id: 'ew-2' })]);

    const removedIds = await deleteExtendedWarrantiesForItem(item.id);

    expect(removedIds.sort()).toEqual(['ew-1', 'ew-2']);
    expect(await getExtendedWarrantiesForItem(item.id)).toEqual([]);
  });

  it('leaves other items alone', async () => {
    const itemA = await makeItem('A');
    const itemB = await makeItem('B');
    await saveExtendedWarrantiesForItem(itemA.id, [draft({ id: 'a-1' })]);
    await saveExtendedWarrantiesForItem(itemB.id, [draft({ id: 'b-1' })]);

    await deleteExtendedWarrantiesForItem(itemA.id);

    expect(await getExtendedWarrantiesForItem(itemB.id)).toHaveLength(1);
  });
});
