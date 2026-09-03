/**
 * Whether the tab bar's add FAB belongs on screen.
 *
 * Home draws its own "Add Product" button while nothing is tracked yet, so the FAB
 * stands down there to leave a single, obvious way in. Every other tab keeps it —
 * they have no add button of their own.
 */
export function shouldShowAddFab(routeName: string, itemCount: number): boolean {
  return !(routeName === 'Home' && itemCount === 0);
}
