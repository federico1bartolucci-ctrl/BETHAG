export async function applyCapLookupResponse({
  input,
  city,
  province,
  requestedCap,
  cityValueAtRequest,
  provinceValueAtRequest,
  lookupSequence,
  getCurrentLookupSequence,
  fetcher,
  setNativeInputValue,
  sentenceCase,
}) {
  const response = await fetcher("https://api.zippopotam.us/IT/" + encodeURIComponent(requestedCap));
  if (!response.ok) return false;
  const data = await response.json();
  const place = Array.isArray(data.places) ? data.places[0] : null;
  if (!place) return false;
  if (!input.isConnected || input.value !== requestedCap || getCurrentLookupSequence() !== lookupSequence) return false;
  if (city && city.isConnected && city.value === cityValueAtRequest && place["place name"]) {
    setNativeInputValue(city, sentenceCase(String(place["place name"])));
  }
  if (province && province.isConnected && province.value === provinceValueAtRequest && place["state abbreviation"]) {
    setNativeInputValue(province, String(place["state abbreviation"]).toLocaleUpperCase("it-IT").slice(0, 2));
  }
  return true;
}
