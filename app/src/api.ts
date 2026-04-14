import { API_BASE_URL } from "./config";

type JsonObject = Record<string, unknown>;

function toHeaders(initHeaders?: HeadersInit): Record<string, string> {
  if (!initHeaders) return {};
  if (initHeaders instanceof Headers) {
    const out: Record<string, string> = {};
    initHeaders.forEach((value: string, key: string) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(initHeaders)) {
    return Object.fromEntries(initHeaders);
  }
  return { ...initHeaders };
}

async function parseResponseJson(res: Response): Promise<JsonObject> {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as JsonObject;
  } catch {
    throw new Error(`Beklenmeyen sunucu cevabi (${res.status})`);
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headerMap = toHeaders(init?.headers);
  const hasContentType = Object.keys(headerMap).some((key) => key.toLowerCase() === "content-type");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(hasContentType ? {} : { "Content-Type": "application/json" }),
      "x-client-source": "APP",
      ...headerMap,
    },
  });

  const json = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error((json.error as string | undefined) ?? `Istek basarisiz (${res.status})`);
  }

  return json as T;
}

export async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ? toHeaders(init.headers) : {}),
    },
  });
}

export async function apiFetchPublic<T>(path: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(path, init);
}

export async function apiFetchForm<T>(path: string, token: string, formData: FormData): Promise<T> {
  return requestJson<T>(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
}

export function resolveAppUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith("/")) {
    return `${API_BASE_URL}${pathOrUrl}`;
  }
  return `${API_BASE_URL}/${pathOrUrl}`;
}
