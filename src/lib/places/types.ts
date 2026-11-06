/** One line in the place search dropdown. */
export type PlaceSuggestion = {
  placeId: string;
  /** "Dorothea Dix Park" */
  mainText: string;
  /** "Raleigh, NC, USA" */
  secondaryText: string;
};

/** What the form receives after the photographer picks a suggestion. */
export type PickedPlace = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** IANA zone found from the coordinates, or null if the lookup failed. */
  timeZone: string | null;
};
