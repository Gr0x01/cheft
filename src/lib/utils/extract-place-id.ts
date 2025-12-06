export function extractPlaceIdFromUrl(url: string): string | null {
  try {
    const placeIdMatch = url.match(/0x[0-9a-f]+:0x[0-9a-f]+/i);
    if (placeIdMatch) {
      return placeIdMatch[0];
    }

    const dataParam = url.match(/data=([^&]+)/);
    if (dataParam) {
      const decodedData = decodeURIComponent(dataParam[1]);
      const placeIdInData = decodedData.match(/0x[0-9a-f]+:0x[0-9a-f]+/i);
      if (placeIdInData) {
        return placeIdInData[0];
      }
    }

    return null;
  } catch {
    return null;
  }
}
