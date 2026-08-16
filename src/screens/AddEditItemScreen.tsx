import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
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
import { createItem, getItemById, updateItem } from '../db/warrantyRepository';
import { saveInvoiceImage } from '../services/fileService';
import { useItemsStore } from '../store/itemsStore';
import { useToastStore } from '../store/toastStore';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/navigation';
import type { WarrantyItem } from '../types/warranty';
import { CATEGORIES, resolveCategory } from '../utils/categories';
import { addMonths, formatIsoDate, fromIsoDate, toIsoDate } from '../utils/date';
import { NOTES_MAX_LENGTH, parsePrice, parseWarrantyMonths } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'AddEditItem'>;

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AddEditItemScreen({ route, navigation }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
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
  const [invoiceUri, setInvoiceUri] = useState<string | undefined>();
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
        setInvoiceUri(item.invoiceUri);
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

  const parsedWarrantyMonths = parseWarrantyMonths(warrantyMonths);
  const expiryPreview =
    parsedWarrantyMonths !== null
      ? formatIsoDate(addMonths(toIsoDate(purchaseDate), parsedWarrantyMonths))
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

  const handleAttachInvoice = async () => {
    if (attachingInvoice) return;

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Camera permission needed',
        'Warranty Store needs camera access to take a photo of your invoice. You can enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (result.canceled || result.assets.length === 0) return;

    setAttachingInvoice(true);
    try {
      const savedUri = await saveInvoiceImage(result.assets[0].uri);
      setInvoiceUri(savedUri);
    } catch (err) {
      console.error('Failed to save invoice photo', err);
      useToastStore.getState().show('Could not save invoice photo. Please try again.');
    } finally {
      setAttachingInvoice(false);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const months = parseWarrantyMonths(warrantyMonths);

    setNameError(trimmedName ? null : 'Name is required');
    setWarrantyMonthsError(
      months === null ? 'Enter warranty duration in whole months (e.g. 12)' : null
    );

    if (!trimmedName || months === null) return;

    const trimmedBrand = brand.trim() || undefined;
    const parsedPrice = parsePrice(price);
    const trimmedStore = store.trim() || undefined;

    setSaving(true);
    try {
      if (isEditing && existing) {
        await updateItem(existing.id, {
          name: trimmedName,
          purchaseDate: toIsoDate(purchaseDate),
          warrantyMonths: months,
          category: resolveCategory(category),
          brand: trimmedBrand,
          price: parsedPrice,
          store: trimmedStore,
          invoiceUri,
          notes: notes.trim() || undefined,
        });
        // Refresh both the list and the detail screen's selected item so they
        // reflect the edit immediately on goBack().
        await useItemsStore.getState().loadItems();
        await useItemsStore.getState().loadItemById(existing.id);
        useToastStore.getState().show('Item updated');
      } else {
        await createItem({
          name: trimmedName,
          purchaseDate: toIsoDate(purchaseDate),
          warrantyMonths: months,
          category: resolveCategory(category),
          brand: trimmedBrand,
          price: parsedPrice,
          store: trimmedStore,
          invoiceUri,
          notes: notes.trim() || undefined,
        });
        // Refresh Home's store directly here rather than relying solely on its
        // focus listener — the Add FAB is reachable from any tab, so goBack()
        // won't always land back on a focused Home screen.
        await useItemsStore.getState().loadItems();
        useToastStore.getState().show('Item added');
      }
      navigation.goBack();
    } catch (err) {
      console.error('Failed to save warranty item', err);
      setNameError('Could not save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (notFound) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Edit Item" onBack={() => navigation.goBack()} backIcon="close" />
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.subtleText }]}>Item not found.</Text>
        </View>
      </View>
    );
  }

  if (loadingExisting) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Edit Item" onBack={() => navigation.goBack()} backIcon="close" />
        <View style={styles.emptyState}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={isEditing ? 'Edit Item' : 'Add Item'}
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
                {photoUri ? 'Change Photo' : 'Add Photo'}
              </Text>
              <Text style={[styles.photoSubtitle, { color: theme.subtleText }]}>Tap to upload</Text>
            </View>
          </Card>
        </Pressable>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>Item Name</Text>
          <TextInput
            style={[
              styles.textBox,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: nameError ? theme.danger : theme.border,
                color: theme.text,
              },
            ]}
            placeholder="e.g. Dell XPS 13 Laptop"
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
            label="Category"
            placeholder="Select category"
            value={category}
            icon="chevron-down"
            onPress={() => setCategoryModalVisible(true)}
          />
          <FormRow label="Brand" placeholder="Enter brand" value={brand} onChangeText={setBrand} />
          <FormRow
            label="Purchase Date"
            placeholder="Select date"
            value={formatDate(purchaseDate)}
            icon="calendar-outline"
            onPress={() => setDatePickerVisible(true)}
          />
          <FormRow
            label="Purchase Price"
            placeholder="Enter amount"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
          <FormRow label="Store" placeholder="Enter store name" value={store} onChangeText={setStore} />
          <FormRow
            label="Invoice / Bill"
            placeholder={attachingInvoice ? 'Saving…' : 'Take photo'}
            value={invoiceUri ? 'Photo attached' : undefined}
            icon="camera-outline"
            onPress={handleAttachInvoice}
          />
        </Card>

        {invoiceUri ? (
          <Pressable onPress={handleAttachInvoice} style={styles.invoiceThumbnailRow}>
            <Image source={{ uri: invoiceUri }} style={styles.invoiceThumbnail} />
            <Text style={[styles.invoiceThumbnailLabel, { color: theme.subtleText }]}>
              Invoice photo attached · Tap to retake
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>Warranty (months)</Text>
          <TextInput
            style={[
              styles.textBox,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: warrantyMonthsError ? theme.danger : theme.border,
                color: theme.text,
              },
            ]}
            placeholder="e.g. 12"
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
              {expiryPreview ? `Expires ${expiryPreview}` : 'Expiry date will be calculated automatically'}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>Notes</Text>
          <TextInput
            style={[
              styles.textBox,
              styles.notesBox,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text },
            ]}
            placeholder="Optional notes"
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
            {saving ? 'Saving…' : 'Save Item'}
          </Text>
        </Pressable>
      </Surface>

      <SelectModal
        visible={categoryModalVisible}
        title="Select category"
        options={CATEGORIES}
        selected={category}
        onSelect={setCategory}
        onClose={() => setCategoryModalVisible(false)}
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
  invoiceThumbnailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: -8,
  },
  invoiceThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  invoiceThumbnailLabel: {
    fontSize: 13,
    flexShrink: 1,
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
