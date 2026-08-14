import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Electronics: 'laptop-outline',
  Furniture: 'file-tray-stacked-outline',
  Appliances: 'hardware-chip-outline',
  Vehicles: 'car-outline',
  Other: 'cube-outline',
};

const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  Electronics: { bg: '#DCE3FF', fg: '#4C5FE0' },
  Furniture: { bg: '#FFE3D0', fg: '#E0824C' },
  Appliances: { bg: '#D6F5E3', fg: '#2FA36B' },
  Vehicles: { bg: '#FDE0E0', fg: '#E05555' },
  Other: { bg: '#E9E9F0', fg: '#7A7A8C' },
};

interface ItemIconProps {
  category?: string;
  size?: number;
}

export default function ItemIcon({ category = 'Other', size = 44 }: ItemIconProps) {
  const icon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.Other;
  const { bg, fg } = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size * 0.28, backgroundColor: bg },
      ]}
    >
      <Ionicons name={icon} size={size * 0.52} color={fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
