import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Card from '../components/Card';
import DetailRow from '../components/DetailRow';
import ItemIcon from '../components/ItemIcon';
import ScreenHeader from '../components/ScreenHeader';
import StatusBadge from '../components/StatusBadge';
import { useItemsStore } from '../store/itemsStore';
import { useToastStore } from '../store/toastStore';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/navigation';
import { DEFAULT_CATEGORY } from '../utils/categories';
import { formatDaysRemaining, formatIsoDate, formatWarrantyDuration, getWarrantyStatus } from '../utils/date';

type Props = NativeStackScreenProps<RootStackParamList, 'ItemDetail'>;

function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}

export default function ItemDetailScreen({ route, navigation }: Props) {
  const { itemId } = route.params;
  const theme = useAppTheme();
  const item = useItemsStore((state) => state.selectedItem);
  const loading = useItemsStore((state) => state.selectedItemLoading);
  const loadItemById = useItemsStore((state) => state.loadItemById);
  const deleteItem = useItemsStore((state) => state.deleteItem);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadItemById(itemId);
    }, [loadItemById, itemId])
  );

  if (!item) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Item Detail" onBack={() => navigation.goBack()} />
        <View style={styles.emptyState}>
          {loading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Text style={[styles.emptyText, { color: theme.subtleText }]}>Item not found.</Text>
          )}
        </View>
      </View>
    );
  }

  const status = getWarrantyStatus(item.expiryDate);
  const category = item.category ?? DEFAULT_CATEGORY;

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteItem(item.id);
      useToastStore.getState().show('Item deleted');
      navigation.navigate('MainTabs');
    } catch (err) {
      console.error('Failed to delete warranty item', err);
      useToastStore.getState().show('Could not delete item. Please try again.');
      setDeleting(false);
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      'Delete item?',
      `"${item.name}" and its details will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleConfirmDelete },
      ]
    );
  };

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
          <ItemIcon category={category} size={56} />
          <View style={styles.summaryInfo}>
            <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.itemMeta, { color: theme.subtleText }]}>{category}</Text>
            <StatusBadge status={status} />
            <Text style={[styles.daysRemaining, { color: theme.subtleText }]}>
              {formatDaysRemaining(item.expiryDate)} · {formatIsoDate(item.expiryDate)}
            </Text>
          </View>
        </Card>

        <Card style={styles.detailCard}>
          {item.brand ? <DetailRow icon="pricetag-outline" label="Brand" value={item.brand} /> : null}
          <DetailRow icon="calendar-outline" label="Purchase Date" value={formatIsoDate(item.purchaseDate)} />
          {item.price !== undefined ? (
            <DetailRow icon="cash-outline" label="Purchase Price" value={formatPrice(item.price)} />
          ) : null}
          {item.store ? <DetailRow icon="storefront-outline" label="Store" value={item.store} /> : null}
          <DetailRow
            icon="time-outline"
            label="Warranty Period"
            value={formatWarrantyDuration(item.warrantyMonths)}
          />
          <DetailRow icon="checkmark-circle-outline" label="Warranty Valid Till" value={formatIsoDate(item.expiryDate)} />
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
          <Pressable
            style={[styles.actionButton, styles.actionButtonOutlined, { borderColor: theme.danger }]}
            onPress={handleDeletePress}
            disabled={deleting}
          >
            <Text style={[styles.actionText, { color: theme.danger }]}>
              {deleting ? 'Deleting…' : 'Delete Item'}
            </Text>
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
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
  daysRemaining: {
    fontSize: 13,
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
