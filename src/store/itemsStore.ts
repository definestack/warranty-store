import { create } from 'zustand';

import { getAllItems, getItemById } from '../db/warrantyRepository';
import type { WarrantyItem } from '../types/warranty';

interface ItemsState {
  items: WarrantyItem[];
  loading: boolean;
  loadItems: () => Promise<void>;
  selectedItem: WarrantyItem | null;
  selectedItemLoading: boolean;
  loadItemById: (id: string) => Promise<void>;
}

export const useItemsStore = create<ItemsState>((set) => ({
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
}));
