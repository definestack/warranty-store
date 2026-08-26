import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Surface from './Surface';
import { useTranslation } from '../i18n/LocaleContext';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/navigation';

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Categories: { active: 'grid', inactive: 'grid-outline' },
  Reminders: { active: 'notifications', inactive: 'notifications-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

export default function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const handleAddPress = () => {
    // navigation here is the bottom-tab navigator; AddEditItem lives one level up
    // the tree (Tabs -> RootStack).
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('AddEditItem', {});
  };

  return (
    <Surface style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const label = (options.title ?? route.name) as string;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const icons = TAB_ICONS[route.name] ?? TAB_ICONS.Home;
        const color = isFocused ? theme.onPrimaryContainer : theme.tabInactive;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
          >
            <View style={[styles.pill, isFocused && { backgroundColor: theme.tabActiveBg }]}>
              <Ionicons name={isFocused ? icons.active : icons.inactive} size={22} color={color} />
            </View>
            <Text
              style={[styles.label, { color: isFocused ? theme.text : theme.tabInactive }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {label}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        onPress={handleAddPress}
        accessibilityRole="button"
        accessibilityLabel={t('nav.addItem')}
        style={[styles.fab, { backgroundColor: theme.primary }]}
      >
        <Ionicons name="add" size={28} color={theme.primaryText} />
      </Pressable>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 32,
    borderRadius: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    // Sits fully above the bar's own top edge (56px tall + 12px clearance), anchored
    // to Surface's box directly rather than an extra wrapper view.
    top: -68,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
