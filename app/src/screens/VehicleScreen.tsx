import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { resolveAppUrl } from "../api";
import { styles } from "../styles";
import type { DriverOverviewStats, DriverProfile, DriverRecentJobItem, DriverVehicleHistoryItem } from "../types";

interface VehicleScreenProps {
  darkMode: boolean;
  assignedVehicle: string;
  driverProfile: DriverProfile | null;
  vehicleHistory: DriverVehicleHistoryItem[];
  recentJobs: DriverRecentJobItem[];
  overviewStats: DriverOverviewStats;
  damageTitle: string;
  damageDescription: string;
  onDamageTitleChange: (value: string) => void;
  onDamageDescriptionChange: (value: string) => void;
  onSubmitDamageReport: () => Promise<string | null>;
}

export function VehicleScreen({
  darkMode,
  assignedVehicle,
  driverProfile,
  vehicleHistory,
  recentJobs,
  overviewStats,
  damageTitle,
  damageDescription,
  onDamageTitleChange,
  onDamageDescriptionChange,
  onSubmitDamageReport,
}: VehicleScreenProps) {
  async function openAttachment(url: string) {
    const targetUrl = resolveAppUrl(url);
    const supported = await Linking.canOpenURL(targetUrl);
    if (!supported) {
      Alert.alert("Arac Dosyasi", "Dosya acilamadi");
      return;
    }
    await Linking.openURL(targetUrl);
  }

  async function handleDamageReport() {
    const err = await onSubmitDamageReport();
    if (err) Alert.alert("Hasar Bildirimi", err);
    else Alert.alert("Basarili", "Hasar bildirimi merkeze iletildi");
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 18 }}>
      <View style={[styles.gradientCard, darkMode && styles.gradientCardDark]}>
        <Text style={styles.gradientCardTitle}>Arac Durumu</Text>
        <Text style={styles.gradientCardText}>Mevcut arac: {assignedVehicle}</Text>
        <Text style={styles.gradientCardText}>Toplam is: {overviewStats.totalJobs}</Text>
        <Text style={styles.gradientCardText}>Tamamlanan is: {overviewStats.completedJobs}</Text>
      </View>

      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Arac Detaylari</Text>
        <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Plaka: {driverProfile?.assignedVehicle?.plateNumber ?? assignedVehicle}</Text>
        <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Marka/Model: {[driverProfile?.assignedVehicle?.brand, driverProfile?.assignedVehicle?.model].filter(Boolean).join(" ") || "-"}</Text>
        <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Durum: {driverProfile?.assignedVehicle?.status ?? "-"}</Text>
        <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Not: {driverProfile?.assignedVehicle?.notes ?? "-"}</Text>
      </View>

      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Arac Belgeleri</Text>
        {driverProfile?.assignedVehicle?.attachments?.length ? (
          driverProfile.assignedVehicle.attachments.map((attachment) => (
            <View key={attachment.id} style={styles.listItemBlock}>
              <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>{attachment.label ?? "Dokuman"}</Text>
              <Text style={styles.meta}>{new Date(attachment.createdAt).toLocaleString("tr-TR")}</Text>
              <Pressable onPress={() => void openAttachment(attachment.url)}>
                <Text style={styles.linkText}>Dosyayi Ac</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={[styles.cardLine, darkMode && styles.cardLineDark]}>Muayene, kasko veya poliçe dosyasi henuz eklenmemis.</Text>
        )}
      </View>

      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>Arac Hasar Bildirimi</Text>
        <TextInput style={[styles.input, darkMode && styles.inputDark]} value={damageTitle} onChangeText={onDamageTitleChange} placeholder="Baslik" placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"} />
        <TextInput style={[styles.input, styles.textArea, darkMode && styles.inputDark]} value={damageDescription} onChangeText={onDamageDescriptionChange} placeholder="Hasar detaylari" placeholderTextColor={darkMode ? "#94a3b8" : "#64748b"} multiline />
        <Pressable style={styles.primaryBtn} onPress={handleDamageReport}>
          <Text style={styles.primaryBtnText}>Merkeze Bildir</Text>
        </Pressable>
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
