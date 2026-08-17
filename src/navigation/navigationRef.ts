import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from '../types/navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Navigates to an item's detail screen, e.g. from a tapped notification. No-ops if the nav tree isn't mounted yet. */
export function navigateToItemDetail(itemId: string): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('ItemDetail', { itemId });
  }
}
