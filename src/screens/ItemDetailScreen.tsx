import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Card from '../components/Card';
import type { CoverageDocumentSection, CoveragePeriodView } from '../components/CoveragePeriodCard';
import CoveragePeriodCard from '../components/CoveragePeriodCard';
import DetailRow from '../components/DetailRow';
import DocumentViewer from '../components/DocumentViewer';
import ItemIcon from '../components/ItemIcon';
import ScreenHeader from '../components/ScreenHeader';
import StatusBadge from '../components/StatusBadge';
import Surface from '../components/Surface';
import { useTranslation } from '../i18n/LocaleContext';
import { useItemsStore } from '../store/itemsStore';
import { useToastStore } from '../store/toastStore';
import { useAppTheme } from '../theme/ThemeContext';
import type { AddEditSection, RootStackParamList } from '../types/navigation';
import type { ExtendedWarranty, ItemDocument } from '../types/warranty';
import { DEFAULT_CATEGORY, getCategoryLabel } from '../utils/categories';
import { formatPeriodCountdown, getPeriodStatus } from '../utils/coverage';
import { formatIsoDate, getDaysRemaining, getWarrantyStatus } from '../utils/date';

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
  // The viewer pages within one section only, so it holds that section's uris rather
  // than an index into a combined list.
  const [viewerDocuments, setViewerDocuments] = useState<string[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

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

  const status = getWarrantyStatus(item.coverageEndDate);
  const category = item.category ?? DEFAULT_CATEGORY;
  const daysLeft = getDaysRemaining(item.coverageEndDate);
  const lastExtended = item.extendedWarranties[item.extendedWarranties.length - 1];

  /** Every add control on this read-only screen opens the editor at its section. */
  const openEditor = (focus?: AddEditSection) =>
    navigation.navigate('AddEditItem', { itemId: item.id, focus });

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

  const openViewer = (documents: ItemDocument[], index: number) => {
    setViewerIndex(index);
    setViewerDocuments(documents.map((entry) => entry.uri));
  };

  /**
   * The per-tile menu. With the screen read-only its only two actions are viewing the
   * document and jumping to the editor to change it.
   */
  const showDocumentMenu = (documents: ItemDocument[], index: number, focus: AddEditSection) => {
    Alert.alert(t('itemDetail.documentMenu'), undefined, [
      { text: t('itemDetail.viewDocument'), onPress: () => openViewer(documents, index) },
      { text: t('itemDetail.editInItem'), onPress: () => openEditor(focus) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const renderAddAction = (label: string, focus: AddEditSection) => (
    <Pressable
      onPress={() => openEditor(focus)}
      style={[styles.sectionAction, { borderColor: theme.primary }]}
    >
      <Ionicons name="add" size={14} color={theme.primary} />
      <Text style={[styles.sectionActionText, { color: theme.primary }]}>{label}</Text>
    </Pressable>
  );

  /**
   * A document strip. Rendered even when the section is empty, so an empty section is
   * visibly empty rather than absent and its add tile stays reachable.
   */
  const renderDocumentStrip = (documents: ItemDocument[], focus: AddEditSection) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.documentRow}
    >
      {documents.map((document, index) => (
        <View key={document.id} style={[styles.documentTile, { borderColor: theme.border }]}>
          <Pressable onPress={() => openViewer(documents, index)}>
            <Image source={{ uri: document.uri }} style={styles.documentThumbnail} />
          </Pressable>
          <Pressable
            hitSlop={6}
            onPress={() => showDocumentMenu(documents, index, focus)}
            accessibilityLabel={t('itemDetail.documentMenu')}
            style={[styles.documentMenuButton, { backgroundColor: theme.surface }]}
          >
            <Ionicons name="ellipsis-vertical" size={13} color={theme.subtleText} />
          </Pressable>
        </View>
      ))}
      <Pressable
        onPress={() => openEditor(focus)}
        style={[styles.documentAddTile, { borderColor: theme.primary }]}
      >
        <Ionicons name="add" size={20} color={theme.primary} />
        <Text style={[styles.documentAddLabel, { color: theme.primary }]}>
          {t('itemDetail.addMore')}
        </Text>
      </Pressable>
    </ScrollView>
  );

  const extendedFacts = (extended: ExtendedWarranty) => {
    const facts: { label: string; value: string }[] = [];
    if (extended.provider) {
      facts.push({ label: t('itemDetail.provider'), value: extended.provider });
    }
    facts.push({
      label: t('itemDetail.duration'),
      value:
        extended.durationUnit === 'years'
          ? t('duration.years', { count: extended.durationValue })
          : t('duration.months', { count: extended.durationValue }),
    });
    if (extended.cost !== undefined) {
      facts.push({ label: t('itemDetail.cost'), value: formatPrice(extended.cost) });
    }
    return facts;
  };

  /**
   * The item's cover as one ordered list: the manufacturer warranty mapped into the same
   * shape as every extended warranty, so neither is a special case below.
   */
  const periods: CoveragePeriodView[] = [
    {
      id: 'manufacturer',
      title: t('itemDetail.originalWarranty'),
      status: getPeriodStatus(item.purchaseDate, item.expiryDate),
      range: `${formatIsoDate(item.purchaseDate, locale)} – ${formatIsoDate(item.expiryDate, locale)}`,
      countdown: formatPeriodCountdown(item.purchaseDate, item.expiryDate, t),
      countdownDate: formatIsoDate(item.expiryDate, locale),
      facts: [],
      sections: [{ kind: 'warranty', label: t('itemDetail.warrantyDocumentsWithExamples') }],
    },
    ...item.extendedWarranties.map((extended, index) => ({
      id: extended.id,
      title:
        item.extendedWarranties.length > 1
          ? `${t('itemDetail.extendedWarranty')} ${index + 1}`
          : t('itemDetail.extendedWarranty'),
      status: getPeriodStatus(extended.startsOn, extended.endsOn),
      range: `${formatIsoDate(extended.startsOn, locale)} – ${formatIsoDate(extended.endsOn, locale)}`,
      countdown: formatPeriodCountdown(extended.startsOn, extended.endsOn, t),
      // An upcoming period counts up to its start, so that is the date to show beside it.
      countdownDate: formatIsoDate(
        getDaysRemaining(extended.startsOn) > 0 ? extended.startsOn : extended.endsOn,
        locale
      ),
      facts: extendedFacts(extended),
      sections: [
        { kind: 'invoice' as const, label: t('itemDetail.extendedInvoiceSection') },
        { kind: 'warranty' as const, label: t('itemDetail.extendedDocumentsSection') },
      ],
    })),
  ];

  const documentsForPeriod = (
    period: CoveragePeriodView,
    section: CoverageDocumentSection
  ): { documents: ItemDocument[]; focus: AddEditSection } => {
    if (period.id === 'manufacturer') {
      return { documents: item.warrantyDocuments, focus: { section: 'warrantyDocuments' } };
    }

    const extended = item.extendedWarranties.find((entry) => entry.id === period.id);
    const documents =
      section.kind === 'invoice'
        ? extended?.invoiceDocuments ?? []
        : extended?.warrantyDocuments ?? [];

    return {
      documents,
      focus: {
        section:
          section.kind === 'invoice' ? 'extendedWarrantyInvoice' : 'extendedWarrantyDocuments',
        extendedWarrantyId: period.id,
      },
    };
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t('itemDetail.title')}
        onBack={() => navigation.goBack()}
        rightIcon="ellipsis-vertical"
        rightFilled={false}
        onRightPress={() => openEditor()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summaryCard}>
          <ItemIcon category={category} size={56} photoUri={item.photoUri} />
          <View style={styles.summaryInfo}>
            <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.itemMeta, { color: theme.subtleText }]}>{getCategoryLabel(category, t)}</Text>
            <StatusBadge status={status} />
            <Text style={[styles.daysRemaining, { color: theme.subtleText }]}>
              {t('itemDetail.coveredTill', {
                date: formatIsoDate(item.coverageEndDate, locale),
              })}
              {daysLeft >= 0 ? ` · ${t('itemDetail.daysLeft', { count: daysLeft })}` : ''}
            </Text>
          </View>
        </Card>

        <Card style={styles.detailCard}>
          {item.brand ? <DetailRow icon="pricetag-outline" label={t('itemDetail.brand')} value={item.brand} /> : null}
          <DetailRow
            icon="albums-outline"
            label={t('itemDetail.category')}
            value={getCategoryLabel(category, t)}
          />
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
            icon="shield-checkmark-outline"
            label={t('itemDetail.originalWarrantyValidTill')}
            value={formatIsoDate(item.expiryDate, locale)}
          />
          {lastExtended ? (
            <DetailRow
              icon="shield-outline"
              label={t('itemDetail.extendedWarrantyValidTill')}
              value={formatIsoDate(lastExtended.endsOn, locale)}
            />
          ) : null}
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t('itemDetail.originalBills')}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.subtleText }]}>
                {t('itemDetail.originalBillsSubtitle')}
              </Text>
            </View>
            {renderAddAction(t('itemDetail.addInvoice'), { section: 'invoiceDocuments' })}
          </View>
          {renderDocumentStrip(item.invoiceDocuments, { section: 'invoiceDocuments' })}
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t('itemDetail.warrantyCoverage')}
            </Text>
            {renderAddAction(t('itemDetail.addExtendedWarranty'), { section: 'extendedWarranties' })}
          </View>

          {periods.map((period, index) => (
            <CoveragePeriodCard
              key={period.id}
              period={period}
              showRail={index < periods.length - 1}
              renderDocuments={(current, section) => {
                const { documents, focus } = documentsForPeriod(current, section);
                return renderDocumentStrip(documents, focus);
              }}
            />
          ))}
        </Card>

        {/*
          The mockup shows no notes section, but its sample item has none. Notes are a
          field the user can fill in, so the section is kept and simply hidden when empty
          rather than deleted outright. See design.md — Risks.
        */}
        {item.notes ? (
          <View style={styles.notesSection}>
            <Text style={[styles.notesLabel, { color: theme.text }]}>{t('itemDetail.notes')}</Text>
            <Text style={[styles.notesText, { color: theme.subtleText }]}>{item.notes}</Text>
          </View>
        ) : null}
      </ScrollView>

      <Surface style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: theme.primaryContainer }]}
          onPress={() => openEditor()}
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
      </Surface>

      {viewerDocuments ? (
        <DocumentViewer
          visible
          images={viewerDocuments}
          initialIndex={viewerIndex}
          onClose={() => setViewerDocuments(null)}
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
    paddingBottom: 32,
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
  sectionCard: {
    padding: 16,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '700',
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
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 2,
  },
  documentTile: {
    width: 76,
    height: 88,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  documentThumbnail: {
    width: '100%',
    height: '100%',
  },
  documentMenuButton: {
    position: 'absolute',
    top: 3,
    right: 3,
    borderRadius: 999,
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  documentAddTile: {
    width: 76,
    height: 88,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  documentAddLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonOutlined: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
