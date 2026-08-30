import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Crypto from 'expo-crypto';
import type { PermissionStatus } from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
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
import type { ItemDocumentDraft } from '../db/invoiceImagesRepository';
import { saveDocumentsForScope } from '../db/invoiceImagesRepository';
import {
  deleteSchedulesForItem,
  getSchedulesForItem,
  saveSchedulesForItem,
} from '../db/notificationSchedulesRepository';
import { createItem, getItemById, updateItem } from '../db/warrantyRepository';
import { useTranslation } from '../i18n/LocaleContext';
import { deleteDocumentFile, deleteItemPhotoFile } from '../services/fileService';
import {
  pickDocumentFromCamera,
  pickDocumentFromGallery,
  pickItemPhotoFromCamera,
  pickItemPhotoFromGallery,
} from '../services/imageService';
import {
  cancelScheduledReminders,
  hasCoverageChanged,
  requestNotificationPermissionIfNeeded,
  scheduleExpiryReminders,
} from '../services/notificationService';
import { useItemsStore } from '../store/itemsStore';
import { useNotificationsStore } from '../store/notificationsStore';
import { useToastStore } from '../store/toastStore';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/navigation';
import type { ItemDocument, ItemDocumentKind, WarrantyItem } from '../types/warranty';
import { CATEGORIES, getCategoryLabel, resolveCategory } from '../utils/categories';
import { addMonths, formatDate, formatIsoDate, fromIsoDate, toIsoDate } from '../utils/date';
import { MAX_DOCUMENTS_PER_KIND } from '../utils/documents';
import { NOTES_MAX_LENGTH, parsePrice, parseWarrantyMonths } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'AddEditItem'>;

type DocumentDrafts = Record<ItemDocumentKind, ItemDocumentDraft[]>;

const EMPTY_DRAFTS: DocumentDrafts = { invoice: [], warranty: [] };

function toDraft(document: ItemDocument): ItemDocumentDraft {
  return { id: document.id, uri: document.uri, isPersisted: true };
}

/**
 * The item's photo while it is being edited. `isPersisted` marks a file that is
 * already referenced by the saved item: an unsaved one is deleted as soon as it is
 * superseded, a persisted one only after a save writes its replacement.
 */
type PhotoDraft = { uri: string; isPersisted: boolean };

export default function AddEditItemScreen({ route, navigation }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const itemId = route.params?.itemId;
  const isEditing = !!itemId;

  const [existing, setExisting] = useState<WarrantyItem | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [notFound, setNotFound] = useState(false);

  const [photoDraft, setPhotoDraft] = useState<PhotoDraft | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [price, setPrice] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('');
  const [warrantyMonthsError, setWarrantyMonthsError] = useState<string | null>(null);
  const [store, setStore] = useState('');
  const [documentDrafts, setDocumentDrafts] = useState<DocumentDrafts>(EMPTY_DRAFTS);
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
        setPhotoDraft(item.photoUri ? { uri: item.photoUri, isPersisted: true } : null);
        setName(item.name);
        setCategory(item.category ?? '');
        setBrand(item.brand ?? '');
        setPurchaseDate(fromIsoDate(item.purchaseDate));
        setPrice(item.price !== undefined ? String(item.price) : '');
        setWarrantyMonths(String(item.warrantyMonths));
        setStore(item.store ?? '');
        setDocumentDrafts({
          invoice: item.invoiceDocuments.map(toDraft),
          warranty: item.warrantyDocuments.map(toDraft),
        });
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

  const [attachingPhoto, setAttachingPhoto] = useState(false);
  const [photoSourceModalVisible, setPhotoSourceModalVisible] = useState(false);

  /**
   * The photo file that would be orphaned if the user left right now. Navigating back
   * runs no handler, so unmount cleanup reads this ref; a committed save clears it so a
   * saved photo is never deleted.
   */
  const unsavedPhotoUriRef = useRef<string | null>(null);

  /** Same contract as `unsavedPhotoUriRef`, for document files of either kind. */
  const unsavedDocumentUrisRef = useRef<string[]>([]);

  useEffect(
    () => () => {
      const orphanUri = unsavedPhotoUriRef.current;
      if (orphanUri) {
        unsavedPhotoUriRef.current = null;
        void deleteItemPhotoFile(orphanUri);
      }

      const orphanDocuments = unsavedDocumentUrisRef.current;
      if (orphanDocuments.length > 0) {
        unsavedDocumentUrisRef.current = [];
        void Promise.all(orphanDocuments.map((uri) => deleteDocumentFile(uri)));
      }
    },
    []
  );

  const forgetUnsavedDocument = (uri: string) => {
    unsavedDocumentUrisRef.current = unsavedDocumentUrisRef.current.filter(
      (candidate) => candidate !== uri
    );
  };

  const [attachingKind, setAttachingKind] = useState<ItemDocumentKind | null>(null);
  const [sourceModalKind, setSourceModalKind] = useState<ItemDocumentKind | null>(null);
  const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null);

  const handleAttachDocument = (kind: ItemDocumentKind) => {
    if (attachingKind) return;
    setReplaceTargetIndex(null);
    setSourceModalKind(kind);
  };

  const handleReplaceDocument = (kind: ItemDocumentKind, index: number) => {
    if (attachingKind) return;
    setReplaceTargetIndex(index);
    setSourceModalKind(kind);
  };

  const showDocumentPermissionAlert = (source: 'camera' | 'gallery') => {
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

  const handleOpenPhotoSource = () => {
    if (attachingPhoto) return;
    setPhotoSourceModalVisible(true);
  };

  const handleRemovePhoto = async () => {
    const current = photoDraft;
    setPhotoDraft(null);
    if (current && !current.isPersisted) {
      unsavedPhotoUriRef.current = null;
      await deleteItemPhotoFile(current.uri);
    }
  };

  const handlePickPhotoSource = async (source: 'camera' | 'gallery' | 'remove') => {
    setPhotoSourceModalVisible(false);

    if (source === 'remove') {
      await handleRemovePhoto();
      return;
    }

    setAttachingPhoto(true);
    try {
      const result =
        source === 'camera' ? await pickItemPhotoFromCamera() : await pickItemPhotoFromGallery();

      if (result.status === 'success') {
        const previous = photoDraft;
        setPhotoDraft({ uri: result.uri, isPersisted: false });
        unsavedPhotoUriRef.current = result.uri;
        if (previous && !previous.isPersisted) {
          await deleteItemPhotoFile(previous.uri);
        }
      } else if (result.status === 'permission-denied') {
        showDocumentPermissionAlert(source);
      }
    } catch (err) {
      console.error('Failed to save item photo', err);
      useToastStore.getState().show(t('addEditItem.photoSaveFailed'));
    } finally {
      setAttachingPhoto(false);
    }
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

  const handlePickDocumentSource = async (source: 'camera' | 'gallery') => {
    const kind = sourceModalKind;
    const targetIndex = replaceTargetIndex;
    setSourceModalKind(null);
    setReplaceTargetIndex(null);
    if (!kind) return;

    if (targetIndex !== null) {
      setAttachingKind(kind);
      try {
        const result =
          source === 'camera' ? await pickDocumentFromCamera() : await pickDocumentFromGallery(1);

        if (result.status === 'success' && result.uris.length > 0) {
          const [newUri] = result.uris;
          const oldDraft = documentDrafts[kind][targetIndex];
          unsavedDocumentUrisRef.current = [...unsavedDocumentUrisRef.current, newUri];
          if (oldDraft && !oldDraft.isPersisted) {
            forgetUnsavedDocument(oldDraft.uri);
            await deleteDocumentFile(oldDraft.uri);
          }
          setDocumentDrafts((drafts) => ({
            ...drafts,
            [kind]: drafts[kind].map((draft, i) =>
              i === targetIndex ? { id: Crypto.randomUUID(), uri: newUri, isPersisted: false } : draft
            ),
          }));
        } else if (result.status === 'permission-denied') {
          showDocumentPermissionAlert(source);
        }
      } catch (err) {
        console.error('Failed to replace document', err);
        useToastStore.getState().show(t('addEditItem.documentSaveFailed'));
      } finally {
        setAttachingKind(null);
      }
      return;
    }

    const remainingCapacity = MAX_DOCUMENTS_PER_KIND - documentDrafts[kind].length;
    if (remainingCapacity <= 0) {
      useToastStore
        .getState()
        .show(t('addEditItem.maxDocumentsReached', { max: MAX_DOCUMENTS_PER_KIND }));
      return;
    }

    setAttachingKind(kind);
    try {
      const result =
        source === 'camera'
          ? await pickDocumentFromCamera()
          : await pickDocumentFromGallery(remainingCapacity);

      if (result.status === 'success') {
        const uris = result.uris.slice(0, remainingCapacity);
        // Anything past the cap was already copied into app storage by the picker, so it
        // has to be discarded here rather than simply ignored.
        const overflow = result.uris.slice(remainingCapacity);
        if (overflow.length > 0) {
          useToastStore
            .getState()
            .show(t('addEditItem.maxDocumentsReached', { max: MAX_DOCUMENTS_PER_KIND }));
          await Promise.all(overflow.map((uri) => deleteDocumentFile(uri)));
        }
        unsavedDocumentUrisRef.current = [...unsavedDocumentUrisRef.current, ...uris];
        setDocumentDrafts((drafts) => ({
          ...drafts,
          [kind]: [
            ...drafts[kind],
            ...uris.map((uri) => ({ id: Crypto.randomUUID(), uri, isPersisted: false })),
          ],
        }));
      } else if (result.status === 'permission-denied') {
        showDocumentPermissionAlert(source);
      }
    } catch (err) {
      console.error('Failed to save document', err);
      useToastStore.getState().show(t('addEditItem.documentSaveFailed'));
    } finally {
      setAttachingKind(null);
    }
  };

  const handleRemoveDocument = async (kind: ItemDocumentKind, index: number) => {
    const draft = documentDrafts[kind][index];
    if (!draft) return;
    if (!draft.isPersisted) {
      forgetUnsavedDocument(draft.uri);
      await deleteDocumentFile(draft.uri);
    }
    setDocumentDrafts((drafts) => ({
      ...drafts,
      [kind]: drafts[kind].filter((_, i) => i !== index),
    }));
  };

  const handleMoveDocument = (kind: ItemDocumentKind, index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    setDocumentDrafts((drafts) => {
      const current = drafts[kind];
      if (targetIndex < 0 || targetIndex >= current.length) return drafts;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return { ...drafts, [kind]: next };
    });
  };

  const renderDocumentStrip = (kind: ItemDocumentKind) => {
    const drafts = documentDrafts[kind];
    if (drafts.length === 0) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.documentTileScroll}
        contentContainerStyle={styles.documentTileRow}
      >
        {drafts.map((draft, index) => (
          <View key={draft.id} style={[styles.documentTileCard, { backgroundColor: theme.surfaceAlt }]}>
            <View style={styles.documentTileImageWrapper}>
              <Image source={{ uri: draft.uri }} style={styles.documentTileThumbnail} />
              <Pressable
                hitSlop={8}
                disabled={attachingKind !== null}
                onPress={() => handleReplaceDocument(kind, index)}
                accessibilityLabel={t('addEditItem.replacePage')}
                style={[
                  styles.documentTileBadge,
                  styles.documentTileReplace,
                  { backgroundColor: theme.primary, borderColor: theme.surfaceAlt },
                ]}
              >
                <Ionicons name="sync-outline" size={9} color={theme.primaryText} />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => handleRemoveDocument(kind, index)}
                accessibilityLabel={t('addEditItem.removePage')}
                style={[
                  styles.documentTileBadge,
                  styles.documentTileRemove,
                  { backgroundColor: theme.danger, borderColor: theme.surfaceAlt },
                ]}
              >
                <Ionicons name="close" size={11} color="#ffffff" />
              </Pressable>
            </View>
            <View style={styles.documentTileReorderRow}>
              <Pressable
                hitSlop={6}
                disabled={index === 0}
                onPress={() => handleMoveDocument(kind, index, -1)}
                accessibilityLabel={t('addEditItem.movePageLeft')}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={index === 0 ? theme.mutedText : theme.text}
                />
              </Pressable>
              <Text style={[styles.documentTileNumber, { color: theme.subtleText }]}>{index + 1}</Text>
              <Pressable
                hitSlop={6}
                disabled={index === drafts.length - 1}
                onPress={() => handleMoveDocument(kind, index, 1)}
                accessibilityLabel={t('addEditItem.movePageRight')}
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={index === drafts.length - 1 ? theme.mutedText : theme.text}
                />
              </Pressable>
            </View>
          </View>
        ))}
        {drafts.length < MAX_DOCUMENTS_PER_KIND ? (
          <Pressable
            onPress={() => handleAttachDocument(kind)}
            accessibilityLabel={t('addEditItem.addPage')}
            style={[styles.documentTileAddTile, { borderColor: theme.border }]}
          >
            <Ionicons name="add" size={22} color={theme.subtleText} />
            <Text style={[styles.documentTileAddLabel, { color: theme.subtleText }]}>
              {t('addEditItem.addMore')}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    );
  };

  const renderAddAction = (kind: ItemDocumentKind, label: string) => (
    <Pressable
      onPress={() => handleAttachDocument(kind)}
      disabled={attachingKind !== null}
      style={[styles.sectionAction, { borderColor: theme.primary }]}
    >
      <Ionicons name="add" size={14} color={theme.primary} />
      <Text style={[styles.sectionActionText, { color: theme.primary }]}>
        {attachingKind === kind ? t('addEditItem.savingEllipsis') : label}
      </Text>
    </Pressable>
  );

  const renderMultipleImagesHint = () => (
    <View style={styles.sectionHintRow}>
      <Ionicons name="information-circle-outline" size={14} color={theme.mutedText} />
      <Text style={[styles.sectionHint, { color: theme.mutedText }]}>
        {t('addEditItem.multipleImagesHint')}
      </Text>
    </View>
  );

  const handleSave = async () => {
    const trimmedName = name.trim();
    const months = parseWarrantyMonths(warrantyMonths);

    setNameError(trimmedName ? null : t('addEditItem.nameRequired'));
    setWarrantyMonthsError(months === null ? t('addEditItem.warrantyMonthsInvalid') : null);

    if (!trimmedName || months === null) return;

    const trimmedBrand = brand.trim() || undefined;
    const parsedPrice = parsePrice(price);
    const trimmedStore = store.trim() || undefined;

    // Always passed explicitly: an omitted key preserves the stored photo, while an
    // explicit undefined clears it, which is how removal is expressed.
    const photoUriToSave = photoDraft?.uri;
    const previousPhotoUri = existing?.photoUri;

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
          photoUri: photoUriToSave,
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
          photoUri: photoUriToSave,
        });
        itemId = createdItem.id;
      }

      // The write committed, so the draft photo is no longer an orphan and the file it
      // replaced (if any) is.
      unsavedPhotoUriRef.current = null;
      if (previousPhotoUri && previousPhotoUri !== photoUriToSave) {
        await deleteItemPhotoFile(previousPhotoUri);
      }

      try {
        // Each kind reconciles independently; the write committed, so nothing still held
        // in the drafts is an orphan any more.
        unsavedDocumentUrisRef.current = [];
        for (const kind of ['invoice', 'warranty'] as const) {
          const { removedUris } = await saveDocumentsForScope(
            { itemId, kind },
            documentDrafts[kind]
          );
          await Promise.all(removedUris.map((uri) => deleteDocumentFile(uri)));
        }
      } catch (err) {
        console.error('Failed to save documents', err);
        useToastStore.getState().show(t('addEditItem.documentSaveFailed'));
      }

      if (isEditing) {
        // Refresh both the list and the detail screen's selected item so they
        // reflect the edit immediately on goBack().
        await useItemsStore.getState().loadItems();
        await useItemsStore.getState().loadItemById(itemId);
        useToastStore.getState().show(t('addEditItem.itemUpdated'));

        if (existing && updatedItem && hasCoverageChanged(existing, updatedItem)) {
          try {
            const existingSchedules = await getSchedulesForItem(existing.id);
            await cancelScheduledReminders(existingSchedules);
            await deleteSchedulesForItem(existing.id);
          } catch (err) {
            console.error('Failed to cancel existing expiry reminders', err);
          }

          if (useNotificationsStore.getState().enabled) {
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
        }
      } else {
        // Refresh Home's store directly here rather than relying solely on its
        // focus listener — the Add FAB is reachable from any tab, so goBack()
        // won't always land back on a focused Home screen.
        await useItemsStore.getState().loadItems();
        useToastStore.getState().show(t('addEditItem.itemAdded'));

        if (useNotificationsStore.getState().enabled) {
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
        <Pressable onPress={handleOpenPhotoSource}>
          <Card style={styles.photoCard}>
            {photoDraft ? (
              <Image source={{ uri: photoDraft.uri }} style={styles.photoPreview} />
            ) : (
              <View style={[styles.photoIcon, { backgroundColor: theme.surfaceAlt }]}>
                <Ionicons name="camera-outline" size={22} color={theme.subtleText} />
              </View>
            )}
            <View>
              <Text style={[styles.photoTitle, { color: theme.text }]}>
                {photoDraft ? t('addEditItem.changePhoto') : t('addEditItem.addPhoto')}
              </Text>
              <Text style={[styles.photoSubtitle, { color: theme.subtleText }]}>
                {attachingPhoto ? t('addEditItem.savingEllipsis') : t('addEditItem.tapToUpload')}
              </Text>
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
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t('addEditItem.invoiceSection')}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.subtleText }]}>
                {t('addEditItem.invoiceSectionSubtitle')}
              </Text>
            </View>
            {renderAddAction('invoice', t('addEditItem.addInvoice'))}
          </View>
          {renderMultipleImagesHint()}
          {renderDocumentStrip('invoice')}
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color={theme.primary} />
            <Text style={[styles.sectionTitle, styles.sectionTitleWithIcon, { color: theme.primary }]}>
              {t('addEditItem.warrantySection')}
            </Text>
          </View>

          <View style={styles.warrantyRow}>
            <Text style={[styles.fieldLabel, styles.warrantyRowLabel, { color: theme.text }]}>
              {t('addEditItem.warrantyMonths')}
            </Text>
            <TextInput
              style={[
                styles.warrantyMonthsInput,
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
          </View>
          {warrantyMonthsError ? (
            <Text style={[styles.fieldCaption, { color: theme.danger }]}>{warrantyMonthsError}</Text>
          ) : null}

          {/*
            Valid-till is derived from purchase date and warranty months on every write and
            is never supplied by a caller, so it is rendered as read-only text. The mockup
            draws a calendar affordance here to match the row above; reproducing it would
            let an expiry date be entered directly and break the status badge, the filters
            and reminder scheduling.
          */}
          <View style={styles.warrantyRow}>
            <Text style={[styles.fieldLabel, styles.warrantyRowLabel, { color: theme.text }]}>
              {t('addEditItem.warrantyValidTill')}
            </Text>
            <Text style={[styles.warrantyRowValue, { color: expiryPreview ? theme.text : theme.mutedText }]}>
              {expiryPreview ?? '—'}
            </Text>
          </View>
          <Text style={[styles.fieldCaption, { color: theme.subtleText }]}>
            {t('addEditItem.warrantyValidTillCaption')}
          </Text>

          <View style={[styles.sectionHeaderRow, styles.warrantyDocumentsHeader]}>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t('addEditItem.warrantyDocumentsLabel')}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.subtleText }]}>
                {t('addEditItem.warrantyDocumentsSubtitle')}
              </Text>
            </View>
            {renderAddAction('warranty', t('addEditItem.addDocument'))}
          </View>
          {renderMultipleImagesHint()}
          {renderDocumentStrip('warranty')}
        </Card>

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
        visible={sourceModalKind !== null}
        title={
          replaceTargetIndex !== null
            ? t('addEditItem.replaceDocumentTitle')
            : t('addEditItem.attachDocumentTitle')
        }
        options={[
          { value: 'camera', label: t('addEditItem.takePhoto') },
          { value: 'gallery', label: t('addEditItem.chooseFromGallery') },
        ]}
        onSelect={(value) => handlePickDocumentSource(value as 'camera' | 'gallery')}
        onClose={() => {
          setSourceModalKind(null);
          setReplaceTargetIndex(null);
        }}
      />
      <SelectModal
        visible={photoSourceModalVisible}
        title={t('addEditItem.photoSourceTitle')}
        options={[
          { value: 'camera', label: t('addEditItem.takePhoto') },
          { value: 'gallery', label: t('addEditItem.chooseFromGallery') },
          ...(photoDraft ? [{ value: 'remove', label: t('addEditItem.removePhoto') }] : []),
        ]}
        onSelect={(value) => handlePickPhotoSource(value as 'camera' | 'gallery' | 'remove')}
        onClose={() => setPhotoSourceModalVisible(false)}
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
  sectionCard: {
    // No margin here: this style lands on Card's inner Surface, while the shadow is cast
    // by its wrapper. A margin would stretch the shadow box past the visible card. The
    // ScrollView's content container already spaces the cards apart.
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitleWithIcon: {
    fontSize: 14,
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHint: {
    fontSize: 11,
  },
  warrantyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  warrantyRowLabel: {
    flex: 1,
    marginBottom: 0,
  },
  warrantyRowValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  warrantyMonthsInput: {
    minWidth: 120,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlign: 'right',
  },
  warrantyDocumentsHeader: {
    marginTop: 4,
  },
  documentTileAddLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  documentTileScroll: {
    marginTop: -8,
  },
  documentTileRow: {
    flexDirection: 'row',
    gap: 12,
  },
  documentTileCard: {
    width: 72,
    borderRadius: 12,
    padding: 6,
    gap: 4,
    alignItems: 'center',
  },
  documentTileImageWrapper: {
    position: 'relative',
    width: 60,
    height: 60,
  },
  documentTileThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  documentTileBadge: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentTileRemove: {
    top: 2,
    right: 2,
  },
  documentTileReplace: {
    top: 2,
    left: 2,
  },
  documentTileReorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 2,
  },
  documentTileNumber: {
    fontSize: 11,
    fontWeight: '600',
  },
  documentTileAddTile: {
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
