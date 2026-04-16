import { UserCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CustomersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Müşteriler</h1>
        <p className="text-muted-foreground">Müşteri firmalarını yönetin.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-muted-foreground" />
            Yakında
          </CardTitle>
          <CardDescription>
            Müşteri yönetimi modülü geliştirme aşamasındadır.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Bu bölümde müşteri firmalarını, iletişim bilgilerini ve sipariş geçmişlerini yönetebileceksiniz.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
