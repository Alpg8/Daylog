import { ScrollView, Text, View } from "react-native";
import { styles } from "../styles";
import type { DriverOverviewStats, DriverRecentJobItem, DriverVehicleHistoryItem } from "../types";

interface VehicleScreenProps {
  darkMode: boolean;
  assignedVehicle: string;
  vehicleHistory: DriverVehicleHistoryItem[];
  recentJobs: DriverRecentJobItem[];
  overviewStats: DriverOverviewStats;
}

export function VehicleScreen({ darkMode, assignedVehicle, vehicleHistory, recentJobs, overviewStats }: VehicleScreenProps) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 18 }}>
      <View style={[styles.gradientCard, darkMode && styles.gradientCardDark]}>
        <Text style={styles.gradientCardTitle}>Arac Durumu</Text>
        <Text style={styles.gradientCardText}>Mevcut arac: {assignedVehicle}</Text>
        <Text style={styles.gradientCardText}>Toplam is: {overviewStats.totalJobs}</Text>
        <Text style={styles.gradientCardText}>Tamamlanan is: {overviewStats.completedJobs}</Text>
      </View>

      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Kullanilan Araclar</Text>
        {vehicleHistory.length === 0 ? (
          <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Gecmis arac kaydi bulunamadi.</Text>
        ) : (
          vehicleHistory.map((item) => (
            <View key={item.vehicleId} style={styles.listItemBlock}>
              <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Plaka: {item.plateNumber}</Text>
              <Text style={styles.meta}>
                Is sayisi: {item.jobCount} / Son kullanim: {new Date(item.lastUsedAt).toLocaleDateString("tr-TR")}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Son Isler</Text>
        {recentJobs.length === 0 ? (
          <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Is gecmisi bulunamadi.</Text>
        ) : (
          recentJobs.map((job) => (
            <View key={job.id} style={styles.listItemBlock}>
              <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>{job.cargoNumber ?? job.tripNumber ?? "Is"} - {job.status}</Text>
              <Text style={styles.meta}>
                Arac: {job.vehiclePlate ?? "-"} / {new Date(job.updatedAt).toLocaleDateString("tr-TR")}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
