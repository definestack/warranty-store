import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTranslation } from '../i18n/LocaleContext';
import { useAppTheme } from '../theme/ThemeContext';
import type { ItemDocumentKind, WarrantyDurationUnit } from '../types/warranty';
import Card from './Card';
import FieldLabel from './FieldLabel';

/** The editable fields of one extended warranty, as the edit screen holds them. */
export interface ExtendedWarrantyCardValues {
  provider: string;
  durationValue: string;
  durationUnit: WarrantyDurationUnit;
  startsOn: Date;
  cost: string;
  notes: string;
}

export interface ExtendedWarrantyCardErrors {
  duration?: string | null;
  cost?: string | null;
}

interface ExtendedWarrantyCardProps {
  /** Heading for this entry, e.g. "Extended Warranty" or "Extended Warranty 2". */
  title: string;
  values: ExtendedWarrantyCardValues;
  errors?: ExtendedWarrantyCardErrors;
  /** Read-only, derived from the start date and duration. Formatted for display. */
  endsOnLabel: string;
  startsOnLabel: string;
  onChange: <K extends keyof ExtendedWarrantyCardValues>(
    field: K,
    value: ExtendedWarrantyCardValues[K]
  ) => void;
  onPressStartDate: () => void;
  onPressDurationUnit: () => void;
  onRemove: () => void;
  /**
   * The document strip for one of this entry's two sections. Supplied by the screen so
   * the tiles, their add control and their limit stay in one implementation rather than
   * being reproduced here.
   */
  renderDocuments: (kind: ItemDocumentKind) => ReactNode;
  renderAddAction: (kind: ItemDocumentKind) => ReactNode;
}

export default function ExtendedWarrantyCard({
  title,
  values,
  errors,
  endsOnLabel,
  startsOnLabel,
  onChange,
  onPressStartDate,
  onPressDurationUnit,
  onRemove,
  renderDocuments,
  renderAddAction,
}: ExtendedWarrantyCardProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const unitLabel =
    values.durationUnit === 'years' ? t('addEditItem.durationYears') : t('addEditItem.durationMonths');

  return (
    <Card style={styles.card}>
      <View style={styles.headingRow}>
        <Text style={[styles.heading, { color: theme.text }]}>{title}</Text>
        <Pressable
          hitSlop={8}
          onPress={onRemove}
          accessibilityLabel={t('addEditItem.removeExtendedWarranty')}
        >
          <Ionicons name="trash-outline" size={18} color={theme.danger} />
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.text }]}>{t('addEditItem.provider')}</Text>
        <View
          style={[
            styles.textBoxRow,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
        >
          <TextInput
            style={[styles.textBoxInput, { color: theme.text }]}
            placeholder={t('addEditItem.providerPlaceholder')}
            placeholderTextColor={theme.mutedText}
            value={values.provider}
            onChangeText={(text) => onChange('provider', text)}
          />
          <Ionicons name="business-outline" size={18} color={theme.mutedText} />
        </View>
      </View>

      <View style={styles.field}>
        <FieldLabel label={t('addEditItem.duration')} required style={styles.fieldLabel} />
        <View style={styles.splitRow}>
          <TextInput
            style={[
              styles.textBox,
              styles.splitGrow,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: errors?.duration ? theme.danger : theme.border,
                color: theme.text,
              },
            ]}
            placeholder={t('addEditItem.durationPlaceholder')}
            placeholderTextColor={theme.mutedText}
            value={values.durationValue}
            onChangeText={(text) => onChange('durationValue', text)}
            keyboardType="numeric"
          />
          <Pressable
            onPress={onPressDurationUnit}
            style={[
              styles.textBoxRow,
              styles.unitSelect,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.unitLabel, { color: theme.text }]}>{unitLabel}</Text>
            <Ionicons name="chevron-down" size={16} color={theme.mutedText} />
          </Pressable>
        </View>
        {errors?.duration ? (
          <Text style={[styles.fieldCaption, { color: theme.danger }]}>{errors.duration}</Text>
        ) : null}
      </View>

      <View style={styles.splitRow}>
        <View style={[styles.field, styles.splitGrow]}>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>
            {t('addEditItem.startsOn')}
          </Text>
          <Pressable
            onPress={onPressStartDate}
            style={[
              styles.textBoxRow,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.textBoxInput, { color: theme.text }]}>{startsOnLabel}</Text>
            <Ionicons name="calendar-outline" size={18} color={theme.mutedText} />
          </Pressable>
        </View>

        {/*
          Ends On is derived from the start date and the duration on every write, so it
          is rendered as read-only text. The mockup draws a calendar affordance here to
          mirror the field beside it; reproducing it would let an end date be entered
          directly, which the whole coverage model rests on not being possible.
        */}
        <View style={[styles.field, styles.splitGrow]}>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>{t('addEditItem.endsOn')}</Text>
          <View
            style={[
              styles.textBoxRow,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.textBoxInput, { color: endsOnLabel ? theme.text : theme.mutedText }]}>
              {endsOnLabel || '—'}
            </Text>
          </View>
        </View>
      </View>
      <Text style={[styles.fieldCaption, { color: theme.subtleText }]}>
        {t('addEditItem.endsOnCaption')}
      </Text>

      <View style={styles.field}>
        <FieldLabel
          label={t('addEditItem.cost')}
          suffix={t('addEditItem.extendedWarrantyOptional')}
          style={styles.fieldLabel}
        />
        <View
          style={[
            styles.textBoxRow,
            {
              backgroundColor: theme.surfaceAlt,
              borderColor: errors?.cost ? theme.danger : theme.border,
            },
          ]}
        >
          <Text style={[styles.currency, { color: theme.subtleText }]}>₹</Text>
          <TextInput
            style={[styles.textBoxInput, { color: theme.text }]}
            placeholder={t('addEditItem.enterAmount')}
            placeholderTextColor={theme.mutedText}
            value={values.cost}
            onChangeText={(text) => onChange('cost', text)}
            keyboardType="numeric"
          />
        </View>
        {errors?.cost ? (
          <Text style={[styles.fieldCaption, { color: theme.danger }]}>{errors.cost}</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <FieldLabel
          label={t('addEditItem.notes')}
          suffix={t('addEditItem.extendedWarrantyOptional')}
          style={styles.fieldLabel}
        />
        <TextInput
          style={[
            styles.textBox,
            styles.notesBox,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text },
          ]}
          placeholder={t('addEditItem.extendedNotesPlaceholder')}
          placeholderTextColor={theme.mutedText}
          value={values.notes}
          onChangeText={(text) => onChange('notes', text)}
          multiline
          textAlignVertical="top"
        />
      </View>
      {/*
        The documents live inside this entry's own card rather than a card of their own:
        with several extended warranties on screen, a detached tile leaves it unclear
        which cover its documents belong to.
      */}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderText}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('addEditItem.extendedInvoiceSection')}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.subtleText }]}>
            {t('addEditItem.extendedInvoiceSubtitle')}
          </Text>
        </View>
        {renderAddAction('invoice')}
      </View>
      {renderDocuments('invoice')}

      <View style={[styles.sectionHeaderRow, styles.secondSectionHeader]}>
        <View style={styles.sectionHeaderText}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('addEditItem.extendedDocumentsSection')}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.subtleText }]}>
            {t('addEditItem.extendedDocumentsSubtitle')}
          </Text>
        </View>
        {renderAddAction('warranty')}
      </View>
      {renderDocuments('warranty')}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 15,
    fontWeight: '700',
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  fieldCaption: {
    fontSize: 12,
  },
  textBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textBoxInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  currency: {
    fontSize: 15,
  },
  notesBox: {
    minHeight: 72,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  splitGrow: {
    flex: 1,
  },
  unitSelect: {
    width: 120,
    justifyContent: 'space-between',
  },
  unitLabel: {
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  secondSectionHeader: {
    marginTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
});
