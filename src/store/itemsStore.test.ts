import { __setFileExists, getInfoAsync } from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';

import { getDatabase, initDatabase } from '../db/database';
import { saveInvoiceImagesForItem } from '../db/invoiceImagesRepository';
import * as notificationSchedulesRepository from '../db/notificationSchedulesRepository';
import { getSchedulesForItem, saveSchedulesForItem } from '../db/notificationSchedulesRepository';
import * as warrantyRepository from '../db/warrantyRepository';
import { createItem, getItemById } from '../db/warrantyRepository';
import * as fileService from '../services/fileService';
import { useItemsStore } from './itemsStore';

beforeAll(async () => {
  await initDatabase();
});

beforeEach(async () => {
  await getDatabase().runAsync('DELETE FROM invoice_images');
  await getDatabase().runAsync('DELETE FROM warranty_items');
  await getDatabase().runAsync('DELETE FROM notification_schedules');
  useItemsStore.setState({ items: [], loading: false, selectedItem: null, selectedItemLoading: false });
  jest.clearAllMocks();
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

describe('deleteItem', () => {
  it('removes the item from SQLite and from the items list', async () => {
    const created = await createItem({ name: 'Blender', purchaseDate: '2026-01-15', warrantyMonths: 12 });
    await useItemsStore.getState().loadItems();

    await useItemsStore.getState().deleteItem(created.id);

    expect(await getItemById(created.id)).toBeNull();
    expect(useItemsStore.getState().items.find((item) => item.id === created.id)).toBeUndefined();
  });

  it('clears the selected item when it matches the deleted id', async () => {
    const created = await createItem({ name: 'Blender', purchaseDate: '2026-01-15', warrantyMonths: 12 });
    await useItemsStore.getState().loadItemById(created.id);

    await useItemsStore.getState().deleteItem(created.id);

    expect(useItemsStore.getState().selectedItem).toBeNull();
  });

  it('leaves the selected item untouched when a different item is deleted', async () => {
    const kept = await createItem({ name: 'Blender', purchaseDate: '2026-01-15', warrantyMonths: 12 });
    const removed = await createItem({ name: 'Toaster', purchaseDate: '2026-01-15', warrantyMonths: 6 });
    await useItemsStore.getState().loadItemById(kept.id);

    await useItemsStore.getState().deleteItem(removed.id);

    expect(useItemsStore.getState().selectedItem?.id).toBe(kept.id);
  });

  it('removes every attached invoice file', async () => {
    const created = await createItem({ name: 'Blender', purchaseDate: '2026-01-15', warrantyMonths: 12 });
    await saveInvoiceImagesForItem(created.id, [
      { id: 'temp-1', uri: 'file:///invoice-1.jpg', isPersisted: false },
      { id: 'temp-2', uri: 'file:///invoice-2.jpg', isPersisted: false },
    ]);
    await useItemsStore.getState().loadItems();
    __setFileExists('file:///invoice-1.jpg', true);
    __setFileExists('file:///invoice-2.jpg', true);

    await useItemsStore.getState().deleteItem(created.id);

    expect((await getInfoAsync('file:///invoice-1.jpg')).exists).toBe(false);
    expect((await getInfoAsync('file:///invoice-2.jpg')).exists).toBe(false);
  });

  it('removes the item photo file', async () => {
    const created = await createItem({
      name: 'Blender',
      purchaseDate: '2026-01-15',
      warrantyMonths: 12,
      photoUri: 'file:///photos/photo-1.jpg',
    });
    await useItemsStore.getState().loadItems();
    __setFileExists('file:///photos/photo-1.jpg', true);

    await useItemsStore.getState().deleteItem(created.id);

    expect((await getInfoAsync('file:///photos/photo-1.jpg')).exists).toBe(false);
  });

  it('does not touch photo storage when the item has no photo', async () => {
    const created = await createItem({ name: 'Blender', purchaseDate: '2026-01-15', warrantyMonths: 12 });
    await useItemsStore.getState().loadItems();
    const deletePhotoSpy = jest.spyOn(fileService, 'deleteItemPhotoFile');

    await useItemsStore.getState().deleteItem(created.id);

    expect(deletePhotoSpy).not.toHaveBeenCalled();
    expect(await getItemById(created.id)).toBeNull();

    deletePhotoSpy.mockRestore();
  });

  it('still deletes the item and logs when deleting its photo file fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const created = await createItem({
      name: 'Blender',
      purchaseDate: '2026-01-15',
      warrantyMonths: 12,
      photoUri: 'file:///photos/photo-1.jpg',
    });
    await useItemsStore.getState().loadItems();
    const deletePhotoSpy = jest
      .spyOn(fileService, 'deleteItemPhotoFile')
      .mockRejectedValueOnce(new Error('unlink failure'));

    await useItemsStore.getState().deleteItem(created.id);

    expect(await getItemById(created.id)).toBeNull();
    expect(useItemsStore.getState().items).toHaveLength(0);
    expect(consoleErrorSpy).toHaveBeenCalled();

    deletePhotoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('propagates the error and leaves state untouched when the DB delete fails', async () => {
    const created = await createItem({ name: 'Blender', purchaseDate: '2026-01-15', warrantyMonths: 12 });
    await useItemsStore.getState().loadItems();
    const deleteSpy = jest
      .spyOn(warrantyRepository, 'deleteItem')
      .mockRejectedValueOnce(new Error('db failure'));

    await expect(useItemsStore.getState().deleteItem(created.id)).rejects.toThrow('db failure');
    expect(useItemsStore.getState().items).toHaveLength(1);

    deleteSpy.mockRestore();
  });

  it('cancels every scheduled reminder and removes their schedule rows', async () => {
    const created = await createItem({ name: 'Blender', purchaseDate: '2026-01-15', warrantyMonths: 12 });
    await saveSchedulesForItem(created.id, [
      { reminderKind: 'thirtyDay', notificationId: 'notif-30', triggerAt: '2026-12-16T09:00:00.000Z' },
      { reminderKind: 'sevenDay', notificationId: 'notif-7', triggerAt: '2027-01-08T09:00:00.000Z' },
    ]);
    await useItemsStore.getState().loadItems();

    await useItemsStore.getState().deleteItem(created.id);

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-30');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-7');
    expect(await getSchedulesForItem(created.id)).toEqual([]);
  });

  it('deletes the item even when no reminders were scheduled for it', async () => {
    const created = await createItem({ name: 'Blender', purchaseDate: '2026-01-15', warrantyMonths: 12 });
    await useItemsStore.getState().loadItems();

    await useItemsStore.getState().deleteItem(created.id);

    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(await getItemById(created.id)).toBeNull();
  });

  it('still deletes the item and logs when cancelling a reminder fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const created = await createItem({ name: 'Blender', purchaseDate: '2026-01-15', warrantyMonths: 12 });
    await saveSchedulesForItem(created.id, [
      { reminderKind: 'thirtyDay', notificationId: 'notif-30', triggerAt: '2026-12-16T09:00:00.000Z' },
    ]);
    await useItemsStore.getState().loadItems();
    (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    await useItemsStore.getState().deleteItem(created.id);

    expect(await getItemById(created.id)).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('still deletes the item and logs when fetching its schedules fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const created = await createItem({ name: 'Blender', purchaseDate: '2026-01-15', warrantyMonths: 12 });
    await useItemsStore.getState().loadItems();
    const getSchedulesSpy = jest
      .spyOn(notificationSchedulesRepository, 'getSchedulesForItem')
      .mockRejectedValueOnce(new Error('read failure'));

    await useItemsStore.getState().deleteItem(created.id);

    expect(await getItemById(created.id)).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();

    getSchedulesSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
