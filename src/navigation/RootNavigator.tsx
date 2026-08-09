import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ItemDetailScreen from '../screens/ItemDetailScreen';
import AddEditItemScreen from '../screens/AddEditItemScreen';
import type { RootStackParamList } from '../types/navigation';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item Detail' }} />
      <Stack.Screen
        name="AddEditItem"
        component={AddEditItemScreen}
        options={({ route }) => ({
          title: route.params?.itemId ? 'Edit Item' : 'Add Item',
        })}
      />
    </Stack.Navigator>
  );
}
