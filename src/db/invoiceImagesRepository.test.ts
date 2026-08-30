import { getDatabase, initDatabase } from './database';
import {
  getDocumentsForItem,
  getDocumentsForItems,
  saveDocumentsForItem,
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

/** Attaches `count` fresh documents of one kind, returning them in stored order. */
async function attach(itemId: string, kind: 'invoice' | 'warranty', count: number) {
  await saveDocumentsForItem(
    itemId,
    kind,
    Array.from({ length: count }, (_, index) => ({
      id: `temp-${kind}-${index}`,
      uri: `file:///${kind}-${index}.jpg`,
      isPersisted: false,
    }))
  );
  const documents = await getDocumentsForItem(itemId);
  return kind === 'invoice' ? documents.invoice : documents.warranty;
}

describe('getDocumentsForItem', () => {
  it('groups documents by kind, each ordered densely from zero', async () => {
    const item = await makeItem();
    await attach(item.id, 'invoice', 3);
    await attach(item.id, 'warranty', 2);

    const documents = await getDocumentsForItem(item.id);

    expect(documents.invoice.map((doc) => doc.uri)).toEqual([
      'file:///invoice-0.jpg',
      'file:///invoice-1.jpg',
      'file:///invoice-2.jpg',
    ]);
    expect(documents.invoice.map((doc) => doc.sortOrder)).toEqual([0, 1, 2]);
    expect(documents.warranty.map((doc) => doc.uri)).toEqual([
      'file:///warranty-0.jpg',
      'file:///warranty-1.jpg',
    ]);
    expect(documents.warranty.map((doc) => doc.sortOrder)).toEqual([0, 1]);
  });

  it('tags every document with its own kind', async () => {
    const item = await makeItem();
    await attach(item.id, 'invoice', 1);
    await attach(item.id, 'warranty', 1);

    const documents = await getDocumentsForItem(item.id);
    expect(documents.invoice[0].kind).toBe('invoice');
    expect(documents.warranty[0].kind).toBe('warranty');
  });

  it('returns two empty lists when the item has no documents', async () => {
    const item = await makeItem();
    expect(await getDocumentsForItem(item.id)).toEqual({ invoice: [], warranty: [] });
  });

  it('returns an empty list for a kind the item has none of', async () => {
    const item = await makeItem();
    await attach(item.id, 'warranty', 2);

    const documents = await getDocumentsForItem(item.id);
    expect(documents.invoice).toEqual([]);
    expect(documents.warranty).toHaveLength(2);
  });
});

describe('getDocumentsForItems', () => {
  it('groups by item and then by kind', async () => {
    const itemA = await makeItem('A');
    const itemB = await makeItem('B');
    await attach(itemA.id, 'invoice', 1);
    await attach(itemA.id, 'warranty', 2);
    await attach(itemB.id, 'warranty', 1);

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
});

describe('saveDocumentsForItem', () => {
  it('inserts new documents of the given kind with sequential sort order', async () => {
    const item = await makeItem();

    const { removedUris } = await saveDocumentsForItem(item.id, 'warranty', [
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
    const invoices = await attach(item.id, 'invoice', 3);
    await attach(item.id, 'warranty', 2);

    await saveDocumentsForItem(item.id, 'warranty', []);

    const documents = await getDocumentsForItem(item.id);
    expect(documents.warranty).toEqual([]);
    expect(documents.invoice.map((doc) => doc.id)).toEqual(invoices.map((doc) => doc.id));
    expect(documents.invoice.map((doc) => doc.sortOrder)).toEqual([0, 1, 2]);
  });

  it('closes the gap and reports removed uris', async () => {
    const item = await makeItem();
    const [first, second, third] = await attach(item.id, 'invoice', 3);

    const { removedUris } = await saveDocumentsForItem(item.id, 'invoice', [
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
    const [first, second] = await attach(item.id, 'warranty', 2);

    await saveDocumentsForItem(item.id, 'warranty', [
      { id: second.id, uri: second.uri, isPersisted: true },
      { id: first.id, uri: first.uri, isPersisted: true },
    ]);

    const { warranty } = await getDocumentsForItem(item.id);
    expect(warranty.map((doc) => doc.id)).toEqual([second.id, first.id]);
    expect(warranty.map((doc) => doc.sortOrder)).toEqual([0, 1]);
  });

  it('numbers each kind from zero independently of the other', async () => {
    const item = await makeItem();
    await attach(item.id, 'invoice', 3);
    await attach(item.id, 'warranty', 2);

    const documents = await getDocumentsForItem(item.id);
    expect(documents.invoice.map((doc) => doc.sortOrder)).toEqual([0, 1, 2]);
    expect(documents.warranty.map((doc) => doc.sortOrder)).toEqual([0, 1]);
  });
});
