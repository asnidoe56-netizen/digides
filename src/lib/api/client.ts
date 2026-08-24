// One error shape and one fetch wrapper for every feature's *-api.ts, so
// error handling doesn't get reinvented per feature (issue M03 section
// 12-13: "Gunakan API client / feature service").

export class ApiError extends Error {
  status: number;
  issues?: Record<string, string[] | undefined>;

  constructor(message: string, status: number, issues?: Record<string, string[] | undefined>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : "Terjadi kesalahan, silakan coba lagi.",
      response.status,
      body.issues,
    );
  }

  return body as T;
}
