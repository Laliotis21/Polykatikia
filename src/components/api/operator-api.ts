/**
 * Typed fetch wrappers for operator UI.
 * Fail gracefully when APIs return 404/501 or are unreachable.
 */

import type {
  AlertListItem,
  ApartmentSharesItem,
  BuildingSummary,
  CreateReceiptResponse,
  CreateTransactionBody,
  CreateTransactionResponse,
  ExpenseCategoryItem,
  KoinoxristaPreview,
  PatchAlertBody,
  ReceiptDetail,
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

export async function fetchBuildings(): Promise<ApiResult<BuildingSummary[]>> {
  try {
    const res = await fetch("/api/buildings", { method: "GET" });
    if (res.status === 404 || res.status === 501) {
      return pendingResult(SEED_BUILDINGS);
    }
    if (!res.ok) {
      return pendingResult(SEED_BUILDINGS, `Buildings API ${res.status}`);
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
    if (list.length === 0) {
      return { ok: true, data: SEED_BUILDINGS };
    }
    return { ok: true, data: list };
  } catch {
    return pendingResult(SEED_BUILDINGS);
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
    if (res.status === 404 || res.status === 501) {
      return pendingResult([]);
    }
    if (!res.ok) {
      return pendingResult([], `Transactions API ${res.status}`);
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
    if (res.status === 404 || res.status === 501) {
      return pendingResult([]);
    }
    if (!res.ok) {
      return pendingResult([], `Alerts API ${res.status}`);
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
    if (res.status === 404 || res.status === 501) {
      return pendingResult(empty);
    }
    if (!res.ok) {
      return pendingResult(empty, `Apartments API ${res.status}`);
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

export async function patchApartmentShares(
  buildingId: string,
  body: {
    apartmentId: string;
    shareBps?: number;
    elevatorShareBps?: number;
    heatingShareBps?: number;
    floor?: number | null;
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
    if (res.status === 404 || res.status === 501) {
      return pendingResult([]);
    }
    if (!res.ok) {
      return pendingResult([], `Categories API ${res.status}`);
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
    if (res.status === 404 || res.status === 501) {
      return pendingResult(null);
    }
    if (!res.ok) {
      return pendingResult(null, `Κοινόχρηστα API ${res.status}`);
    }
    const data = (await parseJsonSafe(res)) as KoinoxristaPreview;
    return { ok: true, data };
  } catch {
    return pendingResult(null);
  }
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
