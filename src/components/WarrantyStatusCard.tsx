import { Ionicons } from '@expo/vector-icons';
import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TranslateFn } from '../i18n/i18n';
import { useTranslation } from '../i18n/LocaleContext';
import { useAppTheme } from '../theme/ThemeContext';
import type { AppTheme } from '../theme/palette';
import type { WarrantyItem } from '../types/warranty';
import { DEFAULT_CATEGORY, getCategoryLabel } from '../utils/categories';
import { formatDaysRemaining, getDaysRemaining } from '../utils/date';
import type { WarrantyStatus } from '../utils/date';
import { getAttentionStatusFilter, summarizeWarrantyAttention } from '../utils/warrantyAttention';
import ItemIcon from './ItemIcon';
import Surface from './Surface';

interface WarrantyStatusCardProps {
  items: WarrantyItem[];
  onSelectItem: (itemId: string) => void;
  onViewAll: (status: WarrantyStatus) => void;
}

interface HeadlineSegment {
  key: WarrantyStatus;
  color: string;
  text: string;
}

/**
 * Days remaining as the row states it: "12 days left" while cover runs, and the
 * "Expired 6 days ago" / "Expires today" wording once it is up.
 */
function formatRowStatus(item: WarrantyItem, days: number, t: TranslateFn): string {
  return days > 0 ? t('itemDetail.daysLeft', { count: days }) : formatDaysRemaining(item.coverageEndDate, t);
}

/** The calendar illustration, badged with the state it is reporting on. */
function CalendarBadge({
  theme,
  badge,
  badgeColor,
}: {
  theme: AppTheme;
  badge: keyof typeof Ionicons.glyphMap;
  badgeColor: string;
}) {
  return (
    <View style={styles.illustration}>
      <Ionicons name="calendar" size={44} color={theme.primary} />
      <View style={[styles.illustrationBadge, { backgroundColor: theme.card }]}>
        <Ionicons name={badge} size={18} color={badgeColor} />
      </View>
    </View>
  );
}

/**
 * The Home dashboard's Warranty Status card: what has expired or is about to, the three
 * most urgent of them, and a way into the filtered product list. Renders nothing when the
 * user has no items at all — the Home empty state speaks for that case.
 */
export default function WarrantyStatusCard({ items, onSelectItem, onViewAll }: WarrantyStatusCardProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const summary = summarizeWarrantyAttention(items);
  const { state, expiredCount, expiringCount, attentionCount } = summary;

  if (state === 'empty') return null;

  const title = <Text style={[styles.title, { color: theme.text }]}>{t('warrantyStatus.title')}</Text>;

  if (state === 'caughtUp') {
    return (
      <Surface style={styles.card}>
        {title}
        <View style={styles.header}>
          <Ionicons name="checkmark-circle-outline" size={28} color={theme.success} />
          <View style={styles.headerText}>
            <Text style={[styles.headline, { color: theme.success }]}>
              {t('warrantyStatus.caughtUpTitle')}
            </Text>
            <Text style={[styles.subline, { color: theme.subtleText }]}>
              {t('warrantyStatus.caughtUpSubtitle')}
            </Text>
          </View>
          <CalendarBadge theme={theme} badge="checkmark-circle" badgeColor={theme.success} />
        </View>
      </Surface>
    );
  }

  // With both buckets present the headline shortens to two counted segments; on its own a
  // bucket gets the full sentence.
  const mixed = expiredCount > 0 && expiringCount > 0;
  const segments: HeadlineSegment[] = [];

  if (expiredCount > 0) {
    segments.push({
      key: 'expired',
      color: theme.danger,
      text: t(mixed ? 'warrantyStatus.expiredSegment' : 'warrantyStatus.expiredHeadline', {
        count: expiredCount,
      }),
    });
  }

  if (expiringCount > 0) {
    segments.push({
      key: 'expiring',
      color: theme.warning,
      text: t(mixed ? 'warrantyStatus.expiringSegment' : 'warrantyStatus.expiringHeadline', {
        count: expiringCount,
      }),
    });
  }

  // One icon for the whole headline rather than one per segment: the most severe bucket's,
  // which is the first segment, since expired is always pushed ahead of expiring.
  const [leadSegment] = segments;
  const leadIcon = leadSegment.key === 'expired' ? 'alert-circle-outline' : 'time-outline';

  // The footer's colour alone: expiring-soon items are the softer warning, so their colour
  // leads it whenever any of them is counted. The headline icon and the calendar badge
  // both follow severity instead, and so stay on danger while anything has expired.
  const accent = expiringCount > 0 ? theme.warning : theme.danger;
  const footerLabel = mixed
    ? t('warrantyStatus.reviewAll', { count: attentionCount })
    : t(expiredCount > 0 ? 'warrantyStatus.viewAllExpired' : 'warrantyStatus.viewAllExpiring', {
        count: attentionCount,
      });
  const destination = getAttentionStatusFilter(summary);

  return (
    <Surface style={styles.card}>
      {title}
      <View style={styles.header}>
        <Ionicons name={leadIcon} size={28} color={leadSegment.color} />
        <View style={styles.headerText}>
          <View style={styles.headlineRow}>
            {segments.map((segment, index) => (
              <Fragment key={segment.key}>
                {index > 0 ? (
                  <Text style={[styles.separator, { color: theme.mutedText }]}>·</Text>
                ) : null}
                <Text style={[styles.headline, { color: segment.color }]}>{segment.text}</Text>
              </Fragment>
            ))}
          </View>
          <Text style={[styles.subline, { color: theme.subtleText }]}>
            {t(expiringCount > 0 ? 'warrantyStatus.attentionSubtitle' : 'warrantyStatus.expiredSubtitle')}
          </Text>
        </View>
        <CalendarBadge theme={theme} badge="warning" badgeColor={leadSegment.color} />
      </View>

      <View style={[styles.list, { borderColor: theme.border }]}>
        {summary.items.map((item, index) => {
          const category = item.category ?? DEFAULT_CATEGORY;
          const categoryLabel = getCategoryLabel(category, t);
          const days = getDaysRemaining(item.coverageEndDate);
          const rowStatus = formatRowStatus(item, days, t);

          return (
            <Pressable
              key={item.id}
              onPress={() => onSelectItem(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${categoryLabel}, ${rowStatus}`}
              style={[
                styles.row,
                index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
              ]}
            >
              <ItemIcon category={category} size={40} photoUri={item.photoUri} />
              <View style={styles.rowInfo}>
                <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.rowCategory, { color: theme.subtleText }]} numberOfLines={1}>
                  {categoryLabel}
                </Text>
              </View>
              <Text style={[styles.rowStatus, { color: days < 0 ? theme.danger : theme.warning }]}>
                {rowStatus}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.mutedText} />
            </Pressable>
          );
        })}

        {destination ? (
          <Pressable
            onPress={() => onViewAll(destination)}
            accessibilityRole="button"
            accessibilityLabel={footerLabel}
            style={[styles.footer, { borderTopColor: theme.border }]}
          >
            <Text style={[styles.footerText, { color: accent }]}>{footerLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={accent} />
          </Pressable>
        ) : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  // Flat like the Overview tiles above it: solid surface and a hairline border, no
  // shadow. `Card`'s elevation reads far heavier at this size than it does on a list row.
  card: {
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  headline: {
    fontSize: 16,
    fontWeight: '700',
  },
  separator: {
    fontSize: 16,
    fontWeight: '700',
  },
  subline: {
    fontSize: 13,
  },
  // A calendar with a small state badge tucked into its lower-right corner.
  illustration: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationBadge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    borderRadius: 999,
    padding: 1,
  },
  list: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowCategory: {
    fontSize: 13,
  },
  rowStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
