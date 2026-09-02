import type { StatusFilter } from '../utils/itemFilters';

/**
 * A section of the Add/Edit screen that a caller can ask it to open at.
 *
 * The item detail screen is read-only: its add controls navigate here rather than saving
 * in place, so they need to say which section the user was reaching for. Omitted, the
 * editor opens at the top as it always has.
 *
 * `extendedWarrantyDocuments` and `extendedWarrantyInvoice` address one specific extended
 * warranty, so they carry its id.
 */
export type AddEditSection =
  | { section: 'invoiceDocuments' }
  | { section: 'warrantyDocuments' }
  | { section: 'extendedWarranties' }
  | { section: 'extendedWarrantyInvoice'; extendedWarrantyId: string }
  | { section: 'extendedWarrantyDocuments'; extendedWarrantyId: string };

export type MainTabParamList = {
  Home: undefined;
  /**
   * `status` seeds the product list's status chip, so Home can open it already filtered.
   * Reading it also resets the category and sort controls, so the list shows that whole
   * slice rather than an older filter narrowed further. The screen clears the param once it
   * has read it, leaving the tab to behave as it always has when reached from the tab bar.
   */
  Products: { status?: StatusFilter } | undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  ItemDetail: { itemId: string };
  AddEditItem: { itemId?: string; focus?: AddEditSection };
};
