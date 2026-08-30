import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';
import type { ItemDocumentKind } from '../types/warranty';
import type { PeriodStatus } from '../utils/coverage';
import StatusBadge from './StatusBadge';

/** A labelled value shown in the provider / duration / cost row. */
export interface CoverageFact {
  label: string;
  value: string;
}

/** One document section belonging to this period. */
export interface CoverageDocumentSection {
  kind: ItemDocumentKind;
  label: string;
}

export interface CoveragePeriodView {
  /** Stable key: the extended warranty's id, or 'manufacturer'. */
  id: string;
  title: string;
  status: PeriodStatus;
  /** "27 Aug 2026 – 27 Aug 2027" */
  range: string;
  /** "Expires in 363 days" or "Starts in 364 days". */
  countdown: string;
  /** The date the countdown refers to, shown beside it. */
  countdownDate: string;
  /** Empty for the manufacturer period, which records none of these. */
  facts: CoverageFact[];
  sections: CoverageDocumentSection[];
}

interface CoveragePeriodCardProps {
  period: CoveragePeriodView;
  /** True for every entry but the last, which stops the timeline rail. */
  showRail: boolean;
  renderDocuments: (period: CoveragePeriodView, section: CoverageDocumentSection) => ReactNode;
}

/**
 * One entry in the Warranty Coverage timeline. The manufacturer warranty and every
 * extended warranty render through this same component — the manufacturer period is not a
 * special case, it simply arrives with no facts.
 */
export default function CoveragePeriodCard({
  period,
  showRail,
  renderDocuments,
}: CoveragePeriodCardProps) {
  const theme = useAppTheme();
  const isManufacturer = period.id === 'manufacturer';

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View
          style={[
            styles.railIcon,
            { backgroundColor: isManufacturer ? theme.success : theme.primary },
          ]}
        >
          <Ionicons
            name={isManufacturer ? 'shield-checkmark' : 'shield'}
            size={13}
            color="#ffffff"
          />
        </View>
        {showRail ? <View style={[styles.railLine, { backgroundColor: theme.border }]} /> : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]}>{period.title}</Text>
          <StatusBadge status={period.status} />
        </View>

        <Text style={[styles.range, { color: theme.text }]}>{period.range}</Text>
        <Text style={[styles.countdown, { color: theme.subtleText }]}>
          {period.countdown} ·{' '}
          <Text style={{ color: theme.primary }}>{period.countdownDate}</Text>
        </Text>

        {period.facts.length > 0 ? (
          <View style={styles.factRow}>
            {period.facts.map((fact) => (
              <View key={fact.label} style={styles.fact}>
                <Text style={[styles.factLabel, { color: theme.subtleText }]}>{fact.label}</Text>
                <Text style={[styles.factValue, { color: theme.text }]}>{fact.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {period.sections.map((section) => (
          <View key={section.kind} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>{section.label}</Text>
            {renderDocuments(period, section)}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rail: {
    alignItems: 'center',
    width: 24,
  },
  railIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railLine: {
    flex: 1,
    width: 2,
    marginTop: 4,
    borderRadius: 1,
  },
  body: {
    flex: 1,
    gap: 4,
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  range: {
    fontSize: 13,
  },
  countdown: {
    fontSize: 12,
  },
  factRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  fact: {
    flex: 1,
    gap: 2,
  },
  factLabel: {
    fontSize: 12,
  },
  factValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    gap: 8,
    marginTop: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
});
