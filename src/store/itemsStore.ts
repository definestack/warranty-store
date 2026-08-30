import { create } from 'zustand';

import { deleteSchedulesForItem, getSchedulesForItem } from '../db/notificationSchedulesRepository';
import { deleteItem as deleteItemRow, getAllItems, getItemById } from '../db/warrantyRepository';
import { deleteDocumentFile, deleteItemPhotoFile } from '../services/fileService';
import { cancelScheduledReminders } from '../services/notificationService';
import type { WarrantyItem } from '../types/warranty';

interface ItemsState {
  items: WarrantyItem[];
  loading: boolean;
  loadItems: () => Promise<void>;
  selectedItem: WarrantyItem | null;
  selectedItemLoading: boolean;
  loadItemById: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useItemsStore = create<ItemsState>((set, get) => ({
  items: [],
  loading: false,
  loadItems: async () => {
    set({ loading: true });
    try {
      const items = await getAllItems();
      set({ items, loading: false });
    } catch (err) {
      console.error('Failed to load warranty items', err);
      set({ loading: false });
    }
  },
  selectedItem: null,
  selectedItemLoading: false,
  loadItemById: async (id: string) => {
    set({ selectedItemLoading: true });
    try {
      const selectedItem = await getItemById(id);
      set({ selectedItem, selectedItemLoading: false });
    } catch (err) {
      console.error('Failed to load warranty item', err);
      set({ selectedItem: null, selectedItemLoading: false });
    }
  },
  deleteItem: async (id: string) => {
    const state = get();
    const item = state.items.find((i) => i.id === id) ?? (state.selectedItem?.id === id ? state.selectedItem : null);

    try {
      const schedules = await getSchedulesForItem(id);
      await cancelScheduledReminders(schedules);
      await deleteSchedulesForItem(id);
    } catch (err) {
      console.error('Failed to cancel expiry reminders for deleted item', err);
    }

    await deleteItemRow(id);

    // Every scope's files, not just the item's own: an extended warranty's documents are
    // deleted with it, so their files must go too.
    const documents = item
      ? [
          ...item.invoiceDocuments,
          ...item.warrantyDocuments,
          ...item.extendedWarranties.flatMap((extended) => [
            ...extended.invoiceDocuments,
            ...extended.warrantyDocuments,
          ]),
        ]
      : [];
    if (documents.length) {
      await Promise.all(documents.map((document) => deleteDocumentFile(document.uri)));
    }

    if (item?.photoUri) {
      try {
        await deleteItemPhotoFile(item.photoUri);
      } catch (err) {
        console.error('Failed to delete the photo file of a deleted item', err);
      }
    }

    set((s) => ({
      items: s.items.filter((i) => i.id !== id),
      selectedItem: s.selectedItem?.id === id ? null : s.selectedItem,
    }));
  },
}));
