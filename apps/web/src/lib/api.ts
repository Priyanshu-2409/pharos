const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ─── Types ───────────────────────────────────────────────────

export type Monitor = {
  id: string;
  name: string;
  url: string;
  intervalSeconds: number;
  status: "ACTIVE" | "PAUSED";
  createdAt: string;
  updatedAt: string;
  latestCheck: {
    result: "UP" | "DOWN" | "DEGRADED";
    statusCode: number | null;
    responseTime: number;
    errorMessage: string | null;
    checkedAt: string;
  } | null;
  hasOpenIncident: boolean;
};

export type MonitorInput = {
  name: string;
  url: string;
  intervalSeconds: number;
};

export type Settings = {
  user: { id: string; name: string; email: string };
  notificationEmail: string;
  hasChannel: boolean;
};

// ─── Fetch wrapper ───────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error ?? `Request failed with ${res.status}`);
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}

// ─── Domain-specific helpers ─────────────────────────────────

export const monitorsApi = {
  list: () =>
    apiFetch<{ monitors: Monitor[] }>("/api/monitors"),

  create: (input: MonitorInput) =>
    apiFetch<{ monitor: Monitor }>("/api/monitors", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: Partial<MonitorInput> & { status?: "ACTIVE" | "PAUSED" }) =>
    apiFetch<{ monitor: Monitor }>(`/api/monitors/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/monitors/${id}`, {
      method: "DELETE",
    }),
};

export const settingsApi = {
  get: () => apiFetch<Settings>("/api/settings"),

  update: (notificationEmail: string) =>
    apiFetch<{ ok: true; notificationEmail: string }>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify({ notificationEmail }),
    }),
};

// ─── Status pages ────────────────────────────────────────────

export type StatusPageSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  monitors: { id: string; name: string }[];
};

export type StatusPageCreateInput = {
  slug: string;
  title: string;
  description?: string | null;
};

export type StatusPageUpdateInput = {
  slug?: string;
  title?: string;
  description?: string | null;
  isPublic?: boolean;
};

export const statusPagesApi = {
  list: () =>
    apiFetch<{ statusPages: StatusPageSummary[] }>("/api/status-pages"),

  create: (input: StatusPageCreateInput) =>
    apiFetch<{ statusPage: StatusPageSummary }>("/api/status-pages", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: StatusPageUpdateInput) =>
    apiFetch<{ statusPage: StatusPageSummary }>(`/api/status-pages/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/status-pages/${id}`, {
      method: "DELETE",
    }),

  setMonitors: (id: string, monitorIds: string[]) =>
    apiFetch<{ ok: true }>(`/api/status-pages/${id}/monitors`, {
      method: "PUT",
      body: JSON.stringify({ monitorIds }),
    }),
};