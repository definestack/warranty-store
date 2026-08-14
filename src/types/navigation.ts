export type MainTabParamList = {
  Home: undefined;
  Add: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  ItemDetail: { itemId: string };
  AddEditItem: { itemId?: string };
};
