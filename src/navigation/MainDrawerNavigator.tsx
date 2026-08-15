import { createDrawerNavigator } from '@react-navigation/drawer';

import type { MainDrawerParamList } from '../types/navigation';
import AppDrawerContent from './AppDrawerContent';
import MainTabNavigator from './MainTabNavigator';

const Drawer = createDrawerNavigator<MainDrawerParamList>();

export default function MainDrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false }}
      drawerContent={(props) => <AppDrawerContent {...props} />}
    >
      <Drawer.Screen name="Tabs" component={MainTabNavigator} />
    </Drawer.Navigator>
  );
}
