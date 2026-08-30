import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../i18n/LocaleContext';
import { useAppTheme } from '../theme/ThemeContext';
import type { PeriodStatus } from '../utils/coverage';

/**
 * Accepts a cover period's state as well as an item's. `upcoming` only ever applies to a
 * period — an item has no start date to be waiting on — but both render as the same chip,
 * so widening here beats a second near-identical badge that would drift.
 */
export type { PeriodStatus };

interface StatusBadgeProps {
  status: PeriodStatus;
}

const LABEL_KEYS: Record<PeriodStatus, string> = {
  active: 'status.active',
  expiring: 'status.expiringSoon',
  expired: 'status.expired',
  upcoming: 'status.upcoming',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { backgroundColor, color } = {
    active: { backgroundColor: theme.successBg, color: theme.success },
    expiring: { backgroundColor: theme.warningBg, color: theme.warning },
    expired: { backgroundColor: theme.dangerBg, color: theme.danger },
    // Cover that has been bought but has not started yet: the accent colour rather than
    // a health colour, because nothing is right or wrong about it yet.
    upcoming: { backgroundColor: theme.primaryContainer, color: theme.onPrimaryContainer },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.label, { color }]}>{t(LABEL_KEYS[status])}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
