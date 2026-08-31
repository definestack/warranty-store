import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../i18n/LocaleContext';
import { useAppTheme } from '../theme/ThemeContext';
import type { WarrantyItem } from '../types/warranty';
import { DEFAULT_CATEGORY, getCategoryLabel } from '../utils/categories';
import { formatAddedAgo, formatIsoDate, getWarrantyStatus } from '../utils/date';
import type { WarrantyStatus } from '../utils/date';
import { selectRecentProducts } from '../utils/recentProducts';
import Card from './Card';
import ItemIcon from './ItemIcon';

interface RecentProductsCardProps {
  items: WarrantyItem[];
  onSelectItem: (itemId: string) => void;
  onSeeAll: () => void;
}

/**
 * The Home dashboard's Recent Products section: the last few items added, newest first,
 * as a way back into something just entered. Renders nothing when there is nothing
 * tracked yet — the Home empty state speaks for that case.
 *
 * The rows deliberately reuse the product list's card treatment, since they are the same
 * object seen in a second place; only the trailing status badge gives way to the coverage
 * end date, which is what a "recent" glance is actually checking.
 */
export default function RecentProductsCard({ items, onSelectItem, onSeeAll }: RecentProductsCardProps) {
  const theme = useAppTheme();
  const { t, locale } = useTranslation();

  const recent = selectRecentProducts(items);
  if (recent.length === 0) return null;

  const statusColors: Record<WarrantyStatus, string> = {
    active: theme.success,
    expiring: theme.warning,
    expired: theme.danger,
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{t('recentProducts.title')}</Text>
        <Pressable
          onPress={onSeeAll}
          accessibilityRole="button"
          accessibilityLabel={t('recentProducts.seeAllHint')}
          style={styles.seeAll}
          hitSlop={8}
        >
          <Text style={[styles.seeAllText, { color: theme.primary }]}>{t('recentProducts.seeAll')}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.primary} />
        </Pressable>
      </View>

      <View style={styles.list}>
        {recent.map((item) => {
          const category = item.category ?? DEFAULT_CATEGORY;
          const categoryLabel = getCategoryLabel(category, t);
          const status = getWarrantyStatus(item.coverageEndDate);
          const expiryLabel = t(status === 'expired' ? 'home.expiredOn' : 'home.expiresOn', {
            date: formatIsoDate(item.coverageEndDate, locale),
          });
          const addedLabel = formatAddedAgo(item.createdAt, t);

          return (
            <Pressable
              key={item.id}
              onPress={() => onSelectItem(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${categoryLabel}, ${addedLabel}, ${expiryLabel}`}
            >
              <Card style={styles.itemCard}>
                <ItemIcon category={category} size={52} photoUri={item.photoUri} />
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemCategory, { color: theme.subtleText }]} numberOfLines={1}>
                    {categoryLabel}
                  </Text>
                  <Text style={[styles.itemAdded, { color: theme.mutedText }]} numberOfLines={1}>
                    {addedLabel}
                  </Text>
                </View>
                <Text style={[styles.itemExpiry, { color: statusColors[status] }]} numberOfLines={1}>
                  {expiryLabel}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.mutedText} />
              </Card>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    marginTop: 10,
    gap: 10,
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
  itemAdded: {
    fontSize: 13,
  },
  itemExpiry: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
});
