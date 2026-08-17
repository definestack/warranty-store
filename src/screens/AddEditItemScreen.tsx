import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import type { PermissionStatus } from 'expo-notifications';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Card from '../components/Card';
import FormRow from '../components/FormRow';
import ScreenHeader from '../components/ScreenHeader';
import SelectModal from '../components/SelectModal';
import Surface from '../components/Surface';
import type { InvoiceImageDraft } from '../db/invoiceImagesRepository';
import { saveInvoiceImagesForItem } from '../db/invoiceImagesRepository';
import {
  deleteSchedulesForItem,
  getSchedulesForItem,
  saveSchedulesForItem,
} from '../db/notificationSchedulesRepository';
import { createItem, getItemById, updateItem } from '../db/warrantyRepository';
import { useTranslation } from '../i18n/LocaleContext';
import { deleteInvoiceFile } from '../services/fileService';
import { MAX_INVOICE_PAGES, pickInvoiceFromCamera, pickInvoiceFromGallery } from '../services/imageService';
import {
  cancelScheduledReminders,
  hasExpiryDateChanged,
  requestNotificationPermissionIfNeeded,
  scheduleExpiryReminders,
} from '../services/notificationService';
import { useItemsStore } from '../store/itemsStore';
import { useToastStore } from '../store/toastStore';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/navigation';
import type { WarrantyItem } from '../types/warranty';
import { CATEGORIES, getCategoryLabel, resolveCategory } from '../utils/categories';
import { addMonths, formatDate, formatIsoDate, fromIsoDate, toIsoDate } from '../utils/date';
import { NOTES_MAX_LENGTH, parsePrice, parseWarrantyMonths } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'AddEditItem'>;

export default function AddEditItemScreen({ route, navigation }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const itemId = route.params?.itemId;
  const isEditing = !!itemId;

  const [existing, setExisting] = useState<WarrantyItem | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [notFound, setNotFound] = useState(false);

  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [price, setPrice] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('');
  const [warrantyMonthsError, setWarrantyMonthsError] = useState<string | null>(null);
  const [store, setStore] = useState('');
  const [invoiceDrafts, setInvoiceDrafts] = useState<InvoiceImageDraft[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;

    (async () => {
      try {
        const item = await getItemById(itemId);
        if (cancelled) return;
        if (!item) {
          setNotFound(true);
          return;
        }
        setExisting(item);
        setName(item.name);
        setCategory(item.category ?? '');
        setBrand(item.brand ?? '');
        setPurchaseDate(fromIsoDate(item.purchaseDate));
        setPrice(item.price !== undefined ? String(item.price) : '');
        setWarrantyMonths(String(item.warrantyMonths));
        setStore(item.store ?? '');
        setInvoiceDrafts(
          item.invoiceImages.map((image) => ({ id: image.id, uri: image.uri, isPersisted: true }))
        );
        setNotes(item.notes ?? '');
      } catch (err) {
        console.error('Failed to load warranty item for editing', err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [itemId]);

  const categoryOptions = CATEGORIES.map((c) => ({ value: c, label: getCategoryLabel(c, t) }));

  const parsedWarrantyMonths = parseWarrantyMonths(warrantyMonths);
  const expiryPreview =
    parsedWarrantyMonths !== null
      ? formatIsoDate(addMonths(toIsoDate(purchaseDate), parsedWarrantyMonths), locale)
      : null;
  const isFormValid = !!name.trim() && parsedWarrantyMonths !== null && !loadingExisting;

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const [attachingInvoice, setAttachingInvoice] = useState(false);
  const [invoiceSourceModalVisible, setInvoiceSourceModalVisible] = useState(false);
  const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null);

  const handleAttachInvoice = () => {
    if (attachingInvoice) return;
    setReplaceTargetIndex(null);
    setInvoiceSourceModalVisible(true);
  };

  const handleReplaceInvoicePage = (index: number) => {
    if (attachingInvoice) return;
    setReplaceTargetIndex(index);
    setInvoiceSourceModalVisible(true);
  };

  const showInvoicePermissionAlert = (source: 'camera' | 'gallery') => {
    const isCamera = source === 'camera';
    Alert.alert(
      isCamera ? t('addEditItem.cameraPermissionTitle') : t('addEditItem.galleryPermissionTitle'),
      isCamera ? t('addEditItem.cameraPermissionMessage') : t('addEditItem.galleryPermissionMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('addEditItem.openSettings'), onPress: () => Linking.openSettings() },
      ]
    );
  };

  const showNotificationPermissionRationale = (): Promise<boolean> =>
    new Promise((resolve) => {
      Alert.alert(
        t('addEditItem.notificationPermissionTitle'),
        t('addEditItem.notificationPermissionMessage'),
        [
          { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
          { text: t('addEditItem.notificationPermissionAllow'), onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });

  const handlePickInvoiceSource = async (source: 'camera' | 'gallery') => {
    setInvoiceSourceModalVisible(false);
    const targetIndex = replaceTargetIndex;
    setReplaceTargetIndex(null);

    if (targetIndex !== null) {
      setAttachingInvoice(true);
      try {
        const result =
          source === 'camera' ? await pickInvoiceFromCamera() : await pickInvoiceFromGallery(1);

        if (result.status === 'success' && result.uris.length > 0) {
          const [newUri] = result.uris;
          const oldDraft = invoiceDrafts[targetIndex];
          if (oldDraft && !oldDraft.isPersisted) {
            await deleteInvoiceFile(oldDraft.uri);
          }
          setInvoiceDrafts((drafts) =>
            drafts.map((draft, i) =>
              i === targetIndex ? { id: Crypto.randomUUID(), uri: newUri, isPersisted: false } : draft
            )
          );
        } else if (result.status === 'permission-denied') {
          showInvoicePermissionAlert(source);
        }
      } catch (err) {
        console.error('Failed to replace invoice photo', err);
        useToastStore.getState().show(t('addEditItem.invoiceSaveFailed'));
      } finally {
        setAttachingInvoice(false);
      }
      return;
    }

    const remainingCapacity = MAX_INVOICE_PAGES - invoiceDrafts.length;
    if (remainingCapacity <= 0) {
      useToastStore.getState().show(t('addEditItem.maxPagesReached', { max: MAX_INVOICE_PAGES }));
      return;
    }

    setAttachingInvoice(true);
    try {
      const result =
        source === 'camera'
          ? await pickInvoiceFromCamera()
          : await pickInvoiceFromGallery(remainingCapacity);

      if (result.status === 'success') {
        const uris = result.uris.slice(0, remainingCapacity);
        if (result.uris.length > uris.length) {
          useToastStore.getState().show(t('addEditItem.maxPagesReached', { max: MAX_INVOICE_PAGES }));
        }
        setInvoiceDrafts((drafts) => [
          ...drafts,
          ...uris.map((uri) => ({ id: Crypto.randomUUID(), uri, isPersisted: false })),
        ]);
      } else if (result.status === 'permission-denied') {
        showInvoicePermissionAlert(source);
      }
    } catch (err) {
      console.error('Failed to save invoice photo', err);
      useToastStore.getState().show(t('addEditItem.invoiceSaveFailed'));
    } finally {
      setAttachingInvoice(false);
    }
  };

  const handleRemoveInvoicePage = async (index: number) => {
    const draft = invoiceDrafts[index];
    if (!draft) return;
    if (!draft.isPersisted) {
      await deleteInvoiceFile(draft.uri);
    }
    setInvoiceDrafts((drafts) => drafts.filter((_, i) => i !== index));
  };

  const handleMoveInvoicePage = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    setInvoiceDrafts((drafts) => {
      if (targetIndex < 0 || targetIndex >= drafts.length) return drafts;
      const next = [...drafts];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const months = parseWarrantyMonths(warrantyMonths);

    setNameError(trimmedName ? null : t('addEditItem.nameRequired'));
    setWarrantyMonthsError(months === null ? t('addEditItem.warrantyMonthsInvalid') : null);

    if (!trimmedName || months === null) return;

    const trimmedBrand = brand.trim() || undefined;
    const parsedPrice = parsePrice(price);
    const trimmedStore = store.trim() || undefined;

    setSaving(true);
    try {
      let itemId: string;
      let createdItem: WarrantyItem | null = null;
      let updatedItem: WarrantyItem | null = null;
      if (isEditing && existing) {
        updatedItem = await updateItem(existing.id, {
          name: trimmedName,
          purchaseDate: toIsoDate(purchaseDate),
          warrantyMonths: months,
          category: resolveCategory(category),
          brand: trimmedBrand,
          price: parsedPrice,
          store: trimmedStore,
          notes: notes.trim() || undefined,
        });
        itemId = existing.id;
      } else {
        createdItem = await createItem({
          name: trimmedName,
          purchaseDate: toIsoDate(purchaseDate),
          warrantyMonths: months,
          category: resolveCategory(category),
          brand: trimmedBrand,
          price: parsedPrice,
          store: trimmedStore,
          notes: notes.trim() || undefined,
        });
        itemId = createdItem.id;
      }

      try {
        const { removedUris } = await saveInvoiceImagesForItem(itemId, invoiceDrafts);
        await Promise.all(removedUris.map((uri) => deleteInvoiceFile(uri)));
      } catch (err) {
        console.error('Failed to save invoice pages', err);
        useToastStore.getState().show(t('addEditItem.invoiceSaveFailed'));
      }

      if (isEditing) {
        // Refresh both the list and the detail screen's selected item so they
        // reflect the edit immediately on goBack().
        await useItemsStore.getState().loadItems();
        await useItemsStore.getState().loadItemById(itemId);
        useToastStore.getState().show(t('addEditItem.itemUpdated'));

        if (existing && updatedItem && hasExpiryDateChanged(existing, updatedItem)) {
          try {
            const existingSchedules = await getSchedulesForItem(existing.id);
            await cancelScheduledReminders(existingSchedules);
            await deleteSchedulesForItem(existing.id);
          } catch (err) {
            console.error('Failed to cancel existing expiry reminders', err);
          }

          let permissionStatus: PermissionStatus | null = null;
          try {
            permissionStatus = await requestNotificationPermissionIfNeeded(showNotificationPermissionRationale);
          } catch (err) {
            console.error('Failed to request notification permission', err);
          }

          if (permissionStatus === 'granted') {
            try {
              const scheduled = await scheduleExpiryReminders(updatedItem, t);
              if (scheduled.length > 0) {
                await saveSchedulesForItem(updatedItem.id, scheduled);
              }
            } catch (err) {
              console.error('Failed to schedule expiry reminders', err);
            }
          }
        }
      } else {
        // Refresh Home's store directly here rather than relying solely on its
        // focus listener — the Add FAB is reachable from any tab, so goBack()
        // won't always land back on a focused Home screen.
        await useItemsStore.getState().loadItems();
        useToastStore.getState().show(t('addEditItem.itemAdded'));

        let permissionStatus: PermissionStatus | null = null;
        try {
          permissionStatus = await requestNotificationPermissionIfNeeded(showNotificationPermissionRationale);
        } catch (err) {
          console.error('Failed to request notification permission', err);
        }

        if (permissionStatus === 'granted' && createdItem) {
          try {
            const scheduled = await scheduleExpiryReminders(createdItem, t);
            if (scheduled.length > 0) {
              await saveSchedulesForItem(createdItem.id, scheduled);
            }
          } catch (err) {
            console.error('Failed to schedule expiry reminders', err);
          }
        }
      }
      navigation.goBack();
    } catch (err) {
      console.error('Failed to save warranty item', err);
      setNameError(t('addEditItem.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (notFound) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title={t('addEditItem.editTitle')} onBack={() => navigation.goBack()} backIcon="close" />
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.subtleText }]}>{t('addEditItem.notFound')}</Text>
        </View>
      </View>
    );
  }

  if (loadingExisting) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title={t('addEditItem.editTitle')} onBack={() => navigation.goBack()} backIcon="close" />
        <View style={styles.emptyState}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={isEditing ? t('addEditItem.editTitle') : t('addEditItem.addTitle')}
        onBack={() => navigation.goBack()}
        backIcon="close"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={handlePickPhoto}>
          <Card style={styles.photoCard}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : (
              <View style={[styles.photoIcon, { backgroundColor: theme.surfaceAlt }]}>
                <Ionicons name="camera-outline" size={22} color={theme.subtleText} />
              </View>
            )}
            <View>
              <Text style={[styles.photoTitle, { color: theme.text }]}>
                {photoUri ? t('addEditItem.changePhoto') : t('addEditItem.addPhoto')}
              </Text>
              <Text style={[styles.photoSubtitle, { color: theme.subtleText }]}>{t('addEditItem.tapToUpload')}</Text>
            </View>
          </Card>
        </Pressable>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>{t('addEditItem.itemName')}</Text>
          <TextInput
            style={[
              styles.textBox,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: nameError ? theme.danger : theme.border,
                color: theme.text,
              },
            ]}
            placeholder={t('addEditItem.itemNamePlaceholder')}
            placeholderTextColor={theme.mutedText}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (nameError) setNameError(null);
            }}
          />
          {nameError ? (
            <Text style={[styles.fieldCaption, { color: theme.danger }]}>{nameError}</Text>
          ) : null}
        </View>

        <Card style={styles.formCard}>
          <FormRow
            label={t('addEditItem.category')}
            placeholder={t('category.selectCategory')}
            value={category ? getCategoryLabel(category, t) : undefined}
            icon="chevron-down"
            onPress={() => setCategoryModalVisible(true)}
          />
          <FormRow
            label={t('addEditItem.brand')}
            placeholder={t('addEditItem.brandPlaceholder')}
            value={brand}
            onChangeText={setBrand}
          />
          <FormRow
            label={t('addEditItem.purchaseDate')}
            placeholder={t('addEditItem.selectDate')}
            value={formatDate(purchaseDate, locale)}
            icon="calendar-outline"
            onPress={() => setDatePickerVisible(true)}
          />
          <FormRow
            label={t('addEditItem.purchasePrice')}
            placeholder={t('addEditItem.enterAmount')}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
          <FormRow
            label={t('addEditItem.store')}
            placeholder={t('addEditItem.storePlaceholder')}
            value={store}
            onChangeText={setStore}
          />
          <FormRow
            label={t('addEditItem.invoiceBill')}
            placeholder={attachingInvoice ? t('addEditItem.savingEllipsis') : t('addEditItem.attachInvoice')}
            value={
              invoiceDrafts.length > 0
                ? t('addEditItem.pagesAttached', { count: invoiceDrafts.length })
                : undefined
            }
            icon="camera-outline"
            onPress={handleAttachInvoice}
          />
        </Card>

        {invoiceDrafts.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.invoicePageScroll}
            contentContainerStyle={styles.invoicePageRow}
          >
            {invoiceDrafts.map((draft, index) => (
              <View key={draft.id} style={[styles.invoicePageCard, { backgroundColor: theme.surfaceAlt }]}>
                <View style={styles.invoicePageImageWrapper}>
                  <Image source={{ uri: draft.uri }} style={styles.invoicePageThumbnail} />
                  <Pressable
                    hitSlop={8}
                    disabled={attachingInvoice}
                    onPress={() => handleReplaceInvoicePage(index)}
                    accessibilityLabel={t('addEditItem.replacePage')}
                    style={[
                      styles.invoicePageBadge,
                      styles.invoicePageReplace,
                      { backgroundColor: theme.primary, borderColor: theme.surfaceAlt },
                    ]}
                  >
                    <Ionicons name="sync-outline" size={9} color={theme.primaryText} />
                  </Pressable>
                  <Pressable
                    hitSlop={8}
                    onPress={() => handleRemoveInvoicePage(index)}
                    accessibilityLabel={t('addEditItem.removePage')}
                    style={[
                      styles.invoicePageBadge,
                      styles.invoicePageRemove,
                      { backgroundColor: theme.danger, borderColor: theme.surfaceAlt },
                    ]}
                  >
                    <Ionicons name="close" size={11} color="#ffffff" />
                  </Pressable>
                </View>
                <View style={styles.invoicePageReorderRow}>
                  <Pressable
                    hitSlop={6}
                    disabled={index === 0}
                    onPress={() => handleMoveInvoicePage(index, -1)}
                    accessibilityLabel={t('addEditItem.movePageLeft')}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={16}
                      color={index === 0 ? theme.mutedText : theme.text}
                    />
                  </Pressable>
                  <Text style={[styles.invoicePageNumber, { color: theme.subtleText }]}>{index + 1}</Text>
                  <Pressable
                    hitSlop={6}
                    disabled={index === invoiceDrafts.length - 1}
                    onPress={() => handleMoveInvoicePage(index, 1)}
                    accessibilityLabel={t('addEditItem.movePageRight')}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={index === invoiceDrafts.length - 1 ? theme.mutedText : theme.text}
                    />
                  </Pressable>
                </View>
              </View>
            ))}
            {invoiceDrafts.length < MAX_INVOICE_PAGES ? (
              <Pressable
                onPress={handleAttachInvoice}
                accessibilityLabel={t('addEditItem.addPage')}
                style={[styles.invoicePageAddTile, { borderColor: theme.border }]}
              >
                <Ionicons name="add" size={22} color={theme.subtleText} />
              </Pressable>
            ) : null}
          </ScrollView>
        ) : null}

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>{t('addEditItem.warrantyMonths')}</Text>
          <TextInput
            style={[
              styles.textBox,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: warrantyMonthsError ? theme.danger : theme.border,
                color: theme.text,
              },
            ]}
            placeholder={t('addEditItem.warrantyMonthsPlaceholder')}
            placeholderTextColor={theme.mutedText}
            value={warrantyMonths}
            onChangeText={(text) => {
              setWarrantyMonths(text);
              if (warrantyMonthsError) setWarrantyMonthsError(null);
            }}
            keyboardType="numeric"
          />
          {warrantyMonthsError ? (
            <Text style={[styles.fieldCaption, { color: theme.danger }]}>{warrantyMonthsError}</Text>
          ) : (
            <Text style={[styles.fieldCaption, { color: theme.subtleText }]}>
              {expiryPreview ? t('addEditItem.expiresPreview', { date: expiryPreview }) : t('addEditItem.expiryAutoCalc')}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>{t('addEditItem.notes')}</Text>
          <TextInput
            style={[
              styles.textBox,
              styles.notesBox,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text },
            ]}
            placeholder={t('addEditItem.notesPlaceholder')}
            placeholderTextColor={theme.mutedText}
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
            maxLength={NOTES_MAX_LENGTH}
          />
        </View>
      </ScrollView>

      <Surface style={[styles.saveBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          onPress={handleSave}
          disabled={!isFormValid || saving}
          style={[
            styles.saveButton,
            { backgroundColor: isFormValid && !saving ? theme.primary : theme.surfaceAlt },
          ]}
        >
          <Text
            style={[
              styles.saveButtonText,
              { color: isFormValid && !saving ? theme.primaryText : theme.mutedText },
            ]}
          >
            {saving ? t('addEditItem.savingEllipsis') : t('addEditItem.save')}
          </Text>
        </Pressable>
      </Surface>

      <SelectModal
        visible={categoryModalVisible}
        title={t('category.selectCategory')}
        options={categoryOptions}
        selected={category}
        onSelect={setCategory}
        onClose={() => setCategoryModalVisible(false)}
      />
      <SelectModal
        visible={invoiceSourceModalVisible}
        title={
          replaceTargetIndex !== null
            ? t('addEditItem.replaceInvoiceTitle')
            : t('addEditItem.attachInvoiceTitle')
        }
        options={[
          { value: 'camera', label: t('addEditItem.takePhoto') },
          { value: 'gallery', label: t('addEditItem.chooseFromGallery') },
        ]}
        onSelect={(value) => handlePickInvoiceSource(value as 'camera' | 'gallery')}
        onClose={() => {
          setInvoiceSourceModalVisible(false);
          setReplaceTargetIndex(null);
        }}
      />
      {datePickerVisible ? (
        <DateTimePicker
          value={purchaseDate}
          mode="date"
          display="default"
          onChange={(_event, selectedDate) => {
            setDatePickerVisible(false);
            if (selectedDate) setPurchaseDate(selectedDate);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  photoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  photoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreview: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  photoTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  photoSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  fieldCaption: {
    fontSize: 13,
  },
  textBox: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  notesBox: {
    minHeight: 88,
    paddingVertical: 12,
  },
  formCard: {
    paddingVertical: 4,
  },
  invoicePageScroll: {
    marginTop: -8,
  },
  invoicePageRow: {
    flexDirection: 'row',
    gap: 12,
  },
  invoicePageCard: {
    width: 72,
    borderRadius: 12,
    padding: 6,
    gap: 4,
    alignItems: 'center',
  },
  invoicePageImageWrapper: {
    position: 'relative',
    width: 60,
    height: 60,
  },
  invoicePageThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  invoicePageBadge: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoicePageRemove: {
    top: 2,
    right: 2,
  },
  invoicePageReplace: {
    top: 2,
    left: 2,
  },
  invoicePageReorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 2,
  },
  invoicePageNumber: {
    fontSize: 11,
    fontWeight: '600',
  },
  invoicePageAddTile: {
    width: 72,
    height: 84,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  saveButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
