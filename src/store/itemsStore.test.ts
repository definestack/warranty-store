import { getDatabase, initDatabase } from '../db/database';
import { createItem } from '../db/warrantyRepository';
import { useItemsStore } from './itemsStore';

beforeAll(async () => {
  await initDatabase();
});

beforeEach(async () => {
  await getDatabase().runAsync('DELETE FROM warranty_items');
  useItemsStore.setState({ items: [], loading: false, selectedItem: null, selectedItemLoading: false });
});

describe('itemsStore', () => {
  it('starts with no items and not loading', () => {
    expect(useItemsStore.getState().items).toEqual([]);
    expect(useItemsStore.getState().loading).toBe(false);
  });

  it('loads all items from SQLite into state', async () => {
    await createItem({ name: 'Washing Machine', purchaseDate: '2026-01-15', warrantyMonths: 12 });
    await createItem({ name: 'Toaster', purchaseDate: '2026-02-01', warrantyMonths: 6 });

    await useItemsStore.getState().loadItems();

    const { items, loading } = useItemsStore.getState();
    expect(loading).toBe(false);
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.name).sort()).toEqual(['Toaster', 'Washing Machine']);
  });

  it('sets loading to true while the fetch is in flight', async () => {
    const loadPromise = useItemsStore.getState().loadItems();
    expect(useItemsStore.getState().loading).toBe(true);
    await loadPromise;
    expect(useItemsStore.getState().loading).toBe(false);
  });

  it('replaces previously loaded items rather than appending', async () => {
    await createItem({ name: 'First', purchaseDate: '2026-01-15', warrantyMonths: 12 });
    await useItemsStore.getState().loadItems();
    expect(useItemsStore.getState().items).toHaveLength(1);

    await getDatabase().runAsync('DELETE FROM warranty_items');
    await createItem({ name: 'Second', purchaseDate: '2026-01-15', warrantyMonths: 12 });
    await useItemsStore.getState().loadItems();

    const { items } = useItemsStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Second');
  });
});

describe('loadItemById', () => {
  it('starts with no selected item and not loading', () => {
    expect(useItemsStore.getState().selectedItem).toBeNull();
    expect(useItemsStore.getState().selectedItemLoading).toBe(false);
  });

  it('fetches the item fresh from SQLite by id', async () => {
    const created = await createItem({ name: 'Blender', purchaseDate: '2026-01-15', warrantyMonths: 12 });

    await useItemsStore.getState().loadItemById(created.id);

    const { selectedItem, selectedItemLoading } = useItemsStore.getState();
    expect(selectedItemLoading).toBe(false);
    expect(selectedItem).toEqual(created);
  });

  it('sets loading to true while the fetch is in flight', async () => {
    const created = await createItem({ name: 'Blender', purchaseDate: '2026-01-15', warrantyMonths: 12 });

    const loadPromise = useItemsStore.getState().loadItemById(created.id);
    expect(useItemsStore.getState().selectedItemLoading).toBe(true);
    await loadPromise;
    expect(useItemsStore.getState().selectedItemLoading).toBe(false);
  });

  it('sets the selected item to null when the id does not exist', async () => {
    await useItemsStore.getState().loadItemById('missing-id');
    expect(useItemsStore.getState().selectedItem).toBeNull();
  });

  it('reflects updates made in SQLite since the item was last loaded', async () => {
    const created = await createItem({ name: 'Blender', purchaseDate: '2026-01-15', warrantyMonths: 12 });
    await useItemsStore.getState().loadItemById(created.id);
    expect(useItemsStore.getState().selectedItem?.name).toBe('Blender');

    await getDatabase().runAsync('UPDATE warranty_items SET name = ? WHERE id = ?', 'Blender Pro', created.id);
    await useItemsStore.getState().loadItemById(created.id);

    expect(useItemsStore.getState().selectedItem?.name).toBe('Blender Pro');
  });
});
