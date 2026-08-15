import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Card from '../components/Card';
import DetailRow from '../components/DetailRow';
import ItemIcon from '../components/ItemIcon';
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
      <ScreenHeader
        title="Item Detail"
        onBack={() => navigation.goBack()}
        rightIcon="ellipsis-vertical"
        rightFilled={false}
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

        <View style={styles.notesSection}>
          <Text style={[styles.notesLabel, { color: theme.text }]}>Notes</Text>
          <Text style={[styles.notesText, { color: theme.subtleText }]}>
            {item.notes ?? 'No notes added.'}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, styles.actionButtonFilled, { backgroundColor: theme.primaryContainer }]}
            onPress={() => navigation.navigate('AddEditItem', { itemId: item.id })}
          >
            <Text style={[styles.actionText, { color: theme.onPrimaryContainer }]}>Edit Item</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.actionButtonOutlined, { borderColor: theme.danger }]}>
            <Text style={[styles.actionText, { color: theme.danger }]}>Mark as Expired</Text>
          </Pressable>
        </View>
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
  notesSection: {
    gap: 6,
    paddingHorizontal: 4,
  },
  notesLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonFilled: {},
  actionButtonOutlined: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
