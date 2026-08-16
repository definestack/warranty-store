import { getDatabase, initDatabase } from '../db/database';
import { createItem } from '../db/warrantyRepository';
import { useItemsStore } from './itemsStore';

beforeAll(async () => {
  await initDatabase();
});

beforeEach(async () => {
  await getDatabase().runAsync('DELETE FROM warranty_items');
  useItemsStore.setState({ items: [], loading: false });
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
