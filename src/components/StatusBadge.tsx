import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';

export type WarrantyStatus = 'active' | 'expiring' | 'expired';

interface StatusBadgeProps {
  status: WarrantyStatus;
}

const LABELS: Record<WarrantyStatus, string> = {
  active: 'Active',
  expiring: 'Expiring Soon',
  expired: 'Expired',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const theme = useAppTheme();
  const { backgroundColor, color } = {
    active: { backgroundColor: theme.successBg, color: theme.success },
    expiring: { backgroundColor: theme.warningBg, color: theme.warning },
    expired: { backgroundColor: theme.dangerBg, color: theme.danger },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.label, { color }]}>{LABELS[status]}</Text>
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
