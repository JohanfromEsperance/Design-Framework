export type BookingStatus = "paid" | "partial" | "outstanding";

export type AdvBookingType =
  | "caravan_park"
  | "national_park"
  | "ferry"
  | "event"
  | "tour"
  | "accommodation"
  | "other";

export interface AdvanceBooking {
  id: string;
  name: string;
  type: AdvBookingType;
  stayDate: string;
  checkoutDate: string;
  cost: number;
  amountPaid: number;
  confirmationNumber: string;
  tripName: string;
  notes: string;
}

export const ADV_TYPE_LABELS: Record<AdvBookingType, string> = {
  caravan_park:  "Caravan Park",
  national_park: "National Park",
  ferry:         "Ferry",
  event:         "Event",
  tour:          "Tour",
  accommodation: "Accommodation",
  other:         "Other",
};

export const ADV_TYPE_COLORS: Record<AdvBookingType, string> = {
  caravan_park:  "bg-[#d9b880]/15 text-[#b8943e] border-[#d9b880]/30",
  national_park: "bg-emerald-600/10 text-emerald-700 border-emerald-200",
  ferry:         "bg-blue-500/10 text-blue-700 border-blue-200",
  event:         "bg-purple-500/10 text-purple-700 border-purple-200",
  tour:          "bg-orange-500/10 text-orange-700 border-orange-200",
  accommodation: "bg-primary/10 text-primary border-primary/20",
  other:         "bg-muted text-muted-foreground border-border",
};

export function bookingStatus(b: AdvanceBooking): BookingStatus {
  if (b.cost <= 0 || b.amountPaid >= b.cost) return "paid";
  if (b.amountPaid > 0) return "partial";
  return "outstanding";
}

export function outstandingAmount(b: AdvanceBooking): number {
  return Math.max(0, b.cost - b.amountPaid);
}

const STORAGE_KEY = "advance_bookings_global_v1";

export function loadAdvanceBookings(): AdvanceBooking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdvanceBooking[]) : [];
  } catch {
    return [];
  }
}

export function saveAdvanceBookings(bookings: AdvanceBooking[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}
