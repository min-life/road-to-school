export const navigationMetrics = {
  headerMinHeight: 72,
  actionSize: 48,
  iconSize: 22,
  tabContentHeight: 66,
  minimumBottomInset: 8,
  tabLabelSize: 11,
} as const;

export function getTabBarMetrics(bottomInset: number, fontScale: number) {
  const paddingBottom = Math.max(bottomInset, navigationMetrics.minimumBottomInset);
  return { height: navigationMetrics.tabContentHeight + paddingBottom + Math.ceil(15 * Math.max(0, fontScale - 1)), paddingBottom };
}

/** Only hide navigation when an editable field loses actual viewport space. */
export function isNavigationOccluded(editing: boolean, availableHeight: number, viewportBottom: number) {
  return editing && viewportBottom < availableHeight - 1;
}
