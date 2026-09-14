export type Retailer = {
  id: string;
  name: string;
  postcode: string;
  town: string;
  address: string;
  note?: string;
  website?: string;
};

export function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase("de-CH")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ae/g, "a")
    .replace(/oe/g, "o")
    .replace(/ue/g, "u")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function filterRetailers(retailers: Retailer[], query: string) {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return retailers.filter((retailer) => {
    const searchable = normalizeSearch(
      `${retailer.name} ${retailer.postcode} ${retailer.town} ${retailer.address}`,
    );
    return tokens.every((token) => searchable.includes(token));
  });
}

export function directionsUrl(retailer: Retailer) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${retailer.address}, ${retailer.postcode} ${retailer.town}, Schweiz`)}`;
}
