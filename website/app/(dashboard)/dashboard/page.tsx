import { StatsCards } from "@/components/dashboard/stats-cards";
import { OperationsOverview } from "@/components/dashboard/operations-overview";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <StatsCards />
      <OperationsOverview />
    </div>
  );
}
