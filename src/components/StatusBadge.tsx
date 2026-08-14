import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';

export type WarrantyStatus = 'active' | 'expired';

interface StatusBadgeProps {
  status: WarrantyStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const theme = useAppTheme();
  const isActive = status === 'active';
  const backgroundColor = isActive ? theme.successBg : theme.warningBg;
  const color = isActive ? theme.success : theme.warning;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.label, { color }]}>{isActive ? 'Active' : 'Expired'}</Text>
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
