import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../utils/colors';
import type { MainTabParamList, RootStackParamList } from '../types/navigation';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

// Placeholder data until item list is backed by the SQLite repository.
const PLACEHOLDER_ITEMS = [
  { id: '1', name: 'Refrigerator' },
  { id: '2', name: 'Washing Machine' },
  { id: '3', name: 'Laptop' },
];

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <FlatList
        data={PLACEHOLDER_ITEMS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
          >
            <Text style={styles.rowText}>{item.name}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No warranty items yet.</Text>}
      />
      <Pressable
        style={styles.addButton}
        onPress={() => navigation.navigate('AddEditItem', {})}
      >
        <Text style={styles.addButtonText}>+ Add Item</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  row: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowText: {
    fontSize: 16,
    color: colors.text,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    color: colors.subtleText,
  },
  addButton: {
    minHeight: 56,
    margin: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
});
