import { MAX_DOCUMENTS_PER_KIND } from '../utils/documents';
import { getDatabase, initDatabase } from './database';
import type { DocumentScope } from './invoiceImagesRepository';
import {
  deleteDocumentsForExtendedWarranties,
  getDocumentsForExtendedWarranties,
  getDocumentsForItem,
  getDocumentsForItems,
  saveDocumentsForScope,
} from './invoiceImagesRepository';
import { createItem } from './warrantyRepository';

beforeAll(async () => {
  await initDatabase();
});

beforeEach(async () => {
  await getDatabase().runAsync('DELETE FROM invoice_images');
  await getDatabase().runAsync('DELETE FROM warranty_items');
});

async function makeItem(name = 'Blender') {
  return createItem({ name, purchaseDate: '2026-01-15', warrantyMonths: 12 });
}

/** Attaches `count` fresh documents to one section, returning them in stored order. */
async function attach(scope: DocumentScope, kind: 'invoice' | 'warranty', count: number) {
  const label = scope.extendedWarrantyId ?? 'item';
  await saveDocumentsForScope(
    { ...scope, kind },
    Array.from({ length: count }, (_, index) => ({
      id: `temp-${label}-${kind}-${index}`,
      uri: `file:///${label}-${kind}-${index}.jpg`,
      isPersisted: false,
    }))
  );
  return readSection(scope, kind);
}

async function readSection(scope: DocumentScope, kind: 'invoice' | 'warranty') {
  const groups = scope.extendedWarrantyId
    ? (await getDocumentsForExtendedWarranties([scope.extendedWarrantyId])).get(
        scope.extendedWarrantyId
      )!
    : await getDocumentsForItem(scope.itemId);
  return groups[kind];
}

describe('getDocumentsForItem', () => {
  it('groups documents by kind, each ordered densely from zero', async () => {
    const item = await makeItem();
    await attach({ itemId: item.id }, 'invoice', 3);
    await attach({ itemId: item.id }, 'warranty', 2);

    const documents = await getDocumentsForItem(item.id);

    expect(documents.invoice.map((doc) => doc.uri)).toEqual([
      'file:///item-invoice-0.jpg',
      'file:///item-invoice-1.jpg',
      'file:///item-invoice-2.jpg',
    ]);
    expect(documents.invoice.map((doc) => doc.sortOrder)).toEqual([0, 1, 2]);
    expect(documents.warranty.map((doc) => doc.uri)).toEqual([
      'file:///item-warranty-0.jpg',
      'file:///item-warranty-1.jpg',
    ]);
    expect(documents.warranty.map((doc) => doc.sortOrder)).toEqual([0, 1]);
  });

  it('tags every document with its own kind and no extended warranty', async () => {
    const item = await makeItem();
    await attach({ itemId: item.id }, 'invoice', 1);
    await attach({ itemId: item.id }, 'warranty', 1);

    const documents = await getDocumentsForItem(item.id);
    expect(documents.invoice[0].kind).toBe('invoice');
    expect(documents.invoice[0].extendedWarrantyId).toBeUndefined();
    expect(documents.warranty[0].kind).toBe('warranty');
    expect(documents.warranty[0].extendedWarrantyId).toBeUndefined();
  });

  it('returns two empty lists when the item has no documents', async () => {
    const item = await makeItem();
    expect(await getDocumentsForItem(item.id)).toEqual({ invoice: [], warranty: [] });
  });

  it('returns an empty list for a kind the item has none of', async () => {
    const item = await makeItem();
    await attach({ itemId: item.id }, 'warranty', 2);

    const documents = await getDocumentsForItem(item.id);
    expect(documents.invoice).toEqual([]);
    expect(documents.warranty).toHaveLength(2);
  });

  it('never returns an extended warranty’s documents among the item’s own', async () => {
    const item = await makeItem();
    await attach({ itemId: item.id }, 'invoice', 1);
    await attach({ itemId: item.id, extendedWarrantyId: 'ew-1' }, 'invoice', 3);

    const documents = await getDocumentsForItem(item.id);
    expect(documents.invoice).toHaveLength(1);
    expect(documents.invoice[0].uri).toBe('file:///item-invoice-0.jpg');
  });
});

describe('getDocumentsForItems', () => {
  it('groups by item and then by kind', async () => {
    const itemA = await makeItem('A');
    const itemB = await makeItem('B');
    await attach({ itemId: itemA.id }, 'invoice', 1);
    await attach({ itemId: itemA.id }, 'warranty', 2);
    await attach({ itemId: itemB.id }, 'warranty', 1);

    const grouped = await getDocumentsForItems([itemA.id, itemB.id]);

    expect(grouped.get(itemA.id)?.invoice).toHaveLength(1);
    expect(grouped.get(itemA.id)?.warranty).toHaveLength(2);
    expect(grouped.get(itemB.id)?.invoice).toEqual([]);
    expect(grouped.get(itemB.id)?.warranty).toHaveLength(1);
  });

  it('yields two empty lists for an item with no documents', async () => {
    const item = await makeItem();
    const grouped = await getDocumentsForItems([item.id]);
    expect(grouped.get(item.id)).toEqual({ invoice: [], warranty: [] });
  });

  it('returns an empty map for an empty id list', async () => {
    expect(await getDocumentsForItems([])).toEqual(new Map());
  });

  it('excludes documents scoped to an extended warranty', async () => {
    const item = await makeItem();
    await attach({ itemId: item.id, extendedWarrantyId: 'ew-1' }, 'warranty', 2);

    const grouped = await getDocumentsForItems([item.id]);
    expect(grouped.get(item.id)).toEqual({ invoice: [], warranty: [] });
  });
});

describe('getDocumentsForExtendedWarranties', () => {
  it('groups each extended warranty’s documents by kind, ordered from zero', async () => {
    const item = await makeItem();
    await attach({ itemId: item.id, extendedWarrantyId: 'ew-1' }, 'invoice', 2);
    await attach({ itemId: item.id, extendedWarrantyId: 'ew-1' }, 'warranty', 3);
    await attach({ itemId: item.id, extendedWarrantyId: 'ew-2' }, 'invoice', 1);

    const grouped = await getDocumentsForExtendedWarranties(['ew-1', 'ew-2']);

    expect(grouped.get('ew-1')?.invoice.map((doc) => doc.sortOrder)).toEqual([0, 1]);
    expect(grouped.get('ew-1')?.warranty.map((doc) => doc.sortOrder)).toEqual([0, 1, 2]);
    expect(grouped.get('ew-2')?.invoice).toHaveLength(1);
    expect(grouped.get('ew-2')?.warranty).toEqual([]);
  });

  it('tags every document with the extended warranty it belongs to', async () => {
    const item = await makeItem();
    await attach({ itemId: item.id, extendedWarrantyId: 'ew-1' }, 'invoice', 1);

    const grouped = await getDocumentsForExtendedWarranties(['ew-1']);
    expect(grouped.get('ew-1')?.invoice[0]).toMatchObject({
      extendedWarrantyId: 'ew-1',
      itemId: item.id,
      kind: 'invoice',
    });
  });

  it('yields two empty lists for an extended warranty with no documents', async () => {
    const grouped = await getDocumentsForExtendedWarranties(['ew-empty']);
    expect(grouped.get('ew-empty')).toEqual({ invoice: [], warranty: [] });
  });

  it('returns an empty map for an empty id list', async () => {
    expect(await getDocumentsForExtendedWarranties([])).toEqual(new Map());
  });
});

describe('saveDocumentsForScope', () => {
  it('inserts new documents of the given kind with sequential sort order', async () => {
    const item = await makeItem();

    const { removedUris } = await saveDocumentsForScope({ itemId: item.id, kind: 'warranty' }, [
      { id: 'temp-1', uri: 'file:///1.jpg', isPersisted: false },
      { id: 'temp-2', uri: 'file:///2.jpg', isPersisted: false },
    ]);

    expect(removedUris).toEqual([]);
    const { warranty } = await getDocumentsForItem(item.id);
    expect(warranty).toHaveLength(2);
    expect(warranty[0]).toMatchObject({ uri: 'file:///1.jpg', sortOrder: 0, kind: 'warranty' });
    expect(warranty[1]).toMatchObject({ uri: 'file:///2.jpg', sortOrder: 1, kind: 'warranty' });
  });

  it('leaves the other kind untouched when reconciling one kind', async () => {
    const item = await makeItem();
    const invoices = await attach({ itemId: item.id }, 'invoice', 3);
    await attach({ itemId: item.id }, 'warranty', 2);

    await saveDocumentsForScope({ itemId: item.id, kind: 'warranty' }, []);

    const documents = await getDocumentsForItem(item.id);
    expect(documents.warranty).toEqual([]);
    expect(documents.invoice.map((doc) => doc.id)).toEqual(invoices.map((doc) => doc.id));
    expect(documents.invoice.map((doc) => doc.sortOrder)).toEqual([0, 1, 2]);
  });

  it('closes the gap and reports removed uris', async () => {
    const item = await makeItem();
    const [first, second, third] = await attach({ itemId: item.id }, 'invoice', 3);

    const { removedUris } = await saveDocumentsForScope({ itemId: item.id, kind: 'invoice' }, [
      { id: first.id, uri: first.uri, isPersisted: true },
      { id: third.id, uri: third.uri, isPersisted: true },
    ]);

    expect(removedUris).toEqual([second.uri]);
    const { invoice } = await getDocumentsForItem(item.id);
    expect(invoice.map((doc) => doc.id)).toEqual([first.id, third.id]);
    expect(invoice.map((doc) => doc.sortOrder)).toEqual([0, 1]);
  });

  it('reorders kept documents according to the new list order', async () => {
    const item = await makeItem();
    const [first, second] = await attach({ itemId: item.id }, 'warranty', 2);

    await saveDocumentsForScope({ itemId: item.id, kind: 'warranty' }, [
      { id: second.id, uri: second.uri, isPersisted: true },
      { id: first.id, uri: first.uri, isPersisted: true },
    ]);

    const { warranty } = await getDocumentsForItem(item.id);
    expect(warranty.map((doc) => doc.id)).toEqual([second.id, first.id]);
    expect(warranty.map((doc) => doc.sortOrder)).toEqual([0, 1]);
  });

  it('numbers each kind from zero independently of the other', async () => {
    const item = await makeItem();
    await attach({ itemId: item.id }, 'invoice', 3);
    await attach({ itemId: item.id }, 'warranty', 2);

    const documents = await getDocumentsForItem(item.id);
    expect(documents.invoice.map((doc) => doc.sortOrder)).toEqual([0, 1, 2]);
    expect(documents.warranty.map((doc) => doc.sortOrder)).toEqual([0, 1]);
  });

  it('leaves every other scope untouched when reconciling one scope', async () => {
    const item = await makeItem();
    const itemInvoices = await attach({ itemId: item.id }, 'invoice', 2);
    const otherWarranty = await attach(
      { itemId: item.id, extendedWarrantyId: 'ew-2' },
      'invoice',
      2
    );

    await saveDocumentsForScope({ itemId: item.id, extendedWarrantyId: 'ew-1', kind: 'invoice' }, [
      { id: 'temp-new', uri: 'file:///ew1.jpg', isPersisted: false },
    ]);

    expect((await getDocumentsForItem(item.id)).invoice.map((doc) => doc.id)).toEqual(
      itemInvoices.map((doc) => doc.id)
    );
    const grouped = await getDocumentsForExtendedWarranties(['ew-1', 'ew-2']);
    expect(grouped.get('ew-1')?.invoice.map((doc) => doc.uri)).toEqual(['file:///ew1.jpg']);
    expect(grouped.get('ew-2')?.invoice.map((doc) => doc.id)).toEqual(
      otherWarranty.map((doc) => doc.id)
    );
  });

  it('clearing an extended warranty’s section leaves the item’s own section intact', async () => {
    const item = await makeItem();
    const itemInvoices = await attach({ itemId: item.id }, 'invoice', 2);
    await attach({ itemId: item.id, extendedWarrantyId: 'ew-1' }, 'invoice', 2);

    await saveDocumentsForScope(
      { itemId: item.id, extendedWarrantyId: 'ew-1', kind: 'invoice' },
      []
    );

    expect((await getDocumentsForItem(item.id)).invoice.map((doc) => doc.id)).toEqual(
      itemInvoices.map((doc) => doc.id)
    );
    expect((await getDocumentsForExtendedWarranties(['ew-1'])).get('ew-1')?.invoice).toEqual([]);
  });

  it('numbers each scope from zero independently of the others', async () => {
    const item = await makeItem();
    await attach({ itemId: item.id }, 'invoice', 3);
    await attach({ itemId: item.id, extendedWarrantyId: 'ew-1' }, 'invoice', 2);

    expect((await getDocumentsForItem(item.id)).invoice.map((doc) => doc.sortOrder)).toEqual([
      0, 1, 2,
    ]);
    expect(
      (await getDocumentsForExtendedWarranties(['ew-1'])).get('ew-1')?.invoice.map(
        (doc) => doc.sortOrder
      )
    ).toEqual([0, 1]);
  });
});

describe('the per-section limit is counted per scope per kind', () => {
  it('lets a full item section coexist with a full section on each extended warranty', async () => {
    const item = await makeItem();
    await attach({ itemId: item.id }, 'invoice', MAX_DOCUMENTS_PER_KIND);
    await attach({ itemId: item.id }, 'warranty', MAX_DOCUMENTS_PER_KIND);
    await attach({ itemId: item.id, extendedWarrantyId: 'ew-1' }, 'invoice', MAX_DOCUMENTS_PER_KIND);
    await attach({ itemId: item.id, extendedWarrantyId: 'ew-1' }, 'warranty', 4);

    const own = await getDocumentsForItem(item.id);
    const extended = (await getDocumentsForExtendedWarranties(['ew-1'])).get('ew-1');

    // A full item invoice section does not restrict any other section's capacity.
    expect(own.invoice).toHaveLength(MAX_DOCUMENTS_PER_KIND);
    expect(own.warranty).toHaveLength(MAX_DOCUMENTS_PER_KIND);
    expect(extended?.invoice).toHaveLength(MAX_DOCUMENTS_PER_KIND);
    expect(extended?.warranty).toHaveLength(4);
  });
});

describe('deleteDocumentsForExtendedWarranties', () => {
  it('drops both kinds and reports their uris for cleanup', async () => {
    const item = await makeItem();
    const invoices = await attach({ itemId: item.id, extendedWarrantyId: 'ew-1' }, 'invoice', 2);
    const warranties = await attach({ itemId: item.id, extendedWarrantyId: 'ew-1' }, 'warranty', 1);

    const { removedUris } = await deleteDocumentsForExtendedWarranties(['ew-1']);

    expect(removedUris.sort()).toEqual(
      [...invoices, ...warranties].map((doc) => doc.uri).sort()
    );
    expect((await getDocumentsForExtendedWarranties(['ew-1'])).get('ew-1')).toEqual({
      invoice: [],
      warranty: [],
    });
  });

  it('leaves the item’s own documents and other extended warranties alone', async () => {
    const item = await makeItem();
    const own = await attach({ itemId: item.id }, 'invoice', 2);
    const kept = await attach({ itemId: item.id, extendedWarrantyId: 'ew-2' }, 'invoice', 1);
    await attach({ itemId: item.id, extendedWarrantyId: 'ew-1' }, 'invoice', 1);

    await deleteDocumentsForExtendedWarranties(['ew-1']);

    expect((await getDocumentsForItem(item.id)).invoice.map((doc) => doc.id)).toEqual(
      own.map((doc) => doc.id)
    );
    expect(
      (await getDocumentsForExtendedWarranties(['ew-2'])).get('ew-2')?.invoice.map((doc) => doc.id)
    ).toEqual(kept.map((doc) => doc.id));
  });

  it('does nothing for an empty id list', async () => {
    expect(await deleteDocumentsForExtendedWarranties([])).toEqual({ removedUris: [] });
  });
});
