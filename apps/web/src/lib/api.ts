const API_BASE = "http://localhost:4000";

// Shape returned by GET /api/monitors — includes latest check + incident flag
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

// Shape sent in POST /api/monitors and PATCH /api/monitors/:id
export type MonitorInput = {
  name: string;
  url: string;
  intervalSeconds: number;
};

// Standard fetch wrapper — always includes cookies, always sends Origin implicitly (browser does it)
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

  // DELETE returns 204 No Content — nothing to parse
  if (res.status === 204) return undefined as T;

  return res.json();
}

// Domain-specific helpers
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