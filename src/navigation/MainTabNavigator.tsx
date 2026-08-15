import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';

import AppTabBar from '../components/AppTabBar';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useToastStore } from '../store/toastStore';
import type { MainTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Categories/Reminders don't have screens yet — shown in the tab bar to match the
// design, but tapping them just surfaces a toast instead of navigating nowhere.
function ComingSoonPlaceholder() {
  return <View />;
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <AppTabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen
        name="Categories"
        component={ComingSoonPlaceholder}
        options={{ title: 'Categories' }}
        listeners={() => ({
          tabPress: (event) => {
            event.preventDefault();
            useToastStore.getState().show('Categories is coming soon');
          },
        })}
      />
      <Tab.Screen
        name="Reminders"
        component={ComingSoonPlaceholder}
        options={{ title: 'Reminders' }}
        listeners={() => ({
          tabPress: (event) => {
            event.preventDefault();
            useToastStore.getState().show('Reminders is coming soon');
          },
        })}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}
