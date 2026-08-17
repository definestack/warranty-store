import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Card from '../components/Card';
import ItemIcon from '../components/ItemIcon';
import SelectModal from '../components/SelectModal';
import { useTranslation } from '../i18n/LocaleContext';
import type { TranslateFn } from '../i18n/i18n';
import { useItemsStore } from '../store/itemsStore';
import { useAppTheme } from '../theme/ThemeContext';
import type { AppTheme } from '../theme/palette';
import type { MainTabParamList, RootStackParamList } from '../types/navigation';
import type { WarrantyItem } from '../types/warranty';
import { CATEGORIES, DEFAULT_CATEGORY, getCategoryLabel } from '../utils/categories';
import { formatIsoDate, getWarrantyStatus } from '../utils/date';
import type { WarrantyStatus } from '../utils/date';
import { ALL_CATEGORIES, filterItems } from '../utils/itemFilters';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const STATUS_TEXT_COLOR: Record<WarrantyStatus, keyof AppTheme> = {
  active: 'success',
  expiring: 'warning',
  expired: 'danger',
};

function expiryLabel(item: WarrantyItem, status: WarrantyStatus, t: TranslateFn, locale: string): string {
  const date = formatIsoDate(item.expiryDate, locale);
  return status === 'expired' ? t('home.expiredOn', { date }) : t('home.expiresOn', { date });
}

export default function HomeScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const allItems = useItemsStore((state) => state.items);
  const loadItems = useItemsStore((state) => state.loadItems);
  const [search, setSearch] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  const items = useMemo(
    () => filterItems(allItems, { search, category }),
    [allItems, search, category]
  );

  const overview = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let expired = 0;
    for (const item of allItems) {
      const status = getWarrantyStatus(item.expiryDate);
      if (status === 'active') active += 1;
      else if (status === 'expiring') expiring += 1;
      else expired += 1;
    }
    return [
      { key: 'active', label: t('status.active'), value: active, color: theme.success, bg: theme.successBg },
      {
        key: 'expiring',
        label: t('status.expiringSoon'),
        value: expiring,
        color: theme.warning,
        bg: theme.warningBg,
      },
      { key: 'expired', label: t('status.expired'), value: expired, color: theme.danger, bg: theme.dangerBg },
      {
        key: 'all',
        label: t('status.allItems'),
        value: allItems.length,
        color: theme.primary,
        bg: theme.primaryContainer,
      },
    ];
  }, [allItems, theme, t]);

  const categoryOptions = useMemo(
    () => [
      { value: ALL_CATEGORIES, label: t('category.allCategories') },
      ...CATEGORIES.map((c) => ({ value: c, label: getCategoryLabel(c, t) })),
    ],
    [t]
  );
  const categoryLabel =
    category === ALL_CATEGORIES ? t('category.allCategories') : getCategoryLabel(category, t);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          hitSlop={12}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          accessibilityLabel={t('nav.openMenu')}
        >
          <Ionicons name="menu" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.brandText, { color: theme.text }]}>{t('common.appName')}</Text>
        <Pressable
          hitSlop={12}
          onPress={() => setSearchVisible((visible) => !visible)}
          accessibilityLabel={t('home.search')}
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
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('home.overview')}</Text>
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
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('home.myItems')}</Text>
              <Pressable style={styles.categoryFilter} onPress={() => setCategoryModalVisible(true)}>
                <Text style={[styles.categoryFilterText, { color: theme.subtleText }]}>{categoryLabel}</Text>
                <Ionicons name="chevron-down" size={16} color={theme.mutedText} />
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const status = getWarrantyStatus(item.expiryDate);
          const itemCategory = item.category ?? DEFAULT_CATEGORY;
          return (
            <Pressable onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}>
              <Card style={styles.itemCard}>
                <ItemIcon category={itemCategory} />
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemMeta, { color: theme.subtleText }]}>
                    {getCategoryLabel(itemCategory, t)}
                  </Text>
                  <Text style={[styles.itemWarranty, { color: theme[STATUS_TEXT_COLOR[status]] as string }]}>
                    {expiryLabel(item, status, t, locale)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.mutedText} />
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          allItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="file-tray-outline" size={40} color={theme.mutedText} />
              <Text style={[styles.emptyText, { color: theme.subtleText }]}>{t('home.emptyTitle')}</Text>
              <Text style={[styles.emptySubtext, { color: theme.mutedText }]}>{t('home.emptySubtitle')}</Text>
              <Pressable
                style={[styles.emptyCta, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate('AddEditItem', {})}
              >
                <Ionicons name="add" size={18} color={theme.primaryText} />
                <Text style={[styles.emptyCtaText, { color: theme.primaryText }]}>{t('home.addItem')}</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: theme.subtleText }]}>{t('home.noSearchResults')}</Text>
          )
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
  emptyState: {
    alignItems: 'center',
    marginTop: 32,
    gap: 6,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyCtaText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
