import { getDatabase, initDatabase } from './database';
import { getImagesForItem, getImagesForItems, saveInvoiceImagesForItem } from './invoiceImagesRepository';
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

describe('getImagesForItem', () => {
  it('returns images ordered by sort order', async () => {
    const item = await makeItem();
    await saveInvoiceImagesForItem(item.id, [
      { id: 'temp-a', uri: 'file:///a.jpg', isPersisted: false },
      { id: 'temp-b', uri: 'file:///b.jpg', isPersisted: false },
    ]);

    const images = await getImagesForItem(item.id);
    expect(images.map((image) => image.uri)).toEqual(['file:///a.jpg', 'file:///b.jpg']);
    expect(images.map((image) => image.sortOrder)).toEqual([0, 1]);
  });

  it('returns an empty array when the item has no images', async () => {
    const item = await makeItem();
    expect(await getImagesForItem(item.id)).toEqual([]);
  });
});

describe('getImagesForItems', () => {
  it('groups images by item id', async () => {
    const itemA = await makeItem('A');
    const itemB = await makeItem('B');
    await saveInvoiceImagesForItem(itemA.id, [{ id: 'temp-a', uri: 'file:///a.jpg', isPersisted: false }]);
    await saveInvoiceImagesForItem(itemB.id, [{ id: 'temp-b', uri: 'file:///b.jpg', isPersisted: false }]);

    const grouped = await getImagesForItems([itemA.id, itemB.id]);
    expect(grouped.get(itemA.id)?.map((image) => image.uri)).toEqual(['file:///a.jpg']);
    expect(grouped.get(itemB.id)?.map((image) => image.uri)).toEqual(['file:///b.jpg']);
  });

  it('returns an empty map for an empty id list', async () => {
    expect(await getImagesForItems([])).toEqual(new Map());
  });
});

describe('saveInvoiceImagesForItem', () => {
  it('inserts new pending images with sequential sort order', async () => {
    const item = await makeItem();

    const { removedUris } = await saveInvoiceImagesForItem(item.id, [
      { id: 'temp-1', uri: 'file:///1.jpg', isPersisted: false },
      { id: 'temp-2', uri: 'file:///2.jpg', isPersisted: false },
    ]);

    expect(removedUris).toEqual([]);
    const images = await getImagesForItem(item.id);
    expect(images).toHaveLength(2);
    expect(images[0]).toMatchObject({ uri: 'file:///1.jpg', sortOrder: 0 });
    expect(images[1]).toMatchObject({ uri: 'file:///2.jpg', sortOrder: 1 });
  });

  it('updates sort order for kept persisted images and reports removed ones', async () => {
    const item = await makeItem();
    await saveInvoiceImagesForItem(item.id, [
      { id: 'temp-1', uri: 'file:///1.jpg', isPersisted: false },
      { id: 'temp-2', uri: 'file:///2.jpg', isPersisted: false },
    ]);
    const [first, second] = await getImagesForItem(item.id);

    const { removedUris } = await saveInvoiceImagesForItem(item.id, [
      { id: second.id, uri: second.uri, isPersisted: true },
    ]);

    expect(removedUris).toEqual([first.uri]);
    const remaining = await getImagesForItem(item.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(second.id);
    expect(remaining[0].sortOrder).toBe(0);
  });

  it('reorders kept persisted images according to the new list order', async () => {
    const item = await makeItem();
    await saveInvoiceImagesForItem(item.id, [
      { id: 'temp-1', uri: 'file:///1.jpg', isPersisted: false },
      { id: 'temp-2', uri: 'file:///2.jpg', isPersisted: false },
    ]);
    const [first, second] = await getImagesForItem(item.id);

    await saveInvoiceImagesForItem(item.id, [
      { id: second.id, uri: second.uri, isPersisted: true },
      { id: first.id, uri: first.uri, isPersisted: true },
    ]);

    const reordered = await getImagesForItem(item.id);
    expect(reordered.map((image) => image.id)).toEqual([second.id, first.id]);
    expect(reordered.map((image) => image.sortOrder)).toEqual([0, 1]);
  });
});
