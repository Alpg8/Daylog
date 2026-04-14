"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="tr">
      <body className="bg-background text-foreground">
        <main className="flex min-h-screen items-center justify-center px-6 py-16">
          <div className="surface-panel w-full max-w-lg rounded-3xl p-8 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
              500
            </p>
            <h1 className="mt-4 text-3xl font-semibold">
              Beklenmeyen bir hata olustu
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Sayfa yuklenirken bir sorun olustu. Tekrar deneyin veya dashboard'a donun.
            </p>
            {error.digest ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Hata kodu: {error.digest}
              </p>
            ) : null}
            {process.env.NODE_ENV !== "production" && error.message ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Ayrinti: {error.message}
              </p>
            ) : null}
            <div className="mt-8 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Tekrar dene
              </button>
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-md border border-border px-5 text-sm font-medium transition hover:bg-accent"
              >
                Dashboard'a don
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}