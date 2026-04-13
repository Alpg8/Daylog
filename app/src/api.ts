import { API_BASE_URL } from "./config";

export async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error ?? "Request failed");
  }

  return json as T;
}

export async function apiFetchForm<T>(path: string, token: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error ?? "Request failed");
  }

  return json as T;
}
