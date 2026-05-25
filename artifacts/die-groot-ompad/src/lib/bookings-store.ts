export type BookingType =
  | "free_camp"
  | "national_park"
  | "caravan_park"
  | "holiday_park"
  | "station_stay"
  | "bush_camp"
  | "rest_area";

export interface SiteLink {
  id: string;
  label: string;
  url: string;
}

export interface SitePhoto {
  id: string;
  name: string;
  data: string;
}

export interface Booking {
  id: string;
  legId?: string;
  legLabel?: string;
  parkName: string;
  type: BookingType;
  dateFrom: string;
  dateTo: string;
  nights: number;
  cost: number;
  confirmationNumber: string;
  membershipUsed: string;
  location: string;
  notes: string;
  receiptName?: string;
  receiptData?: string;
  siteUrl?: string;
  links?: SiteLink[];
  referencePhotos?: SitePhoto[];
}

export const TYPE_LABELS: Record<BookingType, string> = {
  free_camp: "Free Camp",
  national_park: "National Park",
  caravan_park: "Caravan Park",
  holiday_park: "Holiday Park",
  station_stay: "Station Stay",
  bush_camp: "Bush Camp",
  rest_area: "Rest Area",
};

export const TYPE_COLORS: Record<BookingType, string> = {
  free_camp: "bg-primary/10 text-primary",
  national_park: "bg-emerald-600/10 text-emerald-700",
  caravan_park: "bg-[#d9b880]/20 text-[#b8943e]",
  holiday_park: "bg-blue-500/10 text-blue-700",
  station_stay: "bg-orange-500/10 text-orange-700",
  bush_camp: "bg-lime-600/10 text-lime-700",
  rest_area: "bg-muted text-muted-foreground",
};

export const EMPTY_BOOKING: Omit<Booking, "id"> = {
  parkName: "",
  type: "caravan_park",
  dateFrom: "",
  dateTo: "",
  nights: 1,
  cost: 0,
  confirmationNumber: "",
  membershipUsed: "",
  location: "",
  notes: "",
  siteUrl: "",
  links: [],
  referencePhotos: [],
};

const STORAGE_KEY = (tripId: number) => `bookings_trip_${tripId}`;

export function loadBookings(tripId: number): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(tripId));
    return raw ? (JSON.parse(raw) as Booking[]) : [];
  } catch {
    return [];
  }
}

export function saveBookings(tripId: number, bookings: Booking[]): void {
  localStorage.setItem(STORAGE_KEY(tripId), JSON.stringify(bookings));
}

export function nightsBetween(from: string, to: string): number {
  if (!from || !to) return 1;
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export function googleMapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location + ", Australia")}`;
}

export function isValidUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

export function normaliseUrl(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return "https://" + trimmed;
}
