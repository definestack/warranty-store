import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Card from '../components/Card';
import DetailRow from '../components/DetailRow';
import InvoiceImageViewer from '../components/InvoiceImageViewer';
import ItemIcon from '../components/ItemIcon';
import ScreenHeader from '../components/ScreenHeader';
import StatusBadge from '../components/StatusBadge';
import { useTranslation } from '../i18n/LocaleContext';
import { useItemsStore } from '../store/itemsStore';
import { useToastStore } from '../store/toastStore';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/navigation';
import { DEFAULT_CATEGORY, getCategoryLabel } from '../utils/categories';
import { formatDaysRemaining, formatIsoDate, formatWarrantyDuration, getWarrantyStatus } from '../utils/date';

type Props = NativeStackScreenProps<RootStackParamList, 'ItemDetail'>;

function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}

export default function ItemDetailScreen({ route, navigation }: Props) {
  const { itemId } = route.params;
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const item = useItemsStore((state) => state.selectedItem);
  const loading = useItemsStore((state) => state.selectedItemLoading);
  const loadItemById = useItemsStore((state) => state.loadItemById);
  const deleteItem = useItemsStore((state) => state.deleteItem);
  const [deleting, setDeleting] = useState(false);
  const [invoiceViewerVisible, setInvoiceViewerVisible] = useState(false);
  const [invoiceViewerIndex, setInvoiceViewerIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadItemById(itemId);
    }, [loadItemById, itemId])
  );

  if (!item) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title={t('itemDetail.title')} onBack={() => navigation.goBack()} />
        <View style={styles.emptyState}>
          {loading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Text style={[styles.emptyText, { color: theme.subtleText }]}>{t('itemDetail.notFound')}</Text>
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
      useToastStore.getState().show(t('itemDetail.itemDeleted'));
      navigation.navigate('MainTabs');
    } catch (err) {
      console.error('Failed to delete warranty item', err);
      useToastStore.getState().show(t('itemDetail.deleteFailed'));
      setDeleting(false);
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      t('itemDetail.deleteConfirmTitle'),
      t('itemDetail.deleteConfirmMessage', { name: item.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: handleConfirmDelete },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t('itemDetail.title')}
        onBack={() => navigation.goBack()}
        rightIcon="ellipsis-vertical"
        rightFilled={false}
        onRightPress={() => navigation.navigate('AddEditItem', { itemId: item.id })}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <Card style={styles.summaryCard}>
          <ItemIcon category={category} size={56} />
          <View style={styles.summaryInfo}>
            <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.itemMeta, { color: theme.subtleText }]}>{getCategoryLabel(category, t)}</Text>
            <StatusBadge status={status} />
            <Text style={[styles.daysRemaining, { color: theme.subtleText }]}>
              {formatDaysRemaining(item.expiryDate, t)} · {formatIsoDate(item.expiryDate, locale)}
            </Text>
          </View>
        </Card>

        <Card style={styles.detailCard}>
          {item.brand ? <DetailRow icon="pricetag-outline" label={t('itemDetail.brand')} value={item.brand} /> : null}
          <DetailRow
            icon="calendar-outline"
            label={t('itemDetail.purchaseDate')}
            value={formatIsoDate(item.purchaseDate, locale)}
          />
          {item.price !== undefined ? (
            <DetailRow icon="cash-outline" label={t('itemDetail.purchasePrice')} value={formatPrice(item.price)} />
          ) : null}
          {item.store ? <DetailRow icon="storefront-outline" label={t('itemDetail.store')} value={item.store} /> : null}
          <DetailRow
            icon="time-outline"
            label={t('itemDetail.warrantyPeriod')}
            value={formatWarrantyDuration(item.warrantyMonths, t)}
          />
          <DetailRow
            icon="checkmark-circle-outline"
            label={t('itemDetail.warrantyValidTill')}
            value={formatIsoDate(item.expiryDate, locale)}
          />
        </Card>

        <View style={styles.notesSection}>
          <Text style={[styles.notesLabel, { color: theme.text }]}>{t('itemDetail.notes')}</Text>
          <Text style={[styles.notesText, { color: theme.subtleText }]}>
            {item.notes ?? t('itemDetail.noNotes')}
          </Text>
        </View>

        {item.invoiceImages.length > 0 ? (
          <View style={styles.notesSection}>
            <Text style={[styles.notesLabel, { color: theme.text }]}>{t('itemDetail.invoice')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.invoiceThumbnailRow}>
              {item.invoiceImages.map((image, index) => (
                <Pressable
                  key={image.id}
                  onPress={() => {
                    setInvoiceViewerIndex(index);
                    setInvoiceViewerVisible(true);
                  }}
                  accessibilityLabel={t('itemDetail.invoice')}
                >
                  <Image source={{ uri: image.uri }} style={styles.invoiceThumbnail} />
                </Pressable>
              ))}
            </ScrollView>
            <Text style={[styles.notesText, { color: theme.subtleText }]}>
              {t('itemDetail.viewInvoiceHint')}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, styles.actionButtonFilled, { backgroundColor: theme.primaryContainer }]}
            onPress={() => navigation.navigate('AddEditItem', { itemId: item.id })}
          >
            <Text style={[styles.actionText, { color: theme.onPrimaryContainer }]}>{t('itemDetail.editItem')}</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.actionButtonOutlined, { borderColor: theme.danger }]}
            onPress={handleDeletePress}
            disabled={deleting}
          >
            <Text style={[styles.actionText, { color: theme.danger }]}>
              {deleting ? t('itemDetail.deleting') : t('itemDetail.deleteItem')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      {item.invoiceImages.length > 0 ? (
        <InvoiceImageViewer
          visible={invoiceViewerVisible}
          images={item.invoiceImages.map((image) => image.uri)}
          initialIndex={invoiceViewerIndex}
          onClose={() => setInvoiceViewerVisible(false)}
        />
      ) : null}
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
  invoiceThumbnailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  invoiceThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
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
