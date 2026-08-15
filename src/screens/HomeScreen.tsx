import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Card from '../components/Card';
import ItemIcon from '../components/ItemIcon';
import SelectModal from '../components/SelectModal';
import { useAppTheme } from '../theme/ThemeContext';
import type { AppTheme } from '../theme/palette';
import type { MainTabParamList, RootStackParamList } from '../types/navigation';
import { CATEGORIES, PLACEHOLDER_ITEMS } from '../utils/mockData';
import type { MockWarrantyStatus } from '../utils/mockData';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const ALL_CATEGORIES = 'All Categories';

const STATUS_TEXT_COLOR: Record<MockWarrantyStatus, keyof AppTheme> = {
  active: 'success',
  expiring: 'warning',
  expired: 'danger',
};

export default function HomeScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const items = useMemo(() => {
    return PLACEHOLDER_ITEMS.filter((item) => {
      const matchesCategory = category === ALL_CATEGORIES || item.category === category;
      const matchesSearch = item.name.toLowerCase().includes(search.trim().toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  const overview = useMemo(() => {
    const active = PLACEHOLDER_ITEMS.filter((item) => item.status === 'active').length;
    const expiring = PLACEHOLDER_ITEMS.filter((item) => item.status === 'expiring').length;
    const expired = PLACEHOLDER_ITEMS.filter((item) => item.status === 'expired').length;
    return [
      { key: 'active', label: 'Active', value: active, color: theme.success, bg: theme.successBg },
      { key: 'expiring', label: 'Expiring Soon', value: expiring, color: theme.warning, bg: theme.warningBg },
      { key: 'expired', label: 'Expired', value: expired, color: theme.danger, bg: theme.dangerBg },
      { key: 'all', label: 'All Items', value: PLACEHOLDER_ITEMS.length, color: theme.primary, bg: theme.primaryContainer },
    ];
  }, [theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          hitSlop={12}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          accessibilityLabel="Open menu"
        >
          <Ionicons name="menu" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.brandText, { color: theme.text }]}>Warranty Tracker</Text>
        <Pressable
          hitSlop={12}
          onPress={() => setSearchVisible((visible) => !visible)}
          accessibilityLabel="Search"
        >
          <Ionicons name="search" size={22} color={theme.text} />
        </Pressable>
      </View>

      {searchVisible ? (
        <View style={[styles.searchBar, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.mutedText} />
          <TextInput
            autoFocus
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search items..."
            placeholderTextColor={theme.mutedText}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Overview</Text>
            <View style={styles.overviewRow}>
              {overview.map((stat) => (
                <View key={stat.key} style={[styles.statCard, { backgroundColor: stat.bg }]}>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: stat.color }]} numberOfLines={1}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>My Items</Text>
              <Pressable style={styles.categoryFilter} onPress={() => setCategoryModalVisible(true)}>
                <Text style={[styles.categoryFilterText, { color: theme.subtleText }]}>{category}</Text>
                <Ionicons name="chevron-down" size={16} color={theme.mutedText} />
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}>
            <Card style={styles.itemCard}>
              <ItemIcon category={item.category} />
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.itemMeta, { color: theme.subtleText }]}>
                  {item.category} • {item.brand}
                </Text>
                <Text style={[styles.itemWarranty, { color: theme[STATUS_TEXT_COLOR[item.status]] as string }]}>
                  {item.expiresIn}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.mutedText} />
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.subtleText }]}>No warranty items yet.</Text>
        }
      />

      <SelectModal
        visible={categoryModalVisible}
        title="Filter by category"
        options={[ALL_CATEGORIES, ...CATEGORIES]}
        selected={category}
        onSelect={setCategory}
        onClose={() => setCategoryModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryFilterText: {
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemMeta: {
    fontSize: 13,
  },
  itemWarranty: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
  },
});
