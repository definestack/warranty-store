import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';

import AppTabBar from '../components/AppTabBar';
import { useTranslation } from '../i18n/LocaleContext';
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
  const { t } = useTranslation();

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <AppTabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('nav.home') }} />
      <Tab.Screen
        name="Categories"
        component={ComingSoonPlaceholder}
        options={{ title: t('nav.categories') }}
        listeners={() => ({
          tabPress: (event) => {
            event.preventDefault();
            useToastStore.getState().show(t('nav.categoriesComingSoon'));
          },
        })}
      />
      <Tab.Screen
        name="Reminders"
        component={ComingSoonPlaceholder}
        options={{ title: t('nav.reminders') }}
        listeners={() => ({
          tabPress: (event) => {
            event.preventDefault();
            useToastStore.getState().show(t('nav.remindersComingSoon'));
          },
        })}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
    </Tab.Navigator>
  );
}
