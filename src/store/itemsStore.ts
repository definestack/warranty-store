import { create } from 'zustand';

import { getAllItems } from '../db/warrantyRepository';
import type { WarrantyItem } from '../types/warranty';

interface ItemsState {
  items: WarrantyItem[];
  loading: boolean;
  loadItems: () => Promise<void>;
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
}));
