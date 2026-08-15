export type MainTabParamList = {
  Home: undefined;
  Categories: undefined;
  Reminders: undefined;
  Settings: undefined;
};

export type MainDrawerParamList = {
  Tabs: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  ItemDetail: { itemId: string };
  AddEditItem: { itemId?: string };
};
