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
  Products: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  ItemDetail: { itemId: string };
  AddEditItem: { itemId?: string; focus?: AddEditSection };
};
