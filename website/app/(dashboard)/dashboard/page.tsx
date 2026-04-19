import { StatsCards } from "@/components/dashboard/stats-cards";
import { OperationsOverview } from "@/components/dashboard/operations-overview";
import { VehicleFleetMap } from "@/components/dashboard/vehicle-fleet-map";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <StatsCards />
      <VehicleFleetMap />
      <OperationsOverview />
    </div>
  );
}
