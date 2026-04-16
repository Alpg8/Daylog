import { PackageSearch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuppliersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Tedarikçiler</h1>
        <p className="text-muted-foreground">Tedarikçi firmalarını yönetin.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-muted-foreground" />
            Yakında
          </CardTitle>
          <CardDescription>
            Tedarikçi yönetimi modülü geliştirme aşamasındadır.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Bu bölümde tedarikçi firmalarını, iletişim bilgilerini ve tedarik süreçlerini yönetebileceksiniz.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
