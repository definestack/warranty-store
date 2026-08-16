import { create } from 'zustand';

import { deleteItem as deleteItemRow, getAllItems, getItemById } from '../db/warrantyRepository';
import { deleteInvoiceFile } from '../services/fileService';
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

    await deleteItemRow(id);

    if (item?.invoiceUri) {
      await deleteInvoiceFile(item.invoiceUri);
    }

    set((s) => ({
      items: s.items.filter((i) => i.id !== id),
      selectedItem: s.selectedItem?.id === id ? null : s.selectedItem,
    }));
  },
}));
