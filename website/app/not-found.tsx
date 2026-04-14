import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="surface-panel w-full max-w-lg rounded-3xl p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-foreground">
          Aradiginiz sayfa bulunamadi
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sayfa silinmis olabilir ya da baglanti gecersiz.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Dashboard'a don
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border px-5 text-sm font-medium text-foreground transition hover:bg-accent"
          >
            Giris sayfasi
          </Link>
        </div>
      </div>
    </main>
  );
}