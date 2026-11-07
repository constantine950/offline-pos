const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new ApiError(res.status, `Server responded ${res.status}`);
  return res.json() as Promise<T>;
}

export function postJson<T>(
  path: string,
  body: unknown,
  timeoutMs = 10000,
): Promise<T> {
  return request<T>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );
}

export function getJson<T>(path: string, timeoutMs = 10000): Promise<T> {
  return request<T>(path, { method: "GET" }, timeoutMs);
}
