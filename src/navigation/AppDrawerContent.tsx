import { Ionicons } from '@expo/vector-icons';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';
import type { MainTabParamList, RootStackParamList } from '../types/navigation';

interface DrawerItemConfig {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Tab to navigate to within MainTabNavigator, or undefined if the destination doesn't exist yet. */
  tab?: keyof MainTabParamList;
}

const ITEMS: DrawerItemConfig[] = [
  { key: 'home', label: 'Home', icon: 'home-outline', tab: 'Home' },
  { key: 'categories', label: 'Categories', icon: 'grid-outline' },
  { key: 'reminders', label: 'Reminders', icon: 'notifications-outline' },
  { key: 'reports', label: 'Reports', icon: 'bar-chart-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline', tab: 'Settings' },
];

export default function AppDrawerContent(props: DrawerContentComponentProps) {
  const theme = useAppTheme();
  const rootNavigation = props.navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

  // props.state is the drawer's own state (just a single "Tabs" route) — the active
  // tab name lives one level deeper, in the nested tab navigator's own state.
  const tabsRoute = props.state.routes[props.state.index];
  const tabsState = tabsRoute?.state;
  const activeTab = tabsState ? tabsState.routes[tabsState.index ?? 0]?.name : 'Home';

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: theme.surface }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={26} color={theme.primary} />
        <Text style={[styles.brand, { color: theme.text }]}>Warranty Tracker</Text>
      </View>

      <View style={styles.section}>
        {ITEMS.map((item) => {
          const isActive = item.tab !== undefined && item.tab === activeTab;
          const disabled = item.tab === undefined;

          return (
            <Pressable
              key={item.key}
              disabled={disabled}
              onPress={() => {
                if (item.tab) {
                  props.navigation.navigate('Tabs', { screen: item.tab });
                }
              }}
              style={[styles.item, isActive && { backgroundColor: theme.primaryContainer }]}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={isActive ? theme.onPrimaryContainer : disabled ? theme.mutedText : theme.subtleText}
              />
              <Text
                style={[
                  styles.itemLabel,
                  { color: isActive ? theme.onPrimaryContainer : disabled ? theme.mutedText : theme.text },
                  isActive && styles.itemLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.section}>
        <Pressable disabled style={styles.item}>
          <Ionicons name="help-circle-outline" size={22} color={theme.mutedText} />
          <Text style={[styles.itemLabel, { color: theme.mutedText }]}>Help & Feedback</Text>
        </Pressable>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.section}>
        <Pressable style={styles.item} onPress={() => rootNavigation?.goBack()}>
          <Ionicons name="log-out-outline" size={22} color={theme.danger} />
          <Text style={[styles.itemLabel, { color: theme.danger }]}>Sign out</Text>
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  brand: {
    fontSize: 17,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 12,
    gap: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 28,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  itemLabelActive: {
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
    marginHorizontal: 20,
  },
});
