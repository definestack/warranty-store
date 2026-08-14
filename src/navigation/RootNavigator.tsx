import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ItemDetailScreen from '../screens/ItemDetailScreen';
import AddEditItemScreen from '../screens/AddEditItemScreen';
import type { RootStackParamList } from '../types/navigation';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
      <Stack.Screen name="AddEditItem" component={AddEditItemScreen} />
    </Stack.Navigator>
  );
}
