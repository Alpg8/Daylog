"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Auto-refreshes the page every 60 s and exposes a manual refresh button. */
export function OpsSummaryRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, 60_000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => router.refresh()}
      className="gap-2"
      title="Sayfayi yenile"
    >
      <RefreshCw className="h-4 w-4" />
      Yenile
    </Button>
  );
}
