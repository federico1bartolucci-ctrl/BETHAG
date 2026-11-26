function normalizeLastModified(value, key) {
  if (value === null || value === undefined) {
    throw new Error("Source object listing omitted a valid LastModified timestamp for " + JSON.stringify(key));
  }
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Source object listing omitted a valid LastModified timestamp for " + JSON.stringify(key));
  }
  return date.toISOString();
}

export function sourceObjectSignature(items) {
  if (!Array.isArray(items)) {
    throw new TypeError("Source object listing must be an array");
  }

  const signature = items
    .filter((item) => typeof item?.Key === "string" && item.Key.length > 0 && !item.Key.endsWith("/"))
    .map((item) => {
      if (item.Size === null || item.Size === undefined) {
        throw new Error("Source object listing omitted a valid size for " + JSON.stringify(item.Key));
      }
      const size = Number(item.Size);
      if (!Number.isSafeInteger(size) || size < 0) {
        throw new Error("Source object listing omitted a valid size for " + JSON.stringify(item.Key));
      }
      return [item.Key, size, item.ETag || null, normalizeLastModified(item.LastModified, item.Key)];
    })
    .sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

  return JSON.stringify(signature);
}
