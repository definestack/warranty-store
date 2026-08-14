import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import Card from '../components/Card';
import DetailRow from '../components/DetailRow';
import ItemIcon from '../components/ItemIcon';
import ScreenBackdrop from '../components/ScreenBackdrop';
import ScreenHeader from '../components/ScreenHeader';
import StatusBadge from '../components/StatusBadge';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/navigation';
import { PLACEHOLDER_ITEMS } from '../utils/mockData';

type Props = NativeStackScreenProps<RootStackParamList, 'ItemDetail'>;

export default function ItemDetailScreen({ route, navigation }: Props) {
  const { itemId } = route.params;
  const theme = useAppTheme();
  const item = PLACEHOLDER_ITEMS.find((entry) => entry.id === itemId) ?? PLACEHOLDER_ITEMS[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenBackdrop />
      <ScreenHeader
        title="Item Detail"
        onBack={() => navigation.goBack()}
        rightLabel="Edit"
        onRightPress={() => navigation.navigate('AddEditItem', { itemId: item.id })}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summaryCard}>
          <ItemIcon category={item.category} size={56} />
          <View style={styles.summaryInfo}>
            <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.itemMeta, { color: theme.subtleText }]}>
              {item.category} • {item.brand}
            </Text>
            <StatusBadge status={item.status} />
          </View>
        </Card>

        <Card style={styles.detailCard}>
          <DetailRow icon="calendar-outline" label="Purchase Date" value={item.purchaseDate} />
          <DetailRow icon="checkmark-circle-outline" label="Warranty Valid Till" value={item.expiryDate} />
          <DetailRow icon="pricetag-outline" label="Purchase Price" value={item.price} />
          <DetailRow icon="storefront-outline" label="Store" value={item.store} />
          <DetailRow
            icon="document-text-outline"
            label="Invoice / Bill"
            value={item.invoiceFileName}
            onPress={() => {}}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  summaryInfo: {
    flex: 1,
    gap: 6,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: 14,
  },
  detailCard: {
    paddingVertical: 4,
  },
});
