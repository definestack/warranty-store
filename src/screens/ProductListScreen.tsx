import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Card from '../components/Card';
import ItemIcon from '../components/ItemIcon';
import SelectModal from '../components/SelectModal';
import StatusBadge from '../components/StatusBadge';
import { useTranslation } from '../i18n/LocaleContext';
import { useItemsStore } from '../store/itemsStore';
import { useAppTheme } from '../theme/ThemeContext';
import type { MainTabParamList, RootStackParamList } from '../types/navigation';
import { CATEGORIES, DEFAULT_CATEGORY, getCategoryLabel } from '../utils/categories';
import { formatIsoDate, getWarrantyStatus } from '../utils/date';
import {
  ALL_CATEGORIES,
  ALL_STATUSES,
  DEFAULT_PRODUCT_SORT,
  PRODUCT_SORTS,
  STATUS_FILTERS,
  filterAndSortItems,
  getSortLabel,
  getStatusFilterLabel,
} from '../utils/itemFilters';
import type { ProductSort, StatusFilter } from '../utils/itemFilters';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Products'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProductListScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const allItems = useItemsStore((state) => state.items);
  const loadItems = useItemsStore((state) => state.loadItems);
  const [search, setSearch] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [status, setStatus] = useState<StatusFilter>(ALL_STATUSES);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [sort, setSort] = useState<ProductSort>(DEFAULT_PRODUCT_SORT);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  const items = useMemo(
    () => filterAndSortItems(allItems, { search, category, status, sort }),
    [allItems, search, category, status, sort]
  );

  // Every category an item can hold, so the dropdown can reach uncategorized items too.
  const categoryOptions = useMemo(
    () => [
      { value: ALL_CATEGORIES, label: t('category.allCategories') },
      ...[...CATEGORIES, DEFAULT_CATEGORY].map((value) => ({
        value,
        label: getCategoryLabel(value, t),
      })),
    ],
    [t]
  );

  const sortOptions = useMemo(
    () => PRODUCT_SORTS.map((value) => ({ value, label: getSortLabel(value, t) })),
    [t]
  );

  const categoryLabel =
    category === ALL_CATEGORIES ? t('category.allCategories') : getCategoryLabel(category, t);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>{t('products.title')}</Text>
          <Text style={[styles.subtitle, { color: theme.subtleText }]}>{t('products.subtitle')}</Text>
        </View>
        <Pressable
          hitSlop={12}
          style={styles.headerSearch}
          onPress={() => setSearchVisible((visible) => !visible)}
          accessibilityLabel={t('home.search')}
        >
          <Ionicons name="search" size={24} color={theme.text} />
        </Pressable>
      </View>

      {searchVisible ? (
        <View style={[styles.searchBar, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.mutedText} />
          <TextInput
            autoFocus
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={t('home.searchPlaceholder')}
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statusRow}
            >
              {STATUS_FILTERS.map((value) => {
                const selected = value === status;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setStatus(value)}
                    accessibilityRole="button"
                    accessibilityState={selected ? { selected: true } : {}}
                    style={[
                      styles.statusChip,
                      selected
                        ? { backgroundColor: theme.primaryContainer }
                        : { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        { color: selected ? theme.onPrimaryContainer : theme.text },
                      ]}
                    >
                      {getStatusFilterLabel(value, t)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.dropdownRow}>
              <Pressable
                style={[styles.dropdown, { borderColor: theme.border }]}
                onPress={() => setCategoryModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t('category.filterByCategory')}
              >
                <Ionicons name="grid-outline" size={18} color={theme.subtleText} />
                <Text style={[styles.dropdownText, { color: theme.text }]} numberOfLines={1}>
                  {categoryLabel}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.mutedText} />
              </Pressable>

              <Pressable
                style={[styles.dropdown, { borderColor: theme.border }]}
                onPress={() => setSortModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t('sort.title')}
              >
                <Ionicons name="swap-vertical" size={18} color={theme.subtleText} />
                <Text style={[styles.dropdownText, { color: theme.text }]} numberOfLines={1}>
                  {getSortLabel(sort, t)}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.mutedText} />
              </Pressable>
            </View>

            <Text style={[styles.resultCount, { color: theme.subtleText }]}>
              {t('products.count', { count: items.length })}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const itemCategory = item.category ?? DEFAULT_CATEGORY;
          return (
            <Pressable onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}>
              <Card style={styles.itemCard}>
                <ItemIcon category={itemCategory} size={52} photoUri={item.photoUri} />
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemCategory, { color: theme.subtleText }]} numberOfLines={1}>
                    {getCategoryLabel(itemCategory, t)}
                  </Text>
                  <View style={styles.itemExpiry}>
                    <Ionicons name="calendar-clear-outline" size={14} color={theme.subtleText} />
                    <Text style={[styles.itemExpiryText, { color: theme.subtleText }]}>
                      {formatIsoDate(item.coverageEndDate, locale)}
                    </Text>
                  </View>
                </View>
                <View style={styles.itemBadge}>
                  <StatusBadge status={getWarrantyStatus(item.coverageEndDate)} />
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.mutedText} />
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={allItems.length === 0 ? 'cube-outline' : 'funnel-outline'}
              size={40}
              color={theme.mutedText}
            />
            <Text style={[styles.emptyTitle, { color: theme.subtleText }]}>
              {allItems.length === 0 ? t('products.emptyTitle') : t('products.noResultsTitle')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.mutedText }]}>
              {allItems.length === 0 ? t('products.emptySubtitle') : t('products.noResultsSubtitle')}
            </Text>
          </View>
        }
      />

      <SelectModal
        visible={categoryModalVisible}
        title={t('category.filterByCategory')}
        options={categoryOptions}
        selected={category}
        onSelect={setCategory}
        onClose={() => setCategoryModalVisible(false)}
      />

      <SelectModal
        visible={sortModalVisible}
        title={t('sort.title')}
        options={sortOptions}
        selected={sort}
        onSelect={(value) => setSort(value as ProductSort)}
        onClose={() => setSortModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  // Nudged down so the icon sits level with the middle of the title, as in the design.
  headerSearch: {
    marginTop: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  statusRow: {
    gap: 10,
    paddingTop: 18,
    paddingRight: 16,
  },
  statusChip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  statusChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  dropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  resultCount: {
    fontSize: 14,
    marginTop: 18,
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
    fontWeight: '700',
  },
  itemCategory: {
    fontSize: 13,
  },
  itemExpiry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  itemExpiryText: {
    fontSize: 13,
  },
  // The badge sits level with the item name rather than centred on the card, as in the design.
  itemBadge: {
    alignSelf: 'flex-start',
    marginTop: 2,
    marginRight: 4,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 48,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
