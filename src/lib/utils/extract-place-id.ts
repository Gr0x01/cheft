export function extractPlaceIdFromUrl(url: string): string | null {
  try {
    const chIJMatch = url.match(/ChIJ[\w-]+/);
    if (chIJMatch) {
      return chIJMatch[0];
    }

    const placeIdMatch = url.match(/place_id=([^&]+)/);
    if (placeIdMatch) {
      return decodeURIComponent(placeIdMatch[1]);
    }

    const dataParam = url.match(/data=([^&]+)/);
    if (dataParam) {
      const decodedData = decodeURIComponent(dataParam[1]);
      const placeIdInData = decodedData.match(/ChIJ[\w-]+/);
      if (placeIdInData) {
        return placeIdInData[0];
      }
    }

    const hexMatch = url.match(/0x[0-9a-f]+:0x[0-9a-f]+/i);
    if (hexMatch) {
      return hexMatch[0];
    }

    return null;
  } catch {
    return null;
  }
}
