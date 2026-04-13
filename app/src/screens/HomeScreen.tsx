import { Pressable, ScrollView, Text, View } from "react-native";
import { styles } from "../styles";
import type { DriverTask } from "../types";
import type { TabKey } from "../constants";

function QuickAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quickBtn}>
      <Text style={styles.quickBtnText}>{label}</Text>
    </Pressable>
  );
}

interface HomeScreenProps {
  assignedVehicle: string;
  activeTaskCount: number;
  selectedTask: DriverTask | null;
  onTabChange: (tab: TabKey) => void;
}

export function HomeScreen({ assignedVehicle, activeTaskCount, selectedTask, onTabChange }: HomeScreenProps) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 14 }}>
      <View style={styles.gradientCard}>
        <Text style={styles.gradientCardTitle}>Sofor Ozeti</Text>
        <Text style={styles.gradientCardText}>Arac: {assignedVehicle}</Text>
        <Text style={styles.gradientCardText}>Aktif Is: {activeTaskCount}</Text>
      </View>

      {selectedTask ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Siradaki Is</Text>
          <Text style={styles.cardLine}>{selectedTask.cargoNumber ?? "Yuk No Yok"}</Text>
          <Text style={styles.cardLine}>Durum: {selectedTask.status}</Text>
          <Text style={styles.cardLine}>Sefer: {selectedTask.tripNumber ?? "-"}</Text>
          <Text style={styles.cardLine}>Arac: {selectedTask.vehicle?.plateNumber ?? "-"}</Text>
          <Text style={styles.cardLine}>Guzergah: {selectedTask.routeText ?? "-"}</Text>
        </View>
      ) : (
        <View style={styles.card}><Text style={styles.emptyText}>Aktif is bulunamadi.</Text></View>
      )}

      <View style={styles.quickGrid}>
        <QuickAction label="Isler" onPress={() => onTabChange("job")} />
        <QuickAction label="Asama" onPress={() => onTabChange("job")} />
        <QuickAction label="Arac" onPress={() => onTabChange("vehicle")} />
        <QuickAction label="Yakit" onPress={() => onTabChange("fuel")} />
      </View>
    </ScrollView>
  );
}
