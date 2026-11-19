export const siteMarkers = {
  depot: '/map-markers/marker-depot.svg',
  school: '/map-markers/marker-school.svg',
  student: '/map-markers/marker-student.svg',
} as const;

export type SiteMarkerKind = keyof typeof siteMarkers;
export const siteMarkerWidth = 40;
export const siteMarkerHeight = 48;
export const siteMarkerOffset: [number, number] = [0, 1];

export function siteMarkerSize(kind: SiteMarkerKind) {
  return kind === 'student' ? { width: 30, height: 36 } : { width: siteMarkerWidth, height: siteMarkerHeight };
}

export function createSiteMarkerElement(kind: SiteMarkerKind, label?: string) {
  const element = document.createElement('div');
  element.className = 'rts-site-picker-marker';
  const image = document.createElement('img');
  image.src = siteMarkers[kind];
  const { width, height } = siteMarkerSize(kind);
  image.width = width;
  image.height = height;
  image.alt = kind === 'depot' ? 'Bãi xe' : kind === 'school' ? 'Trường học' : 'Học sinh';
  image.draggable = false;
  element.append(image);
  if (label) {
    const caption = document.createElement('span');
    caption.className = 'rts-site-picker-label';
    caption.textContent = label;
    element.append(caption);
  }
  return element;
}
