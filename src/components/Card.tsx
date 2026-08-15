import { StyleSheet, View } from 'react-native';
import type { ViewProps } from 'react-native';

import Surface from './Surface';

export default function Card({ style, ...props }: ViewProps) {
  return (
    <View style={styles.shadowWrapper}>
      <Surface style={[styles.card, style]} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  card: {
    borderRadius: 14,
  },
});
