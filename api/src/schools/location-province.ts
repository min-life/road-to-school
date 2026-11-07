/** VIETMAP Reverse v4 returns the province/city in boundaries[type=0]. */
export async function locationForCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): Promise<{
  province: string | null;
  provinceId: string | null;
  wardId: string | null;
  ward: string | null;
  addressText: string | null;
}> {
  const unknown = {
    province: null,
    provinceId: null,
    wardId: null,
    ward: null,
    addressText: null,
  };
  const key = process.env.VIETMAP_SERVICES_KEY;
  if (
    !key ||
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  )
    return unknown;
  const url = new URL('https://maps.vietmap.vn/api/reverse/v4');
  url.searchParams.set('apikey', key);
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lng', String(longitude));
  url.searchParams.set('display_type', '5');
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return unknown;
    const data: unknown = await response.json();
    const first = Array.isArray(data) ? data[0] : null;
    const boundary = Array.isArray(first?.boundaries)
      ? first.boundaries.find((item: { type?: number }) => item.type === 0)
      : null;
    const province =
      boundary?.full_name ?? boundary?.name ?? first?.province ?? first?.city;
    const wardBoundary = Array.isArray(first?.boundaries)
      ? first.boundaries.find((item: { type?: number }) => item.type === 2)
      : null;
    const identifier = (value: unknown): string | null =>
      (typeof value === 'number' && Number.isFinite(value)) ||
      (typeof value === 'string' && value.trim())
        ? String(value).trim()
        : null;
    const ward = wardBoundary?.full_name ?? wardBoundary?.name;
    const address = first?.display ?? first?.address;
    return {
      provinceId: identifier(boundary?.id),
      wardId: identifier(wardBoundary?.id),
      ward: typeof ward === 'string' && ward.trim() ? ward.trim() : null,
      province:
        typeof province === 'string' && province.trim()
          ? province.trim().slice(0, 100)
          : null,
      addressText:
        typeof address === 'string' && address.trim() ? address.trim() : null,
    };
  } catch {
    return unknown;
  }
}

/** Persist only administrative metadata; never replace the user's address text. */
export async function administrativeLocationForCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
) {
  const { province, provinceId, wardId, ward } = await locationForCoordinates(
    latitude,
    longitude,
  );
  return { province, provinceId, wardId, ward };
}

export async function provinceForCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): Promise<string | null> {
  return (await locationForCoordinates(latitude, longitude)).province;
}
