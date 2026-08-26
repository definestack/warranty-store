import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import AppTabBar from '../components/AppTabBar';
import { useTranslation } from '../i18n/LocaleContext';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import type { MainTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <AppTabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('nav.home') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
    </Tab.Navigator>
  );
}
