/**
 * Typed fetch wrappers for operator UI.
 * Fail gracefully when APIs return 404/501 or are unreachable.
 */

import type {
  AlertListItem,
  ApartmentSharesItem,
  BuildingSummary,
  CollectionsResponse,
  CreateReceiptResponse,
  CreateTransactionBody,
  CreateTransactionResponse,
  ExpenseCategoryItem,
  KoinoxristaPreview,
  MeterReadingsResponse,
  PatchAlertBody,
  PayChargeResponse,
  PortalPayload,
  ReceiptDetail,
  RecurringExpenseItem,
  RecurringExpensesResponse,
  TransactionListItem,
} from "@/lib/api-types";

export type ApiResult<T> =
  | { ok: true; data: T; pending?: false }
  | { ok: false; pending: true; message: string; data: T }
  | { ok: false; pending: false; message: string; data: T };

/** Seed-friendly fallback matching prisma/seed.ts */
export const SEED_BUILDINGS: BuildingSummary[] = [
  {
    id: "seed-building-kolonaki",
    name: "Κολωνάκι 12",
    address: "Σκουφά 12, Αθήνα",
    heatingAllocation: "METER_READINGS",
  },
  {
    id: "seed-building-pangrati",
    name: "Παγκράτι 8",
    address: "Υμηττού 8, Αθήνα",
    heatingAllocation: "FIXED_SHARES",
  },
  {
    id: "seed-building-kypseli",
    name: "Κυψέλη 22",
    address: "Πατησίων 22, Αθήνα",
    heatingAllocation: "FIXED_SHARES",
  },
  {
    id: "seed-building-glyfada",
    name: "Γλυφάδα 5",
    address: "Γρ. Λαμπράκη 5, Γλυφάδα",
    heatingAllocation: "FIXED_SHARES",
  },
  {
    id: "seed-building-thessaloniki",
    name: "Θεσσαλονίκη — Τσιμισκή 40",
    address: "Τσιμισκή 40, Θεσσαλονίκη",
    heatingAllocation: "FIXED_SHARES",
  },
  {
    id: "seed-building-patra",
    name: "Πάτρα — Ρήγα Φεραίου 15",
    address: "Ρήγα Φεραίου 15, Πάτρα",
    heatingAllocation: "FIXED_SHARES",
  },
];

const RECEIPT_DRAFT_PREFIX = "polykatoikia:receipt-draft:";

export type ReceiptDraft = CreateReceiptResponse & {
  fileName?: string;
};

export function saveReceiptDraft(draft: ReceiptDraft): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    `${RECEIPT_DRAFT_PREFIX}${draft.id}`,
    JSON.stringify(draft),
  );
}

export function loadReceiptDraft(id: string): ReceiptDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(`${RECEIPT_DRAFT_PREFIX}${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReceiptDraft;
  } catch {
    return null;
  }
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function pendingResult<T>(data: T, message = "API pending"): ApiResult<T> {
  return { ok: false, pending: true, message, data };
}

function errorResult<T>(data: T, message: string): ApiResult<T> {
  return { ok: false, pending: false, message, data };
}

function messageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as { error: unknown }).error;
    if (typeof err === "string" && err.trim()) return err;
  }
  return fallback;
}

/**
 * Map HTTP failures. Only 501 = "API not implemented yet" (pending badge).
 * 401/403/404/4xx/5xx surface as real errors — never mask as pending.
 */
function failureFromStatus<T>(
  status: number,
  body: unknown,
  data: T,
  label: string,
): ApiResult<T> {
  if (status === 501) {
    return pendingResult(data, messageFromBody(body, `${label} ${status}`));
  }
  if (status === 401) {
    return errorResult(
      data,
      messageFromBody(body, "Απαιτείται σύνδεση (Unauthorized)"),
    );
  }
  if (status === 403) {
    return errorResult(
      data,
      messageFromBody(body, "Δεν έχετε δικαίωμα πρόσβασης"),
    );
  }
  return errorResult(data, messageFromBody(body, `${label} ${status}`));
}

export async function fetchBuildings(): Promise<ApiResult<BuildingSummary[]>> {
  try {
    const res = await fetch("/api/buildings", { method: "GET" });
    if (res.status === 501) {
      return pendingResult(SEED_BUILDINGS);
    }
    if (!res.ok) {
      const body = await parseJsonSafe(res);
      // Do not invent seed buildings on 401/404 — that sends operators to a
      // fake id with empty shares / κοινόχρηστα.
      return failureFromStatus(res.status, body, [] as BuildingSummary[], "Buildings API");
    }
    const json = (await parseJsonSafe(res)) as
      | BuildingSummary[]
      | { buildings: BuildingSummary[] }
      | null;
    const list = Array.isArray(json)
      ? json
      : json && "buildings" in json
        ? json.buildings
        : [];
    return { ok: true, data: list };
  } catch {
    return pendingResult(SEED_BUILDINGS);
  }
}

export async function createBuilding(body: {
  name: string;
  address?: string | null;
  heatingAllocation?: "FIXED_SHARES" | "METER_READINGS";
}): Promise<ApiResult<BuildingSummary | null>> {
  try {
    const res = await fetch("/api/buildings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 404 || res.status === 501) {
      return pendingResult(null);
    }
    if (!res.ok) {
      const err = await parseJsonSafe(res);
      const message =
        err && typeof err === "object" && "error" in err
          ? String((err as { error: unknown }).error)
          : `Create failed (${res.status})`;
      return errorResult(null, message);
    }
    const json = (await parseJsonSafe(res)) as { building: BuildingSummary };
    return { ok: true, data: json.building };
  } catch {
    return pendingResult(null);
  }
}

export async function patchBuilding(body: {
  id: string;
  name?: string;
  address?: string | null;
  heatingAllocation?: "FIXED_SHARES" | "METER_READINGS";
}): Promise<ApiResult<BuildingSummary | null>> {
  try {
    const res = await fetch("/api/buildings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 404 || res.status === 501) {
      return pendingResult(null);
    }
    if (!res.ok) {
      const err = await parseJsonSafe(res);
      const message =
        err && typeof err === "object" && "error" in err
          ? String((err as { error: unknown }).error)
          : `Update failed (${res.status})`;
      return errorResult(null, message);
    }
    const json = (await parseJsonSafe(res)) as { building: BuildingSummary };
    return { ok: true, data: json.building };
  } catch {
    return pendingResult(null);
  }
}

export async function uploadReceipt(input: {
  file: File;
  buildingId: string;
}): Promise<ApiResult<CreateReceiptResponse | null>> {
  try {
    const body = new FormData();
    body.append("file", input.file);
    body.append("buildingId", input.buildingId);
    const res = await fetch("/api/receipts", { method: "POST", body });
    if (res.status === 404 || res.status === 501) {
      return pendingResult(null);
    }
    if (!res.ok) {
      const err = await parseJsonSafe(res);
      const message =
        err && typeof err === "object" && "error" in err
          ? String((err as { error: unknown }).error)
          : `Upload failed (${res.status})`;
      return errorResult(null, message);
    }
    const data = (await parseJsonSafe(res)) as CreateReceiptResponse;
    return { ok: true, data };
  } catch {
    return pendingResult(null);
  }
}

export async function fetchReceipt(
  id: string,
): Promise<ApiResult<ReceiptDetail | null>> {
  try {
    const res = await fetch(`/api/receipts/${id}`, { method: "GET" });
    if (res.status === 404 || res.status === 501) {
      return pendingResult(null);
    }
    if (!res.ok) {
      return errorResult(null, `Receipt ${res.status}`);
    }
    const data = (await parseJsonSafe(res)) as ReceiptDetail;
    return { ok: true, data };
  } catch {
    return pendingResult(null);
  }
}

export async function createTransaction(
  body: CreateTransactionBody,
): Promise<ApiResult<CreateTransactionResponse | null>> {
  try {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 404 || res.status === 501) {
      return pendingResult(null);
    }
    if (!res.ok) {
      const err = await parseJsonSafe(res);
      const message =
        err && typeof err === "object" && "error" in err
          ? String((err as { error: unknown }).error)
          : `Transaction failed (${res.status})`;
      return errorResult(null, message);
    }
    const data = (await parseJsonSafe(res)) as CreateTransactionResponse;
    return { ok: true, data };
  } catch {
    return pendingResult(null);
  }
}

export async function fetchBuildingTransactions(
  buildingId: string,
): Promise<ApiResult<TransactionListItem[]>> {
  try {
    const res = await fetch(`/api/buildings/${buildingId}/transactions`, {
      method: "GET",
    });
    if (!res.ok) {
      const body = await parseJsonSafe(res);
      return failureFromStatus(res.status, body, [], "Transactions API");
    }
    const json = (await parseJsonSafe(res)) as
      | TransactionListItem[]
      | { transactions: TransactionListItem[] }
      | null;
    const list = Array.isArray(json)
      ? json
      : json && "transactions" in json
        ? json.transactions
        : [];
    return { ok: true, data: list };
  } catch {
    return pendingResult([]);
  }
}

export async function fetchAlerts(): Promise<ApiResult<AlertListItem[]>> {
  try {
    const res = await fetch("/api/alerts", { method: "GET" });
    if (!res.ok) {
      const body = await parseJsonSafe(res);
      return failureFromStatus(res.status, body, [], "Alerts API");
    }
    const json = (await parseJsonSafe(res)) as
      | AlertListItem[]
      | { alerts: AlertListItem[] }
      | null;
    const list = Array.isArray(json)
      ? json
      : json && "alerts" in json
        ? json.alerts
        : [];
    return { ok: true, data: list };
  } catch {
    return pendingResult([]);
  }
}

export async function patchAlert(
  id: string,
  body: PatchAlertBody,
): Promise<ApiResult<{ id: string; status: string } | null>> {
  try {
    const res = await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 404 || res.status === 501) {
      return pendingResult(null);
    }
    if (!res.ok) {
      return errorResult(null, `Alert update failed (${res.status})`);
    }
    const json = await parseJsonSafe(res);
    // PATCH /api/alerts/:id returns `{ alert: { id, status, … } }`
    const alert =
      json &&
      typeof json === "object" &&
      "alert" in json &&
      (json as { alert: unknown }).alert &&
      typeof (json as { alert: unknown }).alert === "object"
        ? ((json as { alert: { id: string; status: string } }).alert)
        : (json as { id: string; status: string } | null);
    if (!alert || typeof alert.id !== "string") {
      return errorResult(null, "Unexpected alert PATCH response");
    }
    return { ok: true, data: { id: alert.id, status: String(alert.status) } };
  } catch {
    return pendingResult(null);
  }
}

export function severityRank(severity: string): number {
  if (severity === "HIGH") return 0;
  if (severity === "MEDIUM") return 1;
  return 2;
}

export function txHasMismatch(tx: TransactionListItem): boolean {
  if (tx.mismatchJustification) return true;
  return Boolean(tx.alerts?.some((a) => a.type === "OCR_MISMATCH"));
}

export function txHasAnomaly(tx: TransactionListItem): boolean {
  return Boolean(tx.alerts?.some((a) => a.type === "ANOMALY"));
}

export async function fetchBuildingApartments(
  buildingId: string,
): Promise<
  ApiResult<{
    apartments: ApartmentSharesItem[];
    totals: {
      shareBps: number;
      elevatorShareBps: number;
      heatingShareBps: number;
    };
  }>
> {
  const empty = {
    apartments: [] as ApartmentSharesItem[],
    totals: { shareBps: 0, elevatorShareBps: 0, heatingShareBps: 0 },
  };
  try {
    const res = await fetch(`/api/buildings/${buildingId}/apartments`, {
      method: "GET",
    });
    if (!res.ok) {
      const err = await parseJsonSafe(res);
      return failureFromStatus(res.status, err, empty, "Apartments API");
    }
    const json = (await parseJsonSafe(res)) as {
      apartments: ApartmentSharesItem[];
      totals: {
        shareBps: number;
        elevatorShareBps: number;
        heatingShareBps: number;
      };
    };
    return {
      ok: true,
      data: {
        apartments: json.apartments ?? [],
        totals: json.totals ?? empty.totals,
      },
    };
  } catch {
    return pendingResult(empty);
  }
}

export async function createApartment(
  buildingId: string,
  body: {
    label: string;
    shareBps?: number;
    elevatorShareBps?: number;
    heatingShareBps?: number;
    floor?: number | null;
    owner?: {
      name?: string;
      email?: string | null;
      phone?: string | null;
    };
  },
): Promise<ApiResult<ApartmentSharesItem | null>> {
  try {
    const res = await fetch(`/api/buildings/${buildingId}/apartments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 404 || res.status === 501) {
      return pendingResult(null);
    }
    if (!res.ok) {
      const err = await parseJsonSafe(res);
      const message =
        err && typeof err === "object" && "error" in err
          ? String((err as { error: unknown }).error)
          : `Create failed (${res.status})`;
      return errorResult(null, message);
    }
    const json = (await parseJsonSafe(res)) as {
      apartment: ApartmentSharesItem;
    };
    return { ok: true, data: json.apartment };
  } catch {
    return pendingResult(null);
  }
}

export async function patchApartmentShares(
  buildingId: string,
  body: {
    apartmentId: string;
    shareBps?: number;
    elevatorShareBps?: number;
    heatingShareBps?: number;
    floor?: number | null;
    owner?: {
      name?: string;
      email?: string | null;
      phone?: string | null;
    };
  },
): Promise<ApiResult<ApartmentSharesItem | null>> {
  try {
    const res = await fetch(`/api/buildings/${buildingId}/apartments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 404 || res.status === 501) {
      return pendingResult(null);
    }
    if (!res.ok) {
      const err = await parseJsonSafe(res);
      const message =
        err && typeof err === "object" && "error" in err
          ? String((err as { error: unknown }).error)
          : `Update failed (${res.status})`;
      return errorResult(null, message);
    }
    const json = (await parseJsonSafe(res)) as {
      apartment: ApartmentSharesItem;
    };
    return { ok: true, data: json.apartment };
  } catch {
    return pendingResult(null);
  }
}

export async function fetchExpenseCategories(): Promise<
  ApiResult<ExpenseCategoryItem[]>
> {
  try {
    const res = await fetch("/api/expense-categories", { method: "GET" });
    if (!res.ok) {
      const body = await parseJsonSafe(res);
      return failureFromStatus(res.status, body, [], "Categories API");
    }
    const json = (await parseJsonSafe(res)) as {
      categories: ExpenseCategoryItem[];
    };
    return { ok: true, data: json.categories ?? [] };
  } catch {
    return pendingResult([]);
  }
}

export async function patchExpenseCategory(body: {
  id: string;
  allocationMethod: ExpenseCategoryItem["allocationMethod"];
}): Promise<ApiResult<ExpenseCategoryItem | null>> {
  try {
    const res = await fetch("/api/expense-categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 404 || res.status === 501) {
      return pendingResult(null);
    }
    if (!res.ok) {
      return errorResult(null, `Category update failed (${res.status})`);
    }
    const json = (await parseJsonSafe(res)) as { category: ExpenseCategoryItem };
    return { ok: true, data: json.category };
  } catch {
    return pendingResult(null);
  }
}

export async function fetchKoinoxristaPreview(
  buildingId: string,
  year: number,
  month: number,
): Promise<ApiResult<KoinoxristaPreview | null>> {
  try {
    const res = await fetch(
      `/api/buildings/${buildingId}/koinoxrista?year=${year}&month=${month}`,
      { method: "GET" },
    );
    if (!res.ok) {
      const body = await parseJsonSafe(res);
      return failureFromStatus(res.status, body, null, "Κοινόχρηστα API");
    }
    const data = (await parseJsonSafe(res)) as KoinoxristaPreview;
    return { ok: true, data };
  } catch {
    return errorResult(null, "Αποτυχία σύνδεσης με το API κοινοχρήστων");
  }
}

/** Download URL for multi-page κοινόχρηστα PDF (summary + per apartment). */
export function koinoxristaPdfUrl(
  buildingId: string,
  year: number,
  month: number,
): string {
  return `/api/buildings/${buildingId}/koinoxrista/pdf?year=${year}&month=${month}`;
}

export async function finalizeKoinoxrista(
  buildingId: string,
  year: number,
  month: number,
): Promise<
  ApiResult<{
    settlementId: string;
    totalCents: number;
    chargeTransactionIds: string[];
  } | null>
> {
  try {
    const res = await fetch(`/api/buildings/${buildingId}/koinoxrista`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month }),
    });
    if (res.status === 404 || res.status === 501) {
      return pendingResult(null);
    }
    if (!res.ok) {
      const err = await parseJsonSafe(res);
      const message =
        err && typeof err === "object" && "error" in err
          ? String((err as { error: unknown }).error)
          : `Finalize failed (${res.status})`;
      return errorResult(null, message);
    }
    const data = (await parseJsonSafe(res)) as {
      settlementId: string;
      totalCents: number;
      chargeTransactionIds: string[];
    };
    return { ok: true, data };
  } catch {
    return pendingResult(null);
  }
}

export async function fetchMeterReadings(
  buildingId: string,
  year: number,
  month: number,
): Promise<ApiResult<MeterReadingsResponse | null>> {
  try {
    const res = await fetch(
      `/api/buildings/${buildingId}/meter-readings?year=${year}&month=${month}`,
      { method: "GET" },
    );
    if (!res.ok) {
      const body = await parseJsonSafe(res);
      return failureFromStatus(res.status, body, null, "Ενδείξεις API");
    }
    const data = (await parseJsonSafe(res)) as MeterReadingsResponse;
    return { ok: true, data };
  } catch {
    return errorResult(null, "Αποτυχία σύνδεσης με το API ενδείξεων");
  }
}

export async function putMeterReadings(
  buildingId: string,
  year: number,
  month: number,
  readings: Array<{ apartmentId: string; units: number }>,
): Promise<ApiResult<{ year: number; month: number; count: number } | null>> {
  try {
    const res = await fetch(`/api/buildings/${buildingId}/meter-readings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, readings }),
    });
    if (res.status === 404 || res.status === 501) {
      return pendingResult(null);
    }
    if (!res.ok) {
      const err = await parseJsonSafe(res);
      const message =
        err && typeof err === "object" && "error" in err
          ? String((err as { error: unknown }).error)
          : `Save failed (${res.status})`;
      return errorResult(null, message);
    }
    const data = (await parseJsonSafe(res)) as {
      year: number;
      month: number;
      readings: unknown[];
    };
    return {
      ok: true,
      data: {
        year: data.year,
        month: data.month,
        count: data.readings?.length ?? readings.length,
      },
    };
  } catch {
    return pendingResult(null);
  }
}

export const ALLOCATION_METHOD_LABELS: Record<
  ExpenseCategoryItem["allocationMethod"],
  string
> = {
  GENERAL_SHARES: "Γενικά χιλιοστά",
  ELEVATOR_SHARES: "Χιλιοστά ανελκυστήρα",
  HEATING_SHARES: "Χιλιοστά θέρμανσης",
  EQUAL: "Ισόποσα",
  MANUAL: "Χειροκίνητα",
};

export async function fetchCollections(
  buildingId: string,
  year?: number,
  month?: number,
): Promise<ApiResult<CollectionsResponse | null>> {
  try {
    const qs = new URLSearchParams();
    if (year != null) qs.set("year", String(year));
    if (month != null) qs.set("month", String(month));
    const q = qs.toString();
    const res = await fetch(
      `/api/buildings/${buildingId}/collections${q ? `?${q}` : ""}`,
      { method: "GET" },
    );
    if (!res.ok) {
      const body = await parseJsonSafe(res);
      return failureFromStatus(res.status, body, null, "Collections API");
    }
    const data = (await parseJsonSafe(res)) as CollectionsResponse;
    return { ok: true, data };
  } catch {
    return errorResult(null, "Αποτυχία σύνδεσης με το API εισπράξεων");
  }
}

export async function operatorPayCharge(
  buildingId: string,
  chargeId: string,
): Promise<ApiResult<PayChargeResponse | null>> {
  try {
    const res = await fetch(`/api/buildings/${buildingId}/collections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chargeId }),
    });
    if (!res.ok) {
      const err = await parseJsonSafe(res);
      const message =
        err && typeof err === "object" && "error" in err
          ? String((err as { error: unknown }).error)
          : `Pay failed (${res.status})`;
      return errorResult(null, message);
    }
    const data = (await parseJsonSafe(res)) as PayChargeResponse;
    return { ok: true, data };
  } catch {
    return pendingResult(null);
  }
}

export async function fetchPortal(
  token: string,
): Promise<ApiResult<PortalPayload | null>> {
  try {
    const res = await fetch(`/api/portal/${encodeURIComponent(token)}`, {
      method: "GET",
    });
    if (res.status === 404) {
      return errorResult(null, "Άκυρος σύνδεσμος portal");
    }
    if (!res.ok) {
      return pendingResult(null, `Portal API ${res.status}`);
    }
    const data = (await parseJsonSafe(res)) as PortalPayload;
    return { ok: true, data };
  } catch {
    return pendingResult(null);
  }
}

export async function portalPayCharge(
  token: string,
  chargeId: string,
): Promise<ApiResult<PayChargeResponse | null>> {
  try {
    const res = await fetch(
      `/api/portal/${encodeURIComponent(token)}/pay`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeId }),
      },
    );
    if (!res.ok) {
      const err = await parseJsonSafe(res);
      const message =
        err && typeof err === "object" && "error" in err
          ? String((err as { error: unknown }).error)
          : `Pay failed (${res.status})`;
      return errorResult(null, message);
    }
    const data = (await parseJsonSafe(res)) as PayChargeResponse;
    return { ok: true, data };
  } catch {
    return pendingResult(null);
  }
}

export async function fetchRecurringExpenses(
  buildingId: string,
): Promise<ApiResult<RecurringExpensesResponse | null>> {
  try {
    const res = await fetch(
      `/api/buildings/${buildingId}/recurring-expenses`,
      { method: "GET" },
    );
    if (!res.ok) {
      const body = await parseJsonSafe(res);
      return failureFromStatus(res.status, body, null, "Πάγια API");
    }
    const data = (await parseJsonSafe(res)) as RecurringExpensesResponse;
    return { ok: true, data };
  } catch {
    return pendingResult(null);
  }
}

export async function createRecurringExpense(
  buildingId: string,
  body: {
    categoryId: string;
    label: string;
    amountCents: number;
    dayOfMonth?: number;
    active?: boolean;
  },
): Promise<ApiResult<RecurringExpenseItem | null>> {
  try {
    const res = await fetch(
      `/api/buildings/${buildingId}/recurring-expenses`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const err = await parseJsonSafe(res);
      const message =
        err && typeof err === "object" && "error" in err
          ? String((err as { error: unknown }).error)
          : `Create πάγιο failed (${res.status})`;
      return errorResult(null, message);
    }
    const json = (await parseJsonSafe(res)) as {
      recurringExpense: RecurringExpenseItem;
    };
    return { ok: true, data: json.recurringExpense };
  } catch {
    return pendingResult(null);
  }
}

export async function patchRecurringExpense(
  buildingId: string,
  rid: string,
  body: {
    active?: boolean;
    amountCents?: number;
    label?: string;
    dayOfMonth?: number;
    categoryId?: string;
  },
): Promise<ApiResult<RecurringExpenseItem | null>> {
  try {
    const res = await fetch(
      `/api/buildings/${buildingId}/recurring-expenses/${rid}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const err = await parseJsonSafe(res);
      const message =
        err && typeof err === "object" && "error" in err
          ? String((err as { error: unknown }).error)
          : `Update πάγιο failed (${res.status})`;
      return errorResult(null, message);
    }
    const json = (await parseJsonSafe(res)) as {
      recurringExpense: RecurringExpenseItem;
    };
    return { ok: true, data: json.recurringExpense };
  } catch {
    return pendingResult(null);
  }
}
