import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '../i18n/LocaleContext';
import { useItemsStore } from '../store/itemsStore';
import { useAppTheme } from '../theme/ThemeContext';
import type { MainTabParamList, RootStackParamList } from '../types/navigation';
import { getWarrantyStatus } from '../utils/date';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function HomeScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const allItems = useItemsStore((state) => state.items);
  const loadItems = useItemsStore((state) => state.loadItems);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  const overview = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let expired = 0;
    for (const item of allItems) {
      const status = getWarrantyStatus(item.coverageEndDate);
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={[styles.brandText, { color: theme.text }]}>{t('common.appName')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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

        {allItems.length === 0 ? (
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
        ) : null}
      </ScrollView>
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
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
