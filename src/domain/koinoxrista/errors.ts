/**
 * Domain error for κοινόχρηστα preview/finalize/allocation.
 * API routes map `status` to HTTP.
 */
export class KoinoxristaError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "KoinoxristaError";
    this.status = status;
  }
}

export const MSG_EMPTY_FINALIZE =
  "Δεν υπάρχουν επιμερίσιμα έξοδα για αυτή την περίοδο / No allocatable expenses for this period";

export const MSG_ALREADY_FINALIZED =
  "Η εκκαθάριση έχει ήδη οριστικοποιηθεί για αυτή την περίοδο / Settlement already finalized for this period";

export const MSG_ZERO_WEIGHTS =
  "Δεν μπορούν να επιμεριστούν έξοδα: όλα τα χιλιοστά είναι μηδέν / Cannot allocate: all share weights are zero";

export const MSG_MISSING_HEATING_READINGS =
  "Το κτίριο χρησιμοποιεί μετρητές θέρμανσης· καταχωρήστε ενδείξεις για την περίοδο / Building uses heating meters; enter period readings before allocating heating";
